/* -----

For loops tests

----- */

export const for_tests = {
    "Basic number range":
    {
        "tests": [{ call: "exampleof_forrange()", type: "string", expect: "012345" }],
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
        "tests": [{ call: "exampleof_forrange()", type: "string", expect: "543210" }],
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
    "For String Error":
    {
        "tests": [{ type: "ParserError", expect: "Strings are not directly iterable. Use 'string as list<string>'." }],
        "code":
            `function exampleof_forstring() string {
    string result;
    string my_string = "BADWOLF";
    for (some_char in my_string) {
        if (some_char == "O")
        {
            result = some_char & "!";
        }
    }
    return result;
}`
    }
    ,
    "For List":
    {
        "tests": [{ call: "exampleof_forlist()", type: "string", expect: "BADWOLF" }],
        "code":
            `function exampleof_forlist() string {
    string result;
    list<string> my_list = ["B", "A", "D", "W", "O", "L", "F"];
    for (some_char in my_list) {
        result = result & some_char;
    }
    return result;
}`
    }
    ,
    "For Map (Key)":
    {
        "tests": [{ call: "exampleof_formap()", type: "string", expect: "MADWOLF" }],
        "code":
            `function exampleof_formap() string {
    string result;
    map<string> my_map = ["M": "B", "A": "A", "D": "D", "W": "W", "O": "O", "L": "L", "F": "F"];
    for (some_char in my_map) {
        result = result & some_char;
    }
    return result;
}`
    }
    ,
    "For Map (Key, Value)":
    {
        "tests": [{ call: "exampleof_formap()", type: "string", expect: "MADWOLF & BADWOLF" }],
        "code":
            `function exampleof_formap() string {
    string result_key;
    string result_value;
    map<string> my_map = ["M": "B", "A": "A", "D": "D", "W": "W", "O": "O", "L": "L", "F": "F"];
    for (some_key, some_value in my_map) {
        result_key = result_key & some_key;
        result_value = result_value & some_value;
    }
    return result_key & " & " & result_value;
}`
    }
    ,
    "Decending number range":
    {
        "tests": [{ call: "exampleof_forrange()", type: "string", expect: "543210" }],
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
    ,
    "Loop Boundary Constraints":
    {
        "tests": [{ call: "test_flat_range()", type: "number", expect: 1 }],
        "code":
            `function test_flat_range() number {
number count = 0;
for (i in 10 to 10) {
    count = count + 1;
}
return count; // Should execute exactly 1 time (or 0 depending on your design choice, but must be consistent)
}`
    }
    ,
    "Instruction Limit Breaker": {
        "tests": [{ call: "infinite_loop()", type: "runtime_error", expect: "Execution exceeded maximum instruction limit." }],
        "code":
            `function infinite_loop() none {
    while(true) {
        number x = 1;
    }
}`
    }
};