# Shift Testing Architecture

This document outlines the testing architecture, processes, and tools used to verify the correctness, performance, and parity of both the Go and JavaScript implementations of the Shift language.

## Overview

Shift implements a **unified test architecture** where core language behavior is written once in JavaScript and translated automatically to run across both runtimes. 

| Source / Step | Action / Process | Target / Runner |
| :--- | :--- | :--- |
| **JS Shared Modules** <br> `js_runtime/unit_tests/test_modules/` | Convert Utility | `convert_tests_to_json.mjs` |
| `convert_tests_to_json.mjs` | Generate JSON | **JSON Vectors** <br> `go_runtime/unit_tests/tests_json/` |
| **JS Test Runner** <br> `run_js_runtime_tests.mjs` | Runs | **JS Shared Modules** |
| **Go Test Runner** <br> `go test ./...` | Runs | **JSON Vectors** |

> **Note:** General language feature tests that apply to all implementations must be written in the shared JavaScript modules (`js_runtime/unit_tests/test_modules/`). Direct runtime-specific robustness tests are run separately.

---

## JS Runtime Testing

The JS runtime tests cover interpreter core tests, direct safety validations, sandbox constraints, and filesystem overrides.

### Running JS Tests
To run the full JS test suite:
```bash
cd js_runtime/unit_tests/
node run_js_runtime_tests.mjs
```

### Direct JavaScript Safety & Robustness Tests
Direct safety tests are run dynamically inside `run_js_runtime_tests.mjs` but are housed in the dedicated module `js_runtime/unit_tests/direct_safety_tests.mjs` These tests cover JS-specific integrations and sandboxing rules that do not translate to Go:

1. **JS-Level Intrinsics Safety Checks**:
   - **Circular Reference Serialization**: Ensures parsing a circular structure doesn't cause a stack overflow.
   - **Parameter Count Check**: Verifies that standard intrinsics (e.g., `print_line`) throw if called with incorrect argument lengths.
   - **Value Boundary Guards**: Tests that range and time intrinsics correctly throw on `NaN` or `Infinity` arguments.
2. **Sandbox & Core Mode Constraints**:
   - Verifies that filesystem intrinsics and script imports are disabled in Core Mode.
   - Asserts that custom `importResolver` overrides work as intended.
3. **NodeShift Filesystem Verification**:
   - Tests file and directory manipulation intrinsics (`create_file`, `write_file`, `copy_file`, `delete_file`, `create_folder`, etc.) against a temp directory.
4. **Refactoring Safety & Custom Error Assertions**:
   - Asserts that `validateAST` throws `ShiftValidationError` on invalid/null AST nodes.
   - Asserts that the `Lexer` constructor throws `ShiftLexerError` on invalid source code inputs.
   - Asserts that the `Parser` constructor throws `ShiftParserError` on invalid token lists or imported files sets.
   - Asserts that `Runtime` constructor and functions throw `ShiftRuntimeError` on invalid arguments.
   - Asserts that `node_fs.mjs` resolves imports and reads files using injected dependencies safely, throwing `ShiftRuntimeError` on failures.

---

## Go Runtime Testing

The Go runtime executes tests covering AST parsing safety, execution boundary correctness, and parity using the JSON-serialized test vectors.

### Running Go Tests
To execute standard Go tests:
```bash
cd go_runtime/
go test ./...
```

### Running Core Build Tests
To build and test Go files tagged under standard sandboxed core constraints:
```bash
cd go_runtime/
go test -tags core ./...
```

---

## Cross-Runtime Test Parity (JS ➔ Go Porting)

To maintain absolute feature and behavioral parity between the Go and JavaScript implementations:

1. **Write Tests in JavaScript**: Create new language, edge-case, and syntax validation tests in the JS unit test modules: `js_runtime/unit_tests/test_modules/`.
2. **Convert to JSON**: Execute the test conversion utility to build JSON vectors:
   ```bash
   node js_runtime/utils/convert_tests_to_json.mjs
   ```
   This script parses all shared JS test modules and outputs them as structured JSON files inside `go_runtime/unit_tests/tests_json/` where the Go runtime automatically picks them up.