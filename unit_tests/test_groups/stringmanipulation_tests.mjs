export const stringmanipulation_tests = {

    "Concatenatating string variables":
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

    "Concatenatating string variables in return":
    {
        "tests": [
            { call:"do_test(true, false)", type: "string", expect: "10" },
            { call:"do_test(2, 9)", type: "string", expect: "29" },
            { call:"do_test(\"ABC\", \"123\")", type: "string", expect: "ABC123" }
        ],
        "code": `function do_test(any a, any b) string { return a & b; }`
    },

    "Spltting and Joining string":
    {
        "tests": [
            { call:"do_test()", type: "string", expect: "Apples :: Bananas :: Cheese" }
        ],
        "code": 

`function do_test() string {
    string start_string = "Apples,Bananas,Cheese";
    list<string> middle_list = start_string split with ",";
    string result = middle_list joined with " :: ";
    return result;
}`
    }

};