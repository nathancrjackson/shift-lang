import { ShiftError, ShiftAlert, ShiftCritical, ShiftRuntimeError } from './errors.mjs';
import { logger } from './logger.mjs';

// Control Flow Signals (Internal Only - Not thrown)
const SIGNAL_NONE = 0;
const SIGNAL_BREAK = 1;
const SIGNAL_SKIP = 2;
const SIGNAL_RETURN = 3;

export class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.values = new Map();
    }

    define(name, value) {
        this.values.set(name, value);
    }

    get(name) {
        if (this.values.has(name)) return this.values.get(name);
        if (this.parent) return this.parent.get(name);
        throw new Error(`Runtime Error: Undefined variable '${name}'.`);
    }

    assign(name, value) {
        if (this.values.has(name)) {
            this.values.set(name, value);
            return;
        }
        if (this.parent) {
            this.parent.assign(name, value);
            return;
        }
        throw new Error(`Runtime Error: Undefined variable '${name}'.`);
    }
}

class StackFrame {
    constructor(type, env, statements = []) {
        this.type = type; // "Function", "Block", "Loop"
        this.env = env;
        this.statements = statements;
        this.pc = 0; // Program Counter
        this.waitingForExpr = false;
        this.exprResult = null;
    }
}

export class Runtime {
    constructor(ast, debugMode = false) {
        // Guard clauses
        if (!ast || typeof ast !== 'object') {
            throw new ShiftRuntimeError("Runtime constructor requires a valid AST object.");
        }

        logger.trace("RUNTIME", "Initializing runtime environment");

        this.ast = ast;
        this.debugMode = debugMode;
        this.globalEnv = new Environment();
        this.functions = new Map();
        this.intrinsics = new Map();

        this.loadFunctions();

        // Global magic variables
        this.globalEnv.define("$line_num", 0);
        this.globalEnv.define("$pi", Math.PI);
        this.globalEnv.define("$e", Math.E);

        // The Execution Stack
        this.stack = [];
        this.maxInstructions = 0;
        this.instructionsRun = 0;

        // Configurable Regex Safety Controls
        this.allowUnsafeRegexFallback = true;  // If false, suspicious patterns crash instantly
        this.unsafeRegexMaxStringCeiling = 120; // Highly restrictive character cap for suspicious patterns
    }

    logDebug(msg) {
        if (this.debugMode) {
            console.log(`[DEBUG] ${msg}`);
        }
    }

    addIntrinsic(name, func) {
        if (typeof name !== 'string') {
            throw new ShiftRuntimeError("Intrinsic name must be a string.");
        }
        if (typeof func !== 'function') {
            throw new ShiftRuntimeError("Intrinsic function must be a JS function.");
        }
        this.intrinsics.set(name, func);
    }

    loadFunctions() {
        for (const func of this.ast.functions) {
            this.functions.set(func.name, func);
        }
    }

    stringify(val) {
        if (typeof val === 'boolean') return val ? "1" : "0";
        return String(val);
    }

    deepCopy(value, visited = new Set()) {
        if (value === null) return null;
        if (typeof value !== 'object') return value;
        if (visited.has(value)) {
            throw new Error(`Runtime Error: Circular reference detected during deep copy.`);
        }
        visited.add(value);

        if (Array.isArray(value)) return value.map(item => this.deepCopy(item, visited));
        if (value instanceof Map) {
            const newMap = new Map();
            if (value.__shift_type) newMap.__shift_type = value.__shift_type;
            for (const [k, v] of value) newMap.set(k, this.deepCopy(v, visited));
            return newMap;
        }
        return value;
    }

    getDefaultValue(typeInfo) {
        switch (typeInfo.name) {
            case "number": return 0;
            case "string": return "";
            case "bool": return false;
            case "list": return [];
            case "map": return new Map();
            case "null": return null;
            case "none": return null;
            case "nullable": return null;
            case "any": return null;
            default: return null;
        }
    }

