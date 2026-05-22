# Developer Deep Dive: Integrating & Building Shift

This document provides technical instructions for developers looking to integrate the Shift scripting engine into Go or JavaScript hosts, build the runtimes, and contribute to the language.

---

## 1. Runtimes Integration Guide

Shift is designed to be embedded as a lightweight, safe scripting sandbox inside larger host applications.

### JavaScript Integration

To embed the Shift runtime in a JavaScript application (Browser or Node.js), import either the browser-safe `Shift` class or the Node-specific `NodeShift` wrapper.

#### Standard Sandboxed Core Mode (Browser/Node.js)
```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const engine = new Shift();
try {
    const result = engine.run(`
        function main() number {
            return 40 + 2;
        }
    `, "main", []);
    console.log("Result:", result); // Output: 42
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

#### Node-Enabled Mode (With Filesystem & Imports)
```javascript
import { NodeShift } from './js_runtime/dist/shift_lib.mjs';

// NodeShift is pre-configured with a Node.js-based filesystem and import resolver
const engine = new NodeShift();
const result = engine.run(`
    import "utils.shift";
    function main() string {
        return read_file("config.json");
    }
`);
```

#### Supply a Custom Import Resolver
In JavaScript, you can configure custom resolution behavior (such as loading files from a database, in-memory virtual filesystem, or remote endpoint):
```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const engine = new Shift(null, null, {
    importResolver: (requestedPath, parentPath) => {
        // Resolve and return file content
        return {
            code: "function my_imported_func() string { return \"Hello!\"; }",
            resolvedPath: `/virtual-fs/${requestedPath}` // Prevents circular import loops
        };
    }
});
```

#### Enforcing Instruction Limits (CPU Sandboxing)
Set `maxInstructions` to limit CPU execution time and protect against infinite loops:
```javascript
const engine = new Shift(null, null, { maxInstructions: 50000 });
```

---

### Go Integration

To embed Shift inside a Go service:

```go
package main

import (
	"fmt"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		function main() number {
			return 100 * 2;
		}
	`

	// 1. Lexical Analysis
	l := lexer.NewLexer(source)
	tokens := l.Tokenize()

	// 2. Parsing & Compilation
	p := parser.NewParser(tokens)
	stdlib.LoadDefinitions(p) // Load standard structs and intrinsics
	
	ast, err := p.Parse()
	if err != nil {
		panic(err)
	}

	// 3. Execution (Supply false to run in sandboxed core mode)
	rt := runtime.NewRuntime(ast, false)
	stdlib.LoadIntrinsics(rt) // Register stdlib functions on the interpreter instance
	
	result, err := rt.RunFunction("main", nil)
	if err != nil {
		panic(err)
	}
	
	fmt.Printf("Result: %v\n", result) // Output: 200
}
```

#### Custom Import Resolver in Go
To resolve imported files dynamically:
```go
p := parser.NewParser(tokens).WithImportResolver(func(requestedPath string, currentFilePath string) (parser.ImportResolution, error) {
	return parser.ImportResolution{
		Code:         "function helper() number { return 10; }",
		ResolvedPath: "/abs/path/to/helper.shift",
	}, nil
})
```

#### Enforcing Instruction Limits in Go
Set the instruction limit on the runtime to abort executing after a certain amount of operations:
```go
rt.SetMaxInstructions(100000)
```

---

## 2. Shared Standard Library Orchestration

The core logic of the Shift standard library (which is written in the Shift programming language itself) is kept unified inside a single file:
👉 **[go_runtime/pkg/stdlib/stdlib.shift](file:///home/nathan/Mounts/dev-home/js/shift-lang/go_runtime/pkg/stdlib/stdlib.shift)**

This design ensures complete feature parity between the Go and JavaScript interpreters.

### How Go Integrates `stdlib.shift`
In Go, `stdlib.shift` is embedded directly into the Go binary at compile-time using Go's `//go:embed` directive inside `go_runtime/pkg/stdlib/stdlib.go`. This keeps the library self-contained inside the compiled executable.

### How JavaScript Integrates `stdlib.shift`
In JavaScript, integration is split between development and production builds:
1. **Development Runtime (Direct ESM execution)**:
   When running the JavaScript source code directly in Node, `js_runtime/src/standard_library.mjs` uses dynamic ESM imports to load Node's `fs` and `path` modules and reads `stdlib.shift` synchronously from the repository files on disk.
2. **Production Bundle**:
   When bundling the distribution packages (`shift_lib.mjs` and `shift_core_lib.mjs`), `js_runtime/utils/lib_bundler.js` reads the file and replaces `"standardLibrarySourcePlaceholder"` in the code with the fully escaped inlined content of `stdlib.shift` inside a template literal. It also strips the dynamic disk-loader block so the output bundle is fully self-contained and free of Node dependencies.

---

## 3. Testing and Building Runtimes

### Unified Cross-Runtime Testing (JS ➔ Go JSON Porting)

To maintain absolute behavioral consistency and feature parity between the Go and JavaScript implementations:
1. **Write Tests in JavaScript First**: All language features, edge cases, and parser unit tests are written in the JavaScript unit tests (`js_runtime/unit_tests/test_modules/`).
2. **Serialize to JSON**: The test conversion tool parses and translates these modules:
   ```bash
   node js_runtime/utils/convert_tests_to_json.mjs
   ```
   This script scans the `.mjs` test files, resolves module exports, and writes them out as structured JSON files inside `go_runtime/unit_tests/tests_json/`.
3. **Consume in Go**: The Go runtime test suite parses these JSON test specs during `go test ./...` execution to run the exact same scripts and assert identical results across both runtimes.

### JavaScript Runtime (`js_runtime/`)

#### Testing JS Runtimes
To run the full JS test suite (including interpreter core tests, direct safety validations, sandbox constraints, and node filesystem overrides):
```bash
cd js_runtime/unit_tests/
node run_js_runtime_tests.mjs
```

#### Bundling JS Distributions
To rebuild the distribution libraries output inside `js_runtime/dist/`:
- **Standard Bundle** (includes Node.js native filesystem access):
  ```bash
  node js_runtime/utils/lib_bundler.js
  ```
- **Core Bundle** (completely sandboxed browser-safe JS library):
  ```bash
  node js_runtime/utils/lib_bundler.js --core
  ```

#### Recompiling Playground (`docs/index.html`)
To build a standalone web playground:
```bash
node js_runtime/utils/build_docs.js
```
This automatically runs standard and core builders, generates a `Version YY.MM.DD.HHMM` timestamp, bundles CSS/HTML assets, and compiles them into `docs/index.html`.

### Go Runtime (`go_runtime/`)

#### Testing Go Runtimes
Go tests can be run in two modes:
1. **Standard Mode**: Runs standard features including active OS file/folder intrinsics.
   ```bash
   cd go_runtime/
   go test ./...
   ```
2. **Core Mode**: Tests core sandbox environments.
   ```bash
   cd go_runtime/
   go test -tags core ./...
   ```

#### Building Go Executable
```bash
cd go_runtime/
go build -o shift cmd/shift/main.go
```
