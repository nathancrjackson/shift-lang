import { Lexer } from './lexer.mjs';
import { Parser } from './parser.mjs';
import { Runtime } from './runtime.mjs';
import { StandardLibrary } from './standard_library.mjs';

export class Shift {
    /**
     * @param {string|null} stdLibCode - Custom standard library code (Shift). Pass null to use default.
     * @param {Object|null} stdLibIntrinsics - Custom intrinsics map. Pass null to use default StandardLibrary.intrinsics.
     * @param {Object|number} options - Options object (e.g., importResolver) or maxInstructions integer for backward compatibility.
     */
    constructor(stdLibCode = null, stdLibIntrinsics = null, options = {}) {
        if (typeof options === 'number') {
            this.maxInstructions = options;
            this.importResolver = null;
        } else {
            this.maxInstructions = options.maxInstructions !== undefined ? options.maxInstructions : 1000000;
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
        this.intrinsics.set(name, definition);
    }

    _initStandardLibrary(stdLibCode) {
        // Use provided code or default to StandardLibrary.source
        const source = stdLibCode !== null ? stdLibCode : StandardLibrary.source;

        // Compile the Standard Library (Shift code part) once during initialization
        const stdLexer = new Lexer(source);
        const stdTokens = stdLexer.tokenize().tokens;
        const stdParser = new Parser(stdTokens, this.importResolver);

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

    _loadIntrinsics(parser) {
        for (const [name, def] of this.intrinsics) {
            let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true };
            if (def.generic) {
                typeObj.generic = { type: "Type", name: def.generic, generic: null };
            }
            parser.defineVariable(name, typeObj);
        }
    }

    _loadIntrinsicsIntoRuntime(runtime) {
        for (const [name, def] of this.intrinsics) {
            runtime.addIntrinsic(name, def.func);
        }
    }

    /**
     * Executes a Shift script.
     * @param {string} sourceCode - The Shift source code.
     * @param {string} entryPoint - The name of the function to call (default: "main").
     * @param {Array} args - Arguments to pass to the entry point function.
     * @returns {*} The return value of the executed function.
     */
    run(sourceCode, entryPoint = "main", args = []) {
        if (this.stdLibErrors.length > 0) {
            throw new Error("Cannot run script due to internal Standard Library errors.");
        }

        // 1. Lexer
        const lexer = new Lexer(sourceCode);
        const lexResult = lexer.tokenize();

        if (lexResult.errors.length > 0) {
            const firstError = lexResult.errors[0];
            const line = firstError.line || firstError.endline || firstError.startline;
            throw new Error(`Lexer Error: ${firstError.message} (Line ${line})`);
        }

        // 2. Parser
        const parser = new Parser(lexResult.tokens, this.importResolver);

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
            throw new Error(`Parser Error: ${firstError.message} (Line ${firstError.line})`);
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

        // 4. Runtime Initialization
        const runtime = new Runtime(finalAST);
        runtime.maxInstructions = this.maxInstructions;

        // Load Intrinsic Implementations
        this._loadIntrinsicsIntoRuntime(runtime);

        // 5. Execution
        try {
            return runtime.runFunction(entryPoint, args);
        } catch (e) {
            // Ensure runtime errors are propagated cleanly
            throw e;
        }
    }
}