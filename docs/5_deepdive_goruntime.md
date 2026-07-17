# Go Developer Deep Dive

_Integrating & Building Shift_

This document provides technical instructions for developers looking to integrate the Shift scripting engine into Go host applications, customise the runtime, move data between the host and interpreter, and build/test the codebase.

---

## 1. Runtime integration

### a. Standard Sandboxed Core Mode
Standard Sandboxed Core Mode runs user Shift code in a secure, isolated sandbox. In this mode, external imports and filesystem functions (`read_file`, `write_file`, etc.) are disabled. 

To run the interpreter in Standard Sandboxed Core Mode, parse the tokens without attaching a custom import resolver, load the core definitions/intrinsics, and execute:

```go
package main

import (
	"fmt"
	"log"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		function main() number {
			return 40 + 2;
		}
	`

	// 1. Lexical Analysis
	l := lexer.NewLexer(source)
	lexResult := l.Tokenize()
	if len(lexResult.Errors) > 0 {
		log.Fatalf("Lexer error: %v", lexResult.Errors)
	}

	// 2. Syntactic Analysis (Parsing)
	p := parser.NewParser(lexResult.Tokens)
	stdlib.LoadDefinitions(p) // Load standard library types and core functions
	parseResult := p.Parse()
	if len(parseResult.Errors) > 0 {
		log.Fatalf("Parser error: %v", parseResult.Errors)
	}

	// 3. Runtime Initialization
	rt := runtime.NewRuntime(parseResult.AST, false)
	stdlib.LoadIntrinsics(rt) // Load core intrinsics implementation

	// 4. Execution
	res, err := rt.RunFunction("main", []any{})
	if err != nil {
		log.Fatalf("Runtime error: %v", err)
	}

	fmt.Println("Result:", res) // Output: 42
}
```

### b. Filesystem & Imports enabled Mode
In this mode, external imports and active filesystem functions are enabled. 
1. Compile the Go package **without** the `core` build tag (this automatically registers the filesystem intrinsics from `stdlib_fs.go`).
2. Provide a custom filesystem `ImportResolver` to the parser, and set the current file path on the parser instance to allow relative resolution.

```go
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		import "utils.shift";

		function main() string {
			return read_file("config.json");
		}
	`

	l := lexer.NewLexer(source)
	lexResult := l.Tokenize()

	// 1. Implement a filesystem-based ImportResolver
	resolver := func(requestedPath string, currentFilePath string) (parser.ImportResolution, error) {
		var fullPath string
		if currentFilePath != "" {
			fullPath = filepath.Join(filepath.Dir(currentFilePath), requestedPath)
		} else {
			cwd, _ := os.Getwd()
			fullPath = filepath.Join(cwd, requestedPath)
		}
		
		absPath, err := filepath.Abs(fullPath)
		if err != nil {
			absPath = fullPath
		}

		bytes, err := os.ReadFile(absPath)
		if err != nil {
			return parser.ImportResolution{}, err
		}

		return parser.ImportResolution{
			Code:         string(bytes),
			ResolvedPath: absPath,
		}, nil
	}

	// 2. Set the resolver and the starting file path
	p := parser.NewParser(lexResult.Tokens).
		WithImportResolver(resolver).
		WithCurrentFilePath("main.shift")
	stdlib.LoadDefinitions(p)

	parseResult := p.Parse()
	if len(parseResult.Errors) > 0 {
		log.Fatalf("Parser error: %v", parseResult.Errors)
	}

	rt := runtime.NewRuntime(parseResult.AST, false)
	stdlib.LoadIntrinsics(rt)

	res, err := rt.RunFunction("main", []any{})
	if err != nil {
		log.Fatalf("Runtime error: %v", err)
	}

	fmt.Println("Result:", res)
}
```

### c. How to set instruction limits
To limit CPU execution duration and prevent infinite loops, configure a maximum instruction step count on the runtime instance.

By default, the low-level Go `Runtime` initializes with a limit of `0` (no limit).

```go
rt := runtime.NewRuntime(parseResult.AST, false)
rt.SetMaxInstructions(50000) // Caps total execution steps to 50,000

// Setting it to 0 (or keeping the default) disables instruction limiting
rt.SetMaxInstructions(0)
```

---

## 2. DataType Mapping Reference

