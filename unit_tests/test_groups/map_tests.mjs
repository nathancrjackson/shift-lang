/* -----

Map tests

----- */

export const map_tests = {
    "Assignment":
    {
        "tests": [{ call: "start()", type: "number", expect: 10 }],
        "code":
`function start() number
{
    map<number> result;
    result["High score"] = 10;
    return result["High score"];
}`
    }
,
    "Literal assignment":
    {
        "tests": [
            { call: "get_somestring(\"name\")", type: "string", expect: "Nathan" },
            { call: "get_somestring(\"role\")", type: "string", expect: "Admin" },
            { call: "get_somestring(\"password\")", type: "runtime_error", expect: "Map key does not exist." },
        ],
        "code":
`function get_somestring(string key) string {
    map<string> result = ["name": "Nathan", "role": "Admin"];
    return result[key];
}`
    }
,
    "Element deletion":
    {
        "tests": [
            { call: "get_somestring(\"name\")", type: "string", expect: "Nathan" },
            { call: "get_somestring(\"role\")", type: "string", expect: "Admin" },
            { call: "get_somestring(\"password\")", type: "runtime_error", expect: "Map key does not exist." },
        ],
        "code":
`function get_somestring(string key) string {
    map<string> result = ["name": "Nathan", "role": "Admin", "password": "So1nscure!"];
    delete result["password"];
    return result[key];
}`
    }
,
    "Element checking using has":
    {
        "tests": [
            { call: "check_somemap(\"name\")", type: "bool", expect: true },
            { call: "check_somemap(\"password\")", type: "bool", expect: false },
        ],
        "code":
`function check_somemap(string key) bool {
    map<string> result = ["name": "Nathan", "role": "Admin" ];
    return result has key;
}`
    }
,
    "Assignment type error":
    {
        "tests": [{ type: "parser_error", expect: "Map value type mismatch." }],
        "code":
`function start() number
{
    map<number> result;
    result["High score"] = "A string :O";
    return result["High score"];
}`
    }
,
    "Assignment as list error":
    {
        "tests": [{ type: "parser_error", expect: "Map cannot be set using list." }],
        "code":
`function get_somestring(string key) string {
    map<string> result = [10, 20, 30];
    return result[key];
}`
    }
,
    "Return type error":
    {
        "tests": [{ type: "parser_error", expect: "Return type mismatch." }],
        "code":
`function start() map<number>
{
    map<number> result;
    result["High score"] = 10;
    return result["High score"];
}`
    }
,
    "Assignment any test":
    {
        "tests": [
            { call: "start(\"test\", true)", type: "runtime_error", expect: "Return type mismatch." },
            { call: "start(\"test\", 10)", type: "number", expect: 10 },
            { call: "start(\"test\", \"10\")", type: "runtime_error", expect: "Return type mismatch." }
        ],
        "code":
`function start(string key, any value) number
{
    map<any> result;
    result[key] = value;
    return result[key];
}`
    }
};