import { Lexer } from './lexer.mjs';
import { Parser } from './parser.mjs';
import { Runtime } from './runtime.mjs';
import { StandardLibrary } from './standard_library.mjs';
import { ShiftEngineError, ShiftLexerError, ShiftParserError } from './errors.mjs';
import { logger } from './logger.mjs';
import { validateAST as validateASTFunc } from './ast_validator.mjs';

export { validateASTFunc as validateAST };

/**
 * Main Orchestration Interface for the Shift Language.
 * Manages Standard Library loading, compilation, tree shaking, and runtime execution.
 */
export class Shift {
    /**
     * @param {string|null} [stdLibCode=null] - Custom standard library code (Shift). Pass null to use default.
     * @param {Object|null} [stdLibIntrinsics=null] - Custom intrinsics map. Pass null to use default.
     * @param {Object|number} [options={}] - Options object (e.g., importResolver) or maxInstructions integer.
     * @throws {ShiftEngineError} If input arguments are invalid.
     */
    constructor(stdLibCode = null, stdLibIntrinsics = null, options = {}) {
        // Guard clauses
        if (stdLibCode !== null && typeof stdLibCode !== 'string') {
            throw new ShiftEngineError("stdLibCode must be null or a string.");
        }
        if (stdLibIntrinsics !== null && typeof stdLibIntrinsics !== 'object') {
            throw new ShiftEngineError("stdLibIntrinsics must be null or an object.");
        }
        if (typeof options !== 'number' && (options === null || typeof options !== 'object')) {
            throw new ShiftEngineError("options must be a number or an object.");
        }

        if (typeof options === 'number') {
            this.maxInstructions = options;
            this.importResolver = null;
        } else {
            this.maxInstructions = options.maxInstructions !== undefined ? options.maxInstructions : 0;
            this.importResolver = options.importResolver || null;
        }

        this.stdLibAST = null;
        this.stdLibErrors = [];

        // If stdLibIntrinsics is provided, use it. Otherwise use the default.
        const baseIntrinsics = stdLibIntrinsics !== null ? stdLibIntrinsics : StandardLibrary.intrinsics;
        this.intrinsics = new Map(Object.entries(baseIntrinsics));

        this._initStandardLibrary(stdLibCode);
    }

    /**
     * Registers a new intrinsic function for use in scripts.
     * @param {string} name - Function name.
     * @param {Object} definition - { returnType: string, generic?: string, func: Function }
     */
    registerIntrinsic(name, definition) {
        if (typeof name !== 'string') {
            throw new ShiftEngineError("Intrinsic name must be a string.");
        }
        if (!definition || typeof definition !== 'object') {
            throw new ShiftEngineError("Intrinsic definition must be an object.");
        }
        this.intrinsics.set(name, definition);
    }

    /**
     * Compiles standard library Shift source code.
     * @param {string|null} stdLibCode - Standard library Shift code.
     * @private
     */
    _initStandardLibrary(stdLibCode) {
        // Use provided code or default to StandardLibrary.source
        const source = stdLibCode !== null ? stdLibCode : StandardLibrary.source;

        // Compile the Standard Library (Shift code part) once during initialization
        const stdLexer = new Lexer(source);
        const stdTokens = stdLexer.tokenize().tokens;
        const stdParser = new Parser(stdTokens, this.importResolver, new Set(), "stdlib.shift");

        // Load Definitions manually (Structs + Active Intrinsics)
        this._loadStructs(stdParser);
        this._loadIntrinsics(stdParser);

        // Scan and parse
        stdParser.preScan();
        const result = stdParser.parse();

        this.stdLibAST = result.ast;
        this.stdLibErrors = result.errors;

        if (this.stdLibErrors.length > 0) {
            console.error("Shift Internal Error: Standard Library failed to compile.");
            this.stdLibErrors.forEach(e => console.error(`Line ${e.line}: ${e.message}`));
        }
    }

    /**
     * Load standard library structs definitions into a Parser instance.
     * @param {Parser} parser - Target parser instance.
     * @private
     */
    _loadStructs(parser) {
        StandardLibrary.structs.forEach(s => {
            parser.knownTypes.add(s.name);

            const fields = s.fields.map(f => {
                let typeObj = { type: "Type", name: f.type, generic: null };
                if (f.generic) {
                    typeObj.generic = { type: "Type", name: f.generic, generic: null };
                }
                if (f.type === "nullable" && f.generic) {
                    typeObj = {
                        type: "Type",
                        name: "nullable",
                        generic: { type: "Type", name: f.generic, generic: null }
                    };
                }
                return { name: f.name, type: typeObj };
            });

            parser.structDefinitions.set(s.name, { fields });
        });
    }

