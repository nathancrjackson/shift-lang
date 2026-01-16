export const concatenatation_tests = {

    "Joining string variables":
    {
        "tests": [
            { call:"do_test(true, false)", type: "string", expect: "10" },
            { call:"do_test(2, 9)", type: "string", expect: "29" },
            { call:"do_test(\"ABC\", \"123\")", type: "string", expect: "ABC123" }
        ],
        "code":

`function do_test(any a, any b) string {
    string result = a & b;
    return result;
}`

    },

    "Joining string variables in return":
    {
        "tests": [
            { call:"do_test(true, false)", type: "string", expect: "10" },
            { call:"do_test(2, 9)", type: "string", expect: "29" },
            { call:"do_test(\"ABC\", \"123\")", type: "string", expect: "ABC123" }
        ],
        "code": `function do_test(any a, any b) string { return a & b; }`
    }

};