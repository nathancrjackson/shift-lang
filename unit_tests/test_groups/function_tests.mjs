/* -----

Function tests

----- */

export const function_tests = {
    "Basic": {
        "tests": [{ call:"start()", type: "number", expect: 10}],
        "code": `function start() number { return 10; }`
    },
    "Hoisting": {
        "tests": [
            { call: "main()", type: "number", expect: 42 }
        ],
        "code": `
    function main() number {
        // Call function defined BELOW
        return get_value();
    }

    function get_value() number {
        return 42;
    }
    `
    },
    "No return error": {
        "tests": [
            { call: "main()", type: "runtime_error", expect: "Runtime Error: Expected a return but none was supplied before function end." }
        ],
        "code": `
    function main() number {
        get_value();
    }

    function get_value() number {
        return 42;
    }
    `
    },
    "Return type mismatch parser error": {
        "tests": [
            { call: "main()", type: "parser_error", expect: "Return type mismatch." }
        ],
        "code": `
    function main() number {
        return "Hello";
    }
    `
    },
    "Return type mismatch runtime error": {
        "tests": [
            { call: "main()", type: "runtime_error", expect: "Runtime Error: Return type mismatch." }
        ],
        "code": `
    function main() number {
        list<any> tricky_list;
        tricky_list[] = "Hello";
        return tricky_list[0];
    }
    `
    }
};
