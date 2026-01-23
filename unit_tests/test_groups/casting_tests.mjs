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
            { call:"convertto_number(false)", type: "number", expect: 0 },
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
            { call:"convertto_string(false)", type: "string", expect: "0" },
            { call:"convertto_string(true)", type: "string", expect: "1" },
            { call:"convertto_string(99)", type: "string", expect: "99" },
            { call:"convertto_string(-20.5)", type: "string", expect: "-20.5" },
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
`function start() none {
    bool is_true = true;
    list<bool> bool_list = is_true as list<bool>;
}`
    }
,
    "Nullable bool to list error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<bool> to list" }],
        "code":
`function start() none {
    nullable<bool> is_true = true;
    list<bool> bool_list = is_true as list<bool>;
}`
    }
,
    "Number to list error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot cast from number to list<number>" }],
        "code":
`function start() none {
    number its_one = 1;
    list<number> num_list = its_one as list<number>;
}`
    }
,
    "Nullable number to list error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot cast from nullable<number> to list<number>" }],
        "code":
`function start() none {
    nullable<number> its_one = 1;
    list<number> num_list = its_one as list<number>;
}`
    }
,
    "Map to list error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from map to list" }],
        "code":
`function start() none {
    map<string> some_map = ["key": "value"];
    list<string> str_list = some_map as list<string>;
}`
    }
,
    "Nullable map to list error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<map> to list" }],
        "code":
`function start() none {
    nullable<map<string>> some_map = ["key": "value"];
    list<string> str_list = some_map as list<string>;
}`
    }
,
    "Bool to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from bool to map" }],
        "code":
`function start() none {
    bool is_true = true;
    map<bool> bool_map = is_true as map<bool>;
}`
    }
,
    "Nullable bool to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<bool> to map" }],
        "code":
`function start() none {
    nullable<bool> is_true = true;
    map<bool> bool_map = is_true as map<bool>;
}`
    }
,
    "Number to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from number to map" }],
        "code":
`function start() none {
    number its_one = 1;
    map<number> num_map = its_one as map<number>;
}`
    }
,
    "Nullable number to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<number> to map" }],
        "code":
`function start() none {
    nullable<number> its_one = 1;
    map<number> num_map = its_one as map<number>;
}`
    }
,
    "String to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from string to map" }],
        "code":
`function start() none {
    string its_one = "1";
    map<string> str_map = its_one as map<string>;
}`
    }
,
    "Nullable string to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<string> to map" }],
        "code":
`function start() none {
    nullable<string> its_one = "1";
    map<string> str_map = its_one as map<string>;
}`
    }
,
    "List to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from list to map" }],
        "code":
`function start() none {
    list<string> some_list = ["value"];
    map<string> str_map = some_list as map<string>;
}`
    }
,
    "Nullable list to map error":
    {
        "tests": [{ type: "parser_error", expect: "Error cannot cast from nullable<list> to map" }],
        "code":
`function start() none {
    nullable<list<string>> some_list = ["value"];
    map<string> str_map = some_list as map<string>;
}`
    }
};