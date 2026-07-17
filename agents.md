# Shift Lang Architecture Guidance

This document provides application architecture guidance specific to the constraints, design philosophy, and multi-language requirements of the Shift Language project.

## 1. System Design & Pipeline Architecture

- Strict Compilation Pipeline Decoupling: The Shift language implementation must follow a clean, modular pipeline:
  - Lexer: Tokenizes source text, emitting a deterministic list of tokens. Must not perform syntactic validation or construct AST nodes.
  - Parser: Parses tokens into the standard AST JSON format. Must be independent of the execution runtime.
  - AST Validator: Validates the structure and type-safety constraints of the generated JSON AST.
  - Interpreter (Engine): Executes a validated JSON AST. Must contain no parser or lexer dependencies, allowing execution of precompiled AST files.
- Cross-Runtime Parity: The JavaScript/Node.js runtime (`js_runtime`) and the Go runtime (`go_runtime`) must maintain 100% functional, syntax, and execution parity. Any syntax additions or standard library expansions must be implemented in both runtimes.
- Host-Interpreter Isolation (Sandboxing): The interpreter must run in a secure, sandboxed context (Core Mode by default). Runtimes must never access host resources (filesystem, process environment, imports) directly. Instead, these must be explicitly injected into the engine by the host application via interface abstractions (e.g., custom import resolvers, filesystem drivers).

## 2. API & AST Schema Strategy

- AST-First Schema Contracts: The JSON Abstract Syntax Tree (AST) structure is the formal contract of the language. Any new keyword, operator, statement, or expression must first be defined in `ast_specification.md` and added to `/js_runtime/src/ast_schema.json` before any compiler or interpreter implementation begins.
- AST Code Generation Pipeline: `js_runtime/src/ast_schema.json` is the single source of truth for the AST. When making schema changes, you **must** run the asset generator script:
  ```bash
  node js_runtime/utils/generate_ast_assets.mjs
  ```
  This automatically regenerates `go_runtime/pkg/ast/ast.go`, `go_runtime/pkg/ast/unmarshal.go`, and `ast_specification.md`. Do not modify these auto-generated files manually.
- Strict Parsing Schemas: All runtime components (parser, validator, and interpreter) must defensively validate the AST structure. The Go runtime must implement JSON AST deserialization and structure checks that mirror the JavaScript `ast_validator.mjs` validation logic.
- Zero-Value Initialization & Null Safety: The compiler and runtime must guarantee zero-value safety. Variables and struct fields must be initialized to their designated zero-value defaults on declaration, unless declared as `nullable<T>`.

## 3. Technology Stack & Runtime Hierarchy

- JavaScript Runtime (`js_runtime`):
  - Code must be written in pure ES Modules (`.mjs`) to allow seamless usage in both modern Node.js and browser environments.
  - Core library builds (e.g., `shift_core_lib.mjs`) must be generated without external dependencies or Node-specific built-ins (`fs`, `path`) to preserve core mode safety.
- Go Runtime (`go_runtime`):
  - Written in idiomatic Go with standard package organization (`pkg/lexer`, `pkg/parser`, `pkg/runtime`).
  - Use build tags (e.g., `-tags core`) to conditionally compile out host-level filesystem access, ensuring compile-time safety for embedded environments.
- Web Frontend Sandbox (`docs/`):
  - The interactive sandbox must default exclusively to Vanilla HTML, CSS, and JS (running the JS runtime in the browser) to maintain instant load times and lightweight footprint. Modern frontend frameworks are prohibited.

## 4. State & Memory Management

- Pass-by-Value Semantics: All data structures in Shift (lists, maps, structs) are treated as values. The runtimes must enforce deep copying/cloning when:
  - Passing arguments into functions.
  - Returning structures from functions.
  - Assigning collection values to variables.
  - Doing pipeline (`|`) evaluations.
- Deterministic Resource Limits: Runtimes must support execution instruction limiting (infinite loop protection) via configurable instruction thresholds (`maxInstructions`).

## 5. Testing & Validation

- Cross-Runtime Test Harness: Runtimes must be validated against a unified set of test cases. A standard suite of source scripts and expected AST JSON structures must be shared or replicated between the JS unit tests (`js_runtime/unit_tests`) and Go unit tests (`go_runtime/unit_tests`).
- Unified Test Porting: General language features and parser unit tests are written in JavaScript inside `js_runtime/unit_tests/test_modules/`. To propagate them to the Go runtime, run the conversion utility:
  ```bash
  node js_runtime/utils/convert_tests_to_json.mjs
  ```
  This creates JSON test vectors in `go_runtime/unit_tests/tests_json/` which the Go test harness automatically runs.
