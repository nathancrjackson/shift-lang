# The Shift Programming Language

**Shift** is a domain-specific language (DSL) designed for writing clear, portable, and reliable data logic. It bridges the gap between static data formats (like JSON/YAML) and full-scale programming languages (like C or Go). Shift is intended as a modern, safe alternative to embeddable scripting languages like Lua.

**Try the language online:** [Shift Language Playground](https://nathancrjackson.github.io/shift-lang/)

---

## Key Features

1. **Readable Pipeline Processing:** Chain data transformations from left to right using the Pipe Operator (`|`) and the magic variable `$pipe_value`.
   ```shift
   our_user["role"] = our_user["role"] 
       | trim_string($pipe_value) 
       | transform_ansistring_to_uppercase($pipe_value);
   ```
2. **Zero-Value Safety:** Variables are strictly scoped and automatically initialized to safe defaults upon declaration (`""`, `0`, `false`, `[]`), eliminating uninitialized variable bugs.
3. **Robust Collections:** First-class generic lists (`list<T>`), maps (`map<T>`), and schemas/structures (`struct`) with literal syntax.
4. **Error & Validation Separation:** Distinct code pathways for runtime faults (`catch`) and soft validation failures (`review`).
5. **Secure Sandboxing (Core Mode):** Standard execution blocks imports and filesystem access. Filesystem packages can be omitted entirely at compilation/build time for lightweight browser or host environment safety.

---

## Quick Example

```shift
struct User [
    string $id, // Required & Immutable field
    string name,
    bool is_active
]

function main() number {
    User u = [
        "$id": "usr_100",
        "name": "  Nate  ",
        "is_active": true
    ];
    
    // Clean string transformations using pipes
    u["name"] = u["name"] | trim_string($pipe_value);
    
    print_line("Loaded user: " & u["name"]); // Loaded user: Nate
    return 0;
}
```

---

## Documentation Hub

Explore the Shift specifications, guides, and implementation details:

### 📖 User & Syntax Guides
*   **[Introduction to Writing Shift](docs/intro_to_writing_shift.md)**: A beginner's guide to writing Shift Script. Covers basic syntax, variables, primitive types, collections, control flow, functions, the pipe operator, and error handling.
*   **[Language & System Overview](docs/shift_overview.md)**: Details the design philosophy, core features, three-stage compilation pipeline (`.shift` source -> `.stree` AST JSON -> Shift Engine), and built-in sandboxing (Core Mode).

### ⚙️ Deep Dives & Architecture
*   **[JavaScript Developer Deep Dive](docs/deepdive_jsruntime.md)**: Instructions on running the JS interpreter in Node.js and browsers, executing pre-compiled ASTs, custom options (import resolvers, instruction limits), and packaging/bundling.
*   **[Go Developer Deep Dive](docs/deepdive_goruntime.md)**: A developer guide to integrating the Go runtime interpreter into host applications, mapping types, registering custom intrinsics/magic variables, and compiling/testing.
*   **[AST Specification](docs/ast_specification.md)**: The structural schema for the Shift Tree (`.stree`) AST, serving as the language-independent intermediate representation.
*   **[Testing Architecture](docs/testing_architecture.md)**: Describes the cross-runtime testing suite where tests are written in JavaScript, converted to JSON vectors, and run on both interpreters to ensure 100% parity.

---

## Building and Testing

Shift is implemented as dual, feature-parity runtimes in **Go** and **JavaScript**.

### Go Runtime
```bash
cd go_runtime/
go test ./...               # Run standard tests
go test -tags core ./...    # Test sandboxed core limits
```

### JavaScript Runtime
```bash
cd js_runtime/unit_tests/
node run_js_runtime_tests.mjs   # Run interpreter, safety, and filesystem tests
```

To regenerate the AST code and documentation from the JSON schema:
```bash
node js_runtime/utils/generate_ast_assets.mjs
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
