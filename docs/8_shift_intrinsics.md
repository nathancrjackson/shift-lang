# Shift Intrinsics & Standard Library Reference

This document provides a comprehensive reference for the built-in structures (structs) and intrinsic functions available in the Shift programming language. 

Shift implements these features across both the JavaScript and Go runtimes:
- **Structs & Type Definitions:** Shared definitions enabling interoperable data representations.
- **Native Intrinsics:** Host-implemented primitives (configured in [standard_library.mjs](file://172.21.1.91/homes/developer/js/shift-lang/js_runtime/src/standard_library.mjs) for JS/Node, and [stdlib.go](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib.go) & [stdlib_fs.go](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib_fs.go) for Go).
- **Shift-native Helpers:** Helper functions written directly in Shift code (located in [stdlib.shift](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib.shift)).

---

## 1. Built-in Structs

The runtimes automatically declare the following struct types during parsing and type checking:

### `DateTime`
Used to represent calendar date and clock time, containing local offsets and timezone information.
- Defined in JS: [`DateTime`](file://172.21.1.91/homes/developer/js/shift-lang/js_runtime/src/standard_library.mjs#L89)
- Defined in Go: [`DateTime`](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib.go#L608)

```shift
struct DateTime [
    number year,
    number month,
    number day,
    number hour,
    number minute,
    number second,
    number millisecond,
    number offset_minutes,
    string timezone
]
```

### `RegexResult`
Represents the result of a regular expression match.
- Defined in JS: [`RegexResult`](file://172.21.1.91/homes/developer/js/shift-lang/js_runtime/src/standard_library.mjs#L103)
- Defined in Go: [`RegexResult`](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib.go#L621)

```shift
struct RegexResult [
    string match,
    number start,
    number end,
    list<string> groups
]
```

### `InspectionResult`
Provides meta-information about variables or values.
- Defined in JS: [`InspectionResult`](file://172.21.1.91/homes/developer/js/shift-lang/js_runtime/src/standard_library.mjs#L112)
- Defined in Go: [`InspectionResult`](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib.go#L630)

```shift
struct InspectionResult [
    string $type,
    nullable<number> $size
]
```

---

## 2. Host-Native Intrinsics

These functions are implemented natively by the execution engines (JS and Go). Behavior is validated against the test suite [`strict_intrinsics_tests.mjs`](file://172.21.1.91/homes/developer/js/shift-lang/js_runtime/unit_tests/test_modules/strict_intrinsics_tests.mjs).

### Print Functions

#### `print_line`
Prints a representation of the value to the standard output.
- **Signature:** `function print_line(any val) none`
- **Behavior:** Accepts a single argument of any type. Emits a line break after output.

---

### JSON Conversion

These functions convert structures back and forth between Shift types and raw serialized JSON strings.

#### `convert_jsonstring_to_map`
Parses a JSON string representation of an object.
- **Signature:** `function convert_jsonstring_to_map(string json) map<any>`
- **Errors:** Throws a runtime error if the input is not a valid JSON string or if the parsed root is not a JSON object.

#### `convert_jsonstring_to_list`
Parses a JSON string representation of an array.
- **Signature:** `function convert_jsonstring_to_list(string json) list<any>`
- **Errors:** Throws a runtime error if the input is not a valid JSON string or if the parsed root is not a JSON array.

#### `convert_map_to_jsonstring`
Serializes a map object to a JSON string.
- **Signature:** `function convert_map_to_jsonstring(map<any> m) string`
- **Errors:** Throws a runtime error if the argument is not a map.

#### `convert_list_to_jsonstring`
Serializes a list object to a JSON string.
- **Signature:** `function convert_list_to_jsonstring(list<any> l) string`
- **Errors:** Throws a runtime error if the argument is not a list.

---

### Random Generation

#### `generate_randomnumber`
Generates a random floating-point value.
- **Signature:** `function generate_randomnumber() number`
- **Returns:** A floating-point number in the range `[0.0, 1.0)`.

#### `generate_randomint_from_range`
Generates a random integer between two bounds.
- **Signature:** `function generate_randomint_from_range(number num_x, number num_y) number`
- **Behavior:** Arguments `num_x` and `num_y` represent boundaries. Order does not matter; the function automatically calculates boundaries using mathematical minimum/maximum with ceiling and floor respectively.
- **Errors:** Throws a runtime error if either argument is not a finite number.

---

### Date and Time

#### `get_datetime`
Fetches the current local system date and time.
- **Signature:** `function get_datetime() DateTime`
- **Returns:** A [`DateTime`](file://172.21.1.91/homes/developer/js/shift-lang/docs/8_shift_intrinsics.md#datetime) struct.

#### `get_datetime_as_unixtime`
Fetches the current Unix epoch time in seconds.
- **Signature:** `function get_datetime_as_unixtime() number`
- **Returns:** A Unix timestamp (seconds elapsed since January 1, 1970 UTC).

#### `get_datetime_as_iso8601`
Fetches the current UTC time in ISO 8601/RFC 3339 format.
- **Signature:** `function get_datetime_as_iso8601() string`
- **Returns:** An RFC 3339 UTC string (e.g. `YYYY-MM-DDTHH:MM:SSZ`).

#### `convert_unixtime_to_datetime`
Converts a Unix epoch timestamp (with sub-second precision) into a calendar structure.
- **Signature:** `function convert_unixtime_to_datetime(number ts) DateTime`
- **Behavior:** Preserves millisecond precision.
- **Errors:** Throws a runtime error if `ts` is not a finite number.

#### `convert_iso8601_to_datetime`
Parses a strict ISO 8601 / RFC 3339 calendar string.
- **Signature:** `function convert_iso8601_to_datetime(string iso) DateTime`
- **Behavior:** Requires a valid ISO 8601 date string format matching `YYYY-MM-DDTHH:MM:SSZ` or offsets.
- **Errors:** Throws a runtime error if the string is invalid or cannot be parsed.

#### `convert_datetime_to_unixtime`
Converts a calendar structure into a Unix timestamp.
- **Signature:** `function convert_datetime_to_unixtime(DateTime dt) number`
- **Errors:** Throws a runtime error if `dt` is not a valid [`DateTime`](file://172.21.1.91/homes/developer/js/shift-lang/docs/8_shift_intrinsics.md#datetime) struct or contains non-finite fields.

#### `convert_datetime_to_iso8601`
Converts a calendar structure into a UTC ISO 8601/RFC 3339 string.
- **Signature:** `function convert_datetime_to_iso8601(DateTime dt) string`
- **Errors:** Throws a runtime error if `dt` is not a valid [`DateTime`](file://172.21.1.91/homes/developer/js/shift-lang/docs/8_shift_intrinsics.md#datetime) struct or contains non-finite fields.

---

### String Processing

#### `get_substring`
Extracts a range of characters from a source string.
- **Signature:** `function get_substring(string input_str, number start_index, nullable<number> end_index) string`
- **Behavior:** Extracts characters starting at `start_index` up to (but not including) `end_index`. If `end_index` is `null`, it retrieves all characters to the end of `input_str`.
- **Errors:** Throws a runtime error if index values are negative or out of bounds.

#### `transform_ansistring_to_uppercase`
Converts ASCII letters to uppercase.
- **Signature:** `function transform_ansistring_to_uppercase(string input_str) string`
- **Behavior:** Maps characters in `[a-z]` (char codes 97 to 122) to uppercase. Other characters remain unchanged.

#### `transform_ansistring_to_lowercase`
Converts ASCII letters to lowercase.
- **Signature:** `function transform_ansistring_to_lowercase(string input_str) string`
- **Behavior:** Maps characters in `[A-Z]` (char codes 65 to 90) to lowercase. Other characters remain unchanged.

#### `trim_string`
Removes leading and trailing whitespace characters.
- **Signature:** `function trim_string(string input_str) string`
- **Behavior:** Clears spaces (` `), carriage returns (`\r`), line feeds (`\n`), and tabs (`\t`) from both ends of the string.

#### `trim_string_left`
Removes leading whitespace characters.
- **Signature:** `function trim_string_left(string input_str) string`
- **Behavior:** Clears spaces (` `), carriage returns (`\r`), line feeds (`\n`), and tabs (`\t`) from the beginning of the string.

#### `trim_string_right`
Removes trailing whitespace characters.
- **Signature:** `function trim_string_right(string input_str) string`
- **Behavior:** Clears spaces (` `), carriage returns (`\r`), line feeds (`\n`), and tabs (`\t`) from the end of the string.

---

### List Operations

#### `get_sublist`
Extracts a slice of elements from a source list.
- **Signature:** `function get_sublist(shared list<any> items, number start_index, nullable<number> end_index) list<any>`
- **Behavior:** Returns a slice of the list. The `items` parameter is passed by reference (using the `shared` keyword). Extracts elements starting at `start_index` up to (but not including) `end_index`. If `end_index` is `null`, it retrieves all elements to the end of `items`.
- **Errors:** Throws a runtime error if index values are negative, out of bounds, or if the end index is less than the start index.

---

### High-Performance Shared Intrinsics

These intrinsics maximize execution speed and eliminate garbage collection overhead in performance-critical data pipelines by operating in place on `shared` variables (bypassing pass-by-value cloning).

#### Shared String Intrinsics (`shared nullable<string>`)

These operate directly on the underlying buffer of a boxed reference container (nullable string). If the container holds `null`, these perform a safe no-op.

- `trim_shared_string(shared nullable<string> target)`
  Removes leading and trailing whitespace from the inner string buffer in place.
- `trim_shared_string_left(shared nullable<string> target)`
  Removes leading whitespace from the inner string buffer in place.
- `trim_shared_string_right(shared nullable<string> target)`
  Removes trailing whitespace from the inner string buffer in place.
- `transform_shared_ansistring_to_uppercase(shared nullable<string> target)`
  Converts ASCII characters in the boxed string to uppercase in place.
- `transform_shared_ansistring_to_lowercase(shared nullable<string> target)`
  Converts ASCII characters in the boxed string to lowercase in place.
- `get_shared_substring(shared nullable<string> target, number start_index, nullable<number> end_index)`
  Truncates or slices the boxed string payload in place without reallocating a wrapper container. Throws a runtime error if indices are out of bounds or negative.

#### Collection Memory Recycling & Capacity Control

These reset element counts or pre-allocate memory while preserving the underlying container references.

- `clear_shared_list(shared list<any> target)`
  Resets list length to `0` while retaining allocated memory capacity.
- `clear_shared_map(shared map<any> target)`
  Empties map keys in place.
- `reserve_shared_list_capacity(shared list<any> target, number extra_capacity)`
  Pre-allocates backing storage for `extra_capacity` elements on the host runtime.

#### Bulk Collection Manipulations

- `append_shared_list(shared list<any> target, shared list<any> source)`
  Appends all items from a source list directly onto the end of a target list in a single native operation.
- `merge_shared_map(shared map<any> target, shared map<any> source)`
  Merges all key-value pairs from a source map into a target map in place.

---

### Native Byte & List Offloading Intrinsics

These intrinsics offload loops and search operations on byte arrays or general lists directly to host machine code, maximizing lexing and parsing performance.

#### Byte Searching
- `find_next_byte(shared list<number> bytes, number start_index, list<number> target_bytes) number`
  Scans `bytes` starting at `start_index` and returns the index of the first element matching any byte code in `target_bytes`. Returns `-1` if not found.
- `find_next_non_matching_byte(shared list<number> bytes, number start_index, list<number> ignore_bytes) number`
  Scans `bytes` starting at `start_index` and returns the index of the first element that does NOT match any byte code in `ignore_bytes`. Returns `-1` if all elements match.
- `find_next_sequence(shared list<number> bytes, number start_index, list<number> sequence) number`
  Searches for the first occurrence of multi-byte `sequence` in `bytes` starting at `start_index`. Returns the starting index of the match, or `-1` if not found.

#### Structural Inspection
- `count_byte_occurrences(shared list<number> bytes, number start_index, nullable<number> end_index, number byte_code) number`
  Counts the number of times `byte_code` appears in `bytes` between `start_index` (inclusive) and `end_index` (exclusive or end of list if `null`).

#### Bulk Memory Copy
- `copy_shared_list_slice(shared list<any> target, number dest_index, shared list<any> source, number source_start, nullable<number> source_end) none`
  Copies elements from `source[source_start:source_end]` to `target` starting at `dest_index` at native speed. Overwrites existing elements or appends/grows `target` if the write position exceeds target's current length.

---

### Mathematical Operations

All math operations expect finite numeric inputs and throw runtime errors if inputs are invalid or missing.

| Intrinsic Function | Signature | Description |
| :--- | :--- | :--- |
| `calc_sqrt` | `calc_sqrt(number n) number` | Returns the square root of `n`. |
| `calc_log10` | `calc_log10(number n) number` | Returns the base-10 logarithm of `n`. |
| `calc_natlog` | `calc_natlog(number n) number` | Returns the natural logarithm (base-e) of `n`. |
| `round_number` | `round_number(number n) number` | Rounds `n` to the nearest integer. |
| `round_number_up` | `round_number_up(number n) number` | Rounds `n` up to the nearest integer (ceiling). |
| `round_number_down` | `round_number_down(number n) number` | Rounds `n` down to the nearest integer (floor). |
| `calc_absolute` | `calc_absolute(number n) number` | Returns the absolute value of `n`. |
| `calc_sin` | `calc_sin(number n) number` | Returns the sine of `n` (radians). |
| `calc_cos` | `calc_cos(number n) number` | Returns the cosine of `n` (radians). |
| `calc_tan` | `calc_tan(number n) number` | Returns the tangent of `n` (radians). |
| `calc_asin` | `calc_asin(number n) number` | Returns the arcsine of `n` (radians). |
| `calc_acos` | `calc_acos(number n) number` | Returns the arccosine of `n` (radians). |
| `calc_atan` | `calc_atan(number n) number` | Returns the arctangent of `n` (radians). |
| `calc_atan2` | `calc_atan2(number y, number x) number` | Returns the arctangent of the quotient `y/x` (radians). |
| `convert_deg_to_rad` | `convert_deg_to_rad(number deg) number` | Converts degrees to radians. |
| `convert_rad_to_deg` | `convert_rad_to_deg(number rad) number` | Converts radians to degrees. |

---

### Filesystem Operations

> [!WARNING]
> These intrinsics are disabled in sandboxed core runtimes (e.g. standard `Shift` execution context) and throw an exception if invoked. They are only active in extended environment runtimes (like [`NodeShift`](file://172.21.1.91/homes/developer/js/shift-lang/js_runtime/src/node_fs.mjs#L246) or non-core builds of Go runtime).

| Function | Signature | Description |
| :--- | :--- | :--- |
| `read_file` | `read_file(string path) string` | Reads the full content of the file at `path`. |
| `write_file` | `write_file(string path, string content) none` | Writes `content` to the file at `path`, overwriting if exists. |
| `create_file` | `create_file(string path) none` | Creates a new empty file at `path`. |
| `delete_file` | `delete_file(string path) none` | Deletes the file at `path`. |
| `file_exists` | `file_exists(string path) bool` | Returns `true` if `path` exists and is a file. |
| `copy_file` | `copy_file(string source, string dest) none` | Copies file content from `source` to `dest`. |
| `move_file` | `move_file(string source, string dest) none` | Renames or moves a file from `source` to `dest`. |
| `create_folder` | `create_folder(string path) none` | Recursively creates a folder directory at `path`. |
| `delete_folder` | `delete_folder(string path) none` | Recursively deletes the folder at `path`. |
| `folder_exists` | `folder_exists(string path) bool` | Returns `true` if `path` exists and is a directory. |
| `copy_folder` | `copy_folder(string source, string dest) none` | Recursively copies folder from `source` to `dest`. |
| `move_folder` | `move_folder(string source, string dest) none` | Renames or moves a folder from `source` to `dest`. |

---

## 3. Shift-Native Standard Library

Currently, all built-in helper functions are implemented directly as host-native intrinsics for optimal performance. The Shift portion of the standard library in [`stdlib.shift`](file://172.21.1.91/homes/developer/js/shift-lang/go_runtime/pkg/stdlib/stdlib.shift) is reserved for future high-level logic.
