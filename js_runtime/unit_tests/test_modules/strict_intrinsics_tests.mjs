
export const tests = [
    {
        name: "Strict Intrinsics: Sqrt String Literal",
        code: `
        function main() none {
            calc_sqrt("string");
        }
        `,
        expectedError: "Argument 'n' expects type 'number' in call to 'calc_sqrt'."
    },
    {
        name: "Strict Intrinsics: Sqrt String Variable",
        code: `
        function main() none {
            string s = "test";
            calc_sqrt(s);
        }
        `,
        expectedError: "Argument 'n' expects type 'number' in call to 'calc_sqrt'."
    },
    {
        name: "Strict Intrinsics: Random Int Range Types",
        code: `
        function main() none {
            generate_randomint_from_range("1", 10);
        }
        `,
        expectedError: "Argument 'min' expects type 'number' in call to 'generate_randomint_from_range'."
    },
    {
        name: "Strict Intrinsics: Print Line Param Count",
        code: `
        function main() none {
            print_line();
        }
        `,
        expectedError: "Function 'print_line' expects 1 arguments but got 0."
    },
    {
        name: "Strict Intrinsics: Valid Call",
        code: `
        function main() number {
            return calc_sqrt(16);
        }
        `,
        expectedReturn: 4
    }
];
