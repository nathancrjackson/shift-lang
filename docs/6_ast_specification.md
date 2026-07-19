# Shift AST Specification

This document defines the schema and structure of the Shift Abstract Syntax Tree (AST), also known as the Shift Tree (`.stree`). 

The AST serves as the portable, language-independent intermediate representation of Shift programs. Both the Go and JavaScript interpreters execute this JSON structure directly.

---

## 1. Common Node Fields

Every node in the AST extends the basic node structure, containing positional markers for debugging and error reporting:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | The node type identifier (e.g., `"Program"`, `"IfStatement"`, etc.). |
| `start` | `number` | The starting character offset in the source script. |
| `end` | `number` | The ending character offset in the source script. |
| `line` | `number` | The 1-indexed source code line number where this node begins. |

---

## 2. Structural Schema

### Program
The root node representing a parsed Shift file.
```json
{
  "type": "Program",
  "start": 0,
  "end": 120,
  "line": 1,
  "structs": [],
  "functions": []
}
```

### TypeAnnotation
Represents a type declaration inside parameters, returns, and variables. In the AST, it has type `"Type"` for primitives and generic collections, or `"StructType"` for custom struct references.

#### Standard Type Annotation
```json
{
  "type": "Type",
  "name": "list",
  "generic": {
    "type": "Type",
    "name": "number"
  }
}
```

#### Struct Type Annotation
```json
{
  "type": "StructType",
  "name": "User"
}
```

### StructDeclaration
Declares a new data structure.
```json
{
  "type": "StructDeclaration",
  "name": "User",
  "fields": [
    {
      "name": "id",
      "type": { "type": "StructType", "name": "User" }
    }
  ]
}
```

### FunctionDeclaration
Declares a global function.
```json
{
  "type": "FunctionDeclaration",
  "name": "add",
  "params": [
    {
      "type": "Parameter",
      "name": "x",
      "dataType": { "type": "Type", "name": "number" }
    }
  ],
  "returnType": { "type": "Type", "name": "number" },
  "body": {
    "type": "Block",
    "statements": []
  }
}
```

---

## 3. Statements

Statements represent execution operations and do not evaluate to values.

### VariableDeclaration
Declares a block-scoped variable.
```json
{
  "type": "VariableDeclaration",
  "name": "count",
  "varType": { "type": "Type", "name": "number" },
  "initializer": { "type": "Literal", "value": 0 }
}
```

### IfStatement
```json
{
  "type": "IfStatement",
  "condition": { "type": "Variable", "name": "flag" },
  "thenBranch": { "type": "Block", "statements": [] },
  "elseBranch": { "type": "Block", "statements": [] } // Optional, can be IfStatement or Block
}
```

### WhileStatement
```json
{
  "type": "WhileStatement",
  "condition": { "type": "BinaryExpression", "operator": "<", ... },
  "body": { "type": "Block", "statements": [] }
}
```

### ForRangeStatement
Loop syntax: `for (i in 0 to 10)`
```json
{
  "type": "ForRangeStatement",
  "iterator": "i",
  "startValue": { "type": "Literal", "value": 0 },
  "endValue": { "type": "Literal", "value": 10 },
  "body": { "type": "Block", "statements": [] }
}
```

### ForInStatement
Loop syntax: `for (key, value in my_map)` or `for (item in my_list)`
```json
{
  "type": "ForInStatement",
  "iterator": "key",
  "valueIterator": "value", // Optional (only for map key-value loops)
  "collection": { "type": "Variable", "name": "my_map" },
  "body": { "type": "Block", "statements": [] }
}
```

### TryStatement
Error handling block: `try { ... } catch { ... } review { ... }`
```json
{
  "type": "TryStatement",
  "tryBlock": { "type": "Block", "statements": [] },
  "catchIdentifier": "err",
  "catchBlock": { "type": "Block", "statements": [] },
  "reviewBlock": { "type": "Block", "statements": [] } // Optional
}
```

### Other Statements
- **ReturnStatement**: `{ "type": "ReturnStatement", `value: Expression` }`
- **TransferStatement**: `{ "type": "TransferStatement", `argument: Expression` }`
- **BreakStatement**: `{ "type": "BreakStatement" }`
- **SkipStatement**: `{ "type": "SkipStatement" }`
- **ThrowStatement**: `{ "type": "ThrowStatement", `severity: any`, `argument: Expression` }`
- **DeleteStatement**: `{ "type": "DeleteStatement", `target: *IndexExpression` }`
- **ExpressionStatement**: `{ "type": "ExpressionStatement", `expression: Expression` }`
- **Block**: `{ "type": "Block", `statements: []Statement` }`

