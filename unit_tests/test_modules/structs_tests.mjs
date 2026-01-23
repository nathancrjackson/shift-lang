/* -----

Struct Tests

----- */

export const structs_tests = {
    "Defining":
    {
        "tests": [{ call: "main()", type: "number", expect: 0 }],
        "code":
`struct Address [
    string street,
    number zip
]

function main() number {
    return 0;
}`
    }
,

    "Immutable Field Definition":
    {
        "tests": [{ call: "main()", type: "number", expect: 0 }],
        "code":
`struct Account [
    string $uid,
    string username
]

function main() number {
    return 0;
}`
    }
,

    "Nested Definition Error":
    {
        "tests": [{ type: "parser_error", expect: "Nested structs are not allowed. Define types at top level." }],
        "code":
`struct User [
    string name,
    struct address [
        string street
    ]
]`
    }
,

    "Hoisting":
    {
        "tests": [{ call: "main()", type: "number", expect: 0 }],
        "code":
`struct User [
    string name,
    Address home // Address is defined BELOW
]

struct Address [
    string street,
    number zip
]

function main() number {
    return 0;
}`
    }
,

    "Flat Initialization (Zero Value)":
    {
        "tests": [{ call: "main()", type: "number", expect: 0 }],
        "code":
`struct Point [
    number x,
    number y
]

function main() number {
    Point p; // Should parse as VariableDeclaration
    return p["x"] + p["y"];
}`
    }
,

    "Flat Initialization (Map Syntax)":
    {
        "tests": [{ call: "main(10,20)", type: "number", expect: 30 }],
        "code":
`struct Point [
    number x,
    number y
]

function main(number x, number y) number {
    Point p = ["x": x, "y": y];
    return p["x"] + p["y"];
}`
    }
,

    "Immutable Initialization (Map Syntax with some Zero Value)":
    {
    "tests": [{ call: "main(\"testuid\")", type: "string", expect: "testuid" }],
    "code":
`struct Account [
    string $uid,
    string username
]

function main(string x) string {
    Account p = ["$uid": x];
    return p["$uid"];
}`
    }
,

    "Nested Initialization (Zero Value)":
    {
        "tests": [{ call: "main()", type: "string", expect: " lives in " }],
        "code":
`struct Address [
    string city
]

struct User [
    string name,
    Address addr
]

function main() string {
    User u; 
    return u["name"] & " lives in " & u["addr"]["city"];
}`
    }
,

    "Nested Initialization (Map Syntax)":
    {
        "tests": [{ call: "main(\"John\", \"Melbourne\")", type: "string", expect: "John lives in Melbourne" }],
        "code":
`struct Address [
    string city
]

struct User [
    string name,
    Address addr
]

function main(string name, string city) string {
    User u = ["name":name, "addr": ["city": city]];
    return u["name"] & " lives in " & u["addr"]["city"];
}`
    }
,

    "Schema error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot set Struct element that is not in its defined schema" }],
        "code":
`struct User [
    string name
]

function main() bool {
    User u;
    u["candrive"] = true;
    return u["candrive"];
}`
    }
,

    "Immutable Initialization error no value":
    {
    "tests": [{ type: "parser_error", expect: "Cannot zero-initialize struct 'Account' because required field '$uid' is missing." }],
    "code":
`struct Account [
    string $uid,
    string username
]

function main(string x) string {
    Account p;
    return p["$uid"];
}`
    }
,

    "Immutable Initialization error cannot change value":
    {
    "tests": [{ type: "parser_error", expect: "Cannot assign to immutable field '$uid'." }],
    "code":
`struct Account [
    string $uid,
    string username
]

function main(string x) string {
    Account p = ["$uid": x];
    p["$uid"] = "error here";
    return p["$uid"];
}`
    }
,

    "Delete error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot delete Struct elements" }],
        "code":
`struct User [
    string name,
    bool candrive
]

function main() bool {
    User u;
    delete u["name"];
    return u["candrive"];
}`
    }
,

    "Usage in List":
    {
        "tests": [{ call: "main()", type: "string", expect: "User at index 0" }],
        "code":
`struct User [
    string name
]

function main() string {
    list<User> user_list;
    User u = ["name": "User at index 0"];
    user_list[] = u;
    return user_list[0]["name"];
}`
    }
,

    "Inline usage in List":
    {
        "tests":  [{ call: "main(\"User at index 1\")", type: "string", expect: "User at index 1" }],
        "code":
`struct User [
    string name
]

function main(string some_name) string {
    list<User> user_list;
    User u = ["name": "User at index 0"];
    user_list[] = u;
    user_list[] = ["name": some_name];
    return user_list[1]["name"];
}`
    }
,

    "Type error":
    {
        "tests": [{ type: "parser_error", expect: "Struct value type mismatch." }],
        "code":
`struct User [
    string name
]

function main() string {
    User u = ["name": 10];
    return u["name"];
}`
    }
,

    "Return type error":
    {
        "tests": [{ type: "parser_error", expect: "Return type mismatch." }],
        "code":
`struct User [
    string name
]

function main() number {
    list<User> user_list;
    User u = ["name": "User at index 0"];
    user_list[] = u;
    return user_list[0]["name"];
}`
    }
,

    "Nested return type error":
    {
        "tests": [{ type: "parser_error", expect: "Return type mismatch." }],
        "code":
`struct User [
    string name
]

function main() number {
    list<User> user_list;
    User u = ["name": "User at index 0"];
    user_list[] = u;
    return user_list[0]["name"];
}`
    }
,

    "Direct recursion error":
    {
        "tests": [{ type: "parser_error", expect: "Recursive struct definition detected for 'Node'. Use 'nullable<Node>' or 'list<Node>' to break the cycle." }],
        "code":
`struct Node [
    string val,
    Node next
]

function main() string {
    Node n; 
    return n["val"];
}`
    }
,

    "Recursive wrapped as nullable":
    {
        "tests": [{ call: "main()", type: "string", expect: "null" }],
        "code":
`struct Node [
    string val,
    nullable<Node> next
]

function main() string {
    Node n;
    return type of n["next"];
}`
    }
,

    "Circular zero-value error":
    {
        "tests": [{ type: "parser_error", expect: "Circular struct definition detected: NodeA -> NodeB -> NodeC -> NodeD -> NodeA. Use 'nullable' or 'list' generics to break the cycle." }],
        "code":
`struct NodeA [
    string val,
    NodeB next
]

struct NodeB [
    string val,
    NodeC next
]

struct NodeC [
    string val,
    NodeD next
]

struct NodeD [
    string val,
    NodeA next
]

function main() string {
    NodeA n; 
    return n["val"];
}`
    }
,

    "Circular struct wrapped as nullable":
    {
        "tests": [{ call: "main()", type: "bool", expect: true }],
        "code":
`struct NodeA [
    string val,
    NodeB next
]

struct NodeB [
    string val,
    NodeC next
]

struct NodeC [
    string val,
    NodeD next
]

struct NodeD [
    string val,
    nullable<NodeA> next
]

function main() bool {
    NodeA n;
    return (n["next"]["next"]["next"]["next"] == null);
}`
    }
};