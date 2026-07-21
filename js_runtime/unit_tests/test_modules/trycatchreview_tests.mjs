/* -----

Try,catch,review tests

----- */

export const trycatchreview_tests = {
    "Basic": {
        "tests": [{ call:"start()", type: "number", expect: 10}],
        "code":
`function start() number
{
    number result = 0;

    try {
        result = 10;
    }
    catch {
        return -1;
    }
    review {
        return -2;
    }

return result;
}`
    },
    "Try with only Catch": {
        "tests": [{ call:"start()", type: "number", expect: 10}],
        "code":
`function start() number
{
    number result = 0;

    try {
        result = 10;
    }
    catch {
        return -1;
    }

return result;
}`
    },
    "Try with only review": {
        "tests": [{ call:"start()", type: "number", expect: 10}],
        "code":
`function start() number
{
    number result = 0;

    try {
        result = 10;
    }
    review {
        return -2;
    }

return result;
}`
    },
    "No catch or review after Try error": {
        "tests": [{ type: "parser_error", expect: "Expect 'catch' or 'review' after try block."}],
        "code":
`function start() number
{
    number result = 0;

    try {
        result = 10;
    }

return result;
}`
    },
    "Critical error": {
        "tests": [{ call:"start()", type: "runtime_error", expect: "Stop everything failure!"}],
        "code":
`function start() number
{
    number result = 0;

    try {
        throw critical "Stop everything failure!";
    }
    catch {
        return -1;
    }
    review {
        return -2;
    }

return 10;
}`
    },
    "Catch runtime error": {
        "tests": [{ call:"start()", type: "number", expect: -1}],
        "code":
`function start() number
{
    number result = 0;

    try {
        divide_number(0, 0);
    }
    catch {
        return -1;
    }
    review {
        return -2;
    }

return 10;
}

function divide_number(number dividend, number divisor) number {
     return dividend / divisor;
}`
    },
    "Catch thrown error": {
        "tests": [{ call:"start()", type: "number", expect: -1}],
        "code":
`function start() number
{
    number result = 0;

    try {
        throw error "Ohhhh no no no no no no no no!";
    }
    catch {
        return -1;
    }
    review {
        return -2;
    }

return 10;
}`
    },
    "Catch thrown alert": {
        "tests": [{ call:"start()", type: "number", expect: -2}],
        "code":
`function start() number
{
    number result = 0;

    try {
        throw alert "Ahh check this out?";
    }
    catch {
        return -1;
    }
    review {
        return -2;
    }

return 10;
}`
    },
    "Catch thrown error message": {
        "tests": [{ call:"start()", type: "string", expect: "Caught: \"Ohhhh no no no no no no no no!\""}],
        "code":
`function start() string
{
    try {
        throw error "Ohhhh no no no no no no no no!";
    }
    catch {
        return "Caught: \\"" & $thrown_message & "\\"";
    }
    review {
        return "Review: \\"" & $thrown_message & "\\"";
    }

return "All okay here";
}`
    },
    "Catch thrown alert message": {
        "tests": [{ call:"start()", type: "string", expect: "Review: \"Ahh check this out?\""}],
        "code":
`function start() string
{
    try {
        throw alert "Ahh check this out?";
    }
    catch {
        return "Caught: \\"" & $thrown_message & "\\"";
    }
    review {
        return "Review: \\"" & $thrown_message & "\\"";
    }

return "All okay here";
}`
    },
    "Nested thrown error message": {
        "tests": [{ call:"start()", type: "string", expect: "Caught: \"Ohhhh no no no no no no no no!\""}],
        "code":
`function start() string
{
    try {
        try {
            throw error "Ohhhh no no no no no no no no!";
        }
        catch {
            return "Caught: \\"" & $thrown_message & "\\"";
        }
        review {
            return "Review: \\"" & $thrown_message & "\\"";
        }
    }
    catch {
        return "Wrong - Caught: \\"" & $thrown_message & "\\"";
    }
    review {
        return "Wrong - Review: \\"" & $thrown_message & "\\"";
    }

return "All okay here";
}`
    },
    "Nested thrown alert message": {
        "tests": [{ call:"start()", type: "string", expect: "Review: \"Ahh check this out?\""}],
        "code":
`function start() string
{
    try {
        try {
            throw alert "Ahh check this out?";
        }
        catch {
            return "Caught: \\"" & $thrown_message & "\\"";
        }
        review {
            return "Review: \\"" & $thrown_message & "\\"";
        }
    }
    catch {
        return "Wrong - Caught: \\"" & $thrown_message & "\\"";
    }
    review {
        return "Wrong - Review: \\"" & $thrown_message & "\\"";
    }

return "All okay here";
}`
    },
    "Nested thrown error message missing and going back": {
        "tests": [{ call:"start()", type: "string", expect: "Caught: \"Ohhhh no no no no no no no no!\""}],
        "code":
`function start() string
{
    try {
        try {
            throw error "Ohhhh no no no no no no no no!";
        }
        review {
            return "Review: \\"" & $thrown_message & "\\"";
        }
    }
    catch {
        return "Caught: \\"" & $thrown_message & "\\"";
    }
    review {
        return "Wrong - Review: \\"" & $thrown_message & "\\"";
    }

return "All okay here";
}`
    },
    "Nested thrown alert message missing and going back": {
        "tests": [{ call:"start()", type: "string", expect: "Review: \"Ahh check this out?\""}],
        "code":
`function start() string
{
    try {
        try {
            throw alert "Ahh check this out?";
        }
        catch {
            return "Caught: \\"" & $thrown_message & "\\"";
        }
    }
    catch {
        return "Wrong - Caught: \\"" & $thrown_message & "\\"";
    }
    review {
        return "Review: \\"" & $thrown_message & "\\"";
    }

return "All okay here";
}`
    },
    "Local error introspection magic variables": {
        "tests": [
            { call: "start()", type: "number", expect: 26 },
            { call: "get_source()", type: "string", expect: "main.shift" },
            { call: "get_stack()", type: "string", expect: "  at divide_number() (Line 26)\n  at get_stack() (Line 18)" }
        ],
        "code":
`function start() number {
    try {
        divide_number(0, 0);
    } catch {
        return $error_line;
    }
    return 0;
}
function get_source() string {
    try {
        divide_number(0, 0);
    } catch {
        return $error_source;
    }
    return "";
}
function get_stack() string {
    try {
        divide_number(0, 0);
    } catch {
        return $error_stack;
    }
    return "";
}
function divide_number(number a, number b) number {
    return a / b;
}`
    },
    "Introspection in review block": {
        "tests": [
            { call: "start()", type: "number", expect: 3 },
            { call: "get_source()", type: "string", expect: "main.shift" },
            { call: "get_stack()", type: "string", expect: "  at get_stack() (Line 19)" }
        ],
        "code":
`function start() number {
    try {
        throw alert "warning!";
    } review {
        return $error_line;
    }
    return 0;
}
function get_source() string {
    try {
        throw alert "warning!";
    } review {
        return $error_source;
    }
    return "";
}
function get_stack() string {
    try {
        throw alert "warning!";
    } review {
        return $error_stack;
    }
    return "";
}`
    },
    "Uncaught runtime exception traceback": {
        "tests": [
            { call: "start()", type: "runtime_error", expect: "[Runtime] Division by zero.\nStack trace:\n  at divide_number() (Line 5)\n  at start() (Line 2)" }
        ],
        "code":
`function start() number {
    return divide_number(10, 0);
}
function divide_number(number a, number b) number {
    return a / b;
}`
    }
}