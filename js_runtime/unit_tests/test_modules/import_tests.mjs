/* -----

Import tests

----- */

export const import_tests = {
    "Simple import":
    {
        "tests": [{ call:"main(99)", type: "number", expect: 99 }],
        "code":
`import "test_imports/simple.shift";

function main(number result) number
{
    return basic_function(result);
}`

    },


    "Failed import":
    {
        "tests": [{ type: "parser_error_cascading", expect: "Failed to resolve import: test_imports/doesnotexist.shift" }],
        "code":
`import "test_imports/doesnotexist.shift";

function main(number result) number
{
    return basic_function(result);
}`

    },


    "Two levels of import":
    {
        "tests": [{ call:"main(99)", type: "number", expect: 99 }],
        "code":
`import "test_imports/has_import.shift";

function main(number result) number
{
    return calls_imported_function(result);
}`

    },


    "Import imports self":
    {
        "tests": [{ call:"main(99)", type: "number", expect: 99 }],
        "code":
`import "test_imports/imports_self.shift";

function main(number result) number
{
    return basic_function(result);
}`

    }
};
