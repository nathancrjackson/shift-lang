// Signals for control flow (internal use only)
class BreakSignal {}
class SkipSignal {}
class ReturnSignal {
    constructor(value) {
        this.value = value;
    }
}

// Exception types for Shift logic
class ShiftError extends Error { constructor(message) { super(message); } }
class ShiftAlert extends Error { constructor(message) { super(message); } }
class ShiftCritical extends Error { constructor(message) { super(message); } }

export class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.values = new Map();
    }

    define(name, value) {
        this.values.set(name, value);
    }

    get(name) {
        if (this.values.has(name)) {
            return this.values.get(name);
        }
        if (this.parent) {
            return this.parent.get(name);
        }
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

export class Runtime {
    constructor(ast) {
        this.ast = ast;
        this.globalEnv = new Environment();
        this.functions = new Map();
        this.intrinsics = new Map();
        
        this.loadFunctions();
        
        // NOTE: registerIntrinsics() removed. 
        // Use external StandardLibrary.loadIntrinsics(runtime) instead.

        // Global magic variables
        this.globalEnv.define("$line_num", 0);
    }

    addIntrinsic(name, func) {
        this.intrinsics.set(name, func);
    }

    loadFunctions() {
        for (const func of this.ast.functions) {
            this.functions.set(func.name, func);
        }
    }

    // Helper for Shift-specific string conversion (Bool -> "1"/"0")
    stringify(val) {
        if (typeof val === 'boolean') {
            return val ? "1" : "0";
        }
        return String(val);
    }

    getDefaultValue(typeInfo) {
        switch (typeInfo.name) {
            case "number": return 0;
            case "string": return "";
            case "bool":   return false;
            case "list":   return []; 
            case "map":    return new Map(); 
            case "null":   return null;
            case "none":   return null;
            case "nullable": return null;
            case "any":    return null; 
            default: return null; 
        }
    }

    deepCopy(value) {
        if (value === null) return null;
        if (typeof value !== 'object') return value;
        
        if (Array.isArray(value)) {
            return value.map(item => this.deepCopy(item));
        }
        
        if (value instanceof Map) {
            const newMap = new Map();
            for (const [k, v] of value) {
                newMap.set(k, this.deepCopy(v));
            }
            return newMap;
        }
        
        return value;
    }

    runFunction(name, args = []) {
        try {
            return this.callFunction(name, args);
        } catch (e) {
            throw e; 
        }
    }

    callFunction(name, args) {
        // 1. Check Intrinsics first
        if (this.intrinsics.has(name)) {
            return this.intrinsics.get(name)(args, this);
        }

        // 2. Check User Functions
        const func = this.functions.get(name);
        
        if (!func) {
            throw new Error(`Runtime Error: Function '${name}' not found.`);
        }

        if (args.length !== func.params.length) {
             throw new Error(`Runtime Error: Function '${name}' expects ${func.params.length} arguments but got ${args.length}.`);
        }

        const fnEnv = new Environment(this.globalEnv);

        for (let i = 0; i < func.params.length; i++) {
            const paramName = func.params[i].name;
            const paramValue = this.deepCopy(args[i]);
            fnEnv.define(paramName, paramValue);
        }

        let result = null;
        try {
            this.executeBlock(func.body.statements, fnEnv);
        } catch (e) {
            if (e instanceof ReturnSignal) {
                result = e.value;
            } else {
                throw e; 
            }
        }

        // 3. Strict Return Type Check
        if (func.returnType) {
            this.checkType(result, func.returnType);
        }

        return result; 
    }

    checkType(value, typeInfo) {
        if (typeInfo.name === 'any') return;
        
        if (value === null) {
            if (typeInfo.name === 'nullable' || typeInfo.name === 'null' || typeInfo.name === 'none') return;
            throw new Error(`Runtime Error: Return type mismatch.`);
        }

        if (typeInfo.name === 'nullable') {
            if (typeInfo.generic) {
                this.checkType(value, typeInfo.generic);
            }
            return;
        }

        // Structs are Maps at runtime
        if (typeInfo.type === 'StructType') {
             if (!(value instanceof Map)) throw new Error(`Runtime Error: Return type mismatch.`);
             return;
        }

        switch (typeInfo.name) {
            case 'string':
                if (typeof value !== 'string') throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'number':
                if (typeof value !== 'number') throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'bool':
                if (typeof value !== 'boolean') throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'list':
                if (!Array.isArray(value)) throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'map':
                if (!(value instanceof Map)) throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'none':
                if (value !== null) throw new Error(`Runtime Error: Return type mismatch.`);
                break;
        }
    }

    executeBlock(statements, env) {
        for (const stmt of statements) {
            this.executeStatement(stmt, env);
        }
    }

    executeStatement(stmt, env) {
        if (stmt.line) {
             try { this.globalEnv.assign("$line_num", stmt.line); } catch(e) {} 
        }

        switch (stmt.type) {
            case "Block":
                this.executeBlock(stmt.statements, new Environment(env));
                break;

            case "VariableDeclaration":
                this.handleVariableDeclaration(stmt, env);
                break;
            
            case "ExpressionStatement":
                this.evaluate(stmt.expression, env);
                break;

            case "IfStatement":
                this.executeIfStatement(stmt, env);
                break;

            case "WhileStatement":
                this.executeWhileStatement(stmt, env);
                break;

            case "ForRangeStatement":
                this.executeForRangeStatement(stmt, env);
                break;
            
            case "ForInStatement":
                this.executeForInStatement(stmt, env);
                break;

            case "BreakStatement":
                throw new BreakSignal();

            case "SkipStatement":
                throw new SkipSignal();

            case "ReturnStatement": {
                let retVal = null;
                if (stmt.value) {
                    retVal = this.evaluate(stmt.value, env);
                }
                throw new ReturnSignal(retVal);
            }

            case "ThrowStatement": {
                const message = this.evaluate(stmt.argument, env);
                if (stmt.severity === "alert") {
                    throw new ShiftAlert(message);
                } else if (stmt.severity === "critical") {
                    throw new ShiftCritical(message);
                } else {
                    throw new ShiftError(message);
                }
            }

            case "TryStatement":
                this.executeTryStatement(stmt, env);
                break;
            
            case "DeleteStatement":
                this.executeDeleteStatement(stmt, env);
                break;

            default:
                // console.warn(`Runtime: Unsupported statement type '${stmt.type}' skipped.`);
        }
    }

    executeTryStatement(stmt, env) {
        try {
            this.executeBlock(stmt.tryBlock.statements, new Environment(env));
        } catch (e) {
            if (e instanceof ShiftCritical) {
                throw e; // Critical errors bubble up immediately
            }
            else if (e instanceof ShiftAlert) {
                if (stmt.reviewBlock) {
                    const reviewEnv = new Environment(env);
                    reviewEnv.define(stmt.catchIdentifier, e.message);
                    this.executeBlock(stmt.reviewBlock.statements, reviewEnv);
                } else {
                    throw e;
                }
            }
            else if (e instanceof ShiftError || e instanceof Error) {
                const catchEnv = new Environment(env);
                catchEnv.define(stmt.catchIdentifier, e.message);
                this.executeBlock(stmt.catchBlock.statements, catchEnv);
            } else {
                throw e; 
            }
        }
    }

    executeDeleteStatement(stmt, env) {
        const target = stmt.target; 
        const container = this.evaluate(target.object, env);
        const index = this.evaluate(target.index, env);

        if (container instanceof Map) {
            if (typeof index !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
            if (!container.has(index)) throw new Error("Runtime Error: Map key does not exist.");
            container.delete(index);
        } else if (Array.isArray(container)) {
            if (typeof index !== 'number') throw new Error("Runtime Error: List index must be integer value.");
            if (index < 0) throw new Error("Runtime Error: List index must not be a negative number.");
            if (index >= container.length) throw new Error("Runtime Error: List index is out of bounds.");
            container.splice(index, 1);
        } else {
             throw new Error("Runtime Error: Cannot delete from this type.");
        }
    }

    executeIfStatement(stmt, env) {
        if (this.isTruthy(this.evaluate(stmt.condition, env))) {
            this.executeStatement(stmt.thenBranch, env);
        } else if (stmt.elseBranch) {
            this.executeStatement(stmt.elseBranch, env);
        }
    }

    executeWhileStatement(stmt, env) {
        while (this.isTruthy(this.evaluate(stmt.condition, env))) {
            try {
                this.executeStatement(stmt.body, env);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof SkipSignal) continue;
                throw e; 
            }
        }
    }

    executeForRangeStatement(stmt, env) {
        const start = this.evaluate(stmt.startValue, env);
        const end = this.evaluate(stmt.endValue, env);

        if (typeof start !== 'number' || typeof end !== 'number') {
            throw new Error("Runtime Error: Range values must be numbers.");
        }

        const step = start <= end ? 1 : -1;
        let current = start;
        const condition = () => (step > 0 ? current <= end : current >= end);

        while (condition()) {
            const loopEnv = new Environment(env);
            loopEnv.define(stmt.iterator, current);

            try {
                this.executeStatement(stmt.body, loopEnv);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof SkipSignal) {
                    current += step;
                    continue;
                }
                throw e; 
            }

            current += step;
        }
    }

    executeForInStatement(stmt, env) {
        const collection = this.evaluate(stmt.collection, env);
        
        let iterable = [];

        if (Array.isArray(collection)) {
            iterable = collection;
        } else if (collection instanceof Map) {
            iterable = Array.from(collection.keys());
        } else {
            throw new Error(`Runtime Error: Cannot iterate over type '${typeof collection}'.`);
        }

        for (const item of iterable) {
            const loopEnv = new Environment(env);
            loopEnv.define(stmt.iterator, item);

            try {
                this.executeStatement(stmt.body, loopEnv);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof SkipSignal) continue;
                throw e; 
            }
        }
    }

    handleVariableDeclaration(stmt, env) {
        if (stmt.name.startsWith('$')) {
             throw new Error(`Runtime Error: Cannot declare magic variable '${stmt.name}'.`);
        }

        let value;
        if (stmt.initializer) {
            value = this.evaluate(stmt.initializer, env);
        } else {
            value = this.getDefaultValue(stmt.varType);
        }
        env.define(stmt.name, value);
    }

    evaluate(expr, env) {
        switch (expr.type) {
            case "Literal":
                return expr.value;
            
            case "MagicVariable":
                if (expr.name === "$pipe_value") {
                    return env.get("$pipe_value");
                }
                if (expr.name === "$line_num") {
                    // Fix: Use the line number from the expression if available
                    if (expr.line) {
                        return expr.line;
                    }
                    // Fallback to statement-level tracking (e.g. for implicit usage)
                    return this.globalEnv.get("$line_num");
                }
                return env.get(expr.name);

            case "ListLiteral":
                return expr.elements.map(e => this.evaluate(e, env));

            case "MapLiteral": {
                const map = new Map();
                for (const entry of expr.entries) {
                    const key = this.evaluate(entry.key, env);
                    const val = this.evaluate(entry.value, env);
                    map.set(key, val);
                }
                return map;
            }

            case "Grouping":
                return this.evaluate(expr.expression, env);

            case "Variable":
                return env.get(expr.name);

            case "Assignment": {
                if (expr.name.startsWith('$')) {
                    throw new Error(`Runtime Error: Cannot assign to magic variable '${expr.name}'.`);
                }
                const value = this.evaluate(expr.value, env);
                env.assign(expr.name, value);
                return value;
            }

            case "IndexAssignment": {
                const container = this.evaluate(expr.object, env);
                const value = this.evaluate(expr.value, env);
                
                if (container === null) throw new Error("Runtime Error: Cannot assign to null.");

                if (Array.isArray(container)) {
                    if (expr.index === null) {
                        container.push(value);
                        return value;
                    }
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

            case "IndexExpression": {
                const container = this.evaluate(expr.object, env);
                const index = this.evaluate(expr.index, env);

                if (container === null) throw new Error("Runtime Error: Cannot read properties of null.");

                if (Array.isArray(container)) {
                    if (typeof index !== 'number' || !Number.isInteger(index)) throw new Error("Runtime Error: List index must be integer value.");
                    if (index < 0) throw new Error("Runtime Error: List index must not be a negative number.");
                    if (index >= container.length) throw new Error("Runtime Error: List index is out of bounds.");
                    return container[index];
                }

                if (container instanceof Map) {
                    if (typeof index !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
                    if (!container.has(index)) throw new Error("Runtime Error: Map key does not exist.");
                    return container.get(index);
                }
                throw new Error("Runtime Error: Invalid index target.");
            }

            case "CallExpression": {
                const args = expr.arguments.map(arg => this.evaluate(arg, env));
                return this.callFunction(expr.callee, args);
            }
            
            case "PipelineExpression": {
                const leftVal = this.evaluate(expr.left, env);
                env.define("$pipe_value", leftVal); 
                return this.evaluate(expr.right, env);
            }

            case "BinaryExpression":
                return this.evaluateBinary(expr, env);

            case "UnaryExpression":
                return this.evaluateUnary(expr, env);

            case "CastExpression":
                return this.evaluateCast(expr, env);

            case "InspectExpression":
                return this.evaluateInspect(expr, env);

            case "PackExpression":
                return String.fromCharCode(...this.evaluate(expr.argument, env));

            case "UnpackExpression":
                return String(this.evaluate(expr.argument, env)).split('').map(c => c.charCodeAt(0));

            case "SizeOfExpression":
                return this.evaluateSizeOf(expr, env);

            case "TypeOfExpression":
                return this.evaluateTypeOf(expr, env);
            
            default:
                throw new Error(`Runtime Error: Unsupported expression type '${expr.type}' in Task 6.`);
        }
    }

    evaluateCast(expr, env) {
        const val = this.evaluate(expr.value, env);
        const targetType = expr.targetType.name;

        if (targetType === "string") {
            if (Array.isArray(val)) {
                // Join list elements into a single string
                return val.map(v => this.stringify(v)).join("");
            }
            return this.stringify(val);
        }
        if (targetType === "number") {
            if (typeof val === 'boolean') return val ? 1 : 0;
            const n = parseFloat(val);
            if (isNaN(n)) throw new Error("Runtime Error: Could not cast string to number");
            return n;
        }
        if (targetType === "bool") {
             if (typeof val === 'string') {
                 if (val === "true") return true;
                 if (val === "false") return false;
                 const n = parseFloat(val);
                 if (!isNaN(n)) return n !== 0;
                 throw new Error("Runtime Error: Could not cast string to bool");
             }
             return Boolean(val);
        }
        if (targetType === "list" && typeof val === "string") {
            return val.split(''); // Explicit string to list support for get_stringlength
        }
        return val; 
    }

    evaluateInspect(expr, env) {
        const val = this.evaluate(expr.argument, env);
        const map = new Map();
        let type = "any";
        let size = null;
        
        if (val === null) { type = "null"; }
        else if (Array.isArray(val)) { 
            type = "list"; 
            size = val.length; 
        }
        else if (val instanceof Map) { 
            type = "map"; 
            size = val.size; 
        }
        else if (typeof val === 'number') { type = "number"; }
        else if (typeof val === 'string') { 
            type = "string"; 
            size = val.length;
        } 
        else if (typeof val === 'boolean') { type = "bool"; }
        
        // Ensure keys match InspectionResult struct
        map.set("$type", type);
        map.set("$size", size);
        return map;
    }

    evaluateSizeOf(expr, env) {
        const val = this.evaluate(expr.argument, env);
        if (Array.isArray(val)) return val.length;
        if (val instanceof Map) return val.size;
        if (typeof val === 'string') return val.length;
        throw new Error("Runtime Error: Cannot get size of primitive types"); 
    }

    evaluateTypeOf(expr, env) {
        const val = this.evaluate(expr.argument, env);
        if (val === null) return "null";
        if (Array.isArray(val)) return "list";
        if (val instanceof Map) return "map";
        if (typeof val === 'number') return "number";
        if (typeof val === 'string') return "string";
        if (typeof val === 'boolean') return "bool";
        return "any";
    }

    evaluateBinary(expr, env) {
        const left = this.evaluate(expr.left, env);
        
        if (expr.operator === "and") {
            if (!this.isTruthy(left)) return false;
            return this.isTruthy(this.evaluate(expr.right, env));
        }
        if (expr.operator === "or") {
            if (this.isTruthy(left)) return true;
            return this.isTruthy(this.evaluate(expr.right, env));
        }
        if (expr.operator === "xor") {
            const right = this.evaluate(expr.right, env);
            return this.isTruthy(left) !== this.isTruthy(right);
        }

        const right = this.evaluate(expr.right, env);

        if (expr.operator === "has") {
             if (left instanceof Map) {
                 if (typeof right !== 'string') throw new Error("Runtime Error: 'has' check requires a string key.");
                 return left.has(right);
             }
             throw new Error("Runtime Error: 'has' operator only works on maps.");
        }

        if (expr.operator === "search") {
            const str = String(left);
            const regexStr = String(right); 
            const lastSlash = regexStr.lastIndexOf('/');
            if (lastSlash <= 0) throw new Error("Runtime Error: Invalid regex format.");
            const pattern = regexStr.substring(1, lastSlash);
            const flags = regexStr.substring(lastSlash + 1);
            
            let regex;
            try { regex = new RegExp(pattern, flags); } 
            catch(e) { throw new Error("Runtime Error: Invalid regular expression."); }

            const results = [];
            let match;
            
            if (!regex.global) {
                match = regex.exec(str);
                if (match) {
                     const resMap = new Map();
                     resMap.set("match", match[0]);
                     resMap.set("start", match.index);
                     resMap.set("end", match.index + match[0].length);
                     resMap.set("groups", match.slice(1));
                     results.push(resMap);
                }
            } else {
                while ((match = regex.exec(str)) !== null) {
                    const resMap = new Map();
                    resMap.set("match", match[0]);
                    resMap.set("start", match.index);
                    resMap.set("end", match.index + match[0].length);
                    resMap.set("groups", match.slice(1));
                    results.push(resMap);
                }
            }
            return results;
        }

        switch (expr.operator) {
            case "+": return left + right;
            case "-": return left - right;
            case "*": return left * right;
            case "/": 
                if (right === 0) throw new Error("Runtime Error: Division by zero.");
                return left / right;
            case "%": 
                if (right === 0) throw new Error("Runtime Error: Modulo by zero.");
                return left % right;
            case "==": return left === right;
            case "!=": return left !== right;
            case "<":  return left < right;
            case ">":  return left > right;
            case "<=": return left <= right;
            case ">=": return left >= right;
            case "&":  return this.stringify(left) + this.stringify(right);
            default:
                throw new Error(`Runtime Error: Unknown operator '${expr.operator}'`);
        }
    }

    evaluateUnary(expr, env) {
        const val = this.evaluate(expr.argument, env);

        switch (expr.operator) {
            case "-": return -val;
            case "not":
            case "!": return !this.isTruthy(val);
            default:
                throw new Error(`Runtime Error: Unknown unary operator '${expr.operator}'`);
        }
    }

    isTruthy(value) {
        if (value === null) return false;
        if (value === false) return false;
        if (value === 0) return false; 
        return true;
    }
}