- Running Test Suites:
  - JavaScript: Run `node run_js_runtime_tests.mjs` from within `js_runtime/unit_tests/`.
  - Go: Run `go test ./...` (standard mode) and `go test -tags core ./...` (sandboxed core mode) from within `go_runtime/`.
- Defensive Error Handling: Compiler and interpreter errors must be deterministic. They must produce consistent error messages, including character offsets, lengths, and line numbers (`line`) to allow easy debugging by the user.

## 6. Shared standard library & Build Pipelines

- Central Standard Library (`stdlib.shift`): Standard library routines written in Shift are housed centrally in `go_runtime/pkg/stdlib/stdlib.shift`.
  - Go Integration: Statically embeds the file using Go's `embed` package at build time.
  - JavaScript Integration: In development, it reads from the file on disk. For production, the bundler script inlines the escaped contents directly.
- Bundling JS Libraries: Rebuild the output packages in `js_runtime/dist/` using:
  - Standard bundle: `node js_runtime/utils/lib_bundler.js`
  - Core (sandboxed) bundle: `node js_runtime/utils/lib_bundler.js --core`
- Recompiling the Playground (`js_runtime/utils/build_docs.js`): Rebuild the standalone, self-contained HTML playground (`docs/index.html`) using:
  ```bash
  node js_runtime/utils/build_docs.js
  ```
  This compilation pipeline automates the following steps:
  - Triggers the rebuild of both standard and core JS distributions using `lib_bundler.js`.
  - Generates a timestamped version identifier (e.g., `Version YY.MM.DD.HHMM`).
  - Reads playground template assets (`index.template.html`, `style.css`, and `app.js`) from `.github/workflows/`.
  - Preprocesses the compiled `shift_core_lib.mjs` library by stripping its ESM `export` keywords so that class definitions are exposed as global window variables in the browser context.
  - Injects the compiled styling, preprocessed script, app logic, and version timestamp into the template to output a single, zero-dependency `docs/index.html` file.

# Coding Best Practices To Follow

## Architecture & Function Design

- Single Responsibility Principle (SRP): Each function must do one thing and do it completely. If a function requires an "and" in its description (e.g., `calculate_totals_and_save_to_db`), it should be split into separate functions.
- Avoid High Line Counts & Cyclomatic Complexity: Minimise line count per function and keep cyclomatic complexity low. Minimize nested `if` statements and loops.
- Pure Functions Where Possible: Prioritize deterministic functions that take inputs and return outputs without modifying global state or causing unintended side effects.

## Auditability & Traceability

- Explicit Input Validation (Guard Clauses): Every function should validate its inputs at the very top. Use guard clauses to exit early if preconditions aren't met, making the execution flow obvious.
- Comprehensive Logging & Tracing: Include structured logging inside functions to record key execution checkpoints, inputs, and outputs (ensuring no sensitive PII is logged).
- Deterministic Errors and Exceptions: Avoid generic error catches. Functions should catch specific exceptions, wrap them with contextual information, and rethrow or handle them predictably.

## Schema Awareness & Evolution

- Self-Identifying Data Structures: Any function that persists, caches, or serializes state to disk/memory must include a `version` attribute or metadata header within the data structure itself.
- Defensive Schema Parsing: Code that reads serialized data (e.g., JSON caches, config files) must explicitly check the data's version before processing it. If an older version is detected, the function must either execute a deterministic migration pathway or gracefully invalidate and recreate the data.

## Readability & Documentation

- Self-Documenting Code: Choose highly descriptive, intent-revealing names for functions and variables (e.g., use `is_user_eligible_for_discount` instead of `check_user`).
- Standardized Docstrings: Every function must include a docstring detailing its single purpose, input parameters (with types), return values, and any raised exceptions.
- Explicit Type Hinting: Use strict typing (e.g., TypeScript, Python type hints, or Rust) to make data structures and function contracts crystal clear without needing to execute the code.

## Testability & State Management

- Immutability: Treat inputs as immutable. Functions should return new data structures rather than mutating the arguments passed to them.
- Dependency Injection: Pass external dependencies (like database clients or APIs) as arguments to the function rather than letting the function fetch or instantiate them internally. This makes mocking and auditing trivial.
- 1:1 Test Mapping: Because functions are small and single-purpose, each should map to a direct unit test suite that covers $100\%$ of its logical paths.
