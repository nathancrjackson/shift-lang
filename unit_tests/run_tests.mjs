import { UnitTestHandler } from './unit_test_handler.mjs';

import { lexer_tests } from './test_groups/lexer_tests.mjs';
import { function_tests } from './test_groups/function_tests.mjs';
import { variable_tests } from './test_groups/variable_tests.mjs';
import { stringmanipulation_tests } from './test_groups/stringmanipulation_tests.mjs';
import { boolean_tests } from './test_groups/boolean_tests.mjs';
import { if_tests } from './test_groups/if_tests.mjs';
import { pipe_tests } from './test_groups/pipe_tests.mjs';
import { comparison_tests } from './test_groups/comparison_tests.mjs';
import { math_tests } from './test_groups/math_tests.mjs';
import { casting_tests } from './test_groups/casting_tests.mjs';
import { while_tests } from './test_groups/while_tests.mjs';
import { for_tests } from './test_groups/for_tests.mjs';
import { nullable_tests } from './test_groups/nullable_tests.mjs';
import { list_tests } from './test_groups/list_tests.mjs';
import { map_tests } from './test_groups/map_tests.mjs';
import { inspection_tests } from './test_groups/inspection_tests.mjs';
import { bytepacking_tests } from './test_groups/bytepacking_tests.mjs';
import { trycatchreview_tests } from './test_groups/trycatchreview_tests.mjs';

import { structs_tests } from './test_groups/structs_tests.mjs';
import { regex_tests } from './test_groups/regex_tests.mjs';
import { syntax_tests } from './test_groups/syntax_tests.mjs';
import { complex_tests } from './test_groups/complex_tests.mjs';

const test_suite = new UnitTestHandler();

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
test_suite.addgroup('List', list_tests);
test_suite.addgroup('Map', map_tests);
test_suite.addgroup('Inspection', inspection_tests);
test_suite.addgroup('Byte Packing', bytepacking_tests);
test_suite.addgroup('Try Catch Review', trycatchreview_tests);
test_suite.addgroup('Structs', structs_tests);
test_suite.addgroup('Regex', regex_tests);
test_suite.addgroup('Syntax', syntax_tests);
test_suite.addgroup('Complex', complex_tests);

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
    debugData.forEach((value, key) => {
        if (value.success == false)
        {
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
}