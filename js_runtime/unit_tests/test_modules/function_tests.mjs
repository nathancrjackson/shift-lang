/* -----

Function tests

----- */

export const function_tests = {
    "Basic": {
        "tests": [{ call: "start()", type: "number", expect: 10 }],
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
            { call: "main()", type: "parser_error", expect: "Not all code paths return a value." }
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
    "Return type mismatch list runtime error": {
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
    },
    "Return type mismatch map runtime error": {
        "tests": [
            { call: "main()", type: "runtime_error", expect: "Runtime Error: Return type mismatch." }
        ],
        "code": `
    function main() number {
        map<any> tricky_map;
        tricky_map["Hello"] = "Hello";
        return tricky_map["Hello"];
    }
    `
    }
};
