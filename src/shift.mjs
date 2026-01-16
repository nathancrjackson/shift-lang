import { Lexer } from './lexer.mjs';
import { Parser } from './parser.mjs';
import { Runtime } from './runtime.mjs';
import { StandardLibrary } from './standard_library.mjs';

export class Shift {
    constructor() {
        this.stdLibAST = null;
        this.stdLibErrors = [];
        this._initStandardLibrary();
    }

    _initStandardLibrary() {
        // Compile the Standard Library (Shift code part) once during initialization
        const stdLexer = new Lexer(StandardLibrary.source);
        const stdTokens = stdLexer.tokenize().tokens;
        const stdParser = new Parser(stdTokens);

        // Load definitions so the stdlib parser understands its own types/intrinsics
        StandardLibrary.loadDefinitions(stdParser);
        
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
        const parser = new Parser(lexResult.tokens);
        
        // A. Load Definitions (Structs & Intrinsic Signatures)
        StandardLibrary.loadDefinitions(parser);

        // B. Load Signatures from StdLib AST (functions written in Shift)
        // This ensures the parser knows about functions like 'get_stringlength' for type checking
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
        
        // Load Intrinsic Implementations (Native JS functions)
        StandardLibrary.loadIntrinsics(runtime);

        // 5. Execution
        try {
            return runtime.runFunction(entryPoint, args);
        } catch (e) {
            // Ensure runtime errors are propagated cleanly
            throw e;
        }
    }
}