/* -----

Inspection Tests

----- */

export const inspection_tests = {
    "Basic size of":
    {
        "tests": [{ call:"get_size()", type: "number", expect: 3 }],
        "code":
`function get_size() number {
    list<number> l = [1, 2, 3];
    return size of l;
}`
    }
,
    "Size of passed lists":
    {
        "tests": [
            { call:"get_size( [] )", type: "number", expect: 0 },
            { call:"get_size( [ 1 ] )", type: "number", expect: 1 },
            { call:"get_size( [ 1, 2 ] )", type: "number", expect: 2 },
            { call:"get_size( \"1, 2, 3\" )", type: "number", expect: 7 }
        ],
        "code":
`function get_size(any input_variable) number {
    return size of input_variable;
}`
    }
,
    "Size of type error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot get size of primitive types" }],
        "code":
`function get_size() number {
    number some_string = 100;
    return size of some_string;
}`
    }
,
    "Inspect size":
    {
        "tests": [
            { call:"get_size( [] )", type: "number", expect: 0 },
            { call:"get_size( [ 1 ] )", type: "number", expect: 1 },
            { call:"get_size( [ 1, 2 ] )", type: "number", expect: 2 },
            { call:"get_size( \"1, 2, 3\" )", type: "number", expect: 7 }
        ],
        "code":
`function get_size(any input_variable) nullable<number> {
    InspectionResult inspection = inspect input_variable;
    return inspection["$size"];
}`
    }
,
    "Inspect size error":
    {
        "tests": [{ call:"get_size()", type: "null", expect: null }],
        "code":
`function get_size() nullable<number> {
    number some_num = 100;
    InspectionResult inspection = inspect some_num;
    return inspection["$size"];
}`
    }
,
    "Type of":
    {
        "tests": [
            { call:"get_type(true)", type: "string", expect: "bool" },
            { call:"get_type(5)", type: "string", expect: "number" },
            { call:"get_type(\"Value\")", type: "string", expect: "string" }
        ],
        "code":
`function get_type(any input_variable) string {
    return type of input_variable;
}`
    }
,
    "Type of Struct":
    {
        "tests": [
            { call:"get_struct_type()", type: "string", expect: "DateTime" }
        ],
        "code":
`function get_struct_type() string {
    DateTime date_var;
    return type of date_var;
}`
    }
,
    "Inspect type":
    {
        "tests": [
            { call:"get_type(true)", type: "string", expect: "bool" },
            { call:"get_type(5)", type: "string", expect: "number" },
            { call:"get_type(\"Value\")", type: "string", expect: "string" }
        ],
        "code":
`function get_type(any input_variable) string {
    InspectionResult inspection = inspect input_variable;
    return inspection["$type"];
}`
    }
};