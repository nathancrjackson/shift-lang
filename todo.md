# To-do

Shift is still in it's early days and so far the focus has been on getting a functional prototype off the ground.

This document outlines the some of the tasks required to make Shift a robust, production-ready language.

- Implement stack traces.
- Write usable Standard Library (in Shift where possible).
- Write so many more tests, there are many, many, many different ways to cast, nest, loop or deliberately break things that are not being checked.
- Create test suite for validating already compiled JSON AST.
- Implement JSON AST deserialization in the Go runtime to allow direct execution of precompiled `.stree` files.
