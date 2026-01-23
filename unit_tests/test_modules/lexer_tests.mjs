/* -----

Lexer tests

----- */

export const lexer_tests = {
    "Unexpected character": {
        "code": `function start() number { return @; }`,
        "tests": [{ type: "lexer_error", expect: "Unexpected character '@'"}]
    },
    "Unterminated string": {
        "code": `function start() string { return "Unterminated; }`,
        "tests": [{ type: "lexer_error", expect: "Unterminated string"}]
    },
    "Unterminated block comment": {
        "code": `function start() number { return 10; } /*`,
        "tests": [{ type: "lexer_error", expect: "Unterminated block comment"}]
    }
};