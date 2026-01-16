/* -----

While loops tests

----- */

export const while_tests = {
    "Basic number range":
    {
        "tests": [{ call:"exampleof_while()", type: "number", expect: 5 }],
        "code":
`function exampleof_while() number {
    number count;
    while (count < 5) {
        count = count + 1;
    }
    return count;
}`
    }
}