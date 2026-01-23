/* -----

Boolean Evaluation Tests

----- */

export const boolean_tests = {
    "Evaluation":
    {
        "tests": [{ call:"start()", type: "bool", expect: true}],
        "code": `function start() bool { return true or false and false; }`
    }
,
    "Niche Evaluation":
    {
        "tests": [{ call:"start()", type: "bool", expect: false}],
        "code": `function start() bool { return true xor not false; }`
    }
,
    "Wrong Not Error":
    {
        "tests": [{ type: "parser_error", expect: "Expect expression."}],
        "code": `function start() bool { return !false; }`
    }
,
    "Return type checking error":
    {
        "tests": [{ type: "parser_error", expect: "Return type mismatch." }],
        "code": `function start() bool { return 100; }`
    }
};