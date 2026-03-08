import { TokenType } from './token_enums.mjs';

export class ExpressionParser {
    constructor(parser) {
        this.parser = parser;
    }

    parse() {
        return this.assignment();
    }

    // Level 0: Assignment (a = b)
    assignment() {
        let expr = this.pipeline();

        if (this.parser.match(TokenType.ASSIGN)) {
            const equalsToken = this.parser.previous();
            const value = this.pipeline();

            if (expr.type === "Variable") {
                const varName = expr.name;
                const varType = this.parser.getVariable(varName);

                if (!varType) {
                    throw this.parser.addError(equalsToken, "Undefined variable.");
                }

                // USE CENTRALIZED VALIDATION
                try {
                    this.parser.validateAssignment(varType, value, equalsToken);
                } catch (e) {
                    // Errors already added by validator
                }

                return {
                    type: "Assignment",
                    start: expr.start,
                    end: value.end,
                    line: equalsToken.l,
                    name: varName,
                    value: value
                };
            }
            else if (expr.type === "IndexExpression") {

                let depth = 0;
                let root = expr;

                // 1. Drill down to find the root Variable
                while (root.type === "IndexExpression") {
                    depth++;
                    root = root.object;
                }

                if (root.type === "Variable") {
                    const varName = root.name;
                    const varType = this.parser.getVariable(varName);

                    // --- STRUCT VALIDATION ---
                    if (varType && varType.type === "StructType") {
                        // Validate assignment to a struct field

                        const containerTypeName = this.parser.inferType(expr.object);

                        if (this.parser.structDefinitions.has(containerTypeName)) {
                            const def = this.parser.structDefinitions.get(containerTypeName);

                            // 1. Validate Key (Must be literal string)
                            if (expr.index.type !== "Literal" || typeof expr.index.value !== "string") {
                                throw this.parser.addError(equalsToken, "Struct keys must be string literals.");
                            }

                            const fieldName = expr.index.value;
                            const field = def.fields.find(f => f.name === fieldName);

                            // 2. Validate Schema Existence
                            if (!field) {
                                throw this.parser.addError(expr.index, "Cannot set Struct element that is not in its defined schema");
                            }

                            // 3. IMMUTABILITY CHECK
                            if (field.name.startsWith('$')) {
                                throw this.parser.addError(equalsToken, `Cannot assign to immutable field '${field.name}'.`);
                            }

                            // 4. Validate Value Type (USING CENTRALIZED LOGIC)
                            // Note: Field type is the target, value is the expression
                            try {
                                // Struct fields expect specific message if type check fails
                                this.parser.validateAssignment(field.type, value, equalsToken, "Struct field type mismatch.");
                            } catch (e) {
                                // Suppress internal throw
                            }
                        }
                    }
                    // --- END STRUCT VALIDATION ---

                    else if (varType && varType.generic) {

                        let currentGeneric = varType.generic;
                        let currentDepth = depth;

                        while (currentDepth > 1 && currentGeneric && currentGeneric.generic) {
                            currentGeneric = currentGeneric.generic;
                            currentDepth--;
                        }

                        // MAP CHECKS
                        if (varType.name === "map" && depth === 1) {
                            if (expr.index === null) {
                                throw this.parser.addError(equalsToken, "Cannot push to Map without a key.");
                            }
                            const inferredKey = this.parser.inferType(expr.index);
                            if (inferredKey !== "any" && inferredKey !== "string") {
                                throw this.parser.addError(equalsToken, "Map keys must be strings.");
                            }
                        }

                        // VALUE TYPE CHECK (USING CENTRALIZED LOGIC)
                        // The target type is 'currentGeneric' (the type held inside the list/map)
                        try {
                            const errorMsg = varType.name === "map"
                                ? "Map value type mismatch."
                                : "List variable assignment type mismatch.";

                            this.parser.validateAssignment(currentGeneric, value, equalsToken, errorMsg);
                        } catch (e) {
                            // Suppress internal throw, errors are in parser.errors
                        }
                    }
                }

                return {
                    type: "IndexAssignment",
                    start: expr.start,
                    end: value.end,
                    line: equalsToken.l,
                    object: expr.object,
                    index: expr.index,
                    value: value
                };
            }

            throw this.parser.addError(equalsToken, "Invalid assignment target.");
        }

        return expr;
    }

