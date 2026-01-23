import {TokenType} from './token_enums.mjs';
import { ExpressionParser } from './expression_parser.mjs';

export class Parser
{
	constructor(tokens) {
		this.tokens = tokens;
		this.current = 0;
		this.errors = [];
		this.expressionParser = new ExpressionParser(this);
        
        this.currentReturnType = null; 
        this.loopDepth = 0;

        this.scopes = [];
        this.enterScope(); 
        
        // Base types only. Standard Library types/structs must be loaded externally.
        this.knownTypes = new Set(["string", "number", "bool", "list", "map", "any", "null", "none", "nullable"]);
        this.structDefinitions = new Map();
        
        // Tracking used functions for tree-shaking
        this.usedFunctions = new Set();
	}

    markFunctionUsed(name) {
        this.usedFunctions.add(name);
    }

	preScan() {
        const startPos = this.current;
        
        // PASS 1: Struct Discovery
        this.current = 0;
        while (!this.isAtEnd()) {
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

    preParseFunction() {
        const nameToken = this.consume(TokenType.IDENTIFIER, "Expect function name.");
        this.consume(TokenType.LPAREN, "Expect '(' after function name.");
        
        // Parse parameters to advance the cursor past them correctly
        if (!this.check(TokenType.RPAREN)) {
            do {
                this.parseType(); // Parse type (handles generics)
                this.consume(TokenType.IDENTIFIER, "Expect parameter name.");
            } while (this.match(TokenType.COMMA));
        }
        
        this.consume(TokenType.RPAREN, "Expect ')' after parameters.");

        // Parse Return Type strictly with specific error messages
        const returnType = this.parseType("Expect function return type.", "Invalid function return type.");
        
        // Register the function with the CORRECT return type
        this.defineVariable(nameToken.v, { 
            type: "Type", 
            name: returnType.name, 
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

	inferType(expr) {
        if (!expr) return "null";

        switch (expr.type) {
			case "ListLiteral": return "list";
            case "MapLiteral":  return "map";

            case "InspectExpression": return "InspectionResult"; // Hardcoded expectation of StdLib struct
            case "PackExpression": return "string";
            case "UnpackExpression": return "list";
            case "SizeOfExpression": return "number";
            case "TypeOfExpression": return "string";

            case "PipelineExpression": return this.inferType(expr.right);

            case "Literal":
                if (typeof expr.value === 'number') return "number";
                if (typeof expr.value === 'string') return "string";
                if (typeof expr.value === 'boolean') return "bool";
                if (expr.value === null) return "null";
                return "any";

            case "BinaryExpression":
                if (["==", "!=", "<", ">", "<=", ">=", "and", "or", "xor", "has"].includes(expr.operator)) return "bool";
                if (["-", "*", "/", "%", "+"].includes(expr.operator)) return "number";
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

                    let isNullableResult = false;

                    for (const keyNode of chain) {
                        if (currentType.name === "any") return "any";

                        // Unwrap nullable, but mark result as nullable
                        while (currentType.name === "nullable" && currentType.generic) {
                             isNullableResult = true;
                             currentType = currentType.generic;
                        }

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
                    
                    // If we traversed through a nullable, the result must be nullable
                    if (isNullableResult && currentType.name !== "nullable") {
                        return "nullable"; 
                    }

                    return currentType.name;
				}
				return "any";
			}

            default: return "any";
        }
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
        // Ensure preScan has been called if not already manually invoked
        // Note: In our new architecture, preScan is called manually after loading definitions
        
        const startToken = this.tokens[0];
        const endToken = this.tokens[this.tokens.length - 1]; // EOF

		const program = { 
            type: "Program", 
            start: startToken ? startToken.s : 0,
            end: endToken ? endToken.e : 0,
            line: 1,
            structs: [], 
            functions: [] 
        };

        this.errors = [];

		while (!this.isAtEnd()) {
			try {
                if (this.match(TokenType.STRUCT)) {
                    const structDecl = this.structDeclaration();
                    program.structs.push(structDecl);
                } else if (this.match(TokenType.FUNCTION)) {
                    const funcDecl = this.functionDeclaration();
                    program.functions.push(funcDecl);
                } else {
                    this.addError(this.peek(), "Expect 'function' or 'struct' at top level.");
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
        // Removed assignment '=' check
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

		const body = this.parseBlock(); 
        
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
        
        this.consume(TokenType.CATCH, "Expect 'catch' after try block.");
        this.consume(TokenType.LBRACE, "Expect '{' before catch block.");
        
        this.enterScope();
        this.defineVariable("$thrown_message", { type: "Type", name: "string", initialized: true });
        const catchBlock = this.parseBlock();
        this.exitScope();

        let reviewBlock = null;
        let endToken = catchBlock; // If no review, end is catch block

        if (this.match(TokenType.REVIEW)) {
            this.consume(TokenType.LBRACE, "Expect '{' before review block.");
            this.enterScope();
            this.defineVariable("$thrown_message", { type: "Type", name: "string", initialized: true });
            reviewBlock = this.parseBlock();
            this.exitScope();
            endToken = reviewBlock;
        }

        return {
            type: "TryStatement",
            start: startToken.s,
            end: endToken.end,
            tryBlock: tryBlock,
            catchIdentifier: "$thrown_message",
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

	parseExpression() { return this.expressionParser.parse(); }

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
                const isPrimitive = ["number", "bool"].includes(this.currentReturnType);
                if (isNull && !isPrimitive) { /* Allowed */ } 
                else if (inferredType !== "any" && inferredType !== this.currentReturnType) {
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
        
        // --- FIXED LOGIC START ---
        // Handle: for (key, value in collection)
        const iteratorToken = this.consume(TokenType.IDENTIFIER, "Expect iterator variable name.");
        let valueIteratorToken = null;

        if (this.match(TokenType.COMMA)) {
            valueIteratorToken = this.consume(TokenType.IDENTIFIER, "Expect value iterator variable name.");
        }
        // --- FIXED LOGIC END ---

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
        let valueIterType = "any"; // New: Type for the value iterator
        
        if (isRange) {
            iterType = "number";
            if (valueIteratorToken) {
                 this.addError(valueIteratorToken, "Range loops cannot have two iterators.");
            }
        } else {
            const collectionType = this.inferType(startOrCollection);

            if (["list", "any"].includes(collectionType)) {
                 iterType = "any"; 
                 // If iterating list with (index, value), index is number, value is any
                 if (valueIteratorToken) {
                     iterType = "number"; // The key for a list is the index
                     valueIterType = "any";
                 }
            }
            else if (["map"].includes(collectionType) || this.structDefinitions.has(collectionType)) {
                 iterType = "string"; // Keys 
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
                valueIterator: valueIteratorToken ? valueIteratorToken.v : null, // Store second iterator name
                collection: startOrCollection, 
                body: body, 
                line: startToken.l 
            };
        }
    }

	getDefaultValue(typeInfo, visited = new Set()) {
        switch (typeInfo.name) {
            // Note: Literals created here are synthetic (no source location), 
            // but we need to satisfy schema. 
            // We use -1 for start/end to indicate synthetic nodes.
            case "number": return { type: "Literal", value: 0, start: -1, end: -1, line: -1 };
            case "string": return { type: "Literal", value: "", start: -1, end: -1, line: -1 };
            case "bool":   return { type: "Literal", value: false, start: -1, end: -1, line: -1 };
            case "list":   return { type: "ListLiteral", elements: [], start: -1, end: -1, line: -1 };
            case "map":    return { type: "MapLiteral", entries: [], start: -1, end: -1, line: -1 };
            case "null":   return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
            case "none":   return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
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
                        return { type: "MapLiteral", entries: entries, start: -1, end: -1, line: -1 };
                    }
                }
                return { type: "Literal", value: null, start: -1, end: -1, line: -1 }; 
        }
    }

    // CENTRALIZED ASSIGNMENT LOGIC
    validateAssignment(targetType, valueExpr, token, customMismatchError = null) {
        const inferredVal = this.inferType(valueExpr);
        let typeMatch = false;

        // 1. Any check (Strict: Any variable can take anything, Any value can go anywhere)
        if (inferredVal === "any" || targetType.name === "any") {
            typeMatch = true;
        }
        // 2. Exact match
        else if (inferredVal === targetType.name) {
            typeMatch = true;
        }
        // 3. Struct Initialization via Map Literal
        else if (targetType.type === "StructType" && inferredVal === "map") {
            typeMatch = true;
            if (valueExpr.type === "MapLiteral") {
                this.validateStructLiteral(valueExpr, targetType.name, token);
            }
        }
        // 4. Nullable Handling
        else if (targetType.name === "nullable" && targetType.generic) {
            if (inferredVal === targetType.generic.name || inferredVal === "null") {
                typeMatch = true;
                if (inferredVal === targetType.generic.name && valueExpr.type === "MapLiteral") {
                     this.validateStructLiteral(valueExpr, targetType.generic.name, token);
                }
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
                // Use custom error if provided, otherwise default
                this.addError(token, customMismatchError || "Variable assignment type mismatch.");
            }
            throw new Error("Assignment validation failed"); // Short circuit
        }
    }

    validateStructLiteral(literal, structName, token) {
        const def = this.structDefinitions.get(structName);
        if (!def) return; 

        def.fields.forEach(field => {
            const entry = literal.entries.find(e => e.key.value === field.name);
            
            // MISSING FIELD LOGIC
            if (!entry) {
                if (field.name.startsWith('$')) {
                    this.addError(token, `Missing required struct field: '${field.name}'.`);
                } else {
                    // Auto-inject default value for non-required fields
                    try {
                        const defaultVal = this.getDefaultValue(field.type, new Set([structName])); 
                        literal.entries.push({
                            key: { type: "Literal", value: field.name, start: -1, end: -1, line: -1 },
                            value: defaultVal
                        });
                    } catch (e) {
                         this.addError(token, e.message);
                    }
                }
            } else {
                const valType = this.inferType(entry.value);
                let typeMatch = false;

                if (valType === "any" || field.type.name === "any" || valType === field.type.name) {
                    typeMatch = true;
                } else if (field.type.type === "StructType" && valType === "map") {
                    typeMatch = true;
                    if (entry.value.type === "MapLiteral") {
                        this.validateStructLiteral(entry.value, field.type.name, token);
                    }
                } 
                else if (field.type.name === "nullable" && field.type.generic) {
                    if (valType === field.type.generic.name || valType === "null") {
                        typeMatch = true;
                        if (valType === field.type.generic.name && entry.value.type === "MapLiteral") {
                             this.validateStructLiteral(entry.value, field.type.generic.name, token);
                        }
                    }
                }

                if (!typeMatch) {
                    this.addError(token, "Struct value type mismatch.");
                }
            }
        });
        
        literal.entries.forEach(entry => {
            if (!def.fields.find(f => f.name === entry.key.value)) {
                this.addError(token, `Unknown field in struct initialization: '${entry.key.value}'.`);
            }
        });
    }

	variableDeclaration() {
        // start of declaration is usually the type keyword
        const startToken = this.peek(); // We haven't consumed type yet
        
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
                this.validateAssignment(typeInfo, initializer, nameToken);
            } catch (e) {
                // Validation failed, errors already added
            }
        } else {
            try {
                initializer = this.getDefaultValue(typeInfo);
            } catch(e) {
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

	match(expectedType)
	{
		if (this.check(expectedType))
		{
			this.advance();
			return true;
		}
		return false;
	}

	matchTypeKeyword()
	{
		if (this.isAtEnd()) return false;
		const tokenType = this.peek().t;
		if (tokenType.startsWith("TYPE_")) return tokenType;
		return null;
	}

	check(expectedType)
	{
		if (this.isAtEnd()) return false;
		return this.peek().t === expectedType;
	}

	advance()
	{
		if (!this.isAtEnd()) this.current++;
		return this.previous();
	}

	consume(expectedType, message)
	{
		if (this.check(expectedType)) return this.advance();
		throw this.addError(this.peek(), message);
	}

	isAtEnd()
	{
		return this.peek().t === TokenType.EOF;
	}

	peek()
	{
		return this.tokens[this.current];
	}

	previous()
	{
		return this.tokens[this.current - 1];
	}

	addError(token, message)
	{
		const err = { 
			line: token.l, 
			token: token.v, 
			message: message 
		};
		this.errors.push(err);
		return err;
	}

	synchronize()
	{
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