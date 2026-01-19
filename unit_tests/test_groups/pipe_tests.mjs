/* -----

Pipe values tests

----- */

export const pipe_tests = {
    "Basic":
    {
        "tests": [{ call:"do_piping(\"nathan\", \"jackson\")", type: "string", expect: "NJACKSON" }],
        "code":
`function do_piping(string first_name, string last_name) string
{
    string result = get_substring(first_name, 0, 1) | $pipe_value & last_name | transform_ansistring_to_uppercase($pipe_value);
    return result;
}`

    },
    "Left-To-Right Strictness":
    {
        "tests": [{ call:"test_pipe(\"Type\", \"String\")", type: "string", expect: "(Type): String" }],
        "code":
`function test_pipe(string str_a, string str_b) string
{
    string res = "(" & str_a & ")" | $pipe_value & ": " | $pipe_value & str_b;
    return res;
}`

    }
};
