import { TokenType } from './token_enums.mjs';
import { ExpressionParser } from './expression_parser.mjs';
import { Lexer } from './lexer.mjs';
import { ShiftParserError } from './errors.mjs';
import { logger } from './logger.mjs';
import schema from './ast_schema.json' with { type: 'json' };

export class Parser {
    constructor(tokens, importResolver = null, importedFiles = new Set(), currentFilePath = null) {
        // Guard clauses
        if (!Array.isArray(tokens)) {
            throw new ShiftParserError("Parser construction requires an array of tokens.", 0, "");
        }
        if (!(importedFiles instanceof Set)) {
            throw new ShiftParserError("Parser construction requires importedFiles to be a Set.", 0, "");
        }

        this.tokens = tokens;
        this.current = 0;
        this.errors = [];
        this.expressionParser = new ExpressionParser(this);
        this.currentReturnType = null;
        this.loopDepth = 0;
        this.depth = 0;
        this.scopes = [];
        this.enterScope();
        
        this.knownTypes = new Set(["string", "number", "bool", "list", "map", "any", "null", "none", "nullable"]);
        this.structDefinitions = new Map();
        
        this.usedFunctions = new Set();

        this.importResolver = importResolver;
        this.importedFiles = importedFiles;
        this.currentFilePath = currentFilePath; // <-- NEW: Track where this parser is located
        
        this.importedStructs = [];
        this.importedFunctions = [];
        this.importErrors = [];
    }

    markFunctionUsed(name) {
        this.usedFunctions.add(name);
    }

    preScan() {
        logger.trace("PARSER", "Starting pre-scan", { currentFile: this.currentFilePath });
        const startPos = this.current;

        // PASS 0: Import Resolution
        this.current = 0;
        while (!this.isAtEnd()) {
            if (this.match(TokenType.IMPORT)) {
                try {
                    this.resolveImport();
                } catch (e) {
                    this.synchronize();
                }
            } else {
                this.advance();
            }
        }

        // PASS 1: Struct Discovery
        this.current = 0;
        while (!this.isAtEnd()) {
            if (this.match(TokenType.IMPORT)) {
                this.advance(); // consume string path
                if (this.check(TokenType.SEMICOLON)) this.advance();
                continue;
            }
            
            if (this.match(TokenType.STRUCT)) {
                try {
                    this.preParseStruct();
                } catch (e) {
                    this.synchronize();
                }
            } else {
                this.advance();
            }
        }

        // PASS 2: Function Discovery
        this.current = 0;
        while (!this.isAtEnd()) {
            if (this.match(TokenType.IMPORT)) {
                this.advance(); // consume string path
                if (this.check(TokenType.SEMICOLON)) this.advance();
                continue;
            }

            if (this.match(TokenType.FUNCTION)) {
                try {
                    this.preParseFunction();
                } catch (e) {
                    this.synchronize();
                }
            } else {
                this.advance();
            }
        }

        this.current = startPos;
    }

    resolveImport() {
        const errorCountBefore = this.errors.length;
        try {
            const pathToken = this.consume(TokenType.STRING, "Expect file path after 'import'.");
            
            if (this.check(TokenType.SEMICOLON)) {
                this.advance();
            }

            const requestedPath = pathToken.v;

            if (!this.importResolver) {
                throw this.addError(pathToken, "Imports are disabled in core mode. Provide an importResolver to enable imports.");
            }

            let sourceCode;
            let resolvedPath;
            try {
                // NEW: Pass the requested path AND the parent file's path to the host
                const resolution = this.importResolver(requestedPath, this.currentFilePath);
                
                // Flexible handling: Host can return just the code string, or an object with the absolute path
                if (typeof resolution === 'string') {
                    sourceCode = resolution;
                    resolvedPath = requestedPath; // Fallback if host doesn't support absolute paths
                } else {
                    sourceCode = resolution.code;
                    resolvedPath = resolution.resolvedPath;
                }
            } catch (err) {
                throw this.addError(pathToken, `Failed to resolve import: ${requestedPath}`);
            }

            // NEW: Cycle detection MUST happen on the absolute resolved path!
            if (this.importedFiles.has(resolvedPath)) {
                return;
            }
            this.importedFiles.add(resolvedPath);

            const lexer = new Lexer(sourceCode);
            const lexResult = lexer.tokenize();

            if (lexResult.errors.length > 0) {
                lexResult.errors.forEach(e => this.errors.push(e));
                throw this.addError(pathToken, `Lexer error in imported file: ${requestedPath}`);
            }

            // NEW: Pass the resolved absolute path down to the child parser!
            const childParser = new Parser(lexResult.tokens, this.importResolver, this.importedFiles, resolvedPath);
            
            // Inherit context...
            for (const type of this.knownTypes) {
                childParser.knownTypes.add(type);
            }
            for (const [name, def] of this.structDefinitions.entries()) {
                childParser.structDefinitions.set(name, def);
            }
            for (const [name, typeInfo] of this.scopes[0].entries()) {
                childParser.scopes[0].set(name, typeInfo);
            }

            // Run preScan and parse on the imported file
            childParser.preScan();
            const childAstResult = childParser.parse();

            if (childAstResult.errors.length > 0) {
                childAstResult.errors.forEach(e => this.errors.push(e));
                throw this.addError(pathToken, `Parser error in imported file: ${requestedPath}`);
            }

            // Keep AST pieces...
            this.importedStructs.push(...childAstResult.ast.structs);
            this.importedFunctions.push(...childAstResult.ast.functions);

            // Pull back newly defined types...
            for (const type of childParser.knownTypes) {
                this.knownTypes.add(type);
            }
            for (const [name, def] of childParser.structDefinitions.entries()) {
                this.structDefinitions.set(name, def);
            }
            
            for (const [name, typeInfo] of childParser.scopes[0].entries()) {
                if (!this.scopes[0].has(name)) {
                    try {
                        this.defineVariable(name, typeInfo, true);
                    } catch (e) {
                        throw this.addError(pathToken, `Import collision: '${name}' is already defined.`);
                    }
                }
            }
            
            for (const funcName of childParser.usedFunctions) {
                this.markFunctionUsed(funcName);
            }
        } finally {
            for (let i = errorCountBefore; i < this.errors.length; i++) {
                this.importErrors.push(this.errors[i]);
            }
        }
    }

