/* -----

Math tests

----- */

export const math_tests = {
    "Addition tests":
    {
        "tests": [
            { call:"do_math(0, 0)", type: "number", expect: 0 },
            { call:"do_math(1, 1)", type: "number", expect: 2 },
            { call:"do_math(0.11, 0.22)", type: "number", expect: 0.33 },
            { call:"do_math(-1, -1)", type: "number", expect: -2 }
        ],
        "code":
`function do_math(number a, number b) number {
    return a + b;
}`
    }
,
    "Subtraction tests":
    {
        "tests": [
            { call:"do_math(0, 0)", type: "number", expect: 0 },
            { call:"do_math(1, 2)", type: "number", expect: -1 },
            { call:"do_math(0.11, 0.22)", type: "number", expect: -0.11 },
            { call:"do_math(-1, -2)", type: "number", expect: 1 }
        ],
        "code":
`function do_math(number a, number b) number {
    return a - b;
}`
    }
,
    "Multiplication tests":
    {
        "tests": [
            { call:"do_math(10, 0)", type: "number", expect: 0 },
            { call:"do_math(1, 2)", type: "number", expect: 2 },
            { call:"do_math(0.11, 0.22)", type: "number", expect: 0.0242 },
            { call:"do_math(1, -2)", type: "number", expect: -2 },
            { call:"do_math(-1, -2)", type: "number", expect: 2 }
        ],
        "code":
`function do_math(number a, number b) number {
    return a * b;
}`
    }
,
    "Basic division tests":
    {
        "tests": [
            { call:"do_math(1, 2)", type: "number", expect: 0.5 },
            { call:"do_math(0.22, 0.11)", type: "number", expect: 2 },
            { call:"do_math(1, -2)", type: "number", expect: -0.5 },
            { call:"do_math(-1, -2)", type: "number", expect: 0.5 }
        ],
        "code":
`function do_math(number a, number b) number {
    return a / b;
}`
    }
,
    "Explicit divide by zero error":
    {
        "tests": [{ type: "parser_error", expect: "Explicit attempt to divide by zero" }],
        "code": `function div() number { return 10 / 0; }`
    }
,
    "Divide by zero error":
    {
        "tests": [{ call: "div(0)", type: "runtime_error", expect: "Runtime Error: Division by zero." }],
        "code": `function div(number the_divisor) number { return 10 / the_divisor; }`
    }
,
    "Modulus tests":
    {
        "tests": [
            { call:"do_math(1, 2)", type: "number", expect: 1 },
            { call:"do_math(10.5, -3)", type: "number", expect: 1.5 },
            { call:"do_math(-10.5, -3)", type: "number", expect: -1.5 }
        ],
        "code":
`function do_math(number a, number b) number {
    return a % b;
}`
    }
,
    "Explicit modulus by zero error":
    {
        "tests": [{ type: "parser_error", expect: "Explicit attempt to modulus by zero" }],
        "code": `function div() number { return 10 % 0; }`
    }
,
    "Divide by modulus error":
    {
        "tests": [{ call: "div(0)", type: "runtime_error", expect: "Runtime Error: Modulo by zero." }],
        "code": `function div(number the_divisor) number { return 10 % the_divisor; }`
    }
,
    "Complex order":
    {
        "tests": [{ call:"sillyhalve_number(10)", type: "number", expect: 5 }],
        "code":
`function sillyhalve_number(number the_dividend) number {
    number result = 1 + the_dividend / 2 + 1;
    return 1 + (result - 3);
}`
    }
};