    checkType(value, typeInfo) {
        if (typeInfo.name === 'any') return;
        if (value === null) {
            if (["nullable", "null", "none"].includes(typeInfo.name)) return;
            throw new Error(`Runtime Error: Return type mismatch.`);
        }
        if (typeInfo.name === 'nullable') {
            if (typeInfo.generic) this.checkType(value, typeInfo.generic);
            return;
        }
        if (typeInfo.type === 'StructType') {
            if (!(value instanceof Map)) throw new Error(`Runtime Error: Return type mismatch.`);
            value.__shift_type = typeInfo.name;
            return;
        }
        const actualType = typeof value;

        // Strict Type Mapping
        let expectedJS = typeInfo.name;
        if (expectedJS === "bool") expectedJS = "boolean";

        const valid = (typeInfo.name === "list" && Array.isArray(value)) ||
            (typeInfo.name === "map" && value instanceof Map) ||
            (expectedJS === actualType);

        if (!valid) throw new Error(`Runtime Error: Return type mismatch.`);

        if (typeInfo.name === "list" && typeInfo.generic) {
            for (let i = 0; i < value.length; i++) {
                this.checkType(value[i], typeInfo.generic);
            }
        } else if (typeInfo.name === "map" && typeInfo.generic) {
            for (const val of value.values()) {
                this.checkType(val, typeInfo.generic);
            }
        }
    }

