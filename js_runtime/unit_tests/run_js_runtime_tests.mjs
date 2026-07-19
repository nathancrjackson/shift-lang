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
import { reference_tests } from './test_modules/reference_tests.mjs';
import { complex_tests } from './test_modules/complex_tests.mjs';
import { file_tests } from './test_modules/file_tests.mjs';

import { runDirectSafetyTests } from './direct_safety_tests.mjs';

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
test_suite.addgroup('Share/Transfer References', reference_tests);
test_suite.addgroup('Complex', complex_tests);
test_suite.addgroup('Filesystem', file_tests);

const debugData = test_suite.run();

const showAllDebug = false;

if (showAllDebug) {
    const value = debugData.get('String Manipulation: Slice End Out of bounds');
    console.log(value);
    console.log("--- The AST- --")
    console.log(JSON.stringify(value.ast, null, 4));
    console.log(`\n`);
}
else {
    let anyFailed = false;
    debugData.forEach((value, key) => {
        if (value.success == false) {
            anyFailed = true;
            console.warn(`\n--- FAILED TEST [${key}] ---`)
            console.log("Token Count:", value.tokens.length);
            if (value.ast) {
                console.log("AST Function Nodes:", value.ast.functions.length);
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

// --- Run Direct JavaScript & Filesystem Verification Tests ---
runDirectSafetyTests();

console.log("All tests passed successfully!");