/* -----

Search Tests

----- */

export const regex_tests = {
    "Basic Match":
    {
        "tests": [{ call: "do_match()", type: "bool", expect: true }],
        "code":
`function do_match() bool {
    return "Hello World" matches "/Hello/g";
}`
    }
,
    "Match usage in if":
    {
        "tests": [{ call: "do_match()", type: "bool", expect: true }],
        "code":
`function do_match() bool {
    if ("Hello World" matches "/Hello/g")
    {
        return true;
    }
    return false;
}`
    }
,
    "Basic Replace":
    {
        "tests": [{ call: "do_replace()", type: "string", expect: "Hello Planet" }],
        "code":
`function do_replace() string {
    return "Hello World" replace "/World/g" with "Planet";
}`
    }
,
    "Double Replace":
    {
        "tests": [{ call: "do_replace()", type: "string", expect: "Hello Planet, Goodbye Planet" }],
        "code":
`function do_replace() string {
    return "Hello World, Goodbye World" replace "/World/g" with "Planet";
}`
    }
,
    "Basic Search":
    {
        "tests": [{ call: "do_find()", type: "string", expect: "Hello" }],
        "code":
`function do_find() string {
    list<RegexResult> results = "Hello World" search "/Hello/g";
    return results[0]["match"];
}`
    }
,

    "Search RegexResult fields":
    {
        "tests": [{ call: "do_find()", type: "number", expect: 6 }],
        "code":
`function do_find() number {
    list<RegexResult> results = "Hello World" search "/World/g";
    return results[0]["start"];
}`
    }
,

    "Search Multiple results":
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
    },

/* -----
    ReDoS & Safety Fallback Tests
    ----- */

    "Unsafe Regex Fallback - Short Input (Pass)":
    {
        "tests": [{ call: "test_fallback_pass()", type: "bool", expect: true }],
        "code":
`function test_fallback_pass() bool {
    // (a+)+ is a classic nested quantifier pattern.
    // Since the input string is tiny, the engine allows it under fallback mode.
    return "aaa" matches "/(a+)+/g";
}`
    }
,
    "Unsafe Regex Fallback - Exceed Ceiling (Fail)":
    {
        "tests": [{ call: "test_fallback_fail()", type: "runtime_error", expect: "Suspicious regex running on string size" }],
        "code":
`function test_fallback_fail() bool {
    // A catastrophic backtracking pattern evaluated against an input
    // that exceeds the unsafe structural safety cap (120 characters).
    string malicious_input = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    return malicious_input matches "/(a+)+/g";
}`
    }
,
    "Prohibited Feature - Backreference Rejection":
    {
        "tests": [{ call: "test_backref_ceiling()", type: "runtime_error", expect: "Suspicious regex running on string size" }],
        "code":
`function test_backref_ceiling() bool {
    // Backreferences use \\1, triggering the suspicious pattern flag.
    // Should fail if the evaluated string is longer than 120 characters.
    string long_input = "ababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababab";
    return long_input matches "/(a|b)\\\\1/g";
}`
    }
,
    "Dangerous Alternation Overlap Detection":
    {
        "tests": [{ call: "test_bad_alternation()", type: "runtime_error", expect: "Suspicious regex running on string size" }],
        "code":
`function test_bad_alternation() bool {
    // Detects overlapping quantified alternations like (a+|b+)+
    string payload = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    return payload matches "/(a+|b+)+/g";
}`
    }
,
    "Safe Regex - System Absolute Boundary Limit":
    {
        "tests": [{ call: "test_absolute_limit()", type: "runtime_error", expect: "string too large (ReDoS protection)" }],
        "code":
`function test_absolute_limit() bool {
    // Even if a regex is 100% flat and safe (like /word/), 
    // any input string exceeding 50,000 characters is rejected outright.
    
    // Building a massive string utilizing loop mechanics
    string massive_input = "start";
    for (i in 1 to 500) {
        massive_input = massive_input & "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    }
    return massive_input matches "/word/g";
}`
    }
};