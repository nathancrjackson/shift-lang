/* -----

Comparison tests

----- */

export const comparison_tests = {
    "Simple bool":
    {
        "tests": [
            { call:"do_test(true)", type: "number", expect: 1 },
            { call:"do_test(false)", type: "number", expect: 100 }
        ],
        "code":

`function do_test(bool some_check) number
{
    if (some_check == true)
    {
        return 1;
    }
    return 100;
}`
    }
,
    "Comparing bool to string error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot compare different types: bool and string" }],
        "code":

`function do_test(bool some_check) number
{
    if (some_check == "true")
    {
        return 1;
    }
    return 100;
}`
    }
,
    "String is whitespace comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: true },
            { call:"do_test(\" \")", type: "bool", expect: true },
            { call:"do_test(\"\t\")", type: "bool", expect: true },
            { call:"do_test(\"\n\")", type: "bool", expect: true },
            { call:"do_test(\"\r\")", type: "bool", expect: true },
            { call:"do_test(\" \n \")", type: "bool", expect: true },
            { call:"do_test(\"\t  \t\")", type: "bool", expect: true },
            { call:"do_test(\" Hello \")", type: "bool", expect: false }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is whitespace;
}`
    }
,
    "String is not whitespace comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: false },
            { call:"do_test(\" \")", type: "bool", expect: false },
            { call:"do_test(\"\t\")", type: "bool", expect: false },
            { call:"do_test(\"\n\")", type: "bool", expect: false },
            { call:"do_test(\"\r\")", type: "bool", expect: false },
            { call:"do_test(\" \n \")", type: "bool", expect: false },
            { call:"do_test(\"\t  \t\")", type: "bool", expect: false },
            { call:"do_test(\" Hello \")", type: "bool", expect: true }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is not whitespace;
}`
    }
,
    "String is bool comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: false },
            { call:"do_test(\" \")", type: "bool", expect: false },
            { call:"do_test(\"0\")", type: "bool", expect: true },
            { call:"do_test(\"1\")", type: "bool", expect: true },
            { call:"do_test(\"true\")", type: "bool", expect: false },
            { call:"do_test(\"false\")", type: "bool", expect: false },
            { call:"do_test(\"yes\")", type: "bool", expect: false },
            { call:"do_test(\"no\")", type: "bool", expect: false }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is bool;
}`
    }
,
    "String is not bool comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: true },
            { call:"do_test(\" \")", type: "bool", expect: true },
            { call:"do_test(\"0\")", type: "bool", expect: false },
            { call:"do_test(\"1\")", type: "bool", expect: false },
            { call:"do_test(\"true\")", type: "bool", expect: true },
            { call:"do_test(\"false\")", type: "bool", expect: true },
            { call:"do_test(\"yes\")", type: "bool", expect: true },
            { call:"do_test(\"no\")", type: "bool", expect: true }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is not bool;
}`
    }
,
    "String is number comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: false },
            { call:"do_test(\" \")", type: "bool", expect: false },
            { call:"do_test(\"0\")", type: "bool", expect: true },
            { call:"do_test(\"1\")", type: "bool", expect: true },
            { call:"do_test(\"-1\")", type: "bool", expect: true },
            { call:"do_test(\"-1.1\")", type: "bool", expect: true },
            { call:"do_test(\"true\")", type: "bool", expect: false },
            { call:"do_test(\"false\")", type: "bool", expect: false },
            { call:"do_test(\"yes\")", type: "bool", expect: false },
            { call:"do_test(\"no\")", type: "bool", expect: false }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is number;
}`
    }
,
    "String is not number comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: true },
            { call:"do_test(\" \")", type: "bool", expect: true },
            { call:"do_test(\"0\")", type: "bool", expect: false },
            { call:"do_test(\"1\")", type: "bool", expect: false },
            { call:"do_test(\"-1\")", type: "bool", expect: false },
            { call:"do_test(\"-1.1\")", type: "bool", expect: false },
            { call:"do_test(\"true\")", type: "bool", expect: true },
            { call:"do_test(\"false\")", type: "bool", expect: true },
            { call:"do_test(\"yes\")", type: "bool", expect: true },
            { call:"do_test(\"no\")", type: "bool", expect: true }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is not number;
}`
    }
,
    "String is integer comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: false },
            { call:"do_test(\" \")", type: "bool", expect: false },
            { call:"do_test(\"0\")", type: "bool", expect: true },
            { call:"do_test(\"1\")", type: "bool", expect: true },
            { call:"do_test(\"-1\")", type: "bool", expect: true },
            { call:"do_test(\"-1.1\")", type: "bool", expect: false },
            { call:"do_test(\"true\")", type: "bool", expect: false },
            { call:"do_test(\"false\")", type: "bool", expect: false },
            { call:"do_test(\"yes\")", type: "bool", expect: false },
            { call:"do_test(\"no\")", type: "bool", expect: false }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is integer;
}`
    }
,
    "String is not integer comparison":
    {
        "tests": [
            { call:"do_test(\"\")", type: "bool", expect: true },
            { call:"do_test(\" \")", type: "bool", expect: true },
            { call:"do_test(\"0\")", type: "bool", expect: false },
            { call:"do_test(\"1\")", type: "bool", expect: false },
            { call:"do_test(\"-1\")", type: "bool", expect: false },
            { call:"do_test(\"-1.1\")", type: "bool", expect: true },
            { call:"do_test(\"true\")", type: "bool", expect: true },
            { call:"do_test(\"false\")", type: "bool", expect: true },
            { call:"do_test(\"yes\")", type: "bool", expect: true },
            { call:"do_test(\"no\")", type: "bool", expect: true }
        ],
        "code":

`function do_test(string some_str) bool
{
    return some_str is not integer;
}`
    }
};