    /**
     * Load standard library intrinsics definitions into a Parser instance.
     * @param {Parser} parser - Target parser instance.
     * @private
     */
    _loadIntrinsics(parser) {
        for (const [name, def] of this.intrinsics) {
            let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true };
            if (def.generic) {
                typeObj.generic = { type: "Type", name: def.generic, generic: null };
            }
            parser.defineVariable(name, typeObj);
        }
    }

    /**
     * Load active intrinsics functions into a Runtime instance.
     * @param {Runtime} runtime - Target runtime instance.
     * @private
     */
    _loadIntrinsicsIntoRuntime(runtime) {
        for (const [name, def] of this.intrinsics) {
            runtime.addIntrinsic(name, def.func);
        }
    }

    /**
     * Executes a Shift script.
     * @param {string} sourceCode - The Shift source code.
     * @param {string} [entryPoint="main"] - The name of the function to call.
     * @param {Array} [args=[]] - Arguments to pass to the entry point function.
     * @returns {*} The return value of the executed function.
     * @throws {ShiftEngineError} If input arguments are invalid.
     * @throws {ShiftLexerError} If lexing fails.
     * @throws {ShiftParserError} If parsing fails.
     */
    run(sourceCode, entryPoint = "main", args = [], filePath = null) {
        // Guard clauses
        if (typeof sourceCode !== 'string') {
            throw new ShiftEngineError("sourceCode must be a string.");
        }
        if (typeof entryPoint !== 'string') {
            throw new ShiftEngineError("entryPoint must be a string.");
        }
        if (!Array.isArray(args)) {
            throw new ShiftEngineError("args must be an array.");
        }

        if (this.stdLibErrors.length > 0) {
            throw new ShiftEngineError("Cannot run script due to internal Standard Library errors.");
        }

        logger.trace("SHIFT", "Starting compilation and execution", { entryPoint });

        // 1. Lexer
        const lexer = new Lexer(sourceCode);
        const lexResult = lexer.tokenize();

        if (lexResult.errors.length > 0) {
            const firstError = lexResult.errors[0];
            const line = firstError.line || firstError.endline || firstError.startline;
            throw new ShiftLexerError(firstError.message, line);
        }

        // 2. Parser
        const parser = new Parser(lexResult.tokens, this.importResolver, new Set(), filePath);

        // A. Load Definitions
        this._loadStructs(parser);
        this._loadIntrinsics(parser);

        // B. Load Signatures from StdLib AST (functions written in Shift)
        if (this.stdLibAST) {
            this.stdLibAST.functions.forEach(func => {
                parser.defineVariable(func.name, {
                    type: "Type",
                    name: func.returnType.name,
                    initialized: true
                });
            });
        }

        // C. Parse User Code
        parser.preScan();
        const parseResult = parser.parse();

        if (parseResult.errors.length > 0) {
            const firstError = parseResult.errors[0];
            throw new ShiftParserError(firstError.message, firstError.line, firstError.token);
        }

        // 3. Tree Shaking / Linking
        // Merge used Standard Library functions into the User AST
        const finalAST = parseResult.ast;

        if (this.stdLibAST) {
            this.stdLibAST.functions.forEach(func => {
                if (parser.usedFunctions.has(func.name)) {
                    finalAST.functions.push(func);
                }
            });
        }

        this.finalAST = finalAST;

        // 4. Runtime Initialization
        const runtime = new Runtime(finalAST);
        runtime.maxInstructions = this.maxInstructions;

        // Load Intrinsic Implementations
        this._loadIntrinsicsIntoRuntime(runtime);

        // 5. Execution
        try {
            const result = runtime.runFunction(entryPoint, args);
            logger.trace("SHIFT", "Execution completed successfully");
            return result;
        } catch (e) {
            // Ensure runtime errors are propagated cleanly
            throw e;
        }
    }

    /**
     * Executes a precompiled Shift AST.
     * @param {Object} ast - The precompiled Shift AST object.
     * @param {string} [entryPoint="main"] - The name of the function to call.
     * @param {Array} [args=[]] - Arguments to pass to the entry point function.
     * @param {boolean} [validateAST=true] - Whether to validate the AST structure against the schema.
     * @returns {*} The return value of the executed function.
     * @throws {ShiftEngineError} If input arguments are invalid or AST validation fails.
     */
    executeAST(ast, entryPoint = "main", args = [], validateAST = true) {
        // Guard clauses
        if (!ast || typeof ast !== 'object') {
            throw new ShiftEngineError("ast must be an object.");
        }
        if (typeof entryPoint !== 'string') {
            throw new ShiftEngineError("entryPoint must be a string.");
        }
        if (!Array.isArray(args)) {
            throw new ShiftEngineError("args must be an array.");
        }
        if (typeof validateAST !== 'boolean') {
            throw new ShiftEngineError("validateAST must be a boolean.");
        }

        if (this.stdLibErrors.length > 0) {
            throw new ShiftEngineError("Cannot run AST due to internal Standard Library errors.");
        }

        logger.trace("SHIFT", "Starting executeAST execution", { entryPoint, validateAST });

        // 1. Optional AST validation
        if (validateAST) {
            try {
                validateASTFunc(ast);
            } catch (e) {
                throw new ShiftEngineError(`AST Validation Error: ${e.message}`);
            }
        }

        // 2. Runtime Initialization
        const runtime = new Runtime(ast);
        runtime.maxInstructions = this.maxInstructions;

        // Load Intrinsic Implementations
        this._loadIntrinsicsIntoRuntime(runtime);

        // 3. Execution
        try {
            const result = runtime.runFunction(entryPoint, args);
            logger.trace("SHIFT", "executeAST completed successfully");
            return result;
        } catch (e) {
            if (e instanceof ShiftEngineError) {
                let msg = e.message || "";
                if (!msg.startsWith("[Runtime]") && !msg.startsWith("[Lexer]") && !msg.startsWith("[Parser]")) {
                    msg = `[Runtime] ${msg}`;
                }
                const trace = runtime.getStackTrace();
                if (trace) {
                    msg = `${msg}\nStack trace:\n${trace}`;
                }
                e.message = msg;
                throw e;
            } else {
                let msg = e.message || String(e);
                if (!msg.startsWith("[Runtime]")) {
                    msg = `[Runtime] ${msg}`;
                }
                const trace = runtime.getStackTrace();
                if (trace) {
                    msg = `${msg}\nStack trace:\n${trace}`;
                }
                const newErr = new ShiftRuntimeError(msg);
                newErr.stack = e.stack;
                throw newErr;
            }
        }
    }
}