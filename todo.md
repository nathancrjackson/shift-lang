# To-do

Shift is still in it's early days and so far the focus has been on getting a functional prototype off the ground.

This document outlines the some of the tasks required to make Shift a robust, production-ready language.

- Implement stack traces.
- Write usable Standard Library (in Shift where possible).
- Write so many more tests, there are many, many, many different ways to cast, nest, loop or deliberately break things that are not being checked.
- Create test suite for validating already compiled JSON AST.
- Implement JSON AST deserialization in the Go runtime to allow direct execution of precompiled `.stree` files.

## StructLiteral Implementation
To prevent silent zero-value initialization bugs and ensure strict syntactic validation of structs:
- [ ] **AST Specification & Validation**:
  - Define `StructLiteral` in `ast_schema.json` containing `structName` (string) and `entries` (array of key-value properties), adding it to the `Expression` union.
  - Document the structure of the `StructLiteral` node type in `docs/6_ast_specification.md`.
- [ ] **JS Runtime**:
  - Modify `validateStructLiteral(...)` in `parser.mjs` to output type `"StructLiteral"` (including `"structName": structName`) instead of a plain `"MapLiteral"`.
  - Add support for evaluating `"StructLiteral"` in `runtime.mjs`'s evaluation loop/switch.
- [ ] **Go Runtime**:
  - Define `StructLiteral` struct in `ast.go` & register it under unmarshal.go.
  - Align Go parser/typechecker to expect/validate `StructLiteral` AST nodes when verifying struct types.
  - Add evaluation case for `StructLiteral` in `evaluate.go`.
- [ ] **Verification**:
  - Re-run AST asset generator `generate_ast_assets.mjs` and test conversion `convert_tests_to_json.mjs`.
  - Verify full test suites for both JS and Go runtimes.