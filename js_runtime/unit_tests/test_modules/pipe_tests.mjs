/* -----

Pipe values tests

----- */

export const pipe_tests = {
    "Basic":
    {
        "tests": [{ call: "do_piping(\"nathan\", \"jackson\")", type: "string", expect: "NJACKSON" }],
        "code":
            `function do_piping(string first_name, string last_name) string
{
    string result = get_substring(first_name, 0, 1) | $pipe_value & last_name | transform_ansistring_to_uppercase($pipe_value);
    return result;
}`

    },
    "Left-To-Right Strictness":
    {
        "tests": [{ call: "test_pipe(\"Type\", \"String\")", type: "string", expect: "(Type): String" }],
        "code":
            `function test_pipe(string str_a, string str_b) string
{
    string res = "(" & str_a & ")" | $pipe_value & ": " | $pipe_value & str_b;
    return res;
}`

    },
    "Nested Pipeline Isolation":
    {
        "tests": [{ call: "test_nested_pipes()", type: "number", expect: 17 }],
        "code":
            `function test_nested_pipes() number {
    // Outer pipe passes 10. Inner pipe processes 5. 
    // The final step should still see the outer $pipe_value (10).
    number result = 10 | (5 | $pipe_value + 2) + $pipe_value; 
    return result; // Should evaluate to 7 + 10 = 17
}`

    }
};
