export const strict_intrinsics_tests = {

    "Sqrt String Literal": {
        "tests": [{ type: "parser_error", expect: "Argument 'n' expects type 'number' in call to 'calc_sqrt'." }],
        "code": `
        function main() none {
            calc_sqrt("string");
        }
        `
    },

    "Sqrt String Variable": {
        "tests": [{ type: "parser_error", expect: "Argument 'n' expects type 'number' in call to 'calc_sqrt'." }],
        "code": `
        function main() none {
            string s = "test";
            calc_sqrt(s);
        }
        `
    },

    "Random Int Range Types": {
        "tests": [{ type: "parser_error", expect: "Argument 'num_x' expects type 'number' in call to 'generate_randomint_from_range'." }],
        "code": `
        function main() none {
            generate_randomint_from_range("1", 10);
        }
        `
    },

    "Print Line Param Count": {
        "tests": [{ type: "parser_error", expect: "Function 'print_line' expects 1 arguments but got 0." }],
        "code": `
        function main() none {
            print_line();
        }
        `
    },

    "Valid Call": {
        "tests": [
            { call: "main()", type: "number", expect: 4 }
        ],
        "code": `
        function main() number {
            return calc_sqrt(16);
        }
        `
    },

    // --- JSON Conversion Tests ---

    "JSON String to Map Valid": {
        "tests": [
            { call: "main()", type: "map", expect: { "score": 100, "active": true } }
        ],
        "code": `
        function main() map<any> {
            return convert_jsonstring_to_map("{\\"score\\": 100, \\"active\\": true}");
        }
        `
    },

    "JSON String to List Valid": {
        "tests": [
            { call: "main()", type: "list", expect: [1, 2, 3] }
        ],
        "code": `
        function main() list<any> {
            return convert_jsonstring_to_list("[1, 2, 3]");
        }
        `
    },

    "JSON String Invalid Format": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "Invalid JSON string" }],
        "code": `
        function main() map<any> {
            return convert_jsonstring_to_map("{bad_json: true");
        }
        `
    },

    "JSON String to Map Type Mismatch": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "JSON string is not an object" }],
        "code": `
        function main() map<any> {
            return convert_jsonstring_to_map("[1, 2, 3]");
        }
        `
    },

    "JSON String to List Type Mismatch": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "JSON string is not a list" }],
        "code": `
        function main() list<any> {
            return convert_jsonstring_to_list("{\\"a\\": 1}");
        }
        `
    },

    "Map to JSON String": {
        "tests": [{ call: "main()", type: "string", expect: `{"id":42}` }],
        "code": `
        function main() string {
            map<any> m;
            m["id"] = 42;
            return convert_map_to_jsonstring(m);
        }
        `
    },

    // --- Math Intrinsics Tests ---

    "Math Rounding Up": {
        "tests": [{ call: "main()", type: "number", expect: 4 }],
        "code": `
        function main() number {
            return round_number_up(3.14);
        }
        `
    },

    "Math Rounding Down": {
        "tests": [{ call: "main()", type: "number", expect: 3 }],
        "code": `
        function main() number {
            return round_number_down(3.99);
        }
        `
    },

    "Math Absolute Value": {
        "tests": [{ call: "main()", type: "number", expect: 42 }],
        "code": `
        function main() number {
            return calc_absolute(-42);
        }
        `
    },

    "Trig Function Type Match": {
        "tests": [{ type: "parser_error", expect: "Argument 'n' expects type 'number' in call to 'calc_sin'." }],
        "code": `
        function main() none {
            calc_sin("90");
        }
        `
    },

    // --- Random Generation Patches ---

    "Random Range X Greater Than Y": {
        "tests": [{ call: "main()", type: "bool", expect: true }],
        "code": `
        function main() bool {
            number result = generate_randomint_from_range(10, 5);
			return (result >= 5 and result <= 10);
        }
        `
    },

    "Random Range Valid": {
        "tests": [{ call: "main()", type: "number", expect: 5 }],
        "code": `
        function main() number {
            return generate_randomint_from_range(5, 5);
        }
        `
    },

    // --- Date/Time Strictness & Precision Patches ---

    "ISO8601 Strict Parsing Success": {
        "tests": [{ call: "main()", type: "number", expect: 2026 }],
        "code": `
        function main() number {
            DateTime dt = convert_iso8601_to_datetime("2026-01-01T15:04:05Z");
            return dt["year"] as number;
        }
        `
    },

    "ISO8601 Strict Parsing Failure": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "Invalid ISO8601 date string" }],
        "code": `
        function main() DateTime {
            return convert_iso8601_to_datetime("2026/01/01 15:04:05");
        }
        `
    },

    "Unix Timestamp Sub-Second Precision Retention": {
        "tests": [{ call: "main()", type: "number", expect: 123 }],
        "code": `
        function main() number {
            // 1700000000.123 retains the .123 as 123 milliseconds
            DateTime dt = convert_unixtime_to_datetime(1700000000.123);
            return dt["millisecond"] as number;
        }
        `
    },

    "Round Number Nil check": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "Cannot cast null to number." }],
        "code": `
        function main() number {
            nullable<number> val = null;
            return round_number(val as number);
        }
        `
    },

    "DateTime Convert Expected DateTime Struct": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "Expected DateTime struct" }],
        "code": `
        function main() number {
            map<any> m;
            m["year"] = 2026;
            return convert_datetime_to_unixtime(m as DateTime);
        }
        `
    }
};