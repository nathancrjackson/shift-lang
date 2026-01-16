/* -----

Function tests

----- */

export const function_tests = {
    "Basic": {
        "code": `function start() number { return 10; }`,
        "tests": [{ call:"start()", type: "number", expect: 10}]
    },
    "Hoisting": {
        "code": `
    function main() number {
        // Call function defined BELOW
        return get_value();
    }

    function get_value() number {
        return 42;
    }
    `,
        "tests": [
            { call: "main()", type: "number", expect: 42 }
        ]
    }
};
