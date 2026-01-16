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
};