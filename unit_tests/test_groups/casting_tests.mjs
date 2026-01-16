/* -----

Variable casting tests

----- */

export const casting_tests = {
    "Primatives to boolean":
    {
        "tests": [
            { call:"convertto_bool(true)", type: "bool", expect: true },
            { call:"convertto_bool(99)", type: "bool", expect: true },
            { call:"convertto_bool(-20.5)", type: "bool", expect: true },
            { call:"convertto_bool(\"-20.5\")", type: "bool", expect: true },
            { call:"convertto_bool(\"Value\")", type: "runtime_error", expect: "Runtime Error: Could not cast string to bool" }
        ],
        "code":
`function convertto_bool(any some_variable) bool {
    return some_variable as bool;
}`
    }
,
    "Primatives to number":
    {
        "tests": [
            { call:"convertto_number(true)", type: "number", expect: 1 },
            { call:"convertto_number(99)", type: "number", expect: 99 },
            { call:"convertto_number(\"-20.5\")", type: "number", expect: -20.5 },
            { call:"convertto_number(\"Value\")", type: "runtime_error", expect: "Runtime Error: Could not cast string to number" }
        ],
        "code":
`function convertto_number(any some_variable) number {
    return some_variable as number;
}`
    }
,
    "Primatives to string":
    {
        "tests": [
            { call:"convertto_string(true)", type: "string", expect: "1" },
            { call:"convertto_string(99)", type: "string", expect: "99" },
            { call:"convertto_string(\"Value\")", type: "string", expect: "Value" }
        ],
        "code":
`function convertto_string(any some_variable) string {
    return some_variable as string;
}`
    }
,
    "String to list and back again":
    {
        "tests": [
            { call:"convertto_string(\"Value\")", type: "string", expect: "Value" }
        ],
        "code":
`function convertto_string(string some_variable) string {
    list<string> exploded = some_variable as list<string>;
    return exploded as string;
}`
    }
,
    "Bool to list error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from bool to list" }],
        "code":
`function start() number {
    bool is_true = true;
    list<bool> bool_array = is_true as list<bool>;
}`
    }
,
    "Nullable bool to list":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<bool> to list" }],
        "code":
`function start() number {
    nullable<bool> is_true = true;
    list<bool> bool_array = is_true as list<bool>;
}`
    }
};