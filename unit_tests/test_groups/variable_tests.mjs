/* -----

Variable tests

----- */

export const variable_tests = {
    "Basic assignment and reassignment":
    {
        "tests": [{ call:"start()", type: "number", expect: 5}],
        "code": `function start() number { number x = 0; x = 5; return x; }`
    },


    "Assignment type error":
    {
        "tests": [{ type: "parser_error", expect: "Variable assignment type mismatch." }],
        "code":
`function start() number
{
    number result = false;
    return result;
}`
    },


    "Any assignment type error":
    {
        "tests": [{ type: "parser_error", expect: "Type 'any' is not allowed for variable declarations." }],
        "code":
`function start() number
{
    any result = 10;
    return result;
}`
    },


    "Redeclared from function declaration Error":
    {
        "tests": [{ type: "parser_error", expect: "Variable cannot be redeclared inside the same function." }],
        "code": `function start(number value) number {
        number value = 0;
        return value;
    }`
    },


    "Redeclared in function Error":
    {
        "tests": [{ type: "parser_error", expect: "Variable cannot be redeclared inside the same function." }],
        "code":
`function start() number {
    number value = 0;
    number value = 1;
    return value;
}`
    },


    "Valid redeclaration":
    {
        "tests": [{ call:"get_number(2.5)", type: "number", expect: 25}],
        "code":
`function get_number(number y) number {
    number x = 5;
    return x * double_number(y);
}
    
function double_number(number y) number {
    number x = 2;
    return x * y;
}`
    },


    // Chained assignement is unsupported
    "Chained assignment error": {
        "tests": [{ type: "parser_error", expect: "Expect ';' after expression." }],
        "code":
`function test() none {
    number x = 0;
    number y = 0;
    x = y = 5;
}`
    },

    "Single escaped quote in string": {
        "tests": [{ call:"start()", type: "string", expect: "Hello \" Sir"}],
        "code": `function start() string { return "Hello \\" Sir"; }`
    },


    "Reading magic variables":
    {
        "tests": [{ call:"start()", type: "number", expect: 1}],
        "code": `function start() number { return $line_num; }`
    },



    "Testing $line_num variables":
    {
        "tests": [{ call:"start()", type: "number", expect: 5}],
        "code":
`
function start() number
{
    return
        $line_num;
}
`
    },


    "Writing magic variables error":
    {
        "tests": [{ type: "parser_error", expect: "Invalid assignment target." }],
        "code":
`function start() number
{
    $runtime = "HackedRuntime";
    return $runtime;
}`
    },


    "Undefined variable access error":
    {
        "tests": [{ type: "parser_error", expect: "Undefined variable." }],
        "code":
`function get_key() string {
    string index = "First";
    return key;
}`
    },


    "Unassigned boolean variable access":
    {
        "tests": [{ call:"get_key()", type: "bool", expect: false }],
        "code":
`function get_key() bool {
    bool key;
    return key;
}`
    },


    "Unassigned number variable access":
    {
        "tests": [{ call:"get_key()", type: "number", expect: 0}],
        "code":
`function get_key() number {
    number key;
    return key;
}`
    },


    "Unassigned string variable access":
    {
        "tests": [{ call:"get_key()", type: "string", expect: ""}],
        "code":
`function get_key() string {
    string key;
    return key;
}`
    }
};