/* -----

List tests

----- */

export const list_tests = {
    "Assignment":
    {
        "tests": [{ call: "start()", type: "number", expect: 10 }],
        "code":
`function start() number
{
    list<number> result;
    result[] = 10;
    return result[0];
}`
    }
,
    "Literal assignment":
    {
        "tests": [
            { call: "get_number(-1)", type: "runtime_error", expect: "List index must not be a negative number." },
            { call: "get_number(0)", type: "number", expect: 10 },
            { call: "get_number(1)", type: "number", expect: 20 },
            { call: "get_number(2)", type: "number", expect: 30 },
            { call: "get_number(3)", type: "runtime_error", expect: "List index is out of bounds." },
            { call: "get_number(1.5)", type: "runtime_error", expect: "List index must be integer value." }
        ],
        "code":
`function get_number(number index) number {
    list<number> result = [10, 20, 30];
    return result[index];
}`
    }
,
    "Element deletion":
    {
        "tests": [
            { call: "get_number(0)", type: "number", expect: 10 },
            { call: "get_number(1)", type: "number", expect: 30 }
        ],
        "code":
`function get_number(number index) number {
    list<number> result = [10, 20, 30];
    delete result[1];
    return result[index];
}`
    }
,
    "Element number checking with contains":
    {
        "tests": [
            { call: "check_number(0)", type: "bool", expect: false },
            { call: "check_number(10)", type: "bool", expect: true }
        ],
        "code":
`function check_number(number num_to_check) bool {
    list<number> our_list = [10, 20, 30];
    return our_list contains num_to_check;
}`
    }
,
    "Element string checking with contains":
    {
        "tests": [
            { call: "check_string(\"One Big Dirty Apple\")", type: "bool", expect: false },
            { call: "check_string(\"Apple\")", type: "bool", expect: false },
            { call: "check_string(\"Apples\")", type: "bool", expect: true }
        ],
        "code":
`function check_string(string str_to_check) bool {
    list<number> our_list = ["Apples", "Bananas", "Cheese"];
    return our_list contains str_to_check;
}`
    }
,
    "Assignment type error":
    {
        "tests": [{ type: "parser_error", expect: "List variable assignment type mismatch." }],
        "code":
`function start() number
{
    list<number> result;
    result[] = "A string :O";
    return result[0];
}`
    }
,
    "Assignment as map error":
    {
        "tests": [{ type: "parser_error", expect: "List cannot be set using map." }],
        "code":
`function start() number
{
    list<number> result = ["name": "Nathan", "role": "Admin"];
    return result[0];
}`
    }
,
    "Return type error":
    {
        "tests": [{ type: "parser_error", expect: "Return type mismatch." }],
        "code":
`function start() list<number>
{
    list<number> result;
    result[] = 10;
    return result[0];
}`
    }
,
    "Assignment any test":
    {
        "tests": [
            { call: "start(true)", type: "runtime_error", expect: "Return type mismatch." },
            { call: "start(10)", type: "number", expect: 10 },
            { call: "start(\"10\")", type: "runtime_error", expect: "Return type mismatch." }
        ],
        "code":
`function start(any value) number
{
    list<any> result;
    result[] = value;
    return result[0];
}`
    }
,
    "Empty list return":
    {
        "tests": [{ call: "check_empty()", type: "number", expect: 0 }],
        "code":
`function get_empty_list() list<string> {
    list<string> nothing; 
    return nothing;
}

function check_empty() number {
    list<string> result = get_empty_list();
    return size of result;
}`
    }
,
    "Nested":
    {
        "tests": [{ call: "matrix_test()", type: "number", expect: 4 }],
        "code":
`function matrix_test() number {
    // A list of lists of numbers (2D Array)
    list<list<number>> matrix;
    
    list<number> row1 = [1, 2, 3];
    list<number> row2 = [4, 5, 6];

    matrix[] = row1;
    matrix[] = row2;

    // Access: matrix[1] returns row2, [0] returns 4
    return matrix[1][0]; 
}`
    }
};