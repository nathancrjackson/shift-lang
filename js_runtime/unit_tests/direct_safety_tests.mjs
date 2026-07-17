import fs from 'fs';
import path from 'path';
import { StandardLibrary } from '../src/standard_library.mjs';
import { Shift } from '../src/shift.mjs';
import { NodeShift } from '../src/node_fs.mjs';
import { ShiftEngineError, ShiftValidationError, ShiftLexerError, ShiftParserError, ShiftRuntimeError } from '../src/errors.mjs';
import { validateAST } from '../src/ast_validator.mjs';
import { Lexer } from '../src/lexer.mjs';
import { Parser } from '../src/parser.mjs';
import { Runtime } from '../src/runtime.mjs';
import { resolveImportPath, readImportFile } from '../src/node_fs.mjs';

/**
 * Runs direct JavaScript-level safety, core mode, Node filesystem, and refactoring robustness tests.
 */
export function runDirectSafetyTests() {
    console.log("Running direct JavaScript runtime safety tests...");

    // 1. circular reference serialization check
    const circularMap = new Map();
    circularMap.set("self", circularMap);
    try {
        StandardLibrary.intrinsics.convert_map_to_jsonstring.func([circularMap]);
        console.log("✓ [PASS] toJS circular reference recursion check (did not stack overflow)");
    } catch (e) {
        if (e.message.includes("circular") || e.message.includes("Circular")) {
            console.log("✓ [PASS] toJS circular reference recursion check (did not stack overflow)");
        } else {
            console.error("✗ [FAIL] toJS circular reference check failed with unexpected error:", e);
            process.exit(1);
        }
    }

    // 2. Intrinsic parameter count check (print_line with 0 args)
    try {
        const mockRuntime = {
            addIntrinsic: (name, func) => {
                if (name === "print_line") {
                    func([]); // Call with 0 args
                }
            }
        };
        StandardLibrary.loadIntrinsics(mockRuntime);
        console.error("✗ [FAIL] Intrinsic parameter count check: expected print_line to throw on missing args");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("Intrinsic 'print_line' expects 1 arguments")) {
            console.log("✓ [PASS] Intrinsic parameter count check (print_line threw expected error)");
        } else {
            console.error("✗ [FAIL] Intrinsic parameter count check failed with wrong error:", e);
            process.exit(1);
        }
    }

    // 3. generate_randomint_from_range NaN/Inf check
    try {
        StandardLibrary.intrinsics.generate_randomint_from_range.func([NaN, 10]);
        console.error("✗ [FAIL] generate_randomint_from_range: expected throw on NaN");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("Random range must be finite numbers")) {
            console.log("✓ [PASS] generate_randomint_from_range NaN validation");
        } else {
            console.error("✗ [FAIL] generate_randomint_from_range validation failed:", e);
            process.exit(1);
        }
    }

    try {
        StandardLibrary.intrinsics.generate_randomint_from_range.func([1, Infinity]);
        console.error("✗ [FAIL] generate_randomint_from_range: expected throw on Infinity");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("Random range must be finite numbers")) {
            console.log("✓ [PASS] generate_randomint_from_range Infinity validation");
        } else {
            console.error("✗ [FAIL] generate_randomint_from_range validation failed:", e);
            process.exit(1);
        }
    }

    // 4. convert_unixtime_to_datetime NaN check
    try {
        StandardLibrary.intrinsics.convert_unixtime_to_datetime.func([NaN]);
        console.error("✗ [FAIL] convert_unixtime_to_datetime: expected throw on NaN");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("Expected finite number")) {
            console.log("✓ [PASS] convert_unixtime_to_datetime NaN validation");
        } else {
            console.error("✗ [FAIL] convert_unixtime_to_datetime validation failed:", e);
            process.exit(1);
        }
    }

    // 5. convert_datetime_to_unixtime null/NaN field checks
    const badDt = new Map();
    badDt.__shift_type = "DateTime";
    badDt.set("year", null);
    badDt.set("month", 10);
    badDt.set("day", 15);
    badDt.set("hour", 12);
    badDt.set("minute", 30);
    badDt.set("second", 0);
    badDt.set("millisecond", 0);
    try {
        StandardLibrary.intrinsics.convert_datetime_to_unixtime.func([badDt]);
        console.error("✗ [FAIL] convert_datetime_to_unixtime: expected throw on null field");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("DateTime fields must be finite numbers")) {
            console.log("✓ [PASS] convert_datetime_to_unixtime null field validation");
        } else {
            console.error("✗ [FAIL] convert_datetime_to_unixtime field validation failed:", e);
            process.exit(1);
        }
    }

    console.log("All direct safety tests passed successfully!");

    // --- Core Mode & Filesystem Intrinsics Tests ---
    console.log("\nRunning Core Mode and Filesystem Intrinsics tests...");

    // Test 1: Core Mode default filesystem intrinsics disabled
    try {
        const shift = new Shift();
        shift.run(`
            function main() none {
                read_file("test.txt");
            }
        `);
        console.error("✗ [FAIL] Core mode: expected read_file to throw disabled error");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("read_file is disabled in core mode")) {
            console.log("✓ [PASS] Core mode: read_file throws disabled error");
        } else {
            console.error("✗ [FAIL] Core mode: unexpected read_file error:", e.message);
            process.exit(1);
        }
    }

    // Test 2: Core Mode default imports disabled
    try {
        const shift = new Shift();
        shift.run(`
            import "some_file.shift";
            function main() none {}
        `);
        console.error("✗ [FAIL] Core mode: expected import to throw disabled error");
        process.exit(1);
    } catch (e) {
        if (e.message.includes("Imports are disabled in core mode")) {
            console.log("✓ [PASS] Core mode: import throws disabled error");
        } else {
            console.error("✗ [FAIL] Core mode: unexpected import error:", e.message);
            process.exit(1);
        }
    }

    // Test 3: Core Mode custom resolver works
    try {
        const shift = new Shift(null, null, {
            importResolver: (requested) => `function test_func() string { return "custom"; }`
        });
        shift.run(`
            import "dummy.shift";
            function main() string {
                return test_func();
            }
        `);
        console.log("✓ [PASS] Core mode: custom importResolver works");
    } catch (e) {
        console.error("✗ [FAIL] Core mode: custom importResolver failed:", e.message);
        process.exit(1);
    }

    // Test 4: NodeShift standard filesystem intrinsics work
    const testFilePath = path.resolve("./test_temp_shift.txt");
    const testFolderPath = path.resolve("./test_temp_shift_folder");
    try {
        // Clean up if left over
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        if (fs.existsSync(testFolderPath)) fs.rmSync(testFolderPath, { recursive: true, force: true });

        const nodeShift = new NodeShift();

        // 1. Create file and file_exists
        nodeShift.run(`
            function main(string path) none {
                create_file(path);
            }
        `, "main", [testFilePath]);
        if (!fs.existsSync(testFilePath)) throw new Error("create_file did not create file");

        // 2. Write file and read file
        nodeShift.run(`
            function main(string path) none {
                write_file(path, "hello shift");
            }
        `, "main", [testFilePath]);
        const readVal = nodeShift.run(`
            function main(string path) string {
                return read_file(path);
            }
        `, "main", [testFilePath]);
        if (readVal !== "hello shift") throw new Error(`read_file got incorrect content: ${readVal}`);

        // 3. File exists check
        const exists = nodeShift.run(`
            function main(string path) bool {
                return file_exists(path);
            }
        `, "main", [testFilePath]);
        if (!exists) throw new Error("file_exists returned false for existing file");

        // 4. Copy and move file
        const copyPath = testFilePath + ".copy";
        nodeShift.run(`
            function main(string src, string dest) none {
                copy_file(src, dest);
            }
        `, "main", [testFilePath, copyPath]);
        if (!fs.existsSync(copyPath)) throw new Error("copy_file did not create copy");

        const movePath = testFilePath + ".moved";
        nodeShift.run(`
            function main(string src, string dest) none {
                move_file(src, dest);
            }
        `, "main", [copyPath, movePath]);
        if (fs.existsSync(copyPath)) throw new Error("move_file did not remove source file");
        if (!fs.existsSync(movePath)) throw new Error("move_file did not create destination file");

        // 5. Delete file
        nodeShift.run(`
            function main(string path) none {
                delete_file(path);
            }
        `, "main", [movePath]);
        if (fs.existsSync(movePath)) throw new Error("delete_file did not delete file");

        // 6. Create folder
        nodeShift.run(`
            function main(string path) none {
                create_folder(path);
            }
        `, "main", [testFolderPath]);
        if (!fs.existsSync(testFolderPath) || !fs.statSync(testFolderPath).isDirectory()) {
            throw new Error("create_folder did not create folder");
        }

        // 7. Folder exists
        const fExists = nodeShift.run(`
            function main(string path) bool {
                return folder_exists(path);
            }
        `, "main", [testFolderPath]);
        if (!fExists) throw new Error("folder_exists returned false for existing folder");

        // 8. Delete folder
        nodeShift.run(`
            function main(string path) none {
                delete_folder(path);
            }
        `, "main", [testFolderPath]);
        if (fs.existsSync(testFolderPath)) throw new Error("delete_folder did not delete folder");

        console.log("✓ [PASS] NodeShift: filesystem intrinsics verified successfully");
    } catch (e) {
        console.error("✗ [FAIL] NodeShift filesystem verification failed:", e);
        process.exit(1);
    } finally {
        // Final cleanup
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        if (fs.existsSync(testFolderPath)) fs.rmSync(testFolderPath, { recursive: true, force: true });
    }

    // --- Refactoring Safety & Robustness Tests ---
    console.log("\nRunning Refactoring Safety & Robustness tests...");

    // 1. validateAST: Null / invalid object check
    try {
        validateAST(null);
        console.error("✗ [FAIL] validateAST: expected throw on null node");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftValidationError && e.message.includes("AST root cannot be null or undefined")) {
            console.log("✓ [PASS] validateAST: null node validation");
        } else {
            console.error("✗ [FAIL] validateAST: null node check failed:", e);
            process.exit(1);
        }
    }

    try {
        validateAST("not-an-object");
        console.error("✗ [FAIL] validateAST: expected throw on non-object node");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftValidationError && e.message.includes("AST root must be an object")) {
            console.log("✓ [PASS] validateAST: non-object node validation");
        } else {
            console.error("✗ [FAIL] validateAST: non-object check failed:", e);
            process.exit(1);
        }
    }

    // 2. Lexer: constructor non-string check
    try {
        new Lexer(12345);
        console.error("✗ [FAIL] Lexer constructor: expected throw on non-string source");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftLexerError && e.message.includes("Lexer source must be a string")) {
            console.log("✓ [PASS] Lexer constructor: non-string source validation");
        } else {
            console.error("✗ [FAIL] Lexer constructor check failed:", e);
            process.exit(1);
        }
    }

    // 3. Parser: constructor input checks
    try {
        new Parser("not-an-array");
        console.error("✗ [FAIL] Parser constructor: expected throw on non-array tokens");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftParserError && e.message.includes("Parser construction requires an array of tokens")) {
            console.log("✓ [PASS] Parser constructor: non-array tokens validation");
        } else {
            console.error("✗ [FAIL] Parser constructor check failed:", e);
            process.exit(1);
        }
    }

    try {
        new Parser([], null, "not-a-set");
        console.error("✗ [FAIL] Parser constructor: expected throw on non-Set importedFiles");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftParserError && e.message.includes("Parser construction requires importedFiles to be a Set")) {
            console.log("✓ [PASS] Parser constructor: non-Set importedFiles validation");
        } else {
            console.error("✗ [FAIL] Parser constructor check failed:", e);
            process.exit(1);
        }
    }

    // 4. Runtime: constructor non-object AST check
    try {
        new Runtime(null);
        console.error("✗ [FAIL] Runtime constructor: expected throw on null AST");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftRuntimeError && e.message.includes("Runtime constructor requires a valid AST object")) {
            console.log("✓ [PASS] Runtime constructor: null AST validation");
        } else {
            console.error("✗ [FAIL] Runtime constructor check failed:", e);
            process.exit(1);
        }
    }

    // 5. node_fs: resolveImportPath / readImportFile input checks
    try {
        resolveImportPath(null);
        console.error("✗ [FAIL] resolveImportPath: expected throw on null requestedPath");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftRuntimeError && e.message.includes("requestedPath must be a string")) {
            console.log("✓ [PASS] resolveImportPath: invalid requestedPath validation");
        } else {
            console.error("✗ [FAIL] resolveImportPath check failed:", e);
            process.exit(1);
        }
    }

    try {
        readImportFile("/some/path", "not-a-function");
        console.error("✗ [FAIL] readImportFile: expected throw on non-function reader");
        process.exit(1);
    } catch (e) {
        if (e instanceof ShiftRuntimeError && e.message.includes("fsReader must be a function")) {
            console.log("✓ [PASS] readImportFile: invalid fsReader validation");
        } else {
            console.error("✗ [FAIL] readImportFile check failed:", e);
            process.exit(1);
        }
    }

    // --- executeAST Tests ---
    console.log("\nRunning executeAST API tests...");
    try {
        const shift = new Shift();
        // Compile a simple program to get a valid AST
        const source = `
            function main(number x) number {
                return x + 5;
            }
        `;
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize().tokens;
        const parser = new Parser(tokens);
        shift._loadStructs(parser);
        shift._loadIntrinsics(parser);
        const parsed = parser.parse();
        const ast = parsed.ast;

        // A. Run executeAST with valid AST (validateAST = true by default)
        const resultDefault = shift.executeAST(ast, "main", [10]);
        if (resultDefault !== 15) {
            throw new Error(`executeAST with default validation expected 15, got ${resultDefault}`);
        }
        console.log("✓ [PASS] executeAST: valid AST execution (default validation)");

        // B. Run executeAST with valid AST (validateAST = false explicitly)
        const resultNoVal = shift.executeAST(ast, "main", [20], false);
        if (resultNoVal !== 25) {
            throw new Error(`executeAST with validateAST = false expected 25, got ${resultNoVal}`);
        }
        console.log("✓ [PASS] executeAST: valid AST execution (disabled validation)");

        // C. Run executeAST with malformed AST (validateAST = true should throw)
        const malformedAST = {
            type: "Program",
            structs: [],
            functions: [
                {
                    type: "FunctionDeclaration",
                    name: "main",
                    params: [],
                    returnType: { type: "Type", name: "number" },
                    body: {
                        type: "Block"
                        // Missing start/end/line/statements, which validateAST requires!
                    }
                }
            ]
        };
        try {
            shift.executeAST(malformedAST, "main", [], true);
            console.error("✗ [FAIL] executeAST: expected validation to throw on malformed AST");
            process.exit(1);
        } catch (e) {
            if (e instanceof ShiftEngineError && e.message.includes("AST Validation Error")) {
                console.log("✓ [PASS] executeAST: malformed AST throws ShiftEngineError under validation");
            } else {
                console.error("✗ [FAIL] executeAST: malformed AST threw unexpected error:", e);
                process.exit(1);
            }
        }

        // D. Run executeAST with malformed AST (validateAST = false should skip validation)
        // Note: The execution might fail inside runtime due to missing statements, but the validator was skipped.
        // We can check that it throws a Runtime Error or a standard Error instead of "AST Validation Error".
        try {
            shift.executeAST(malformedAST, "main", [], false);
            console.error("✗ [FAIL] executeAST: expected runtime to fail on execute, but validation should have been bypassed");
            process.exit(1);
        } catch (e) {
            if (e.message.includes("AST Validation Error")) {
                console.error("✗ [FAIL] executeAST: validation was not bypassed when validateAST = false");
                process.exit(1);
            } else {
                console.log("✓ [PASS] executeAST: malformed AST bypassed validator when validateAST = false (failed at execution/runtime level)");
            }
        }
    } catch (e) {
        console.error("✗ [FAIL] executeAST verification tests failed:", e);
        process.exit(1);
    }

    console.log("All safety and robustness tests passed successfully!");
}
