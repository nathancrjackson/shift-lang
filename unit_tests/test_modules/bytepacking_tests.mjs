/* -----

Packing and unpacking tests

----- */

export const bytepacking_tests = {
    "Basic unpack":
    {
        "tests": [{ call:"get_bytes()", type: "list", expect: [65, 66, 67] }],
        "code":
`function get_bytes() list<number> {
    string s = "ABC";
    return unpack s;
}`
    }
,
    "Unpack passed data":
    {
        "tests": [
            { call:"get_byte(\"ABC\", 0)", type: "number", expect: 65 },
            { call:"get_byte(\"ABC\", 1)", type: "number", expect: 66 },
            { call:"get_byte(\"ABC\", 2)", type: "number", expect: 67 }
        ],
        "code":
`function get_byte(string str, number index) number {
    list<number> byte_list = unpack str;
    return byte_list[index];
}`
    }
,
    "Pack":
    {
        "tests": [{ call:"get_str( [65, 66, 67] )", type: "string", expect: "ABC" }],
        "code":
`function get_str( list<number> input_var ) string {
    return pack input_var;
}`
    }
};