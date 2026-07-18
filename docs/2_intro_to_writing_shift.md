# Intro to writing Shift Script

_A Beginner's Guide_

Welcome to Shift Script! This guide will walk you through the basics of writing clear, reliable, and readable logic using Shift.

## 1. The Basics

### Comments

Shift uses C-style comments.

```
// This is a single-line comment

/* This is a multi-line
   block comment
*/
```

### The Structure

A Shift script consists of Struct Definitions and Functions. There is no global executable code outside of functions.
```
// Define data shapes first
struct User [
    string name,
    number id
]

// Then define functions
function main() number {
    print_line("Hello, Shift!");
    return 0;
}
```

## 2. Variables & Types

Shift is statically typed, but it handles default values for you. You never have to worry about "undefined" variables.

### Primitive Types
```
function variables_demo() none {
    // Declaring variables (automatically initialized)
    string name;      // becomes ""
    number count;     // becomes 0
    bool is_active;   // becomes false

    // Assignment
    name = "Alice";
    count = 42;
    is_active = true;

    // Declaration with initialization
    number score = 100;
}
```

### Nullable Types

By default, variables cannot be `null`. If you need a value to be optional, use `nullable<T>`.

```
nullable<string> optional_name; // initialized as null

if (optional_name == null) {
    print_line("Name is missing");
}
```

### Casting

You must explicitly cast types if you want to convert them.

```
number val = 50;
string text = val as string; // "50"
```

### String Concatenation

To join strings together, use the ampersand `&` operator. Shift does not use `+` for strings.

```
string first = "Hello";
string second = "World";
string message = first & " " & second; // "Hello World"

// Types are automatically converted to string when using &
string score_msg = "Score: " & 100; // "Score: 100"
```

## 3. Collections

### Lists

Lists are ordered collections of a specific type.

```
list<number> scores = [10, 20, 30];

// Accessing items
number first = scores[0];

// Adding items (push syntax)
scores[] = 40;

// Getting size
number len = size of scores;
```

### Maps

Maps are key-value pairs where keys are always strings.

```
map<string> config = ["host": "localhost", "port": "8080"];

// Accessing items
string h = config["host"];

// Adding/Updating items
config["status"] = "online";

// Checking existence
if (config has "status") {
    // ...
}
```

### Structs

Structs are strict maps. They enforce a specific schema.

#### Definition:
```
struct Point [
    number x,
    number y
]
```

#### Usage:
```
// Initialize like a map
Point p = ["x": 10, "y": 20];

// Access like a map
number my_x = p["x"];
```

#### Special Modifiers:

Prefix a struct field with `$` to make it Required (must be set on init) and Immutable (cannot be changed later).

```
struct User [
    string $id,  // Required & Immutable
    string name
]
```

## 4. Control Flow

### If / Else

Braces { } are required, even for single lines.

```
if (score > 100) {
    print_line("High Score!");
} else if (score == 0) {
    print_line("Try again.");
} else {
    print_line("Keep going.");
}
```

### Loops

#### While Loop:
```
number i = 0;
while (i < 5) {
    print_line(i as string);
    i = i + 1;
}
```

#### For Range:
```
// Prints 0 to 5 inclusive
for (i in 0 to 5) {
    print_line(i as string);
}
```

#### For In (Collections):
```
list<string> names = ["Alice", "Bob"];
for (name in names) {
    print_line(name);
}
```

#### Control Keywords:
- break; - Exit the loop immediately.
- skip; - Skip to the next iteration (like continue in other languages).

## 5. Functions
Functions must declare their return type. Use none if they don't return anything. Arguments are passed by value (copied), so a function cannot modify your original variables.

```
function add_numbers(number a, number b) number {
    return a + b;
}


function log_message(string msg) none {
    print_line("LOG: " & msg);
}
```

## 6. The Pipe Operator |

Pipes allow you to chain functions left-to-right, making data transformations easy to read. You must use the magic variable $pipe_value to show where the data goes.

### Standard Nested Call (Hard to read):
```
string result = to_upper(trim(input));
```

### Shift Piped Call (Easy to read):
```
string result = input 
    | trim_string($pipe_value) 
    | transform_ansistring_to_uppercase($pipe_value);
```

## 7. Error Handling

Shift separates "Technical Errors" (crashes, bad data types) from "Business Logic Failures" (validation rules).

```
try {
    // Normal logic
    if (user_age < 18) {
        // Business Logic Alert (Caught in 'review')
        throw alert "User is too young"; 
    }

    // System Error (Caught in 'catch')
    throw error "Database connection failed";

} catch {
    // Handles 'throw error' or runtime crashes
    print_line("System Error: " & $thrown_message);

} review {
    // Handles 'throw alert'
    print_line("Validation Failed: " & $thrown_message);
}
```

## 8. Putting It All Together

Here is a complete script that processes a list of users.
```
struct User [
    string name,
    bool is_active
]

function get_active_users_count(list<User> users) number {
    number count = 0;
    
    for (u in users) {
        if (u["is_active"]) {
            count = count + 1;
        }
    }
    
    return count;
}

function main() number {
    list<User> my_users;
    
    // Add some users
    my_users[] = ["name": "Alice", "is_active": true];
    my_users[] = ["name": "Bob",   "is_active": false];
    my_users[] = ["name": "Charlie", "is_active": true];

    // Process
    number active_count = get_active_users_count(my_users);
    
    // Output
    string report = "Total active users: " & (active_count as string);
    print_line(report);

    return 0;
}
```

The output:
```
Total active users: 2
```