    // Level 0.5: Pipeline (|)
    pipeline() {
        let expr = this.nullCoalescing();

        while (this.parser.match(TokenType.PIPE)) {
            const operatorToken = this.parser.previous();
            const right = this.nullCoalescing();

            expr = {
                type: "PipelineExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 0.7: Null Coalescing (??)
    nullCoalescing() {
        let expr = this.logicalOr();

        while (this.parser.match(TokenType.QUESTION_QUESTION)) {
            const operatorToken = this.parser.previous();
            const right = this.logicalOr();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 1: Logical OR
    logicalOr() {
        let expr = this.logicalAnd();

        while (this.parser.match(TokenType.LOGICAL_OR)) {
            const operatorToken = this.parser.previous();
            const right = this.logicalAnd();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 2: Logical AND
    logicalAnd() {
        let expr = this.logicalXor();

        while (this.parser.match(TokenType.LOGICAL_AND)) {
            const operatorToken = this.parser.previous();
            const right = this.logicalXor();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 3: Logical XOR
    logicalXor() {
        let expr = this.equality();

        while (this.parser.match(TokenType.LOGICAL_XOR)) {
            const operatorToken = this.parser.previous();
            const right = this.equality();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 4: Equality (==, !=)
    equality() {
        let expr = this.comparison();

        while (this.parser.match(TokenType.BANG_EQUAL) || this.parser.match(TokenType.EQUAL_EQUAL)) {
            const operatorToken = this.parser.previous();
            const right = this.comparison();

            // TYPE CHECK FOR EQUALITY
            const leftType = this.parser.inferType(expr);
            const rightType = this.parser.inferType(right);

            if (leftType !== "any" && rightType !== "any") {
                let match = false;
                if (leftType === rightType) match = true;
                if (leftType === "null" || rightType === "null") match = true;
                if (leftType === "nullable" || rightType === "nullable") match = true;

                if (!match) {
                    throw this.parser.addError(operatorToken, `Cannot compare different types: ${leftType} and ${rightType}`);
                }
            }


            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 5: Comparison (<, >, <=, >=, has, search, is, contains, replace, split, joined, matches)
    comparison() {
        let expr = this.concatenation();

        while (this.parser.match(TokenType.LANGLE) || this.parser.match(TokenType.RANGLE) ||
            this.parser.match(TokenType.LESS_EQUAL) || this.parser.match(TokenType.GREATER_EQUAL) ||
            this.parser.match(TokenType.HAS) || this.parser.match(TokenType.SEARCH) ||
            this.parser.match(TokenType.CONTAINS) || this.parser.match(TokenType.IS) ||
            this.parser.match(TokenType.REPLACE) || this.parser.match(TokenType.SPLIT) || this.parser.match(TokenType.JOINED) ||
            this.parser.match(TokenType.MATCHES)
        ) {
            const operatorToken = this.parser.previous();

            // 1. IS Operator
            if (operatorToken.t === TokenType.IS) {
                let isNot = false;
                if (this.parser.match(TokenType.NOT)) {
                    isNot = true;
                }

                let checkType = "";
                let endPos = operatorToken.e;

                // Match type keywords (string, number) OR identifiers (alpha, email)
                if (this.parser.matchTypeKeyword()) {
                    const tok = this.parser.advance();
                    checkType = tok.v;
                    endPos = tok.e;
                } else if (this.parser.match(TokenType.IDENTIFIER)) {
                    const tok = this.parser.previous();
                    checkType = tok.v;
                    endPos = tok.e;
                } else {
                    throw this.parser.addError(this.parser.peek(), "Expect type or check name after 'is'.");
                }

                expr = {
                    type: "IsExpression",
                    start: expr.start,
                    end: endPos,
                    line: operatorToken.l,
                    left: expr,
                    check: checkType,
                    isNot: isNot
                };
                continue;
            }

            // 2. REPLACE Operator
            if (operatorToken.t === TokenType.REPLACE) {
                const pattern = this.concatenation();
                this.parser.consume(TokenType.WITH, "Expect 'with' after replace pattern.");
                const replacement = this.concatenation();

                expr = {
                    type: "ReplaceExpression",
                    start: expr.start,
                    end: replacement.end,
                    line: operatorToken.l,
                    source: expr,
                    pattern: pattern,
                    replacement: replacement
                };
                continue;
            }

            // 3. SPLIT / JOINED Operators
            if (operatorToken.t === TokenType.SPLIT || operatorToken.t === TokenType.JOINED) {
                this.parser.consume(TokenType.WITH, `Expect 'with' after ${operatorToken.v}.`);
                const delimiter = this.concatenation();

                expr = {
                    type: operatorToken.t === TokenType.SPLIT ? "SplitExpression" : "JoinExpression",
                    start: expr.start,
                    end: delimiter.end,
                    line: operatorToken.l,
                    source: expr,
                    delimiter: delimiter
                };
                continue;
            }

            // 4. Standard Binary Ops (contains, search, has, matches, etc)
            const right = this.concatenation();

            // CONTAINS Check
            if (operatorToken.t === TokenType.CONTAINS) {
                const leftType = this.parser.inferType(expr);
                if (leftType !== "any" && leftType !== "list" && leftType !== "string") {
                    // We allow list or string for 'contains'
                }
            }

            if (operatorToken.t === TokenType.SEARCH) {
                const leftType = this.parser.inferType(expr);
                const rightType = this.parser.inferType(right);

                // 1. Data must be string
                if (leftType !== "any" && leftType !== "string") {
                    throw this.parser.addError(operatorToken, "Search data must be a string.");
                }

                // 2. Pattern must be string
                if (rightType !== "any" && rightType !== "string") {
                    throw this.parser.addError(operatorToken, "Search expression must be a string.");
                }

                // 3. Pattern literal validation (heuristics)
                if (right.type === "Literal" && typeof right.value === "string") {
                    if (!right.value.startsWith("/")) {
                        throw this.parser.addError(operatorToken, "Search expression must be a valid regular expression.");
                    }
                }
            }

            if (operatorToken.t === TokenType.MATCHES) {
                const leftType = this.parser.inferType(expr);
                const rightType = this.parser.inferType(right);

                // 1. Data must be string
                if (leftType !== "any" && leftType !== "string") {
                    throw this.parser.addError(operatorToken, "Matches data must be a string.");
                }

                // 2. Pattern must be string
                if (rightType !== "any" && rightType !== "string") {
                    throw this.parser.addError(operatorToken, "Matches expression must be a string.");
                }

                // 3. Pattern literal validation (heuristics)
                if (right.type === "Literal" && typeof right.value === "string") {
                    if (!right.value.startsWith("/")) {
                        throw this.parser.addError(operatorToken, "Matches expression must be a valid regular expression.");
                    }
                }
            }

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 5.5: Concatenation (&)
    concatenation() {
        let expr = this.term();

        while (this.parser.match(TokenType.AMPERSAND)) {
            const operatorToken = this.parser.previous();
            const right = this.term();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 6: Term (+, -) 
    term() {
        let expr = this.factor();

        while (this.parser.match(TokenType.PLUS) || this.parser.match(TokenType.MINUS)) {
            const operatorToken = this.parser.previous();
            const right = this.factor();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }
        return expr;
    }

    // Level 7: Factor (*, /, %)
    factor() {
        let expr = this.power(); // Changed from unary() to power()

        while (this.parser.match(TokenType.SLASH) || this.parser.match(TokenType.STAR) || this.parser.match(TokenType.PERCENT)) {
            const operatorToken = this.parser.previous();
            const right = this.power(); // Changed from unary() to power()

            if (operatorToken.v === '/' || operatorToken.v === '%') {
                if (right.type === "Literal" && right.value === 0) {
                    const isMod = operatorToken.v === '%';
                    throw this.parser.addError(operatorToken, isMod ? "Explicit attempt to modulus by zero" : "Explicit attempt to divide by zero");
                }
            }

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 7.5: Power (^) - New
    power() {
        let expr = this.unary();

        while (this.parser.match(TokenType.CARET)) {
            const operatorToken = this.parser.previous();
            const right = this.unary();

            expr = {
                type: "BinaryExpression",
                start: expr.start,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 8: Unary (not, -, inspect, pack, unpack, size of, type of)
    unary() {
        if (this.parser.match(TokenType.NOT) || this.parser.match(TokenType.MINUS)) {
            const operatorToken = this.parser.previous();
            const right = this.unary();

            return {
                type: "UnaryExpression",
                start: operatorToken.s,
                end: right.end,
                line: operatorToken.l,
                operator: operatorToken.v,
                argument: right
            };
        }

        // inspect <expr>
        if (this.parser.match(TokenType.INSPECT)) {
            const startToken = this.parser.previous();
            const right = this.unary();
            return {
                type: "InspectExpression",
                start: startToken.s,
                end: right.end,
                line: startToken.l,
                argument: right
            };
        }

        // pack <expr>
        if (this.parser.match(TokenType.PACK)) {
            const startToken = this.parser.previous();
            const right = this.unary();
            return {
                type: "PackExpression",
                start: startToken.s,
                end: right.end,
                line: startToken.l,
                argument: right
            };
        }

        // unpack <expr>
        if (this.parser.match(TokenType.UNPACK)) {
            const startToken = this.parser.previous();
            const right = this.unary();
            return {
                type: "UnpackExpression",
                start: startToken.s,
                end: right.end,
                line: startToken.l,
                argument: right
            };
        }

        // size of <expr>
        if (this.parser.match(TokenType.SIZE)) {
            const startToken = this.parser.previous();
            this.parser.consume(TokenType.OF, "Expect 'of' after 'size'.");
            const right = this.unary();

            const argType = this.parser.inferType(right);
            if (["number", "bool", "null", "none", "nullable"].includes(argType)) {
                throw this.parser.addError(this.parser.previous(), "Cannot get size of primitive types");
            }

            return {
                type: "SizeOfExpression",
                start: startToken.s,
                end: right.end,
                line: startToken.l,
                argument: right
            };
        }

        // type of <expr>
        if (this.parser.match(TokenType.TYPE)) {
            const startToken = this.parser.previous();
            this.parser.consume(TokenType.OF, "Expect 'of' after 'type'.");
            const right = this.unary();
            return {
                type: "TypeOfExpression",
                start: startToken.s,
                end: right.end,
                line: startToken.l,
                argument: right
            };
        }

        return this.cast();
    }

    // Level 8.5: Cast (as)
    cast() {
        let expr = this.primary();

        while (this.parser.match(TokenType.AS)) {
            const asToken = this.parser.previous();
            const typeInfo = this.parser.parseType();
            // Note: parseType doesn't return a Node, so it doesn't have an end.
            // But if it was a generic, it consumed RANGLE.
            // We need to approximate the end from previous token.
            const endToken = this.parser.previous();

            let fromType = this.parser.inferType(expr);
            const toType = typeInfo.name;

            let fromGeneric = null;
            if (expr.type === "Variable") {
                const varDef = this.parser.getVariable(expr.name);
                if (varDef && varDef.generic) {
                    fromGeneric = varDef.generic.name;
                }
            }

            let checkFrom = fromType;
            let checkTo = toType;

            if (fromType === "nullable" && fromGeneric) {
                checkFrom = fromGeneric;
            }
            if (toType === "nullable" && typeInfo.generic) {
                checkTo = typeInfo.generic.name;
            }

            if (checkFrom !== "any" && checkTo !== "any") {
                const fromName = fromType === "nullable" && fromGeneric ? `nullable<${fromGeneric}>` : fromType;

                if (checkFrom === "bool") {
                    if (checkTo === "list") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to list`);
                    if (checkTo === "map") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to map`);
                }

                if (checkFrom === "number") {
                    if (checkTo === "list") {
                        const sub = typeInfo.generic ? typeInfo.generic.name : "unknown";
                        throw this.parser.addError(asToken, `Cannot cast from ${fromName} to list<${sub}>`);
                    }
                    if (checkTo === "map") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to map`);
                }

                if (checkFrom === "string") {
                    if (checkTo === "map") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to map`);
                }

                if (checkFrom === "list") {
                    if (checkTo === "map") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to map`);
                    if (checkTo === "bool") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to bool`);
                    if (checkTo === "number") {
                        if (fromGeneric === "bool") throw this.parser.addError(asToken, `Error cannot cast from list<bool> to number`);
                        if (fromGeneric === "number") throw this.parser.addError(asToken, `Error cannot cast from list<number> to number`);
                    }
                }

                if (checkFrom === "map") {
                    if (checkTo === "bool") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to bool`);
                    if (checkTo === "list") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to list`);
                    if (checkTo === "number") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to number`);
                    if (checkTo === "string") throw this.parser.addError(asToken, `Error cannot cast from ${fromName} to string`);
                }
            }

            expr = {
                type: "CastExpression",
                start: expr.start,
                end: endToken.e,
                line: asToken.l,
                value: expr,
                targetType: typeInfo
            };
        }

        return expr;
    }

    // Level 9: Primary (Atomic values)
    primary() {
        if (this.parser.match(TokenType.FALSE)) {
            const t = this.parser.previous();
            return { type: "Literal", value: false, start: t.s, end: t.e, line: t.l };
        }
        if (this.parser.match(TokenType.TRUE)) {
            const t = this.parser.previous();
            return { type: "Literal", value: true, start: t.s, end: t.e, line: t.l };
        }
        if (this.parser.match(TokenType.TYPE_NULL)) {
            const t = this.parser.previous();
            return { type: "Literal", value: null, start: t.s, end: t.e, line: t.l };
        }

        if (this.parser.match(TokenType.MAGIC_VAR)) {
            const token = this.parser.previous();
            return {
                type: "MagicVariable",
                start: token.s,
                end: token.e,
                line: token.l,
                name: token.v
            };
        }

        if (this.parser.match(TokenType.NUMBER)) {
            const token = this.parser.previous();
            return {
                type: "Literal",
                start: token.s,
                end: token.e,
                line: token.l,
                value: parseFloat(token.v)
            };
        }

        if (this.parser.match(TokenType.STRING)) {
            const token = this.parser.previous();
            return {
                type: "Literal",
                start: token.s,
                end: token.e,
                line: token.l,
                value: token.v
            };
        }

        if (this.parser.match(TokenType.LBRACKET)) {
            return this.collectionLiteral();
        }

        if (this.parser.match(TokenType.IDENTIFIER)) {
            const token = this.parser.previous();
            const name = token.v;

            const symbol = this.parser.getVariable(name);
            if (!symbol) {
                throw this.parser.addError(token, "Undefined variable.");
            }

            let expr;

            if (this.parser.match(TokenType.LPAREN)) {
                expr = this.finishCall(name, token);
            } else {
                expr = {
                    type: "Variable",
                    start: token.s,
                    end: token.e,
                    line: token.l,
                    name: name
                };
            }

            while (this.parser.match(TokenType.LBRACKET)) {
                expr = this.finishIndex(expr);
            }

            return expr;
        }

        if (this.parser.match(TokenType.LPAREN)) {
            const startToken = this.parser.previous();
            const expr = this.parse();
            const endToken = this.parser.consume(TokenType.RPAREN, "Expect ')' after expression.");
            return {
                type: "Grouping",
                start: startToken.s,
                end: endToken.e,
                line: startToken.l,
                expression: expr
            };
        }

        throw this.parser.addError(this.parser.peek(), "Expect expression.");
    }

    collectionLiteral() {
        const startToken = this.parser.previous(); // LBRACKET

        if (this.parser.check(TokenType.RBRACKET)) {
            const endToken = this.parser.consume(TokenType.RBRACKET, "Compiler error");
            return {
                type: "ListLiteral",
                start: startToken.s,
                end: endToken.e,
                line: startToken.l,
                elements: []
            };
        }

        const firstExpr = this.parse();

        if (this.parser.match(TokenType.COLON)) {
            const entries = [];

            const firstValue = this.parse();
            entries.push({ key: firstExpr, value: firstValue });

            while (this.parser.match(TokenType.COMMA)) {
                const key = this.parse();
                this.parser.consume(TokenType.COLON, "Expect ':' in map entry.");
                const value = this.parse();
                entries.push({ key: key, value: value });
            }

            const endToken = this.parser.consume(TokenType.RBRACKET, "Expect ']' after map literal.");
            return {
                type: "MapLiteral",
                start: startToken.s,
                end: endToken.e,
                line: startToken.l,
                entries: entries
            };
        }

        const elements = [firstExpr];

        while (this.parser.match(TokenType.COMMA)) {
            elements.push(this.parse());
        }

        const endToken = this.parser.consume(TokenType.RBRACKET, "Expect ']' after list literal.");
        return {
            type: "ListLiteral",
            start: startToken.s,
            end: endToken.e,
            line: startToken.l,
            elements: elements
        };
    }

    finishCall(calleeName, calleeToken) {
        this.parser.markFunctionUsed(calleeName);

        const args = [];
        if (!this.parser.check(TokenType.RPAREN)) {
            do {
                args.push(this.parse());
            } while (this.parser.match(TokenType.COMMA));
        }

        const endToken = this.parser.consume(TokenType.RPAREN, "Expect ')' after arguments.");

        // --- CALL VALIDATION ---
        const calleeVar = this.parser.getVariable(calleeName);
        if (calleeVar && calleeVar.params) {
            // 1. Check Argument Count
            if (args.length !== calleeVar.params.length) {
                this.parser.addError(calleeToken, `Function '${calleeName}' expects ${calleeVar.params.length} arguments but got ${args.length}.`);
            } else {
                // 2. Check Argument Types
                for (let i = 0; i < args.length; i++) {
                    const param = calleeVar.params[i];
                    const arg = args[i];

                    // Construct a type object compatible with validateAssignment
                    const typeObj = { type: "Type", name: param.type, generic: param.generic };

                    try {
                        this.parser.validateAssignment(typeObj, arg, calleeToken, `Argument '${param.name}' expects type '${param.type}' in call to '${calleeName}'.`);
                    } catch (e) {
                        // generic validation error added by validationAssignment
                    }
                }
            }
        }
        // --- END CALL VALIDATION ---

        return {
            type: "CallExpression",
            start: calleeToken.s,
            end: endToken.e,
            line: calleeToken.l,
            callee: calleeName,
            arguments: args
        };
    }

    finishIndex(objectExpr) {
        let index = null;
        if (!this.parser.check(TokenType.RBRACKET)) {
            index = this.parse();
        }

        const endToken = this.parser.consume(TokenType.RBRACKET, "Expect ']' after index.");

        return {
            type: "IndexExpression",
            start: objectExpr.start,
            end: endToken.e,
            line: objectExpr.line,
            object: objectExpr,
            index: index
        };
    }
}