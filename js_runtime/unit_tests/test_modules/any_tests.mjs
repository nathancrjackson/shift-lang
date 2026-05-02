/* -----
Any keyword tests
----- */

export const any_tests = {
    "Variable declaration error":
    {
        "tests": [{ type: "parser_error", expect: "Type 'any' is not allowed for variable declarations." }],
        "code": 
`function start() number {
    any result = 10;
    return 10;
}`
    },

    //"'Any' Nullable wrapping error" is tested under nullable teste

    "Function parameter and return":
    {
        "tests": [
            { call: "echo(42)", type: "number", expect: 42 },
            { call: "echo(\"Hello\")", type: "string", expect: "Hello" },
            { call: "echo(true)", type: "bool", expect: true }
        ],
        "code": 
`function echo(any input) any {
    return input;
}`
    },

    "List generic assignment":
    {
        "tests": [{ call: "test_list()", type: "number", expect: 42 }],
        "code": 
`function test_list() number {
    list<any> my_list;
    my_list[] = "A string";
    my_list[] = 42;
    my_list[] = false;
    
    // Extract and cast the element back to a strict type
    return my_list[1] as number;
}`
    },

    "Map generic assignment (JSON style)":
    {
        "tests": [{ call: "test_map()", type: "string", expect: "Admin" }],
        "code": 
`function test_map() string {
    map<any> payload = [
        "name": "Alice",
        "role": "Admin",
        "login_count": 5
    ];
    
    return payload["role"] as string;
}`
    },

    "Casting from any to primitive":
    {
        "tests": [
            { call: "cast_to_number(100)", type: "number", expect: 100 },
            { call: "cast_to_number(\"200\")", type: "number", expect: 200 }
        ],
        "code": 
`function cast_to_number(any val) number {
    return val as number;
}`
    }
};