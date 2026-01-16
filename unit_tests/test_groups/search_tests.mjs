/* -----

Search Tests

----- */

export const search_tests = {
    "Basic":
    {
        "tests": [{ call: "do_find()", type: "string", expect: "Hello" }],
        "code":
`function do_find() string {
    list<RegexResult> results = "Hello World" search "/Hello/g";
    return results[0]["match"];
}`
    }
,

    "RegexResult fields":
    {
        "tests": [{ call: "do_find()", type: "number", expect: 6 }],
        "code":
`function do_find() number {
    list<RegexResult> results = "Hello World" search "/World/g";
    return results[0]["start"];
}`
    }
,

    "Multiple results":
    {
        "tests": [{ call: "do_find()", type: "number", expect: 2 }],
        "code":
`function do_find() number {
    list<RegexResult> results = "Hello World" search "/o/g";
    return size of results;
}`
    }
,

    "Search data must be string error":
    {
        "tests": [{ type: "parser_error", expect: "Search data must be a string." }],
        "code":
`function do_find() number {
    list<RegexResult> results;
    results = 1000000 search "/0/g";
    return size of results;
}`
    }
,

    "Search expression must be string error":
    {
        "tests": [{ type: "parser_error", expect: "Search expression must be a string." }],
        "code":
`function do_find() number {
    list<RegexResult> results;
    results = "1000000" search 0;
    return size of results;
}`
    }
,

    "Search expression must be regex error":
    {
        "tests": [{ type: "parser_error", expect: "Search expression must be a valid regular expression." }],
        "code":
`function do_find() number {
    list<RegexResult> results;
    results = "1000000" search "0";
    return size of results;
}`
    }
};