When passing parameters to the Shift engine or receiving return values, Shift types map directly to Go native types:

| Shift Type | Go Native Type | Description / Notes |
|---|---|---|
| `number` | `float64` | All numeric values are double-precision floats. |
| `string` | `string` | Standard Go strings (UTF-8). |
| `bool` | `bool` | `true` or `false`. |
| `null` / `none` | `nil` | Evaluates to `nil`. |
| `list<T>` | `[]any` | Go slice containing elements of mapped types. |
| `map<T>` | `*runtime.ShiftMap` | Custom pointer to ShiftMap structure preserving insertion order. |
| Struct (e.g., `User`) | `*runtime.ShiftMap` | Custom pointer to ShiftMap structure with `StructName` set to struct name. |

---

## 3. Runtime customisation

### a. Custom Import resolver
You can configure a custom resolver callback on the parser (e.g., fetching scripts from in-memory virtual filesystems, databases, or remote web services):

```go
p := parser.NewParser(tokens).
	WithImportResolver(func(requestedPath string, currentFilePath string) (parser.ImportResolution, error) {
		// Custom logic: return code and a resolved path to prevent cyclic import loops
		return parser.ImportResolution{
			Code:         "function remote_val() string { return \"Remote code!\"; }",
			ResolvedPath: "/virtual-fs/" + requestedPath,
		}, nil
	})
```

### b. Custom Filesystem tools
Standard filesystem intrinsics (`read_file`, `write_file`, etc.) can be overridden or defined with custom implementations (e.g., using a mock virtual filesystem) by registering custom functions under the standard filesystem function names:

```go
rt.AddIntrinsic("read_file", func(args []any, r *runtime.Runtime) any {
	path := args[0].(string)
	// Read from a custom virtual directory or mock state
	return "Mock content for " + path
})
```

### c. Custom standard library
You can inject global standard library functions and structures (written in Shift) into the parser and compile pipeline. This exposes them automatically to every user script.

```go
// 1. Declare custom standard library structs and functions
customStdLibSource := `
	struct Metadata [
		string source,
		number priority
	]

	function prepare_metadata(string src, number prio) Metadata {
		Metadata m = [
			"source": src,
			"priority": prio
		];
		return m;
	}
`

// 2. Parse custom standard library code
stdLexer := lexer.NewLexer(customStdLibSource)
stdParser := parser.NewParser(stdLexer.Tokenize().Tokens)
stdResult := stdParser.Parse()

// 3. Inject standard library definitions into the user script parser
userParser := parser.NewParser(userTokens)
stdlib.LoadDefinitions(userParser) // Load built-ins first

// Inject custom structs
for k, v := range stdParser.structDefinitions {
	userParser.AddKnownType(k)
	userParser.AddStructDefinition(k, v)
}

// Inject custom function prototypes
for _, f := range stdResult.AST.Functions {
	params := []ast.Parameter{}
	for _, param := range f.Params {
		params = append(params, param)
	}
	typ := parser.TypeDef{Type: "Type", Name: f.ReturnType.Name, Initialized: true, Params: params}
	if f.ReturnType.Generic != nil {
		typ.Generic = f.ReturnType.Generic
	}
	userParser.AddGlobalVariable(f.Name, typ)
}

// 4. Parse user code and merge the ASTs
userResult := userParser.Parse()
program := userResult.AST
program.Structs = append(stdResult.AST.Structs, program.Structs...)
program.Functions = append(stdResult.AST.Functions, program.Functions...)

// 5. Initialise runtime with compiled program
rt := runtime.NewRuntime(program, false)
```

### d. Custom native intrinsic functions
You can declare custom native functions (written in Go) that scripts can invoke directly. Register the function signature with the parser for compile-time validation, and add the callback to the runtime:

```go
// 1. Register signature with parser before parsing user code
p.AddGlobalVariable("fetch_external_data", parser.TypeDef{
	Type: "Type",
	Name: "string", // Return type
	Params: []ast.Parameter{
		{Name: "query", DataType: ast.TypeAnnotation{Name: "string"}},
	},
	Initialized: true,
})

parseResult := p.Parse()

// 2. Register native implementation on runtime before execution
rt := runtime.NewRuntime(parseResult.AST, false)
rt.AddIntrinsic("fetch_external_data", func(args []any, r *runtime.Runtime) any {
	query := args[0].(string)
	// Execute host-level Go logic
	return fmt.Sprintf("Data for: %s", query)
})
```