    verifySafeRegex(pattern) {
        // 1. Prohibit backreferences (\1, \2)
        if (/\\\d/.test(pattern)) return false;

        // 2. Detect nested quantifiers (e.g., (a+)+, (.*)*)
        if (/\([^)]*[\*\+\?\}][^)]*\)[\*\+\?\}]/.test(pattern)) return false;

        // 3. Detect overlapping quantifiers across alternations (e.g., (a+|b+)+)
        if (/\([^)]*[\*\+\?\}].*\|.*[\*\+\?\}][^)]*\)[\*\+\?\}]/.test(pattern)) return false;

        return true; // Pattern structural composition passed safety benchmarks
    }

    // --- The Stack Machine Core ---

    runFunction(name, args = []) {
        if (typeof name !== 'string') {
            throw new ShiftRuntimeError("Function callee name must be a string.");
        }
        if (!Array.isArray(args)) {
            throw new ShiftRuntimeError("Function args must be an array.");
        }

        logger.trace("RUNTIME", `Executing function call: ${name}`, { argsCount: args.length });

        const previousStack = this.stack;
        this.stack = [];

        try {
            let func = null;

            if (this.intrinsics.has(name)) {
                this.logDebug(`Running Intrinsic: ${name}`);
                return this.intrinsics.get(name)(args, this);
            } else {
                func = this.functions.get(name);
            }

            if (!func) throw new Error(`Runtime Error: Function '${name}' not found.`);
            if (args.length !== func.params.length) {
                throw new Error(`Runtime Error: Function '${name}' expects ${func.params.length} arguments but got ${args.length}.`);
            }

            const fnEnv = new Environment(this.globalEnv);
            for (let i = 0; i < func.params.length; i++) {
                const paramName = func.params[i].name;
                const paramValue = this.deepCopy(args[i]);
                fnEnv.define(paramName, paramValue);
            }

            const initialFrame = new StackFrame("Function", fnEnv, func.body.statements);
            initialFrame.meta = { returnType: func.returnType, functionName: name };

            this.stack.push(initialFrame);
            this.logDebug(`Pushed Function Frame: ${name} (Args: ${args.length})`);

            let finalResult = null;
            let currentSignal = SIGNAL_NONE;
            let signalValue = null;

            while (this.stack.length > 0) {
                this.instructionsRun++;
                if (this.maxInstructions > 0 && this.instructionsRun > this.maxInstructions) {
                    throw new ShiftCritical("Runtime Error: Execution exceeded maximum instruction limit.");
                }

                const frame = this.stack[this.stack.length - 1];

                if (currentSignal === SIGNAL_RETURN) {
                    if (frame.type === "Function") {
                        finalResult = signalValue;
                        this.stack.pop();
                        this.logDebug(`Popped Function Frame: ${frame.meta?.functionName} (Return: ${this.stringify(finalResult)})`);

                        if (frame.meta && frame.meta.returnType) {
                            this.checkType(finalResult, frame.meta.returnType);
                        }

                        if (this.stack.length === 0) return finalResult;

                        const callerFrame = this.stack[this.stack.length - 1];
                        callerFrame.exprResult = finalResult;
                        callerFrame.waitingForExpr = false;

                        currentSignal = SIGNAL_NONE;
                        signalValue = null;
                        continue;
                    }
                    else {
                        this.stack.pop();
                        this.logDebug(`Popped Frame: ${frame.type} (Propagating Return)`);
                        continue;
                    }
                }

                if (currentSignal === SIGNAL_BREAK || currentSignal === SIGNAL_SKIP) {
                    if (frame.type === "Loop") {
                        if (currentSignal === SIGNAL_BREAK) {
                            this.stack.pop();
                            this.logDebug(`Loop Terminated (Break)`);
                            currentSignal = SIGNAL_NONE;
                        } else {
                            this.logDebug(`Loop Skipping`);
                            currentSignal = SIGNAL_NONE;
                        }
                        continue;
                    } else if (frame.type === "Function") {
                        throw new Error("Runtime Error: 'break' or 'skip' used outside of loop.");
                    } else {
                        this.stack.pop();
                        continue;
                    }
                }

                if (frame.pc >= frame.statements.length) {
                    this.stack.pop();
                    this.logDebug(`Popped Frame: ${frame.type} (Finished)`);

                    if (frame.type === "Function") {
                        const retType = frame.meta.returnType;
                        if (retType.name !== 'none' && retType.name !== 'null' &&
                            retType.name !== 'nullable' && retType.name !== 'any') {
                            throw new Error(`Runtime Error: Expected a return but none was supplied before function end.`);
                        }
                        if (this.stack.length > 0) {
                            const caller = this.stack[this.stack.length - 1];
                            caller.exprResult = null;
                            caller.waitingForExpr = false;
                        } else {
                            return null;
                        }
                    }
                    continue;
                }

                const stmt = frame.statements[frame.pc];

                if (frame.type !== "Loop") {
                    frame.pc++;
                }

                try {
                    this.executeStatement(stmt, frame, (sig, val) => {
                        currentSignal = sig;
                        signalValue = val;
                        if (sig !== SIGNAL_NONE) this.logDebug(`Signal Raised: ${sig}`);
                    });
                } catch (e) {
                    throw e;
                }

                if (currentSignal !== SIGNAL_NONE) continue;
            }

            return finalResult;

        } finally {
            this.stack = previousStack;
        }
    }

    executeStatement(stmt, frame, signalCallback) {
        if (stmt.line) {
            try { this.globalEnv.assign("$line_num", stmt.line); } catch (e) { }
        }

        this.logDebug(`Exec Stmt: ${stmt.type} (Line: ${stmt.line})`);

        switch (stmt.type) {
            case "VariableDeclaration": {
                if (stmt.name.startsWith('$')) throw new Error(`Runtime Error: Cannot declare magic variable '${stmt.name}'.`);
                let val = stmt.initializer ? this.deepCopy(this.evaluate(stmt.initializer, frame.env)) : this.getDefaultValue(stmt.varType);
                if (stmt.varType.type === "StructType" && val instanceof Map) val.__shift_type = stmt.varType.name;
                frame.env.define(stmt.name, val);
                break;
            }
            case "ExpressionStatement":
                this.evaluate(stmt.expression, frame.env);
                break;

            case "ReturnStatement": {
                let retVal = null;
                if (stmt.value) retVal = this.evaluate(stmt.value, frame.env);
                signalCallback(SIGNAL_RETURN, retVal);
                break;
            }

            case "BreakStatement":
                signalCallback(SIGNAL_BREAK, null);
                break;

            case "SkipStatement":
                signalCallback(SIGNAL_SKIP, null);
                break;

            case "IfStatement": {
                if (this.isTruthy(this.evaluate(stmt.condition, frame.env))) {
                    this.pushBlock(stmt.thenBranch, frame.env);
                } else if (stmt.elseBranch) {
                    if (stmt.elseBranch.type === "IfStatement") {
                        this.stack.push(new StackFrame("Block", new Environment(frame.env), [stmt.elseBranch]));
                    } else {
                        this.pushBlock(stmt.elseBranch, frame.env);
                    }
                }
                break;
            }

            case "WhileStatement": {
                this.startLoop(stmt, frame.env, "while");
                break;
            }

            case "ForRangeStatement": {
                this.startLoop(stmt, frame.env, "range");
                break;
            }

            case "ForInStatement": {
                this.startLoop(stmt, frame.env, "in");
                break;
            }

            case "Block": {
                this.pushBlock(stmt, frame.env);
                break;
            }

            case "LoopStep": {
                this.executeLoopStep(frame);
                break;
            }

            case "ThrowStatement": {
                const message = this.evaluate(stmt.argument, frame.env);
                if (stmt.severity === "alert") throw new ShiftAlert(message);
                if (stmt.severity === "critical") throw new ShiftCritical(message);
                throw new ShiftError(message);
            }

            case "TryStatement": {
                try {
                    this.runProtectedBlock(stmt.tryBlock, frame.env, signalCallback);
                } catch (e) {
                    if (e instanceof ShiftCritical) {
                        throw e;
                    }
                    else if (e instanceof ShiftAlert) {
                        if (stmt.reviewBlock) {
                            const reviewEnv = new Environment(frame.env);
                            reviewEnv.define(stmt.catchIdentifier, e.message);
                            this.runProtectedBlock(stmt.reviewBlock, reviewEnv, signalCallback);
                        } else {
                            throw e;
                        }
                    }
                    else if (e instanceof ShiftError || e instanceof Error) {
                        if (stmt.catchBlock) {
                            const catchEnv = new Environment(frame.env);
                            catchEnv.define(stmt.catchIdentifier, e.message);
                            this.runProtectedBlock(stmt.catchBlock, catchEnv, signalCallback);
                        } else {
                            throw e;
                        }
                    }
                }
                break;
            }

            case "DeleteStatement":
                this.executeDelete(stmt, frame.env);
                break;
        }
    }

    pushBlock(blockNode, parentEnv) {
        const blockEnv = new Environment(parentEnv);
        this.stack.push(new StackFrame("Block", blockEnv, blockNode.statements));
    }

    runProtectedBlock(blockNode, env, parentSignalCallback) {
        const oldStyleExec = (statements, env) => {
            for (const stmt of statements) {
                this.executeStatement(stmt, { env, type: "Protected" }, (sig, val) => {
                    throw { type: "Signal", sig, val };
                });
            }
        };
        try {
            oldStyleExec(blockNode.statements, env);
        } catch (e) {
            if (e.type === "Signal") {
                if (parentSignalCallback) {
                    parentSignalCallback(e.sig, e.val);
                } else {
                    throw new Error("Control flow signal unhandled in protected block.");
                }
                return;
            }
            throw e;
        }
    }

    startLoop(stmt, env, type) {
        const loopEnv = new Environment(env);
        const loopFrame = new StackFrame("Loop", loopEnv, []);

        if (type === "range") {
            const start = this.evaluate(stmt.startValue, env);
            const end = this.evaluate(stmt.endValue, env);
            if (typeof start !== 'number' || typeof end !== 'number') throw new Error("Range must be numbers");

            loopFrame.iterState = {
                type: "range",
                current: start,
                end: end,
                step: start <= end ? 1 : -1,
                varName: stmt.iterator,
                body: stmt.body
            };
        }
        else if (type === "while") {
            loopFrame.iterState = {
                type: "while",
                condition: stmt.condition,
                body: stmt.body
            };
        }
        else if (type === "in") {
            const col = this.evaluate(stmt.collection, env);
            let items = [];
            let isMap = false;

            if (Array.isArray(col)) items = col;
            else if (col instanceof Map) { items = Array.from(col.entries()); isMap = true; }
            else throw new Error("Not iterable");

            loopFrame.iterState = {
                type: "in",
                items: items,
                index: 0,
                varName: stmt.iterator,
                valVarName: stmt.valueIterator,
                isMap: isMap,
                body: stmt.body
            };
        }

        loopFrame.statements = [{ type: "LoopStep" }];
        this.stack.push(loopFrame);
        this.logDebug(`Started Loop (${type})`);
    }

    executeLoopStep(frame) {
        const state = frame.iterState;
        let shouldRun = false;
        let loopEnv = new Environment(frame.env);

        if (state.type === "range") {
            const cond = (state.step > 0) ? state.current <= state.end : state.current >= state.end;
            if (cond) {
                loopEnv.define(state.varName, state.current);
                state.current += state.step;
                shouldRun = true;
            }
        }
        else if (state.type === "while") {
            if (this.isTruthy(this.evaluate(state.condition, frame.env))) {
                shouldRun = true;
            }
        }
        else if (state.type === "in") {
            if (state.index < state.items.length) {
                const item = state.items[state.index++];
                if (state.isMap) {
                    if (state.valVarName) {
                        loopEnv.define(state.varName, item[0]);
                        loopEnv.define(state.valVarName, item[1]);
                    } else {
                        loopEnv.define(state.varName, item[0]);
                    }
                } else {
                    if (state.valVarName) {
                        loopEnv.define(state.varName, state.index - 1);
                        loopEnv.define(state.valVarName, item);
                    } else {
                        loopEnv.define(state.varName, item);
                    }
                }
                shouldRun = true;
            }
        }

        if (shouldRun) {
            frame.pc = 0;
            this.logDebug(`Loop Step: Running Body`);
            this.pushBlock(state.body, loopEnv);
        } else {
            this.stack.pop();
            this.logDebug(`Loop Finished`);
        }
    }

    evaluate(expr, env) {
        this.logDebug(`Eval: ${expr.type}`);

        switch (expr.type) {
            case "Literal": return expr.value;
            case "MagicVariable":
                if (expr.name === "$line_num") {
                    return expr.line || this.globalEnv.get("$line_num");
                }
                if (expr.name === "$pipe_value") return env.get("$pipe_value");
                return env.get(expr.name);
            case "Variable": return env.get(expr.name);
            case "ListLiteral": return expr.elements.map(e => this.evaluate(e, env));
            case "MapLiteral": {
                const map = new Map();
                for (const entry of expr.entries) map.set(this.evaluate(entry.key, env), this.evaluate(entry.value, env));
                return map;
            }
            case "Assignment": {
                if (expr.name.startsWith('$')) throw new Error(`Runtime Error: Cannot assign to magic variable '${expr.name}'.`);
                const value = this.deepCopy(this.evaluate(expr.value, env));
                env.assign(expr.name, value);
                return value;
            }
            case "IndexAssignment": {
                const container = this.evaluate(expr.object, env);
                const value = this.deepCopy(this.evaluate(expr.value, env));
                if (container === null) {
                    const index = this.evaluate(expr.index, env);
                    if (typeof index === 'number') throw new Error("Runtime Error: Cannot access index on null value.");
                    if (typeof index === 'string') throw new Error("Runtime Error: Cannot access key on null value.");
                    throw new Error("Runtime Error: Cannot assign to null.");
                }
                if (Array.isArray(container)) {
                    if (expr.index === null) { container.push(value); return value; }
                    const index = this.evaluate(expr.index, env);
                    if (typeof index !== 'number' || !Number.isInteger(index)) throw new Error("Runtime Error: List index must be integer value.");
                    if (index < 0) throw new Error("Runtime Error: List index must not be a negative number.");
                    if (index >= container.length) throw new Error("Runtime Error: List index is out of bounds.");
                    container[index] = value;
                    return value;
                }
                if (container instanceof Map) {
                    if (expr.index === null) throw new Error("Runtime Error: Map requires a key.");
                    const key = this.evaluate(expr.index, env);
                    if (typeof key !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
                    container.set(key, value);
                    return value;
                }
                throw new Error("Runtime Error: Invalid assignment target.");
            }

            case "BinaryExpression": return this.evaluateBinary(expr, env);
            case "UnaryExpression": return this.evaluateUnary(expr, env);
            case "Grouping": return this.evaluate(expr.expression, env);
            case "PipelineExpression": {
                const left = this.evaluate(expr.left, env);
                const hasPrev = env.values.has("$pipe_value");
                const prevVal = hasPrev ? env.values.get("$pipe_value") : undefined;
                env.define("$pipe_value", left);
                try {
                    return this.evaluate(expr.right, env);
                } finally {
                    if (hasPrev) {
                        env.define("$pipe_value", prevVal);
                    } else {
                        env.values.delete("$pipe_value");
                    }
                }
            }
            case "IndexExpression": return this.evaluateIndex(expr, env);
            case "CallExpression": {
                const args = expr.arguments.map(a => this.evaluate(a, env));
                return this.runFunction(expr.callee, args);
            }
            case "CastExpression": return this.evaluateCast(expr, env);
            default: return this.evaluateRest(expr, env);
        }
    }

    evaluateRest(expr, env) {
        switch (expr.type) {
            case "InspectExpression": {
                const val = this.evaluate(expr.argument, env);
                const map = new Map();
                let type = "any", size = null;
                if (val === null) type = "null";
                else if (Array.isArray(val)) { type = "list"; size = val.length; }
                else if (val instanceof Map) { type = val.__shift_type || "map"; size = val.size; }
                else if (typeof val === "number") type = "number";
                else if (typeof val === "string") { type = "string"; size = val.length; }
                else if (typeof val === "boolean") type = "bool";
                map.set("$type", type); map.set("$size", size);
                return map;
            }
            case "SizeOfExpression": {
                const val = this.evaluate(expr.argument, env);
                if (Array.isArray(val)) return val.length;
                if (val instanceof Map) return val.size;
                if (typeof val === "string") return val.length;
                throw new Error("Runtime Error: Cannot get size of primitive types");
            }
            case "PackExpression": {
                const bytes = this.evaluate(expr.argument, env);
                if (!Array.isArray(bytes)) throw new Error("Runtime Error: pack requires a list of numbers.");
                
                let result = "";
                const chunkSize = 10000;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    result += String.fromCodePoint(...bytes.slice(i, i + chunkSize));
                }
                return result;
            }
            case "UnpackExpression": return [...String(this.evaluate(expr.argument, env))].map(c => c.codePointAt(0));
            case "TypeOfExpression": return this.getTypeName(this.evaluate(expr.argument, env));
            case "IsExpression": return this.evaluateIs(expr, env);
            case "ReplaceExpression": return this.evaluateReplace(expr, env);
            case "SplitExpression": return String(this.evaluate(expr.source, env)).split(String(this.evaluate(expr.delimiter, env)));
            case "JoinExpression": {
                const src = this.evaluate(expr.source, env);
                if (!Array.isArray(src)) throw new Error("Runtime Error: Join requires a list.");
                return src.join(String(this.evaluate(expr.delimiter, env)));
            }
            default: throw new Error(`Unknown expression ${expr.type}`);
        }
    }

    evaluateIndex(expr, env) {
        const obj = this.evaluate(expr.object, env);
        const idx = this.evaluate(expr.index, env);
        if (obj === null) {
            if (typeof idx === 'number') throw new Error("Runtime Error: Cannot access index on null value.");
            if (typeof idx === 'string') throw new Error("Runtime Error: Cannot access key on null value.");
            throw new Error("Runtime Error: Cannot read properties of null.");
        }
        if (Array.isArray(obj)) {
            if (!Number.isInteger(idx)) throw new Error("Runtime Error: List index must be integer value.");
            if (idx < 0) throw new Error("Runtime Error: List index must not be a negative number.");
            if (idx >= obj.length) throw new Error("Runtime Error: List index is out of bounds.");
            return obj[idx];
        }
        if (obj instanceof Map) {
            if (typeof idx !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
            if (!obj.has(idx)) throw new Error("Runtime Error: Map key does not exist.");
            return obj.get(idx);
        }
        throw new Error("Runtime Error: Invalid index target.");
    }

    getTypeName(val) {
        if (val === null) return "null";
        if (Array.isArray(val)) return "list";
        if (val instanceof Map) return val.__shift_type || "map";
        if (typeof val === 'boolean') return "bool";
        return typeof val;
    }

    evaluateIs(expr, env) {
        const val = this.evaluate(expr.left, env);
        let res = false;
        const check = expr.check;

        if (check === "string") res = typeof val === 'string';
        else if (check === "number") res = typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
        else if (check === "bool") res = typeof val === 'boolean' || (typeof val === 'string' && (val === "1" || val === "0"));
        else if (check === "list") res = Array.isArray(val);
        else if (check === "map") res = val instanceof Map;
        else if (check === "null") res = val === null;
        else if (check === "integer") res = Number.isInteger(val) || (typeof val === 'string' && Number.isInteger(parseFloat(val)));
        else if (check === "whitespace") res = typeof val === 'string' && /^\s*$/.test(val);
        else if (check === "alpha") res = typeof val === 'string' && /^[a-zA-Z]+$/.test(val);
        else if (check === "numeric") res = typeof val === 'string' && /^[0-9]+$/.test(val);
        else if (check === "alphanumeric") res = typeof val === 'string' && /^[a-zA-Z0-9]+$/.test(val);
        else if (check === "email") res = typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        else throw new Error(`Unknown is check '${check}'`);

        return expr.isNot ? !res : res;
    }

    evaluateReplace(expr, env) {
        const src = String(this.evaluate(expr.source, env));
        const rep = String(this.evaluate(expr.replacement, env));
        const patRaw = String(this.evaluate(expr.pattern, env));

        if (patRaw.startsWith("/") && patRaw.lastIndexOf("/") > 0) {
            const last = patRaw.lastIndexOf('/');
            const pattern = patRaw.substring(1, last);
            const flags = patRaw.substring(last + 1);

            const isSafePattern = this.verifySafeRegex(pattern);
            if (!isSafePattern) {
                if (!this.allowUnsafeRegexFallback) {
                    throw new Error("Runtime Error: Strict Regex Protection prevents processing this complex pattern.");
                }
                if (src.length > this.unsafeRegexMaxStringCeiling) {
                    throw new Error(`Runtime Error: Suspicious regex running on string size (${src.length}) exceeding your fallback structural safety limit of ${this.unsafeRegexMaxStringCeiling} characters.`);
                }
            } else {
                if (src.length > 50000) throw new Error("Runtime Error: replace source string too large (ReDoS protection).");
            }

            try {
                const regex = new RegExp(pattern, flags);
                return src.replace(regex, rep);
            } catch (e) { throw new Error(`Runtime Error: Invalid regular expression in replace: ${e.message}`); }
        }
        return src.replaceAll(patRaw, rep);
    }

    evaluateCast(expr, env) {
        const val = this.evaluate(expr.value, env);
        const target = expr.targetType.name;
        const sourceType = this.getTypeName(val);

        if (sourceType === target) {
            return val;
        }

        if (target === "string") {
            if (sourceType === "map") throw new Error("Runtime Error: Cannot cast map to string.");
            if (Array.isArray(val)) return val.map(v => this.stringify(v)).join("");
            return this.stringify(val);
        }

        if (target === "number") {
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (typeof val === 'string') {
                const n = parseFloat(val);
                if (isNaN(n)) throw new Error("Runtime Error: Could not cast string to number.");
                return n;
            }
            throw new Error(`Runtime Error: Cannot cast ${sourceType} to number.`);
        }

        if (target === "bool") {
            if (typeof val === 'string') {
                if (val === "true" || val === "1") return true;
                if (val === "false" || val === "0") return false;
                const n = parseFloat(val);
                if (!isNaN(n)) return n !== 0;
                throw new Error("Runtime Error: Could not cast string to bool.");
            }
            if (typeof val === 'number') return val !== 0;
            if (typeof val === 'boolean') return val;

            throw new Error(`Runtime Error: Cannot cast ${sourceType} to bool.`);
        }

        if (target === "list") {
            if (typeof val === "string") return val.split('');
            if (Array.isArray(val)) return val;
            throw new Error(`Runtime Error: Cannot cast ${sourceType} to list.`);
        }

        return val;
    }

    evaluateBinary(expr, env) {
        const left = this.evaluate(expr.left, env);
        if (expr.operator === "and") return this.isTruthy(left) && this.isTruthy(this.evaluate(expr.right, env));
        if (expr.operator === "or") return this.isTruthy(left) || this.isTruthy(this.evaluate(expr.right, env));
        if (expr.operator === "??") return left !== null ? left : this.evaluate(expr.right, env);

        if (expr.operator === "xor") {
            const right = this.evaluate(expr.right, env);
            return this.isTruthy(left) !== this.isTruthy(right);
        }

        const right = this.evaluate(expr.right, env);
        if (expr.operator === "+") {
            if (typeof left === "number" && typeof right === "number") return left + right;
            if (typeof left === "string" && typeof right === "string") return left + right;
            throw new Error(`Runtime Error: Type Mismatch. Cannot add ${typeof left} and ${typeof right}.`);
        }
        if (expr.operator === "-") return left - right;
        if (expr.operator === "*") return left * right;
        if (expr.operator === "/") { if (right === 0) throw new Error("Runtime Error: Division by zero."); return left / right; }
        if (expr.operator === "%") { if (right === 0) throw new Error("Runtime Error: Modulo by zero."); return left % right; }
        if (expr.operator === "^") return Math.pow(left, right);
        if (expr.operator === "&") return this.stringify(left) + this.stringify(right);
        if (expr.operator === "==") return left === right;
        if (expr.operator === "!=") return left !== right;
        if (expr.operator === "<") return left < right;
        if (expr.operator === ">") return left > right;
        if (expr.operator === "<=") return left <= right;
        if (expr.operator === ">=") return left >= right;

        if (expr.operator === "contains") {
            if (Array.isArray(left) || typeof left === 'string') return left.includes(right);
            throw new Error("Runtime Error: 'contains' requires a list or string.");
        }
        if (expr.operator === "has") {
            if (left instanceof Map) {
                if (typeof right !== 'string') throw new Error("Runtime Error: 'has' check requires a string key.");
                return left.has(right);
            }
            throw new Error("Runtime Error: 'has' operator only works on maps.");
        }
        if (expr.operator === "matches") {
            const str = String(left); const reg = String(right);
            const l = reg.lastIndexOf('/');
            const pattern = reg.substring(1, l);
            const flags = reg.substring(l + 1);

            const isSafePattern = this.verifySafeRegex(pattern);

            if (!isSafePattern) {
                if (!this.allowUnsafeRegexFallback) {
                    throw new Error("Runtime Error: Strict Regex Protection prevents processing this complex pattern.");
                }
                if (str.length > this.unsafeRegexMaxStringCeiling) {
                    throw new Error(`Runtime Error: Suspicious regex running on string size (${str.length}) exceeding your fallback structural safety limit of ${this.unsafeRegexMaxStringCeiling} characters.`);
                }
            } else {
                if (str.length > 50000) throw new Error("Runtime Error: matches string too large (ReDoS protection).");
            }

            try {
                return new RegExp(pattern, flags).test(str);
            } catch (e) { throw new Error(`Runtime Error: Invalid regular expression in matches: ${e.message}`); }
        }

        if (expr.operator === "search") {
            const str = String(left); const regStr = String(right);
            const lastSlash = regStr.lastIndexOf('/');
            const pattern = regStr.substring(1, lastSlash);
            const flags = regStr.substring(lastSlash + 1);

            const isSafePattern = this.verifySafeRegex(pattern);

            if (!isSafePattern) {
                if (!this.allowUnsafeRegexFallback) {
                    throw new Error("Runtime Error: Strict Regex Protection prevents processing this complex pattern.");
                }
                if (str.length > this.unsafeRegexMaxStringCeiling) {
                    throw new Error(`Runtime Error: Suspicious regex running on string size (${str.length}) exceeding your fallback structural safety limit of ${this.unsafeRegexMaxStringCeiling} characters.`);
                }
            } else {
                if (str.length > 50000) throw new Error("Runtime Error: search string too large (ReDoS protection).");
            }

            let regex;
            try {
                regex = new RegExp(pattern, flags);
            } catch (e) { throw new Error(`Runtime Error: Invalid regular expression in search: ${e.message}`); }
            const results = [];
            let match;
            if (!regex.global) {
                match = regex.exec(str);
                if (match) {
                    const resMap = new Map();
                    resMap.__shift_type = "RegexResult";
                    resMap.set("match", match[0]);
                    resMap.set("start", match.index);
                    resMap.set("end", match.index + match[0].length);
                    resMap.set("groups", match.slice(1));
                    results.push(resMap);
                }
            } else {
                while ((match = regex.exec(str)) !== null) {
                    const resMap = new Map();
                    resMap.__shift_type = "RegexResult";
                    resMap.set("match", match[0]);
                    resMap.set("start", match.index);
                    resMap.set("end", match.index + match[0].length);
                    resMap.set("groups", match.slice(1));
                    results.push(resMap);
                }
            }
            return results;
        }

        throw new Error(`Unknown op ${expr.operator}`);
    }

    evaluateUnary(expr, env) {
        const val = this.evaluate(expr.argument, env);
        if (expr.operator === "not" || expr.operator === "!") return !this.isTruthy(val);
        if (expr.operator === "-") return -val;
        return null;
    }

    executeDelete(stmt, env) {
        const t = stmt.target;
        const obj = this.evaluate(t.object, env);
        const idx = this.evaluate(t.index, env);

        if (obj instanceof Map) {
            if (!obj.has(idx)) throw new Error("Runtime Error: Map key does not exist.");
            obj.delete(idx);
        } else if (Array.isArray(obj)) {
            if (!Number.isInteger(idx)) throw new Error("Runtime Error: List index must be integer value.");
            if (idx < 0) throw new Error("Runtime Error: List index must not be a negative number.");
            if (idx >= obj.length) throw new Error("Runtime Error: List index is out of bounds.");
            obj.splice(idx, 1);
        } else {
            throw new Error("Cannot delete");
        }
    }

    isTruthy(val) {
        return val !== null && val !== false && val !== 0;
    }
}