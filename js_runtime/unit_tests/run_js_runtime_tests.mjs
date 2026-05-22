import { UnitTestHandler } from './unit_test_handler.mjs';

import { lexer_tests } from './test_modules/lexer_tests.mjs';
import { function_tests } from './test_modules/function_tests.mjs';
import { variable_tests } from './test_modules/variable_tests.mjs';
import { stringmanipulation_tests } from './test_modules/stringmanipulation_tests.mjs';
import { boolean_tests } from './test_modules/boolean_tests.mjs';
import { if_tests } from './test_modules/if_tests.mjs';
import { pipe_tests } from './test_modules/pipe_tests.mjs';
import { comparison_tests } from './test_modules/comparison_tests.mjs';
import { math_tests } from './test_modules/math_tests.mjs';
import { casting_tests } from './test_modules/casting_tests.mjs';
import { while_tests } from './test_modules/while_tests.mjs';
import { for_tests } from './test_modules/for_tests.mjs';
import { nullable_tests } from './test_modules/nullable_tests.mjs';
import { any_tests } from './test_modules/any_tests.mjs';
import { list_tests } from './test_modules/list_tests.mjs';
import { map_tests } from './test_modules/map_tests.mjs';
import { inspection_tests } from './test_modules/inspection_tests.mjs';
import { bytepacking_tests } from './test_modules/bytepacking_tests.mjs';
import { trycatchreview_tests } from './test_modules/trycatchreview_tests.mjs';

import { structs_tests } from './test_modules/structs_tests.mjs';
import { regex_tests } from './test_modules/regex_tests.mjs';
import { syntax_tests } from './test_modules/syntax_tests.mjs';
import { strict_intrinsics_tests } from './test_modules/strict_intrinsics_tests.mjs';
import { import_tests } from './test_modules/import_tests.mjs';
import { complex_tests } from './test_modules/complex_tests.mjs';
import { file_tests } from './test_modules/file_tests.mjs';

const test_suite = new UnitTestHandler();

/*
*/
test_suite.addgroup('Lexer', lexer_tests);
test_suite.addgroup('Function', function_tests);
test_suite.addgroup('Variable', variable_tests);
test_suite.addgroup('Boolean', boolean_tests);
test_suite.addgroup('If', if_tests);
test_suite.addgroup('Comparisons', comparison_tests);
test_suite.addgroup('String Manipulation', stringmanipulation_tests);
test_suite.addgroup('Pipes', pipe_tests);
test_suite.addgroup('Math', math_tests);
test_suite.addgroup('Casting', casting_tests);
test_suite.addgroup('While', while_tests);
test_suite.addgroup('For', for_tests);
test_suite.addgroup('Nullable', nullable_tests);
test_suite.addgroup('Any', any_tests);
test_suite.addgroup('List', list_tests);
test_suite.addgroup('Map', map_tests);
test_suite.addgroup('Inspection', inspection_tests);
test_suite.addgroup('Byte Packing', bytepacking_tests);
test_suite.addgroup('Try Catch Review', trycatchreview_tests);
test_suite.addgroup('Structs', structs_tests);
test_suite.addgroup('Regex', regex_tests);
test_suite.addgroup('Syntax', syntax_tests);
test_suite.addgroup('Strict Intrinsics', strict_intrinsics_tests);
test_suite.addgroup('Imports', import_tests);
test_suite.addgroup('Complex', complex_tests);
test_suite.addgroup('Filesystem', file_tests);
/*
*/

const debugData = test_suite.run();

let focusOnTest = '';
//focusOnTest = "Function: Basic";

if (focusOnTest != '' && debugData.has(focusOnTest)) {
    const value = debugData.get(focusOnTest);

    console.warn(`\n--- TEST DATA [${focusOnTest}] ---`)
    console.log("Token Count:", value.tokens.length);
    if (value.ast)
    {
        console.log("AST Function Nodes:",  value.ast.functions.length);
        console.log("AST Struct Nodes:", value.ast.structs.length);
    }
    else { console.log("No AST"); }
    console.log(value);
    console.log("--- The AST- --")
    console.log(JSON.stringify(value.ast, null, 4));
    console.log(`\n`);
}
else
{
    let anyFailed = false;
    debugData.forEach((value, key) => {
        if (value.success == false)
        {
            anyFailed = true;
            console.warn(`\n--- FAILED TEST [${key}] ---`)
            console.log("Token Count:", value.tokens.length);
            if (value.ast)
            {
                console.log("AST Function Nodes:",  value.ast.functions.length);
                console.log("AST Struct Nodes:", value.ast.structs.length);
            }
            else { console.log("No AST"); }
            console.log(value);
            console.log(`\n`);
        }
    });
    if (anyFailed) {
        process.exit(1);
    }
}

// --- Direct Safety / Robustness Assertions ---
import { StandardLibrary } from '../src/standard_library.mjs';

console.log("\nRunning direct JavaScript runtime safety tests...");

// 1. circular reference serialization check
const circularMap = new Map();
circularMap.set("self", circularMap);
try {
    const jsObj = StandardLibrary.intrinsics.convert_map_to_jsonstring.func([circularMap]);
    // JSON.stringify of circular structure will throw a standard circular error
    // but the toJS function should NOT stack overflow!
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
    // StandardLibrary.loadIntrinsics wraps the function, let's mock runtime to load it
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
import { Shift } from '../src/shift.mjs';
import { NodeShift } from '../src/node_fs.mjs';
import fs from 'fs';
import path from 'path';

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

console.log("All tests passed successfully!");