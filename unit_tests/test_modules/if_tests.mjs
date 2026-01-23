/* -----

If logic tests

----- */

export const if_tests = {
    "Logic test":
    {
        "tests": [
            { call:"do_test(true)", type: "number", expect: 1 },
            { call:"do_test(false)", type: "number", expect: 100 }
        ],
        "code":

`function do_test(bool some_check) number
{
    if (some_check)
    {
        return 1;
    }
    return 100;
}`

    },

    "If, else if, else logic test":
    {
        "tests": [
            { call: "process_transaction(100)", type: "string", expect: "Processed" },
            { call: "process_transaction(0)", type: "string", expect: "Zero Value" },
            { call: "process_transaction(-50)", type: "runtime_error", expect: "Invalid transaction" }
        ],
        "code":
        
`function process_transaction(number amount) string
{
    if (amount > 0) { return "Processed"; } 
    else if (amount == 0) { return "Zero Value"; } 
    else { throw error "Invalid transaction"; }
}`

    }
};