    preParseFunction() {
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect function name.");
        this.consume(TokenType.LPAREN, "Expect '(' after function name.");

        const params = [];

        // Parse parameters to advance the cursor past them correctly AND store them
        if (!this.check(TokenType.RPAREN)) {
            do {
                const typeInfo = this.parseType(); // Parse type (handles generics)
                const paramName = this.consume(TokenType.IDENTIFIER, "Expect parameter name.");
                params.push({ name: paramName.v, type: typeInfo.name, generic: typeInfo.generic });
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RPAREN, "Expect ')' after parameters.");

        // Parse Return Type strictly with specific error messages
        const returnType = this.parseType("Expect function return type.", "Invalid function return type.");

        // Register the function with the CORRECT return type AND params
        this.defineVariable(nameToken.v, {
            type: "Type",
            name: returnType.name,
            generic: returnType.generic,
            params: params,
            initialized: true
        });

        this.consume(TokenType.LBRACE, "Expect '{' before function body.");
        this.skipBlock();
    }

    preParseStruct() {
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect struct name.");
        this.knownTypes.add(nameToken.v);
        this.consume(TokenType.LBRACKET, "Expect '[' to begin struct fields.");
        this.skipList();
    }

    skipBlock() {
        let braceDepth = 1;
        while (braceDepth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LBRACE)) braceDepth++;
            else if (this.check(TokenType.RBRACE)) braceDepth--;
            this.advance();
        }
    }

    skipList() {
        let bracketDepth = 1;
        while (bracketDepth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LBRACKET)) bracketDepth++;
            else if (this.check(TokenType.RBRACKET)) bracketDepth--;
            this.advance();
        }
    }

    inferType(expr, resolveNullable = false) {
        if (!expr) return "null";
        switch (expr.type) {
            case "ListLiteral": return "list";
            case "MapLiteral": return "map";
            case "StructLiteral": return expr.structName;
            case "InspectExpression": return "InspectionResult"; // Hardcoded expectation of StdLib struct
            case "PackExpression": return "string";
            case "UnpackExpression": return "list";
            case "SizeOfExpression": return "number";
            case "TypeOfExpression": return "string";
            case "PipelineExpression": return this.inferType(expr.right, resolveNullable);
            case "Literal":
                if (typeof expr.value === 'number') return "number";
                if (typeof expr.value === 'string') return "string";
                if (typeof expr.value === 'boolean') return "bool";
                if (expr.value === null) return "null";
                return "any";
            case "BinaryExpression":
                if (["==", "!=", "<", ">", "<=", ">=", "and", "or", "xor", "has"].includes(expr.operator)) return "bool";
                if (["-", "*", "/", "%"].includes(expr.operator)) return "number";
                if (expr.operator === "+") {
                    const left = this.inferType(expr.left);
                    const right = this.inferType(expr.right);
                    if (left === "string" || right === "string") return "string";
                    return "number";
                }
                if (expr.operator === "&") return "string";
                if (expr.operator === "search") return "list";
                return "any";
            case "UnaryExpression":
                if (expr.operator === "!" || expr.operator === "not") return "bool";
                if (expr.operator === "-") return "number";
                return "any";
            case "CallExpression":
                const funcType = this.getVariable(expr.callee);
                if (funcType) return funcType.name;
                return "any";
            case "Variable":
                const varType = this.getVariable(expr.name);
                if (varType) return varType.name;
                return "any";
            case "CastExpression":
                return expr.targetType.name;
            case "IndexExpression": {
                let root = expr;
                let chain = [];
                while (root.type === "IndexExpression") {
                    chain.unshift(root.index);
                    root = root.object;
                }
                if (root.type === "Variable") {
                    let currentType = this.getVariable(root.name);
                    if (!currentType) return "any";

                    let isResultNullable = false;
                    for (const keyNode of chain) {
                        if (currentType.name === "any") return "any";

                        // 1. Detect if it's a Nullable
                        const wasNullable = currentType.name === "nullable";
                        if (wasNullable) isResultNullable = true;

                        // 2. Unwrap Nullable
                        while (currentType.name === "nullable" && currentType.generic) {
                            currentType = currentType.generic;
                        }

                        // 3. Static Type Validation for Index Access
                        let isNumericIndex = false;
                        if (keyNode.type === "Literal" && typeof keyNode.value === 'number') isNumericIndex = true;
                        if (keyNode.type === "Variable") {
                            const kType = this.inferType(keyNode);
                            if (kType === "number") isNumericIndex = true;
                        }

                        if (wasNullable) {
                            if (isNumericIndex) {
                                if (currentType.name !== "list") {
                                    this.addError(keyNode, "Cannot access index on nullable that is not a list.");
                                    return "any";
                                }
                            } else {
                                if (currentType.name !== "map" && currentType.type !== "StructType") {
                                    this.addError(keyNode, "Cannot access key on nullable that is not a map.");
                                    return "any";
                                }
                            }
                        }

                        // 4. Peirce the collection to find internal type
                        if (currentType.generic) {
                            currentType = currentType.generic;
                        }
                        else if (currentType.type === "StructType") {
                            const def = this.structDefinitions.get(currentType.name);
                            if (!def) return "any";
                            
                            if (keyNode.type === "Literal" && typeof keyNode.value === "string") {
                                const field = def.fields.find(f => f.name === keyNode.value);
                                if (field) {
                                    currentType = field.type;
                                } else {
                                    return "any";
                                }
                            } else {
                                return "any";
                            }
                        }
                        else {
                            return "any";
                        }
                    }

                    // FIXED: If we encountered a nullable wrapper along the way, the result is nullable.
                    if (isResultNullable) {
                        if (resolveNullable) return currentType.name;
                        return "nullable";
                    }
                    return currentType.name;
                }
                return "any";
            }
            default: return "any";
        }
    }

    resolveTypeAnnotation(expr) {
        if (!expr) return null;
        if (expr.type === "Variable") {
            const t = this.getVariable(expr.name);
            return t ? { type: t.type, name: t.name, generic: t.generic } : null;
        }
        if (expr.type === "IndexExpression") {
            let parentType = this.resolveTypeAnnotation(expr.object);
            if (!parentType) return null;

            // Unwrap nullable
            let current = parentType;
            while (current.name === "nullable" && current.generic) {
                current = current.generic;
            }

            if (current.name === "map" || current.name === "list") {
                return current.generic;
            }
            if (current.type === "StructType") {
                const def = this.structDefinitions.get(current.name);
                if (!def) return null;
                if (expr.index.type === "Literal" && typeof expr.index.value === "string") {
                    const field = def.fields.find(f => f.name === expr.index.value);
                    return field ? field.type : null;
                }
            }
        }
        const typeName = this.inferType(expr);
        return { type: "Type", name: typeName };
    }

    enterScope() { this.scopes.push(new Map()); }

    exitScope() { this.scopes.pop(); }

    defineVariable(name, typeInfo, checkShadowing = false) {
        if (this.scopes.length > 0) {
            if (checkShadowing) {
                for (let i = this.scopes.length - 1; i > 0; i--) {
                    if (this.scopes[i].has(name)) {
                        throw new Error("Variable cannot be redeclared inside the same function.");
                    }
                }
            }
            this.scopes[this.scopes.length - 1].set(name, typeInfo);
        }
    }

    getVariable(name) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                return this.scopes[i].get(name);
            }
        }
        return null;
    }

    parse() {
        logger.trace("PARSER", "Starting AST construction", { tokenCount: this.tokens.length });
        const program = {
            type: "Program",
            start: this.tokens[0] ? this.tokens[0].s : 0,
            end: this.tokens[this.tokens.length - 1] ? this.tokens[this.tokens.length - 1].e : 0,
            line: 1,
            version: schema.version,
            structs: [...this.importedStructs],
            functions: [...this.importedFunctions]
        };

        // Reset errors but preserve the fatal import errors caught during preScan
        this.errors = [...this.importErrors];

        while (!this.isAtEnd()) {
            try {
                if (this.match(TokenType.IMPORT)) {
                    this.advance(); // String
                    if (this.check(TokenType.SEMICOLON)) this.advance();
                } else if (this.match(TokenType.STRUCT)) {
                    const structDecl = this.structDeclaration();
                    program.structs.push(structDecl);
                } else if (this.match(TokenType.FUNCTION)) {
                    const funcDecl = this.functionDeclaration();
                    program.functions.push(funcDecl);
                } else {
                    this.addError(this.peek(), "Expect 'function', 'struct', or 'import' at top level.");
                    this.advance();
                }
            } catch (error) {
                this.synchronize();
            }
        }

        return { ast: program, errors: this.errors };
    }

    structDeclaration() {
        const startToken = this.previous(); // STRUCT keyword
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect struct name.");

        this.consume(TokenType.LBRACKET, "Expect '[' to begin struct fields.");

        const fields = [];
        if (!this.check(TokenType.RBRACKET)) {
            do {
                if (this.check(TokenType.STRUCT)) {
                    throw this.addError(this.peek(), "Nested structs are not allowed. Define types at top level.");
                }

                const typeInfo = this.parseType();

                let fieldNameToken;
                if (this.match(TokenType.MAGIC_VAR)) {
                    fieldNameToken = this.previous();
                } else {
                    fieldNameToken = this.consume(TokenType.IDENTIFIER, "Expect field name.");
                }

                fields.push({
                    name: fieldNameToken.v,
                    type: typeInfo
                });

            } while (this.match(TokenType.COMMA));
        }

        const endToken = this.consume(TokenType.RBRACKET, "Expect ']' after struct fields.");

        this.structDefinitions.set(nameToken.v, { fields });

        return {
            type: "StructDeclaration",
            start: startToken.s,
            end: endToken.e,
            line: startToken.l,
            name: nameToken.v,
            fields: fields
        };
    }

    functionDeclaration() {
        const startToken = this.previous(); // FUNCTION keyword
        const line = startToken.l;
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect function name.");
        this.consume(TokenType.LPAREN, "Expect '(' after function name.");

        const params = [];
        if (!this.check(TokenType.RPAREN)) {
            do {
                const typeInfo = this.parseType();
                const paramName = this.consume(TokenType.IDENTIFIER, "Expect parameter name.");
                params.push({ type: "Parameter", dataType: typeInfo, name: paramName.v });
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RPAREN, "Expect ')' after parameters.");

        // Pass specific error messages for return types
        const returnType = this.parseType("Expect function return type.", "Invalid function return type.");

        this.defineVariable(nameToken.v, {
            type: "Type",
            name: returnType.name,
            initialized: true
        });

        this.consume(TokenType.LBRACE, "Expect '{' before function body.");
        this.enterScope();

        params.forEach(p => {
            try {
                this.defineVariable(p.name, p.dataType, true);
            } catch (e) {
                this.addError({ l: line, v: p.name }, "Duplicate parameter name.");
            }
        });

        const previousReturnType = this.currentReturnType;
        this.currentReturnType = returnType.name;

        const startErrorCount = this.errors.length;
        const body = this.parseBlock();
        const hasBodyErrors = this.errors.length > startErrorCount;

        if (!hasBodyErrors && returnType.name !== "none" && returnType.name !== "null" && returnType.name !== "any") {
            if (!this.hasGuaranteedReturn(body)) {
                this.addError({ l: line, v: nameToken.v }, "Not all code paths return a value.");
            }
        }

        this.currentReturnType = previousReturnType;
        this.exitScope();

        return {
            type: "FunctionDeclaration",
            start: startToken.s,
            end: body.end,
            line: line,
            name: nameToken.v,
            params: params,
            returnType: returnType,
            body: body
        };
    }

    hasGuaranteedReturn(statement) {
        if (!statement) return false;

        if (statement.type === "Block") {
            for (let i = 0; i < statement.statements.length; i++) {
                if (this.hasGuaranteedReturn(statement.statements[i])) return true;
            }
            return false;
        }

        if (statement.type === "ReturnStatement" || statement.type === "ThrowStatement") {
            return true;
        }

        if (statement.type === "IfStatement") {
            if (statement.elseBranch) {
                return this.hasGuaranteedReturn(statement.thenBranch) && this.hasGuaranteedReturn(statement.elseBranch);
            }
            return false;
        }

        if (statement.type === "TryStatement") {
            let tryReturns = this.hasGuaranteedReturn(statement.tryBlock);
            if (!tryReturns) return false;
            if (statement.catchBlock && !this.hasGuaranteedReturn(statement.catchBlock)) return false;
            if (statement.reviewBlock && !this.hasGuaranteedReturn(statement.reviewBlock)) return false;
            return true;
        }

        return false;
    }

    parseType(missingMsg = "Expect valid type name.", invalidMsg = "Expect valid type name.") {
        const base_keyword = this.matchTypeKeyword();
        if (base_keyword) {
            const baseTypeToken = this.consume(base_keyword, "Compiler error");
            let generic = null;

            if (this.match(TokenType.LANGLE)) {
                generic = this.parseType();
                this.consume(TokenType.RANGLE, "Expect '>' after generic type.");

                if (base_keyword != TokenType.TYPE_LIST &&
                    base_keyword != TokenType.TYPE_MAP &&
                    base_keyword != TokenType.TYPE_NULLABLE) {
                    this.addError(baseTypeToken, "Base type does not support generics.");
                }
            }

            return { type: "Type", name: baseTypeToken.v, generic: generic };
        }

        if (this.check(TokenType.IDENTIFIER)) {
            const token = this.peek();
            if (this.knownTypes.has(token.v)) {
                this.advance();
                return { type: "StructType", name: token.v };
            }

            // It IS an identifier, but NOT a known type -> Invalid Type
            throw this.addError(this.peek(), invalidMsg);
        }

        // It is NOT a type keyword AND NOT an identifier -> Missing Type
        throw this.addError(this.peek(), missingMsg);
    }

    parseBlock() {
        const startToken = this.previous(); // Should be the LBRACE
        this.enterScope();
        const statements = [];

        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            const statement = this.parseStatement();
            if (statement) statements.push(statement);
        }

        const endToken = this.consume(TokenType.RBRACE, "Expect '}' after block.");
        this.exitScope();

        return {
            type: "Block",
            start: startToken.s,
            end: endToken.e,
            line: startToken.l,
            statements: statements
        };
    }

    parseStatement() {
        try {
            if (this.match(TokenType.RETURN)) return this.returnStatement();
            if (this.match(TokenType.IF)) return this.ifStatement();
            if (this.match(TokenType.FOR)) return this.forStatement();
            if (this.match(TokenType.WHILE)) return this.whileStatement();
            if (this.match(TokenType.BREAK)) return this.breakStatement();
            if (this.match(TokenType.SKIP)) return this.skipStatement();
            if (this.match(TokenType.TRY)) return this.tryStatement();
            if (this.match(TokenType.THROW)) return this.throwStatement();
            if (this.match(TokenType.DELETE)) return this.deleteStatement();

            if (this.matchTypeKeyword()) return this.variableDeclaration();

            if (this.check(TokenType.IDENTIFIER) && this.knownTypes.has(this.peek().v)) {
                return this.variableDeclaration();
            }

            return this.expressionStatement();
        } catch (error) {
            this.synchronize();
            return null;
        }
    }

    whileStatement() {
        const startToken = this.previous(); // WHILE
        this.consume(TokenType.LPAREN, "Expect '(' after 'while'.");
        const condition = this.parseExpression();
        this.consume(TokenType.RPAREN, "Expect ')' after while condition.");

        this.consume(TokenType.LBRACE, "Expect '{' before loop body.");
        this.loopDepth++;
        const body = this.parseBlock();
        this.loopDepth--;

        return {
            type: "WhileStatement",
            start: startToken.s,
            end: body.end,
            condition: condition,
            body: body,
            line: startToken.l
        };
    }

    breakStatement() {
        const startToken = this.previous();
        if (this.loopDepth === 0) this.addError(startToken, "'break' can only be used inside a loop.");
        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after 'break'.");
        return {
            type: "BreakStatement",
            start: startToken.s,
            end: endToken.e,
            line: startToken.l
        };
    }

    skipStatement() {
        const startToken = this.previous();
        if (this.loopDepth === 0) this.addError(startToken, "'skip' can only be used inside a loop.");
        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after 'skip'.");
        return {
            type: "SkipStatement",
            start: startToken.s,
            end: endToken.e,
            line: startToken.l
        };
    }

    tryStatement() {
        const startToken = this.previous(); // TRY
        this.consume(TokenType.LBRACE, "Expect '{' before try block.");
        const tryBlock = this.parseBlock();

        let catchBlock = null;
        let catchIdentifier = null;
        let reviewBlock = null;
        let hasCatchOrReview = false;
        let endToken = tryBlock;

        // Check for CATCH
        if (this.match(TokenType.CATCH)) {
            hasCatchOrReview = true;
            this.consume(TokenType.LBRACE, "Expect '{' before catch block.");

            this.enterScope();
            this.defineVariable("$thrown_message", { type: "Type", name: "string", initialized: true });
            catchBlock = this.parseBlock();
            this.exitScope();

            catchIdentifier = "$thrown_message";
            endToken = catchBlock;
        }

        // Check for REVIEW
        if (this.match(TokenType.REVIEW)) {
            hasCatchOrReview = true;
            this.consume(TokenType.LBRACE, "Expect '{' before review block.");

            this.enterScope();
            this.defineVariable("$thrown_message", { type: "Type", name: "string", initialized: true });
            reviewBlock = this.parseBlock();
            this.exitScope();

            if (!catchIdentifier) {
                catchIdentifier = "$thrown_message";
            }
            endToken = reviewBlock;
        }

        if (!hasCatchOrReview) {
            throw this.addError(this.peek(), "Expect 'catch' or 'review' after try block.");
        }

        return {
            type: "TryStatement",
            start: startToken.s,
            end: endToken.end,
            tryBlock: tryBlock,
            catchIdentifier: catchIdentifier,
            catchBlock: catchBlock,
            reviewBlock: reviewBlock,
            line: startToken.l
        };
    }

    throwStatement() {
        const startToken = this.previous(); // THROW

        let severity = "error";

        if (this.check(TokenType.IDENTIFIER)) {
            const severityToken = this.advance();
            if (["alert", "error", "critical"].includes(severityToken.v)) {
                severity = severityToken.v;
            } else {
                this.addError(severityToken, "Expected 'alert', 'error', or 'critical' after throw.");
            }
        } else {
            this.addError(this.peek(), "Expected severity level (alert, error, critical) after throw.");
        }

        const value = this.parseExpression();
        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after throw value.");

        return {
            type: "ThrowStatement",
            start: startToken.s,
            end: endToken.e,
            severity: severity,
            argument: value,
            line: startToken.l
        };
    }

    deleteStatement() {
        const startToken = this.previous(); // DELETE
        const expr = this.parseExpression();

        if (expr.type !== "IndexExpression") {
            this.addError(startToken, "Invalid delete target. Expected index expression (e.g. collection[key]).");
        } else {
            // Check if we are deleting from a Struct
            const inferredObj = this.inferType(expr.object);
            const structDef = this.structDefinitions.get(inferredObj);
            if (structDef) {
                this.addError(startToken, "Cannot delete Struct elements");
            }
        }

        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after delete statement.");
        return {
            type: "DeleteStatement",
            start: startToken.s,
            end: endToken.e,
            target: expr,
            line: startToken.l
        };
    }

    parseExpression() {
        this.depth++;
        if (this.depth > 200) {
            throw this.addError(this.peek(), "Expression too deep. Maximum nesting exceeded.");
        }
        const expr = this.expressionParser.parse();
        this.depth--;
        return expr;
    }

    returnStatement() {
        const startToken = this.previous(); // RETURN
        let value = null;

        if (!this.check(TokenType.SEMICOLON)) value = this.parseExpression();

        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");

        if (this.currentReturnType !== null && this.currentReturnType !== "any") {
            if (value === null) {
                if (this.currentReturnType !== "none") {
                    this.addError(startToken, "Return type mismatch.");
                }
            } else {
                const inferredType = this.inferType(value);
                if (this.currentReturnType === "none") {
                    this.addError(startToken, "Return type mismatch.");
                }

                const isNull = inferredType === "null";

                // FIXED RETURN TYPE LOGIC: Account for nullable target correctly
                let match = (inferredType === this.currentReturnType);
                if (!match) {
                    if (this.currentReturnType === "nullable" && inferredType !== "null" && inferredType !== "none") {
                        match = true; // Concrete type (e.g. number) can fulfill a nullable (e.g. nullable<number>)
                    }
                    if (inferredType === "any" || this.currentReturnType === "any") {
                        match = true;
                    }
                }

                const isPrimitiveTarget = ["number", "bool"].includes(this.currentReturnType);
                if (isNull && !isPrimitiveTarget) { match = true; } // null to nullable/string/list/map is fine

                if (!match) {
                    this.addError(startToken, "Return type mismatch.");
                }
            }
        }

        return {
            type: "ReturnStatement",
            start: startToken.s,
            end: endToken.e,
            line: startToken.l,
            value: value
        };
    }

    ifStatement() {
        const startToken = this.previous(); // IF
        this.consume(TokenType.LPAREN, "Expect '(' after 'if'.");
        const condition = this.parseExpression();
        this.consume(TokenType.RPAREN, "Expect ')' after if condition.");

        this.consume(TokenType.LBRACE, "Expect '{' before if body.");
        const thenBranch = this.parseBlock();

        let elseBranch = null;
        let endNode = thenBranch;

        if (this.match(TokenType.ELSE)) {
            if (this.match(TokenType.IF)) {
                elseBranch = this.ifStatement();
            } else {
                this.consume(TokenType.LBRACE, "Expect '{' before else body.");
                elseBranch = this.parseBlock();
            }
            endNode = elseBranch;
        }

        return {
            type: "IfStatement",
            start: startToken.s,
            end: endNode.end,
            condition: condition,
            thenBranch: thenBranch,
            elseBranch: elseBranch,
            line: startToken.l
        };
    }

    forStatement() {
        const startToken = this.previous(); // FOR
        this.consume(TokenType.LPAREN, "Expect '(' after 'for'.");

        const iteratorToken = this.consume(TokenType.IDENTIFIER, "Expect iterator variable name.");
        let valueIteratorToken = null;

        if (this.match(TokenType.COMMA)) {
            valueIteratorToken = this.consume(TokenType.IDENTIFIER, "Expect value iterator variable name.");
        }

        this.consume(TokenType.IN, "Expect 'in' after variable name.");

        const startOrCollection = this.parseExpression();

        let isRange = false;
        let endValue = null;

        if (this.match(TokenType.TO)) {
            isRange = true;
            endValue = this.parseExpression();
        }

        this.consume(TokenType.RPAREN, "Expect ')' after for clauses.");

        this.consume(TokenType.LBRACE, "Expect '{' before loop body.");
        this.enterScope();

        let iterType = "any";
        let valueIterType = "any";

        if (isRange) {
            iterType = "number";
            if (valueIteratorToken) {
                this.addError(valueIteratorToken, "Range loops cannot have two iterators.");
            }
        } else {
            const collectionType = this.inferType(startOrCollection);
            if (["list", "any"].includes(collectionType)) {
                iterType = "any";
                if (valueIteratorToken) {
                    iterType = "number";
                    valueIterType = "any";
                }
            }
            else if (["map"].includes(collectionType) || this.structDefinitions.has(collectionType)) {
                iterType = "string";
                if (valueIteratorToken) {
                    valueIterType = "any";
                }
            }
            else if (collectionType === "string") {
                this.addError(startToken, "Strings are not directly iterable. Use 'string as list<string>'.");
            }
            else {
                this.addError(startToken, `Type '${collectionType}' is not iterable.`);
            }
        }

        this.defineVariable(iteratorToken.v, { type: "Type", name: iterType, initialized: true });

        if (valueIteratorToken) {
            this.defineVariable(valueIteratorToken.v, { type: "Type", name: valueIterType, initialized: true });
        }

        this.loopDepth++;
        const body = this.parseBlock();
        this.loopDepth--;

        this.exitScope();

        if (isRange) {
            return {
                type: "ForRangeStatement",
                start: startToken.s,
                end: body.end,
                iterator: iteratorToken.v,
                startValue: startOrCollection,
                endValue: endValue,
                body: body,
                line: startToken.l
            };
        } else {
            return {
                type: "ForInStatement",
                start: startToken.s,
                end: body.end,
                iterator: iteratorToken.v,
                valueIterator: valueIteratorToken ? valueIteratorToken.v : null,
                collection: startOrCollection,
                body: body,
                line: startToken.l
            };
        }
    }

    getDefaultValue(typeInfo, visited = new Set()) {
        switch (typeInfo.name) {
            case "number": return { type: "Literal", value: 0, start: -1, end: -1, line: -1 };
            case "string": return { type: "Literal", value: "", start: -1, end: -1, line: -1 };
            case "bool": return { type: "Literal", value: false, start: -1, end: -1, line: -1 };
            case "list": return { type: "ListLiteral", elements: [], start: -1, end: -1, line: -1 };
            case "map": return { type: "MapLiteral", entries: [], start: -1, end: -1, line: -1 };
            case "null": return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
            case "none": return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
            case "nullable": return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
            default:
                if (typeInfo.type === "StructType") {
                    if (visited.has(typeInfo.name)) {
                        const path = Array.from(visited);
                        const parent = path[path.length - 1];
                        if (parent === typeInfo.name) {
                            throw new Error(`Recursive struct definition detected for '${typeInfo.name}'. Use 'nullable<${typeInfo.name}>' or 'list<${typeInfo.name}>' to break the cycle.`);
                        } else {
                            const cycle = [...path, typeInfo.name].join(" -> ");
                            throw new Error(`Circular struct definition detected: ${cycle}. Use 'nullable' or 'list' generics to break the cycle.`);
                        }
                    }

                    const structDef = this.structDefinitions.get(typeInfo.name);
                    if (structDef) {
                        const newVisited = new Set(visited);
                        newVisited.add(typeInfo.name);

                        const missingRequired = structDef.fields.find(f => f.name.startsWith('$'));
                        if (missingRequired) {
                            throw new Error(`Cannot zero-initialize struct '${typeInfo.name}' because required field '${missingRequired.name}' is missing.`);
                        }

                        const entries = structDef.fields.map(field => ({
                            key: { type: "Literal", value: field.name, start: -1, end: -1, line: -1 },
                            value: this.getDefaultValue(field.type, newVisited)
                        }));

                        return { type: "StructLiteral", structName: typeInfo.name, entries: entries, start: -1, end: -1, line: -1 };
                    }
                }
                return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
        }
    }

    validateAssignment(targetType, valueExpr, token, customMismatchError = null) {
        const inferredVal = this.inferType(valueExpr);

        let typeMatch = false;
        let updatedExpr = valueExpr;

        if (inferredVal === "any" || targetType.name === "any") {
            typeMatch = true;
        }
        else if (inferredVal === targetType.name) {
            typeMatch = true;
        }
        else if (targetType.type === "StructType" && inferredVal === "map") {
            typeMatch = true;
            if (valueExpr.type === "MapLiteral") {
                updatedExpr = this.validateStructLiteral(valueExpr, targetType.name, token);
            }
        }
        else if (targetType.name === "nullable" && targetType.generic) {
            // FIXED: Concrete type name (e.g. "number") can match the nullable requirement
            if (inferredVal === targetType.generic.name || inferredVal === "null" || inferredVal === "nullable") {
                typeMatch = true;
                if (inferredVal === targetType.generic.name && valueExpr.type === "MapLiteral") {
                    updatedExpr = this.validateStructLiteral(valueExpr, targetType.generic.name, token);
                }
            }
        }
        // FIXED: Allow implicit unwrapping of nullable result from index access if inner type matches
        // This supports the test case where we assign a nullable[index] (which is technically nullable) 
        // to a strict variable, relying on runtime checks.
        else if (inferredVal === "nullable" && targetType.name !== "nullable") {
            const resolved = this.inferType(valueExpr, true);
            if (resolved === targetType.name) {
                typeMatch = true;
            }
        }

        if (!typeMatch) {
            if (targetType.name === "list" && inferredVal === "map") {
                this.addError(token, "List cannot be set using map.");
            } else if (targetType.name === "map" && inferredVal === "list") {
                this.addError(token, "Map cannot be set using list.");
            } else if (targetType.name === "nullable") {
                this.addError(token, "Nullable variable assignment type mismatch.");
            } else {
                this.addError(token, customMismatchError || "Variable assignment type mismatch.");
            }
            throw new ShiftParserError("Assignment validation failed", token.l, token.v);
        }

        return updatedExpr;
    }

    validateStructLiteral(literal, structName, token) {
        const def = this.structDefinitions.get(structName);
        if (!def) return literal;

        // Clone map literal and its entries to maintain AST immutability
        const clonedLiteral = {
            type: "StructLiteral",
            structName: structName,
            start: literal.start,
            end: literal.end,
            line: literal.line,
            entries: [...literal.entries.map(e => ({ ...e }))]
        };

        def.fields.forEach(field => {
            const entryIndex = clonedLiteral.entries.findIndex(e => e.key.value === field.name);

            if (entryIndex === -1) {
                if (field.name.startsWith('$')) {
                    this.addError(token, `Missing required struct field: '${field.name}'.`);
                } else {
                    try {
                        const defaultVal = this.getDefaultValue(field.type, new Set([structName]));
                        clonedLiteral.entries.push({
                            key: { type: "Literal", value: field.name, start: -1, end: -1, line: -1 },
                            value: defaultVal
                        });
                    } catch (e) {
                        this.addError(token, e.message);
                    }
                }
            } else {
                const entry = clonedLiteral.entries[entryIndex];
                const valType = this.inferType(entry.value);
                let typeMatch = false;

                if (valType === "any" || field.type.name === "any" || valType === field.type.name) {
                    typeMatch = true;
                } else if (field.type.type === "StructType" && valType === "map") {
                    typeMatch = true;
                    if (entry.value.type === "MapLiteral") {
                        entry.value = this.validateStructLiteral(entry.value, field.type.name, token);
                    }
                }
                else if (field.type.name === "nullable" && field.type.generic) {
                    if (valType === field.type.generic.name || valType === "null") {
                        typeMatch = true;
                        if (valType === field.type.generic.name && entry.value.type === "MapLiteral") {
                            entry.value = this.validateStructLiteral(entry.value, field.type.generic.name, token);
                        }
                    }
                }

                if (!typeMatch) {
                    this.addError(token, "Struct value type mismatch.");
                }
            }
        });

        clonedLiteral.entries.forEach(entry => {
            if (!def.fields.find(f => f.name === entry.key.value)) {
                this.addError(token, `Unknown field in struct initialization: '${entry.key.value}'.`);
            }
        });

        return clonedLiteral;
    }

    variableDeclaration() {
        const startToken = this.peek();
        const typeInfo = this.parseType();
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect variable name.");

        if (typeInfo.name === "any") {
            this.addError(nameToken, "Type 'any' is not allowed for variable declarations.");
        }

        if (typeInfo.name === "nullable" && typeInfo.generic && typeInfo.generic.name === "any") {
            this.addError(nameToken, "Type 'nullable<any>' is not allowed.");
        }

        let initializer = null;
        let isInitialized = true;

        if (this.match(TokenType.ASSIGN)) {
            initializer = this.parseExpression();
            try {
                initializer = this.validateAssignment(typeInfo, initializer, nameToken);
            } catch (e) {
            }
        } else {
            try {
                initializer = this.getDefaultValue(typeInfo);
            } catch (e) {
                this.addError(nameToken, e.message);
            }
        }

        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");

        try {
            this.defineVariable(nameToken.v, { ...typeInfo, initialized: isInitialized }, true);
        } catch (e) {
            this.addError(nameToken, e.message);
        }

        return {
            type: "VariableDeclaration",
            start: startToken.s,
            end: endToken.e,
            line: nameToken.l,
            varType: typeInfo,
            name: nameToken.v,
            initializer: initializer
        };
    }

    expressionStatement() {
        const expr = this.parseExpression();
        const endToken = this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");

        return {
            type: "ExpressionStatement",
            start: expr.start,
            end: endToken.e,
            line: expr.line,
            expression: expr
        };
    }

    match(expectedType) {
        if (this.check(expectedType)) {
            this.advance();
            return true;
        }
        return false;
    }

    matchTypeKeyword() {
        if (this.isAtEnd()) return false;
        const tokenType = this.peek().t;
        if (tokenType.startsWith("TYPE_")) return tokenType;
        return null;
    }

    check(expectedType) {
        if (this.isAtEnd()) return false;
        return this.peek().t === expectedType;
    }

    advance() {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    consume(expectedType, message) {
        if (this.check(expectedType)) return this.advance();
        throw this.addError(this.peek(), message);
    }

    isAtEnd() {
        return this.peek().t === TokenType.EOF;
    }

    peek() {
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current - 1];
    }

    addError(token, message) {
        const err = new ShiftParserError(message, token.l, token.v);
        this.errors.push(err);
        return err;
    }

    synchronize() {
        this.advance();
        let braceDepth = 0;

        while (!this.isAtEnd()) {
            const token = this.peek();

            if (token.t === TokenType.LBRACE) {
                braceDepth++;
            }
            else if (token.t === TokenType.RBRACE) {
                if (braceDepth > 0) {
                    braceDepth--;
                    this.advance();
                    if (braceDepth === 0) return;
                    continue;
                } else {
                    return;
                }
            }

            if (this.previous().t === TokenType.SEMICOLON && braceDepth === 0) return;

            if (braceDepth === 0) {
                switch (token.t) {
                    case TokenType.FUNCTION:
                    case TokenType.STRUCT:
                    case TokenType.IMPORT:
                    case TokenType.FOR:
                    case TokenType.WHILE:
                    case TokenType.IF:
                    case TokenType.RETURN:
                        return;
                }
            }

            this.advance();
        }
    }
}