---

## 4. Expressions

Expressions represent computations that yield values.

| Type | Fields | Description / Examples |
|---|---|---|
| **Assignment** | `name: string`, `value: Expression` | `x = 5` |
| **IndexAssignment** | `object: Expression`, `index: Expression`, `value: Expression` | `arr[0] = 5` |
| **PipelineExpression** | `left: Expression`, `right: Expression` | `data \| process($pipe_value)` |
| **ShareExpression** | `argument: Expression` | (Auto-generated entry) |
| **BinaryExpression** | `operator: string`, `left: Expression`, `right: Expression` | `x + y`, `a and b` |
| **UnaryExpression** | `operator: string`, `argument: Expression` | `not flag`, `-num` |
| **CallExpression** | `callee: string`, `arguments: []Expression` | `print_line("hello")` |
| **IndexExpression** | `object: Expression`, `index: Expression` | `map["key"]`, `arr[0]` |
| **CastExpression** | `value: Expression`, `targetType: TypeAnnotation` | `5 as string` |
| **InspectExpression** | `argument: Expression` | `inspect my_var` |
| **PackExpression** | `argument: Expression` | `pack my_list` |
| **UnpackExpression** | `argument: Expression` | `unpack my_string` |
| **SizeOfExpression** | `argument: Expression` | `size of my_var` |
| **TypeOfExpression** | `argument: Expression` | `type of my_var` |
| **IsExpression** | `left: Expression`, `check: string`, `isNot: bool` | `str is numeric` |
| **ReplaceExpression** | `source: Expression`, `pattern: Expression`, `replacement: Expression` | `str replace "/regex/" with ""` |
| **SplitExpression** | `source: Expression`, `delimiter: Expression` | `str split with ","` |
| **JoinExpression** | `source: Expression`, `delimiter: Expression` | `arr joined with ","` |
| **Literal** | `value: any` | `42`, `"hello"`, `true`, `null` |
| **Variable** | `name: string` | `my_var` |
| **MagicVariable** | `name: string` | `$pipe_value`, `$thrown_message` |
| **ListLiteral** | `elements: []Expression` | `[1, 2, 3]` |
| **MapLiteral** | `entries: []MapEntry` | `["key": "value"]` |
| **StructLiteral** | `structName: string`, `entries: []MapEntry` | `User ["name": "Tom"]` |
| **Grouping** | `expression: Expression` | `(x + y)` |

---

## 5. Compiled Example

Here is a simple Shift script and its resulting JSON AST:

### Source Script
```shift
function main() number {
    number result = 40 + 2;
    return result;
}
```

### JSON AST (`Program`)
```json
{
  "type": "Program",
  "start": 0,
  "end": 74,
  "line": 1,
  "structs": [],
  "functions": [
    {
      "type": "FunctionDeclaration",
      "start": 0,
      "end": 74,
      "line": 1,
      "name": "main",
      "params": [],
      "returnType": {
        "type": "Type",
        "name": "number"
      },
      "body": {
        "type": "Block",
        "start": 23,
        "end": 74,
        "line": 1,
        "statements": [
          {
            "type": "VariableDeclaration",
            "start": 29,
            "end": 51,
            "line": 2,
            "name": "result",
            "varType": {
              "type": "Type",
              "name": "number"
            },
            "initializer": {
              "type": "BinaryExpression",
              "start": 45,
              "end": 51,
              "line": 2,
              "operator": "+",
              "left": {
                "type": "Literal",
                "start": 45,
                "end": 47,
                "line": 2,
                "value": 40
              },
              "right": {
                "type": "Literal",
                "start": 50,
                "end": 51,
                "line": 2,
                "value": 2
              }
            }
          },
          {
            "type": "ReturnStatement",
            "start": 57,
            "end": 72,
            "line": 3,
            "value": {
              "type": "Variable",
              "start": 64,
              "end": 70,
              "line": 3,
              "name": "result"
            }
          }
        ]
      }
    }
  ]
}
```
