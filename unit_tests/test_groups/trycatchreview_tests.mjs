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

return 10;
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
    }
}