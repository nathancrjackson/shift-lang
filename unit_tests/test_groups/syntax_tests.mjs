/* -----

Syntax tests

----- */

export const syntax_tests = {
    "Missing semicolon error":
    {
        "tests": [{ type: "parser_error_cascading", expect: "Expect ';' after return value." }],
        "code": `function bad() number { return 10 }`
    }
,

    "Missing opening bracket error":
    {
        "tests": [{ type: "parser_error_cascading", expect: "Expect '{' before function body." }],
        "code": `function bad() number return 10; }`
    }
,

    "Missing closing bracket error":
    {
        "tests": [{ type: "parser_error", expect: "Expect '}' after block." }],
        "code": `function bad() number { return 10;`
    }
,

    "Missing function block":
    {
        "tests": [{ type: "parser_error", expect: "Expect '{' before function body." }],
        "code": `function bad() bool function good() number { return 10; }`
    }
,

    "Missing function result type error":
    {
        "tests": [{ type: "parser_error_cascading", expect: "Expect function return type." }],
        "code": `function bad() { return 10; }`
    }
,

    "Invalid function result type":
    {
        "tests": [{ type: "parser_error", expect: "Invalid function return type." }],
        "code": `function bad() int { return 10; }`
    }
,

    "If without block":
    {
        "tests": [{ type: "parser_error", expect: "Expect '{' before if body." }],
        "code":
`function bad() bool {
    if (true) return true;
    
    return false;
}`
    }
,

    "If without block closing bracket":
    {
        "tests": [{ type: "parser_error", expect: "Expect '}' after block." }],
        "code":
`function bad() bool {
    if (true) { return true;
    
    return false;}`
    }
,

    "For without block":
    {
        "tests": [{ type: "parser_error", expect: "Expect '{' before loop body." }],
        "code":
`function bad() bool {
    for (count in 1 to 5) return true;
    
    return false;
}`
    }
,

    "For without block closing bracket":
    {
        "tests": [{ type: "parser_error", expect: "Expect '}' after block." }],
        "code": 
`function bad() bool {
    for (count in 1 to 5) { return true;
    
    return false;
}`
    }
};
