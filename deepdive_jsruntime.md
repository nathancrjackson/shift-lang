# JavaScript Developer Deep Dive: Integrating & Building Shift

This document provides technical instructions for developers looking to integrate the Shift scripting engine into JavaScript host environments (Browsers or Node.js), customise the runtime, move data between the host and interpreter, and build/test the codebase.

---

## 1. Runtime integration

### a. Standard Sandboxed Core Mode
Standard Sandboxed Core Mode runs user Shift code in a secure, browser-safe isolated sandbox. In this mode, external imports and filesystem functions are disabled.

To run the interpreter in Standard Sandboxed Core Mode, import the browser-safe `Shift` class, instantiate it, and execute:

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const source = `
    function main() number {
        return 40 + 2;
    }
`;

const engine = new Shift();
try {
    const result = engine.run(source, "main", []);
    console.log("Result:", result); // Output: 42
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

### b. Filesystem & Imports enabled Mode
In this mode, external imports and active filesystem functions are enabled. 

Import the Node-specific `NodeShift` wrapper, which extends the core class with pre-configured Node.js native filesystem intrinsics (`read_file`, `write_file`, etc.) and a path-based filesystem import resolver:

```javascript
import { NodeShift } from './js_runtime/dist/shift_lib.mjs';

const source = `
    import "utils.shift";

    function main() string {
        return read_file("config.json");
    }
`;

const engine = new NodeShift();
try {
    const result = engine.run(source, "main", []);
    console.log("File content:", result);
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

### c. How to set instruction limits
To limit CPU execution duration and protect against infinite loops, configure a maximum instruction step limit in the options passed to the constructor.

By default, the high-level `Shift` and `NodeShift` wrappers initialize with a limit of `0` (no limit).

```javascript
// Caps total execution steps to 50,000
const engine = new Shift(null, null, { maxInstructions: 50000 });

// Disables instruction limits entirely (default behavior)
const engineNoLimit = new Shift(null, null, { maxInstructions: 0 });
```

---

## 2. DataType Mapping Reference

When passing parameters to the Shift engine or receiving return values, Shift types map directly to JavaScript native types:

| Shift Type | JavaScript Native Type | Description / Notes |
|---|---|---|
| `number` | `Number` | All numeric values are double-precision floats. |
| `string` | `String` | UTF-16 character strings. |
| `bool` | `Boolean` | `true` or `false`. |
| `null` / `none` | `null` | Evaluates to `null`. |
| `list<T>` | `Array` | Standard JavaScript Arrays (e.g. `[1, 2, 3]`). |
| `map<T>` | `Map` | Standard JavaScript `Map` objects. |
| Struct (e.g., `User`) | `Map` | Standard JavaScript `Map` objects with keys matching struct fields. |

---

## 3. Runtime customisation

### a. Custom Import resolver
You can configure custom resolution behavior (such as loading files from a database, in-memory virtual filesystem, or remote endpoint) by defining an `importResolver` callback in the constructor:

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const engine = new Shift(null, null, {
    importResolver: (requestedPath, parentPath) => {
        // Resolve path and return code and resolvedPath (to prevent circular imports)
        return {
            code: "function my_imported_func() string { return \"Hello!\"; }",
            resolvedPath: `/virtual-fs/${requestedPath}`
        };
    }
});
```

### b. Custom Filesystem tools
Standard filesystem intrinsics (`read_file`, `write_file`, etc.) can be overridden or defined with custom implementations (e.g., using a custom memory filesystem) by registering custom functions under the standard filesystem function names:

```javascript
engine.registerIntrinsic("read_file", {
    returnType: "string",
    params: [{ name: "path", type: "string" }],
    func: (args) => {
        const path = args[0];
        // Read from virtual database/memory
        return "Mock content for " + path;
    }
});
```

### c. Custom standard library
You can inject global standard library functions and structures (written in Shift) into the compilation pipeline. Pass your custom standard library Shift code as the first argument to the `Shift` constructor:

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

// Define custom standard library structs and helper functions in Shift
const customStdLibShift = `
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
`;

const engine = new Shift(customStdLibShift);
```

### d. Custom native intrinsic functions
You can declare custom native helper functions (written in JavaScript) that scripts can invoke directly. Register the function signature and callback implementation using `registerIntrinsic`:

```javascript
engine.registerIntrinsic("fetch_external_data", {
    returnType: "string",
    params: [{ name: "query", type: "string" }],
    func: (args) => {
        const query = args[0];
        // Perform host-level logic
        return `Data for: ${query}`;
    }
});
```

### e. Custom intrinsic structs
While custom structs are typically declared at the top level of custom Shift standard library code, you can also inject structures programmatically when running the Parser manually by adding to its types and definitions maps:

```javascript
import { Parser } from './js_runtime/src/parser.mjs';

const parser = new Parser(tokens);

// Register CustomStruct with the parser
parser.knownTypes.add("CustomStruct");
parser.structDefinitions.set("CustomStruct", {
    fields: [
        { name: "key", type: { type: "Type", name: "string" } },
        { name: "value", type: { type: "Type", name: "number" } }
    ]
});
```

### f. Custom host-supplied magic variables
Magic variables start with `$` and are immutable, globally accessible read-only variables managed by the host. To inject them, manually initialize the compiler and runtime classes, then define the values in the global environment before executing functions:

```javascript
import { Lexer } from './js_runtime/src/lexer.mjs';
import { Parser } from './js_runtime/src/parser.mjs';
import { Runtime } from './js_runtime/src/runtime.mjs';

// 1. Compile script manually
const lexer = new Lexer(source);
const parser = new Parser(lexer.tokenize().tokens);
const ast = parser.parse().ast;

// 2. Initialize Runtime
const runtime = new Runtime(ast);

// 3. Inject Magic Variable into the Global Environment
runtime.globalEnv.define("$host_env", "Production");

// 4. Run function
const result = runtime.runFunction("main", []);
```

---

## 4. Moving data between host and runtime

### a. Example code declaring basic data types in the host, passing to runtime function and the result being returned back to the host
This example demonstrates passing JavaScript basic types (`Number`, `String`, `Boolean`) to a Shift function, processing them, and returning a basic type back to JavaScript:

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const source = `
    function process_basic(number n, string s, bool b) string {
        if b {
            return s & " (number: " & (n + 10) & ")";
        }
        return "Disabled";
    }
`;

const engine = new Shift();
try {
    // Pass basic JS values directly
    const result = engine.run(source, "process_basic", [5, "Hello", true]);
    console.log("Result:", result); // Output: "Hello (number: 15)"
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

### b. Example code declaring a List in the host, passing to runtime function and the result being returned back to the host
List types in Shift map to JavaScript native `Array` objects. This example demonstrates passing a JS array to a Shift function and receiving a modified array back:

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const source = `
    function process_list(list<number> items) list<number> {
        list<number> res = [];
        for x in items {
            res = res + [x * 2];
        }
        return res;
    }
`;

const engine = new Shift();
try {
    const inputList = [1, 2, 3];
    const result = engine.run(source, "process_list", [inputList]);
    console.log("Result:", result); // Output: [2, 4, 6]
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

### c. Example code declaring a Map in the host, passing to runtime function and the result being returned back to the host
Map types in Shift map to JavaScript native `Map` objects. This example demonstrates passing a JS map to Shift, modifying keys, and retrieving it:

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const source = `
    function process_map(map<string> m) map<string> {
        m["greeting"] = m["greeting"] & " World";
        return m;
    }
`;

const engine = new Shift();
try {
    const myMap = new Map();
    myMap.set("greeting", "Hello");

    const result = engine.run(source, "process_map", [myMap]);
    console.log("greeting:", result.get("greeting")); // Output: "Hello World"
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

### d. Example code declaring a Struct in the host, passing to runtime function and the result being returned back to the host
Structs behave similarly to typed maps with structural type safety. The JavaScript interpreter represents both Shift maps and custom structs using the native JavaScript `Map` class. 

When the struct is passed into the Shift engine, the runtime automatically performs type validation against the struct declaration and stamps the `__shift_type` metadata string property onto the returned `Map` object.

```javascript
import { Shift } from './js_runtime/dist/shift_core_lib.mjs';

const source = `
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
`;

const engine = new Shift();
try {
    // Instantiate struct as a native Map containing field values
    const user = new Map();
    user.set("$id", "usr_99");
    user.set("name", "Nate");
    user.set("age", 28);

    const result = engine.run(source, "process_user", [user]);
    
    console.log("Struct Stamp:", result.__shift_type); // Output: "User"
    console.log("ID:", result.get("$id"));            // Output: "usr_99"
    console.log("Name:", result.get("name"));          // Output: "Nate (Verified)"
    console.log("Age:", result.get("age"));            // Output: 29
} catch (err) {
    console.error("Execution failed:", err.message);
}
```

---

## 5. Shared Standard Library Orchestration

To maintain exact behavioral parity and feature alignment between the Go and JavaScript runtime implementations, standard library routines written in Shift are housed centrally in a single source file:
👉 **[go_runtime/pkg/stdlib/stdlib.shift](file:///home/nathan/Mounts/dev-home/js/shift-lang/go_runtime/pkg/stdlib/stdlib.shift)**

### How JavaScript Integrates `stdlib.shift`
In JavaScript, integration is split between development and production builds:
1. **Development Runtime (Direct ESM execution)**:
   When running the JavaScript source code directly in Node, `js_runtime/src/standard_library.mjs` uses dynamic ESM imports to load Node's `fs` and `path` modules and reads `stdlib.shift` synchronously from the repository files on disk.
2. **Production Bundle**:
   When bundling the distribution packages (`shift_lib.mjs` and `shift_core_lib.mjs`), `js_runtime/utils/lib_bundler.js` reads the file and replaces `"standardLibrarySourcePlaceholder"` in the code with the fully escaped inlined content of `stdlib.shift` inside a template literal. It also strips the disk-loader block so the output bundle is fully self-contained and free of Node dependencies.

---

## 6. Testing & Building the Runtime

### Unified Cross-Runtime Testing (JS ➔ Go JSON Porting)
To maintain absolute behavioral consistency and feature parity between the Go and JavaScript implementations:
1. **Write Tests in JavaScript First**: All language features, edge cases, and parser unit tests are written in the JavaScript unit tests (`js_runtime/unit_tests/test_modules/`).
2. **Serialize to JSON**: The test conversion tool parses and translates these modules:
   ```bash
   node js_runtime/utils/convert_tests_to_json.mjs
   ```
   This script scans the `.mjs` test files, resolves module exports, and writes them out as structured JSON files inside `go_runtime/unit_tests/tests_json/`.

### Testing JS Runtimes
To run the full JS test suite (including interpreter core tests, direct safety validations, sandbox constraints, and node filesystem overrides):
```bash
cd js_runtime/unit_tests/
node run_js_runtime_tests.mjs
```

### Bundling JS Distributions
To rebuild the distribution libraries output inside `js_runtime/dist/`:
- **Standard Bundle** (includes Node.js native filesystem access):
  ```bash
  node js_runtime/utils/lib_bundler.js
  ```
- **Core Bundle** (completely sandboxed browser-safe JS library):
  ```bash
  node js_runtime/utils/lib_bundler.js --core
  ```

### Recompiling Playground (`docs/index.html`)
To build a standalone web playground:
```bash
node js_runtime/utils/build_docs.js
```
This automatically runs standard and core builders, generates a `Version YY.MM.DD.HHMM` timestamp, bundles CSS/HTML assets, and compiles them into `docs/index.html`.