### e. Custom intrinsic structs
You can register custom host-supplied structures programmatically with the parser. This allows user scripts to write variables with those types and have them statically checked during parsing.

```go
// 1. Declare struct layout
fields := []ast.StructField{
	{Name: "host_key", Type: ast.TypeAnnotation{Name: "string"}},
	{Name: "status_code", Type: ast.TypeAnnotation{Name: "number"}},
}

// 2. Register type stamp with the parser
p.AddKnownType("HostStatus")
p.AddStructDefinition("HostStatus", parser.StructDef{Fields: fields})
```

### f. Custom host-supplied magic variables
Magic variables start with `$` and are immutable, globally accessible read-only variables managed by the host. To inject them, define their values directly in the runtime's global environment prior to running your functions:

```go
rt := runtime.NewRuntime(parseResult.AST, false)
rt.GlobalEnv.Define("$host_env", "Production")
```

---

## 4. Moving data between host and runtime

### a. Example code declaring basic data types in the host, passing to runtime function and the result being returned back to the host
This example demonstrates passing Go native basic types (`float64`, `string`, `bool`) to a Shift function, processing them, and returning a native value back to Go:

```go
package main

import (
	"fmt"
	"log"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		function process_basic(number n, string s, bool b) string {
			if b {
				return s & " (number: " & (n + 10) & ")";
			}
			return "Disabled";
		}
	`
	l := lexer.NewLexer(source)
	p := parser.NewParser(l.Tokenize().Tokens)
	stdlib.LoadDefinitions(p)
	parseResult := p.Parse()

	rt := runtime.NewRuntime(parseResult.AST, false)
	stdlib.LoadIntrinsics(rt)

	// Pass basic Go types: float64, string, bool
	res, err := rt.RunFunction("process_basic", []any{5.0, "Hello", true})
	if err != nil {
		log.Fatalf("Runtime error: %v", err)
	}
	fmt.Println("Result:", res) // Output: "Hello (number: 15)"
}
```

### b. Example code declaring a List in the host, passing to runtime function and the result being returned back to the host
List types in Shift map to Go slices (`[]any`). This example demonstrates passing a slice to a Shift function and receiving a modified slice back:

```go
package main

import (
	"fmt"
	"log"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		function process_list(list<number> items) list<number> {
			list<number> res = [];
			for x in items {
				res = res + [x * 2];
			}
			return res;
		}
	`
	l := lexer.NewLexer(source)
	p := parser.NewParser(l.Tokenize().Tokens)
	stdlib.LoadDefinitions(p)
	parseResult := p.Parse()

	rt := runtime.NewRuntime(parseResult.AST, false)
	stdlib.LoadIntrinsics(rt)

	// Pass native Go slice containing float64 values
	inputList := []any{1.0, 2.0, 3.0}
	res, err := rt.RunFunction("process_list", []any{inputList})
	if err != nil {
		log.Fatalf("Runtime error: %v", err)
	}

	outputList, ok := res.([]any)
	if !ok {
		log.Fatalf("Expected slice return type")
	}
	fmt.Println("Result:", outputList) // Output: [2 4 6]
}
```

### c. Example code declaring a Map in the host, passing to runtime function and the result being returned back to the host
Map types in Shift map to Go `*runtime.ShiftMap` (preserving insertion order). This example demonstrates passing a map to Shift, modifying keys, and retrieving it:

```go
package main

import (
	"fmt"
	"log"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		function process_map(map<string> m) map<string> {
			m["greeting"] = m["greeting"] & " World";
			return m;
		}
	`
	l := lexer.NewLexer(source)
	p := parser.NewParser(l.Tokenize().Tokens)
	stdlib.LoadDefinitions(p)
	parseResult := p.Parse()

	rt := runtime.NewRuntime(parseResult.AST, false)
	stdlib.LoadIntrinsics(rt)

	// Initialize ShiftMap
	myMap := runtime.NewShiftMap()
	myMap.Set("greeting", "Hello")

	res, err := rt.RunFunction("process_map", []any{myMap})
	if err != nil {
		log.Fatalf("Runtime error: %v", err)
	}

	outputMap, ok := res.(*runtime.ShiftMap)
	if !ok {
		log.Fatalf("Expected ShiftMap return type")
	}
	val, _ := outputMap.Get("greeting")
	fmt.Println("greeting:", val) // Output: "Hello World"
}
```

### d. Example code declaring a Struct in the host, passing to runtime function and the result being returned back to the host
Structs behave similarly to typed maps with structural type safety. The Go interpreter represents both Shift maps and custom structs using `*runtime.ShiftMap` with the `StructName` field populated to match the struct identifier.

Prefixing a field name with `$` (e.g. `$id`) indicates that the field is required during initialization and remains immutable during execution.

```go
package main

