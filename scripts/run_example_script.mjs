import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeShift, Lexer, Parser } from '../dist/shift_lib.mjs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the process runs in the script's directory so relative paths in Shift (like read_file("users.json")) resolve correctly
const demoScriptDir = path.join(__dirname, 'demo_script');
process.chdir(demoScriptDir);

// Load the Shift source file
const demoScriptPath = path.join(demoScriptDir, 'demo.shift');
const source = fs.readFileSync(demoScriptPath, 'utf-8');

// Initialize the NodeShift engine (which includes filesystem access & standard library)
const engine = new NodeShift();

try {
    // 1. Lexer
    const lexer = new Lexer(source);
    const lexResult = lexer.tokenize();
    if (lexResult.errors.length > 0) {
        throw new Error(`Lexer Error: ${lexResult.errors[0].message}`);
    }

    // 2. Parser
    const parser = new Parser(lexResult.tokens, engine.importResolver);

    // Load structs and intrinsics definitions into parser
    engine._loadStructs(parser);
    engine._loadIntrinsics(parser);

    // Load function signatures from standard library AST
    if (engine.stdLibAST) {
        engine.stdLibAST.functions.forEach(func => {
            parser.defineVariable(func.name, {
                type: "Type",
                name: func.returnType.name,
                initialized: true
            });
        });
    }

    parser.preScan();
    const parseResult = parser.parse();
    if (parseResult.errors.length > 0) {
        throw new Error(`Parser Error: ${parseResult.errors[0].message}`);
    }

    // 3. Tree Shaking / Linking
    const finalAST = parseResult.ast;
    if (engine.stdLibAST) {
        engine.stdLibAST.functions.forEach(func => {
            if (parser.usedFunctions.has(func.name)) {
                finalAST.functions.push(func);
            }
        });
    }

    // 4. Dump the AST to file before running the code
    const astOutputPath = path.join(demoScriptDir, '../demo_ast_stree.json');
    fs.writeFileSync(astOutputPath, JSON.stringify(finalAST, null, 2));
    console.log("AST successfully written to ast_stree.json");

    console.log("Running demo.shift...");

    // 5. Run the compiled AST using executeAST
    const result = engine.executeAST(finalAST, "main", []);
    console.log("Execution finished successfully with result code:", result);
    process.exit(result);
} catch (err) {
    console.error("Execution failed:", err.message);
    process.exit(1);
}

