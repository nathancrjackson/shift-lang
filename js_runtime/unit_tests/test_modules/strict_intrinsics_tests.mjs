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
    },

    "Get Sublist Valid": {
        "tests": [{ call: "main()", type: "list", expect: [2, 3] }],
        "code": `
        function main() list<any> {
            list<number> items = [1, 2, 3, 4];
            return get_sublist(share items, 1, 3);
        }
        `
    },

    "Get Sublist Null End Index": {
        "tests": [{ call: "main()", type: "list", expect: [2, 3, 4] }],
        "code": `
        function main() list<any> {
            list<number> items = [1, 2, 3, 4];
            return get_sublist(share items, 1, null);
        }
        `
    },

    "Get Sublist Missing Share": {
        "tests": [{ type: "parser_error", expect: "Function expects shared argument." }],
        "code": `
        function main() list<any> {
            list<number> items = [1, 2, 3, 4];
            return get_sublist(items, 1, 3);
        }
        `
    },

    "Get Sublist Non List Type": {
        "tests": [{ type: "parser_error", expect: "Argument 'items' expects type 'list' in call to 'get_sublist'." }],
        "code": `
        struct Dummy [
            number x
        ]
        function main() list<any> {
            Dummy d;
            return get_sublist(share d, 0, 1);
        }
        `
    },

    "Get Sublist Negative Index Error": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "start_index out of bounds" }],
        "code": `
        function main() list<any> {
            list<number> items = [1, 2, 3];
            return get_sublist(share items, -1, 2);
        }
        `
    },

    "Get Sublist End Less Than Start Error": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "end_index cannot be less than start_index" }],
        "code": `
        function main() list<any> {
            list<number> items = [1, 2, 3];
            return get_sublist(share items, 2, 1);
        }
        `
    },

    "Get Substring Valid": {
        "tests": [{ call: "main()", type: "string", expect: "bcd" }],
        "code": `
        function main() string {
            return get_substring("abcdef", 1, 4);
        }
        `
    },

    "Get Substring Null End Index": {
        "tests": [{ call: "main()", type: "string", expect: "def" }],
        "code": `
        function main() string {
            return get_substring("abcdef", 3, null);
        }
        `
    },

    "Get Substring Out of Bounds Error": {
        "tests": [{ call: "main()", type: "runtime_error", expect: "end_index out of bounds" }],
        "code": `
        function main() string {
            return get_substring("abcdef", 0, 10);
        }
        `
    },

    "Transform ANSI String to Uppercase": {
        "tests": [{ call: "main()", type: "string", expect: "ABC123D" }],
        "code": `
        function main() string {
            return transform_ansistring_to_uppercase("aBc123D");
        }
        `
    },

    "Transform ANSI String to Lowercase": {
        "tests": [{ call: "main()", type: "string", expect: "abc123d" }],
        "code": `
        function main() string {
            return transform_ansistring_to_lowercase("aBc123D");
        }
        `
    },

    "Trim String": {
        "tests": [{ call: "main()", type: "string", expect: "Hello World" }],
        "code": `
        function main() string {
            return trim_string(" \\n\\r\\t Hello World \\t\\r\\n ");
        }
        `
    },

    "Trim String Left": {
        "tests": [{ call: "main()", type: "string", expect: "Hello World \t\r\n " }],
        "code": `
        function main() string {
            return trim_string_left(" \\n\\r\\t Hello World \\t\\r\\n ");
        }
        `
    },

    "Trim String Right": {
        "tests": [{ call: "main()", type: "string", expect: " \n\r\t Hello World" }],
        "code": `
        function main() string {
            return trim_string_right(" \\n\\r\\t Hello World \\t\\r\\n ");
        }
        `
    },

    "Trim Shared String": {
        "tests": [{ call: "main()", type: "string", expect: "Hello World" }],
        "code": `
        function main() string {
            nullable<string> s = "   Hello World   ";
            trim_shared_string(share s);
            return s as string;
        }
        `
    },

    "Trim Shared String Left": {
        "tests": [{ call: "main()", type: "string", expect: "Hello World   " }],
        "code": `
        function main() string {
            nullable<string> s = "   Hello World   ";
            trim_shared_string_left(share s);
            return s as string;
        }
        `
    },

    "Trim Shared String Right": {
        "tests": [{ call: "main()", type: "string", expect: "   Hello World" }],
        "code": `
        function main() string {
            nullable<string> s = "   Hello World   ";
            trim_shared_string_right(share s);
            return s as string;
        }
        `
    },

    "Transform Shared ANSI String to Uppercase": {
        "tests": [{ call: "main()", type: "string", expect: "HELLO 123" }],
        "code": `
        function main() string {
            nullable<string> s = "hello 123";
            transform_shared_ansistring_to_uppercase(share s);
            return s as string;
        }
        `
    },

    "Transform Shared ANSI String to Lowercase": {
        "tests": [{ call: "main()", type: "string", expect: "hello 123" }],
        "code": `
        function main() string {
            nullable<string> s = "HELLO 123";
            transform_shared_ansistring_to_lowercase(share s);
            return s as string;
        }
        `
    },

    "Get Shared Substring": {
        "tests": [{ call: "main()", type: "string", expect: "def" }],
        "code": `
        function main() string {
            nullable<string> s = "abcdefghi";
            get_shared_substring(share s, 3, 6);
            return s as string;
        }
        `
    },

    "Get Shared Substring Null End": {
        "tests": [{ call: "main()", type: "string", expect: "defghi" }],
        "code": `
        function main() string {
            nullable<string> s = "abcdefghi";
            get_shared_substring(share s, 3, null);
            return s as string;
        }
        `
    },

    "Clear Shared List": {
        "tests": [{ call: "main()", type: "number", expect: 0 }],
        "code": `
        function main() number {
            list<number> items = [1, 2, 3];
            clear_shared_list(share items);
            return size of items;
        }
        `
    },

    "Clear Shared Map": {
        "tests": [{ call: "main()", type: "number", expect: 0 }],
        "code": `
        function main() number {
            map<number> items = ["a": 1, "b": 2];
            clear_shared_map(share items);
            return size of items;
        }
        `
    },

    "Reserve Shared List Capacity": {
        "tests": [{ call: "main()", type: "number", expect: 3 }],
        "code": `
        function main() number {
            list<number> items = [1, 2, 3];
            reserve_shared_list_capacity(share items, 10);
            return size of items;
        }
        `
    },

    "Append Shared List": {
        "tests": [{ call: "main()", type: "number", expect: 5 }],
        "code": `
        function main() number {
            list<number> target = [1, 2];
            list<number> source = [3, 4, 5];
            append_shared_list(share target, share source);
            return size of target;
        }
        `
    },

    "Merge Shared Map": {
        "tests": [
            { call: "main()", type: "number", expect: 3 },
            { call: "get_val()", type: "number", expect: 99 }
        ],
        "code": `
        function main() number {
            map<number> target = ["a": 1, "b": 2];
            map<number> source = ["b": 99, "c": 3];
            merge_shared_map(share target, share source);
            return size of target;
        }
        function get_val() number {
            map<number> target = ["a": 1, "b": 2];
            map<number> source = ["b": 99, "c": 3];
            merge_shared_map(share target, share source);
            return target["b"];
        }
        `
    },

    "Find Next Byte": {
        "tests": [
            { call: "main()", type: "number", expect: 3 },
            { call: "main_not_found()", type: "number", expect: -1 }
        ],
        "code": `
        function main() number {
            list<number> bytes = [10, 20, 30, 40, 50];
            return find_next_byte(share bytes, 1, [40, 99]);
        }
        function main_not_found() number {
            list<number> bytes = [10, 20, 30, 40, 50];
            return find_next_byte(share bytes, 1, [99]);
        }
        `
    },

    "Find Next Non-Matching Byte": {
        "tests": [
            { call: "main()", type: "number", expect: 3 }
        ],
        "code": `
        function main() number {
            list<number> bytes = [32, 32, 32, 99, 32];
            return find_next_non_matching_byte(share bytes, 0, [32]);
        }
        `
    },

    "Find Next Sequence": {
        "tests": [
            { call: "main()", type: "number", expect: 2 },
            { call: "main_not_found()", type: "number", expect: -1 }
        ],
        "code": `
        function main() number {
            list<number> bytes = [10, 20, 30, 40, 50];
            return find_next_sequence(share bytes, 0, [30, 40]);
        }
        function main_not_found() number {
            list<number> bytes = [10, 20, 30, 40, 50];
            return find_next_sequence(share bytes, 0, [30, 99]);
        }
        `
    },

    "Count Byte Occurrences": {
        "tests": [
            { call: "main()", type: "number", expect: 3 },
            { call: "main_with_end()", type: "number", expect: 2 }
        ],
        "code": `
        function main() number {
            list<number> bytes = [10, 20, 10, 30, 10];
            return count_byte_occurrences(share bytes, 0, null, 10);
        }
        function main_with_end() number {
            list<number> bytes = [10, 20, 10, 30, 10];
            return count_byte_occurrences(share bytes, 0, 4, 10);
        }
        `
    },

    "Copy Shared List Slice": {
        "tests": [
            { call: "main_overwrite()", type: "list", expect: [1, 2, 99, 98, 5] },
            { call: "main_append()", type: "list", expect: [1, 2, 3, 99, 98, 97] }
        ],
        "code": `
        function main_overwrite() list<number> {
            list<number> target = [1, 2, 3, 4, 5];
            list<number> source = [99, 98, 97];
            copy_shared_list_slice(share target, 2, share source, 0, 2);
            return target;
        }
        function main_append() list<number> {
            list<number> target = [1, 2, 3];
            list<number> source = [99, 98, 97];
            copy_shared_list_slice(share target, 3, share source, 0, null);
            return target;
        }
        `
    }
};