import (
	"fmt"
	"log"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	source := `
		struct User [
			string $id,
			string name,
			number age
		]

		function process_user(User u) User {
			u["name"] = u["name"] & " (Verified)";
			u["age"] = u["age"] + 1;
			return u;
		}
	`
	l := lexer.NewLexer(source)
	p := parser.NewParser(l.Tokenize().Tokens)
	stdlib.LoadDefinitions(p)
	parseResult := p.Parse()

	rt := runtime.NewRuntime(parseResult.AST, false)
	stdlib.LoadIntrinsics(rt)

	// Instantiate Struct as *runtime.ShiftMap and specify StructName
	user := runtime.NewShiftMap()
	user.StructName = "User"
	user.Set("$id", "usr_99")
	user.Set("name", "Nate")
	user.Set("age", 28.0)

	res, err := rt.RunFunction("process_user", []any{user})
	if err != nil {
		log.Fatalf("Runtime error: %v", err)
	}

	outputUser, ok := res.(*runtime.ShiftMap)
	if !ok {
		log.Fatalf("Expected ShiftMap return type")
	}
	idVal, _ := outputUser.Get("$id")
	nameVal, _ := outputUser.Get("name")
	ageVal, _ := outputUser.Get("age")

	fmt.Println("Struct Stamp:", outputUser.StructName) // Output: "User"
	fmt.Println("ID:", idVal)                            // Output: "usr_99"
	fmt.Println("Name:", nameVal)                        // Output: "Nate (Verified)"
	fmt.Println("Age:", ageVal)                          // Output: 29
}
```

---

## 5. Shared Standard Library Orchestration

To maintain exact behavioral parity and feature alignment between the Go and JavaScript runtime implementations, standard library routines written in Shift are housed centrally in a single source file:
👉 **go_runtime/pkg/stdlib/stdlib.shift**

### How Go Integrates `stdlib.shift`
1. **Embedding**: Go utilizes the standard compiler `embed` package inside `go_runtime/pkg/stdlib/stdlib.go` to import `stdlib.shift` statically as `Source` string at build time.
2. **Compilation**: When host Go applications call Shift library APIs (`LoadDefinitions`), the compiler embeds the standard definitions. The interpreter parser then parses and merges these embedded AST nodes when running user programs.

---

## 6. Authoritative AST Code Generation

To ensure 1:1 parity between the Go AST package (`go_runtime/pkg/ast`) and the language's formal JSON schema, both `go_runtime/pkg/ast/ast.go` and `go_runtime/pkg/ast/unmarshal.go` are completely auto-generated from the authoritative JSON schema:
👉 **js_runtime/src/ast_schema.json**

### Running the Code Generator
When schema changes are made, run the Node.js generator script to update the Go AST packages and the Markdown specification documentation:
```bash
node js_runtime/utils/generate_ast_assets.mjs
```

> [!WARNING]
> Do not modify `go_runtime/pkg/ast/ast.go` or `go_runtime/pkg/ast/unmarshal.go` manually. Any manual edits will be overwritten the next time the asset generator script is executed.

---

## 7. Testing & Building the Runtime

### Running Go Tests
To execute the Go runtime tests (including bounds correctness, parsing safety limits, and JS-serialized compatibility JSON test vectors):
```bash
cd go_runtime/
go test ./...
```

### Running Core Build Tests
To run core-tagged Go builds testing standard sandboxed constraints:
```bash
cd go_runtime/
go test -tags core ./...
```

### Cleaning & Formatting Go Code
To maintain consistent Go formatting across packages:
```bash
cd go_runtime/
go fmt ./...
```

