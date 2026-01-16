/* -----

For loops tests

----- */

export const for_tests = {
    "Basic number range":
    {
        "tests": [{ call:"exampleof_forrange()", type: "string", expect: "012345" }],
        "code":
`function exampleof_forrange() string {
    string result;
    for (t_minus in 0 to 5) {
        result = result & t_minus;
    }
    return result;
}`
    }
,
    "Decending number range":
    {
        "tests": [{ call:"exampleof_forrange()", type: "string", expect: "543210" }],
        "code":
`function exampleof_forrange() string {
    string result;
    for (t_minus in 5 to 0) {
        result = result & t_minus;
    }
    return result;
}`
    }
,
    "Break and Skip":
    {
        "tests": [
            { call: "find_value(-10)", type: "bool", expect: false },
            { call: "find_value(0)", type: "bool", expect: false },
            { call: "find_value(50)", type: "bool", expect: true },
            { call: "find_value(101)", type: "bool", expect: false }
        ],
        "code":
`function find_value(number item_number) bool {
    list<number> items = [0, 50, 100];
    bool found;
    for (item in items) {
        if (item == 0) {
            skip;
        }
        
        if (item == item_number) {
            found = true;
            break;
        }
    }
    return found;
}`
    }
,
    "Break outside of loop error":
    {
        "tests": [{ type: "parser_error", expect: "'break' can only be used inside a loop." }],
        "code":
`function bad_break() none {
    break; // Error!
}`
    }
};