/* -----

Nullable tests

----- */

export const nullable_tests = {

    "Assignment":
    {
        "tests": [{ call: "start()", type: "number", expect: 10 }],
        "code":
`function start() nullable<number>
{
    nullable<number> result;
    result = 10;
    return result;
}`
    }
,
    "Generic assignment":
    {
        "tests": [{ call: "get_number(1)", type: "number", expect: 20 }],
        "code":
`function get_number(number index) nullable<number>
{
    nullable<list<number>> result;
    result = [10, 20, 30];
    return result[index];
}`
    }
,
    "Null coalescing assignment":
    {
        "tests": [
            { call: "get_number( true )", type: "number", expect: 99 },
            { call: "get_number( false )", type: "number", expect: 100 }
        ],
        "code":
`function get_number(bool assign_value) number
{
    nullable<number> our_nullable;

    if (assign_value)
    {
        our_nullable = 99;
    }

    number result = our_nullable ?? 100;

    return result;
}`
    }
,
    "Function argument assignment":
    {
        "tests": [
            { call: "is_numbernotnull(-1)", type: "bool", expect: true },
            { call: "is_numbernotnull(0)", type: "bool", expect: true },
            { call: "is_numbernotnull(1)", type: "bool", expect: true },
            { call: "is_numbernotnull(null)", type: "bool", expect: false }
        ],
        "code":
`function is_numbernotnull(nullable<number> our_input) bool
{
    if (our_input == null)
    {
        return false;
    }
    
    return true;
}`
    }
,
    "Any assignment error":
    {
        "tests": [{ type: "parser_error_cascading", expect: "Type 'nullable<any>' is not allowed." }],
        "code":
`function get_number() number
{
    nullable<any> result = 10;
    return result as number;
}`
    }
,
    "Verify index does not pierce Nullable":
    {
        "tests": [{ type: "parser_error", expect: "Return type mismatch." }],
        "code":
`function get_number(number index) number
{
    nullable<list<number>> result;
    result = [10, 20, 30];
    return result[index];
}`
    }
,
    "Return with a cast":
    {
        "tests": [{ call: "start()", type: "number", expect: 10 }],
        "code":
`function start() number
{
    nullable<number> result;
    result = 10;
    return result as number;
}`
    }
,
    "Assigning null":
    {
        "tests": [
            { call: "start()", type: "bool", expect: true }
        ],
        "code":
`function start() bool {
    nullable<number> our_var = 10;
    our_var = null;
    if (our_var == null)
    {
        return true;
    }
    return false;
}`
    }
,
    "Nullable assignment type error":
    {
        "tests": [{ type: "parser_error", expect: "Nullable variable assignment type mismatch." }],
        "code":
`function start() bool
{
    nullable<number> our_var;
    our_var = "A string :O";
    if (our_var == null)
    {
        return true;
    }
    return false;
}`
    }
,
    "Null assignment type error":
    {
        "tests": [{ type: "parser_error", expect: "Variable assignment type mismatch." }],
        "code":
`function start() number
{
    number result = null;
    return result;
}`
    }
};