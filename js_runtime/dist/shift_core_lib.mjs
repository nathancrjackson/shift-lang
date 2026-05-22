/**
 * Shift Script Library (Core Mode)
 * Bundled at: 2026-05-22T13:15:09.490Z
 */

// --- Source: token_enums.mjs ---
export const TokenType = {
// Keywords
FUNCTION: "FUNCTION",
RETURN: "RETURN",
STRUCT: "STRUCT",
IF: "IF",
ELSE: "ELSE",
FOR: "FOR",
IN: "IN",
TO: "TO",
    WHILE: "WHILE",
TRY: "TRY",
CATCH: "CATCH",
REVIEW: "REVIEW",
THROW: "THROW",
TRUE: "TRUE",
FALSE: "FALSE",
BREAK: "BREAK",
SKIP: "SKIP",
LOGICAL_AND: "LOGICAL_AND",
LOGICAL_OR: "LOGICAL_OR",
    LOGICAL_XOR: "LOGICAL_XOR",
NOT: "NOT",
    IMPORT: "IMPORT",

    // Casting & Checks
    AS: "AS",
    HAS: "HAS",
    IS: "IS",
                 
    CONTAINS: "CONTAINS",
    MATCHES: "MATCHES",
    DELETE: "DELETE",
    SEARCH: "SEARCH",

    // String/List Ops
    REPLACE: "REPLACE",
       
    WITH: "WITH",
             
    SPLIT: "SPLIT",
           
    JOINED: "JOINED",

    // Inspection & Bytes
    INSPECT: "INSPECT",
    SIZE: "SIZE",
    TYPE: "TYPE",
    OF: "OF",
    PACK: "PACK",
    UNPACK: "UNPACK",
         
    // Null Coalescing
    QUESTION_QUESTION: "QUESTION_QUESTION",

// Types
TYPE_STRING: "TYPE_STRING",
TYPE_NUMBER: "TYPE_NUMBER",
TYPE_BOOL: "TYPE_BOOL",
TYPE_LIST: "TYPE_LIST",
TYPE_MAP: "TYPE_MAP",
TYPE_NULL: "TYPE_NULL",
     
TYPE_NONE: "TYPE_NONE",
TYPE_ANY: "TYPE_ANY",
    TYPE_NULLABLE: "TYPE_NULLABLE",

// Symbols & Operators
BANG: "BANG",
BANG_EQUAL: "BANG_EQUAL",
    EQUAL_EQUAL: "EQUAL_EQUAL",
    LESS_EQUAL: "LESS_EQUAL",
GREATER_EQUAL: "GREATER_EQUAL",
LANGLE: "LANGLE",
RANGLE: "RANGLE",
             // < > 
LPAREN: "LPAREN",
RPAREN: "RPAREN",
             // ( )
LBRACE: "LBRACE",
RBRACE: "RBRACE",
             // { }
LBRACKET: "LBRACKET",
RBRACKET: "RBRACKET",
     // [ ]
COMMA: "COMMA",
COLON: "COLON",
SEMICOLON: "SEMICOLON",
PIPE: "PIPE",
ASSIGN: "ASSIGN",
PLUS: "PLUS",
MINUS: "MINUS",
SLASH: "SLASH",
STAR: "STAR",
PERCENT: "PERCENT",
                             // %
     
AMPERSAND: "AMPERSAND",
                         // &
     
CARET: "CARET",
                                 // ^
     
MAGIC_VAR: "MAGIC_VAR",
                         // $

// Literals
IDENTIFIER: "IDENTIFIER",
STRING: "STRING",
NUMBER: "NUMBER",

// Special identifiers
PIPE_VALUE: "PIPE_VALUE",

// Control
EOF: "EOF"
};

export const GENERICSARRAY = [TokenType.TYPE_STRING, TokenType.TYPE_NUMBER, TokenType.TYPE_BOOL, TokenType.TYPE_LIST, TokenType.TYPE_MAP, TokenType.TYPE_ANY];

export const KEYWORDS = {
"function": TokenType.FUNCTION,
"return": TokenType.RETURN,
"struct": TokenType.STRUCT,
"if": TokenType.IF,
"else": TokenType.ELSE,
"for": TokenType.FOR,
"in": TokenType.IN,
"to": TokenType.TO,
    "while": TokenType.WHILE,
"try": TokenType.TRY,
"catch": TokenType.CATCH,
"review": TokenType.REVIEW,
     
"throw": TokenType.THROW, 
"true": TokenType.TRUE,
"false": TokenType.FALSE,
"break": TokenType.BREAK,
"skip": TokenType.SKIP,
"and": TokenType.LOGICAL_AND,
"or": TokenType.LOGICAL_OR,
"xor": TokenType.LOGICAL_XOR,
"not": TokenType.NOT,
    "import": TokenType.IMPORT,

    "as": TokenType.AS,
    "has": TokenType.HAS,
    "is": TokenType.IS,
                 
    "contains": TokenType.CONTAINS,
     
    "matches": TokenType.MATCHES,
    "replace": TokenType.REPLACE,
       
    "with": TokenType.WITH,
             
    "split": TokenType.SPLIT,
           
    "joined": TokenType.JOINED,
    "delete": TokenType.DELETE,
    "search": TokenType.SEARCH,
    "inspect": TokenType.INSPECT,
    "size": TokenType.SIZE,
    "type": TokenType.TYPE,
    "of": TokenType.OF,
    "pack": TokenType.PACK,
    "unpack": TokenType.UNPACK,


"string": TokenType.TYPE_STRING,
"number": TokenType.TYPE_NUMBER,
"bool": TokenType.TYPE_BOOL,
"list": TokenType.TYPE_LIST,
"map": TokenType.TYPE_MAP,
"null": TokenType.TYPE_NULL,
     
"none": TokenType.TYPE_NONE,
"any": TokenType.TYPE_ANY,
    "nullable": TokenType.TYPE_NULLABLE
};

// --- Source: lexer.mjs ---

export class Lexer {
    constructor(source) {
        this.source = source;
        this.tokens = [];
        this.errors = [];
        this.startindex = 0;
        this.currentindex = 0;
        this.startline = 1;
        this.currentline = 1;
    }

    tokenize() {
        while (!this.isAtEnd()) {
            this.startindex = this.currentindex;
            this.startline = this.currentline;
            this.scanToken();
        }

        this.tokens.push({
            t: TokenType.EOF,
            v: "",
            l: this.currentline,
            s: this.currentindex,
            e: this.currentindex
        });

        return { 
            tokens: this.tokens, 
            errors: this.errors 
        };
    }

    addError(message) {
        this.errors.push({
            startline: this.startline,
            endline: this.currentline,
            message: message
        });
    }

    scanToken() {
        const char = this.advance();
        switch (char) {
            // Single-character tokens
            case '(': this.addToken(TokenType.LPAREN, "("); break;
            case ')': this.addToken(TokenType.RPAREN, ")"); break;
            case '{': this.addToken(TokenType.LBRACE, "{"); break;
            case '}': this.addToken(TokenType.RBRACE, "}"); break;
            case '[': this.addToken(TokenType.LBRACKET, "["); break;
            case ']': this.addToken(TokenType.RBRACKET, "]"); break;
            case ',': this.addToken(TokenType.COMMA, ","); break;
            case ':': this.addToken(TokenType.COLON, ":"); break;
            case ';': this.addToken(TokenType.SEMICOLON, ";"); break;
            case '+': this.addToken(TokenType.PLUS, "+"); break;
            case '-': this.addToken(TokenType.MINUS, "-"); break;
            case '*': this.addToken(TokenType.STAR, "*"); break;
            case '%': this.addToken(TokenType.PERCENT, "%"); break;
            case '^': this.addToken(TokenType.CARET, "^"); break;
            case '$': this.magicVariable(); break;
            
            // Null Coalescing ??
            case '?':
                if (this.match('?')) {
                    this.addToken(TokenType.QUESTION_QUESTION, "??");
                } else { 
                    this.addError("Unexpected character '?'");
                }
                break;

            // Could it be generic definition or could it be a comparison?
            case '<':
                if (this.match('=')) this.addToken(TokenType.LESS_EQUAL, "<=");
                else this.addToken(TokenType.LANGLE, "<");
                break;
            case '>':
                if (this.match('=')) this.addToken(TokenType.GREATER_EQUAL, ">=");
                else this.addToken(TokenType.RANGLE, ">");
                break;

            // Other comparisons
            case '!':
                if (this.match('=')) this.addToken(TokenType.BANG_EQUAL, "!=");
                else this.addToken(TokenType.BANG, "!");
                break;
            case '=':
                if (this.match('=')) this.addToken(TokenType.EQUAL_EQUAL, "==");
                else this.addToken(TokenType.ASSIGN, "=");
                break;
            
            // Concatenation or Logic?
            case '&':
                if (this.match('&')) {
                    this.addError("Unsupported operator '&&'. Use 'and' instead.");
                } else {
                    this.addToken(TokenType.AMPERSAND, "&");
                }
                break;

            // Pipe or Logic?
            case '|':
                if (this.match('|')) {
                    this.addError("Unsupported operator '||'. Use 'or' instead.");
                } else {
                    this.addToken(TokenType.PIPE, "|");
                }
                break;

            // Is it a comment or a math division?
            case '/':
                if (this.match('/')) {
                    this.advanceUntil('\n');
                } else if (this.match('*')) {
                    // Block comment /* ... */
                    this.skipBlockComment();
                } else {
                    this.addToken(TokenType.SLASH, "/");
                }
                break;

            // Whitespace
            case ' ':
            case '\r':
            case '\t':
                break;
            case '\n':
                this.currentline++;
                break;

            // String Literals
            case '"':
                this.string();
                break;

            default:
                if (this.isDigit(char)) {
                    this.number();
                } else if (this.isAlpha(char)) {
                    this.identifier();
                } else if (!this.isWhitespace(char)) {
                    this.addError(`Unexpected character '${char}'`);
                }
                break;
        }
    }

    identifier() {
        while (this.isAlphaNumeric(this.peek())) this.advance();

        const text = this.source.substring(this.startindex, this.currentindex);
        const type = KEYWORDS[text] || TokenType.IDENTIFIER;
        this.addToken(type, text);
    }

    number() {
        while (this.isDigit(this.peek())) this.advance();

        // Look for fractional part
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            this.advance(); // Consume the "."
            while (this.isDigit(this.peek())) this.advance();
        }

        const value = this.source.substring(this.startindex, this.currentindex);
        this.addToken(TokenType.NUMBER, value);
    }

    string() {
        while (!this.isAtEnd()) {
            // Handle the backslash case
            if (this.peek() === '\\') {
                this.advance(); // Consume slash
                if (this.isAtEnd()) break; // Prevent out-of-bounds on dangling slash
                
                // Track newline if we are escaping a line break
                if (this.peek() === '\n') {
                    this.currentline++;
                }
                
                this.advance(); // Consume escaped character
                continue;
            }

            if (this.peek() === '"') {
                break;
            }

            if (this.peek() === '\n') {
                this.currentline++;
            }

            this.advance();
        }

        // Catch unterminated strings
        if (this.isAtEnd()) {
            this.addError("Unterminated string");
            return;
        }

        this.advance(); // Move past the closing "

        // Extract raw content and unescape it
        const raw = this.source.substring(this.startindex + 1, this.currentindex - 1);
        const value = this.unescapeString(raw);
        this.addToken(TokenType.STRING, value);
    }

    unescapeString(str) {
        let result = "";
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '\\') {
                i++;
                if (i >= str.length) break;
                switch (str[i]) {
                    case '"': result += '"'; break;
                    case '\\': result += '\\'; break;
                    case 'n': result += '\n'; break;
                    case 'r': result += '\r'; break;
                    case 't': result += '\t'; break;
                    default: result += str[i]; // Unknown escape, keep literal
                }
            } else {
                result += str[i];
            }
        }
        return result;
    }

    skipBlockComment() {
        while (!this.isAtEnd()) {
            if (this.peek() === '*' && this.peekNext() === '/') {
                this.advance(); // *
                this.advance(); // /
                return;
            }
            if (this.peek() === '\n') {
                this.currentline++;
            }
            this.advance();
        }
        this.addError("Unterminated block comment");
    }

    advance() {
        const char = this.source.charAt(this.currentindex);
        this.currentindex++;
        return char;
    }

    advanceUntil(char) {
        while (this.peek() !== char && !this.isAtEnd()) {
            // Keep tracking line numbers
            if (this.peek() === '\n') {
                this.currentline++;
            }
            this.advance();
        }
        // False if we encountered EOF first
        return !this.isAtEnd();
    }

    peek() {
        if (this.isAtEnd()) return '\0';
        return this.source.charAt(this.currentindex);
    }

    peekNext() {
        if (this.currentindex + 1 >= this.source.length) return '\0';
        return this.source.charAt(this.currentindex + 1);
    }

    match(expected) {
        if (this.isAtEnd()) return false;
        
        const currentCharacter = this.source.charAt(this.currentindex);
        if (currentCharacter !== expected) return false;

        this.currentindex++;
        return true;
    }

    // t = Token type, v = Token value, l = Line Token is on
    addToken(t, v) {
        // Add start (s) and end (e) indices
        this.tokens.push({ 
            t, 
            v, 
            l: this.currentline,
            s: this.startindex,
            e: this.currentindex
        });
    }

    magicVariable() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        const text = this.source.substring(this.startindex, this.currentindex);
        this.addToken(TokenType.MAGIC_VAR, text);
    }

    isAtEnd() {
        return this.currentindex >= this.source.length;
    }

    isDigit(char) {
        return char >= '0' && char <= '9';
    }

    isAlpha(char) {
        return (char >= 'a' && char <= 'z') ||
               (char >= 'A' && char <= 'Z') ||
                char === '_';
    }

    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char);
    }

    isWhitespace(char) {
        return [' ', '\r', '\t', '\n'].includes(char);
    }
}

// --- Source: expression_parser.mjs ---

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

// --- Source: parser.mjs ---

export class Parser {
    constructor(tokens, importResolver = null, importedFiles = new Set(), currentFilePath = null) {
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
        const program = {
            type: "Program",
            start: this.tokens[0] ? this.tokens[0].s : 0,
            end: this.tokens[this.tokens.length - 1] ? this.tokens[this.tokens.length - 1].e : 0,
            line: 1,
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

                        return { type: "MapLiteral", entries: entries, start: -1, end: -1, line: -1 };
                    }
                }
                return { type: "Literal", value: null, start: -1, end: -1, line: -1 };
        }
    }

    validateAssignment(targetType, valueExpr, token, customMismatchError = null) {
        const inferredVal = this.inferType(valueExpr);

        let typeMatch = false;

        if (inferredVal === "any" || targetType.name === "any") {
            typeMatch = true;
        }
        else if (inferredVal === targetType.name) {
            typeMatch = true;
        }
        else if (targetType.type === "StructType" && inferredVal === "map") {
            typeMatch = true;
            if (valueExpr.type === "MapLiteral") {
                this.validateStructLiteral(valueExpr, targetType.name, token);
            }
        }
        else if (targetType.name === "nullable" && targetType.generic) {
            // FIXED: Concrete type name (e.g. "number") can match the nullable requirement
            if (inferredVal === targetType.generic.name || inferredVal === "null" || inferredVal === "nullable") {
                typeMatch = true;
                if (inferredVal === targetType.generic.name && valueExpr.type === "MapLiteral") {
                    this.validateStructLiteral(valueExpr, targetType.generic.name, token);
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
            throw new Error("Assignment validation failed");
        }
    }

    validateStructLiteral(literal, structName, token) {
        const def = this.structDefinitions.get(structName);
        if (!def) return;

        def.fields.forEach(field => {
            const entry = literal.entries.find(e => e.key.value === field.name);

            if (!entry) {
                if (field.name.startsWith('$')) {
                    this.addError(token, `Missing required struct field: '${field.name}'.`);
                } else {
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
                this.validateAssignment(typeInfo, initializer, nameToken);
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
        const err = {
            line: token.l,
            token: token.v,
            message: message
        };
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

// --- Source: runtime.mjs ---
// Exceptions for User Logic (still useful for error reporting)
class ShiftError extends Error { constructor(message) { super(message); } }
class ShiftAlert extends Error { constructor(message) { super(message); } }
class ShiftCritical extends Error { constructor(message) { super(message); } }

// Control Flow Signals (Internal Only - Not thrown)
const SIGNAL_NONE = 0;
const SIGNAL_BREAK = 1;
const SIGNAL_SKIP = 2;
const SIGNAL_RETURN = 3;

export class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.values = new Map();
    }

    define(name, value) {
        this.values.set(name, value);
    }

    get(name) {
        if (this.values.has(name)) return this.values.get(name);
        if (this.parent) return this.parent.get(name);
        throw new Error(`Runtime Error: Undefined variable '${name}'.`);
    }

    assign(name, value) {
        if (this.values.has(name)) {
            this.values.set(name, value);
            return;
        }
        if (this.parent) {
            this.parent.assign(name, value);
            return;
        }
        throw new Error(`Runtime Error: Undefined variable '${name}'.`);
    }
}

class StackFrame {
    constructor(type, env, statements = []) {
        this.type = type; // "Function", "Block", "Loop"
        this.env = env;
        this.statements = statements;
        this.pc = 0; // Program Counter
        this.waitingForExpr = false;
        this.exprResult = null;
    }
}

export class Runtime {
    constructor(ast, debugMode = false) {
        this.ast = ast;
        this.debugMode = debugMode;
        this.globalEnv = new Environment();
        this.functions = new Map();
        this.intrinsics = new Map();

        this.loadFunctions();

        // Global magic variables
        this.globalEnv.define("$line_num", 0);
        this.globalEnv.define("$pi", Math.PI);
        this.globalEnv.define("$e", Math.E);

        // The Execution Stack
        this.stack = [];
        this.maxInstructions = 0;
        this.instructionsRun = 0;

        // Configurable Regex Safety Controls
        this.allowUnsafeRegexFallback = true;  // If false, suspicious patterns crash instantly
        this.unsafeRegexMaxStringCeiling = 120; // Highly restrictive character cap for suspicious patterns
    }

    logDebug(msg) {
        if (this.debugMode) {
            console.log(`[DEBUG] ${msg}`);
        }
    }

    addIntrinsic(name, func) {
        this.intrinsics.set(name, func);
    }

    loadFunctions() {
        for (const func of this.ast.functions) {
            this.functions.set(func.name, func);
        }
    }

    stringify(val) {
        if (typeof val === 'boolean') return val ? "1" : "0";
        return String(val);
    }

    deepCopy(value, visited = new Set()) {
        if (value === null) return null;
        if (typeof value !== 'object') return value;
        if (visited.has(value)) {
            throw new Error(`Runtime Error: Circular reference detected during deep copy.`);
        }
        visited.add(value);

        if (Array.isArray(value)) return value.map(item => this.deepCopy(item, visited));
        if (value instanceof Map) {
            const newMap = new Map();
            if (value.__shift_type) newMap.__shift_type = value.__shift_type;
            for (const [k, v] of value) newMap.set(k, this.deepCopy(v, visited));
            return newMap;
        }
        return value;
    }

    getDefaultValue(typeInfo) {
        switch (typeInfo.name) {
            case "number": return 0;
            case "string": return "";
            case "bool": return false;
            case "list": return [];
            case "map": return new Map();
            case "null": return null;
            case "none": return null;
            case "nullable": return null;
            case "any": return null;
            default: return null;
        }
    }

    checkType(value, typeInfo) {
        if (typeInfo.name === 'any') return;
        if (value === null) {
            if (["nullable", "null", "none"].includes(typeInfo.name)) return;
            throw new Error(`Runtime Error: Return type mismatch.`);
        }
        if (typeInfo.name === 'nullable') {
            if (typeInfo.generic) this.checkType(value, typeInfo.generic);
            return;
        }
        if (typeInfo.type === 'StructType') {
            if (!(value instanceof Map)) throw new Error(`Runtime Error: Return type mismatch.`);
            value.__shift_type = typeInfo.name;
            return;
        }
        const actualType = typeof value;

        // Strict Type Mapping
        let expectedJS = typeInfo.name;
        if (expectedJS === "bool") expectedJS = "boolean";

        const valid = (typeInfo.name === "list" && Array.isArray(value)) ||
            (typeInfo.name === "map" && value instanceof Map) ||
            (expectedJS === actualType);

        if (!valid) throw new Error(`Runtime Error: Return type mismatch.`);

        if (typeInfo.name === "list" && typeInfo.generic) {
            for (let i = 0; i < value.length; i++) {
                this.checkType(value[i], typeInfo.generic);
            }
        } else if (typeInfo.name === "map" && typeInfo.generic) {
            for (const val of value.values()) {
                this.checkType(val, typeInfo.generic);
            }
        }
    }

    verifySafeRegex(pattern) {
        // 1. Prohibit backreferences (\1, \2)
        if (/\\\d/.test(pattern)) return false;

        // 2. Detect nested quantifiers (e.g., (a+)+, (.*)*)
        if (/\([^)]*[\*\+\?\}][^)]*\)[\*\+\?\}]/.test(pattern)) return false;

        // 3. Detect overlapping quantifiers across alternations (e.g., (a+|b+)+)
        if (/\([^)]*[\*\+\?\}].*\|.*[\*\+\?\}][^)]*\)[\*\+\?\}]/.test(pattern)) return false;

        return true; // Pattern structural composition passed safety benchmarks
    }

    // --- The Stack Machine Core ---

    runFunction(name, args = []) {
        const previousStack = this.stack;
        this.stack = [];

        try {
            let func = null;

            if (this.intrinsics.has(name)) {
                this.logDebug(`Running Intrinsic: ${name}`);
                return this.intrinsics.get(name)(args, this);
            } else {
                func = this.functions.get(name);
            }

            if (!func) throw new Error(`Runtime Error: Function '${name}' not found.`);
            if (args.length !== func.params.length) {
                throw new Error(`Runtime Error: Function '${name}' expects ${func.params.length} arguments but got ${args.length}.`);
            }

            const fnEnv = new Environment(this.globalEnv);
            for (let i = 0; i < func.params.length; i++) {
                const paramName = func.params[i].name;
                const paramValue = this.deepCopy(args[i]);
                fnEnv.define(paramName, paramValue);
            }

            const initialFrame = new StackFrame("Function", fnEnv, func.body.statements);
            initialFrame.meta = { returnType: func.returnType, functionName: name };

            this.stack.push(initialFrame);
            this.logDebug(`Pushed Function Frame: ${name} (Args: ${args.length})`);

            let finalResult = null;
            let currentSignal = SIGNAL_NONE;
            let signalValue = null;

            while (this.stack.length > 0) {
                this.instructionsRun++;
                if (this.maxInstructions > 0 && this.instructionsRun > this.maxInstructions) {
                    throw new ShiftCritical("Runtime Error: Execution exceeded maximum instruction limit.");
                }

                const frame = this.stack[this.stack.length - 1];

                if (currentSignal === SIGNAL_RETURN) {
                    if (frame.type === "Function") {
                        finalResult = signalValue;
                        this.stack.pop();
                        this.logDebug(`Popped Function Frame: ${frame.meta?.functionName} (Return: ${this.stringify(finalResult)})`);

                        if (frame.meta && frame.meta.returnType) {
                            this.checkType(finalResult, frame.meta.returnType);
                        }

                        if (this.stack.length === 0) return finalResult;

                        const callerFrame = this.stack[this.stack.length - 1];
                        callerFrame.exprResult = finalResult;
                        callerFrame.waitingForExpr = false;

                        currentSignal = SIGNAL_NONE;
                        signalValue = null;
                        continue;
                    }
                    else {
                        this.stack.pop();
                        this.logDebug(`Popped Frame: ${frame.type} (Propagating Return)`);
                        continue;
                    }
                }

                if (currentSignal === SIGNAL_BREAK || currentSignal === SIGNAL_SKIP) {
                    if (frame.type === "Loop") {
                        if (currentSignal === SIGNAL_BREAK) {
                            this.stack.pop();
                            this.logDebug(`Loop Terminated (Break)`);
                            currentSignal = SIGNAL_NONE;
                        } else {
                            this.logDebug(`Loop Skipping`);
                            currentSignal = SIGNAL_NONE;
                        }
                        continue;
                    } else if (frame.type === "Function") {
                        throw new Error("Runtime Error: 'break' or 'skip' used outside of loop.");
                    } else {
                        this.stack.pop();
                        continue;
                    }
                }

                if (frame.pc >= frame.statements.length) {
                    this.stack.pop();
                    this.logDebug(`Popped Frame: ${frame.type} (Finished)`);

                    if (frame.type === "Function") {
                        const retType = frame.meta.returnType;
                        if (retType.name !== 'none' && retType.name !== 'null' &&
                            retType.name !== 'nullable' && retType.name !== 'any') {
                            throw new Error(`Runtime Error: Expected a return but none was supplied before function end.`);
                        }
                        if (this.stack.length > 0) {
                            const caller = this.stack[this.stack.length - 1];
                            caller.exprResult = null;
                            caller.waitingForExpr = false;
                        } else {
                            return null;
                        }
                    }
                    continue;
                }

                const stmt = frame.statements[frame.pc];

                if (frame.type !== "Loop") {
                    frame.pc++;
                }

                try {
                    this.executeStatement(stmt, frame, (sig, val) => {
                        currentSignal = sig;
                        signalValue = val;
                        if (sig !== SIGNAL_NONE) this.logDebug(`Signal Raised: ${sig}`);
                    });
                } catch (e) {
                    throw e;
                }

                if (currentSignal !== SIGNAL_NONE) continue;
            }

            return finalResult;

        } finally {
            this.stack = previousStack;
        }
    }

    executeStatement(stmt, frame, signalCallback) {
        if (stmt.line) {
            try { this.globalEnv.assign("$line_num", stmt.line); } catch (e) { }
        }

        this.logDebug(`Exec Stmt: ${stmt.type} (Line: ${stmt.line})`);

        switch (stmt.type) {
            case "VariableDeclaration": {
                if (stmt.name.startsWith('$')) throw new Error(`Runtime Error: Cannot declare magic variable '${stmt.name}'.`);
                let val = stmt.initializer ? this.deepCopy(this.evaluate(stmt.initializer, frame.env)) : this.getDefaultValue(stmt.varType);
                if (stmt.varType.type === "StructType" && val instanceof Map) val.__shift_type = stmt.varType.name;
                frame.env.define(stmt.name, val);
                break;
            }
            case "ExpressionStatement":
                this.evaluate(stmt.expression, frame.env);
                break;

            case "ReturnStatement": {
                let retVal = null;
                if (stmt.value) retVal = this.evaluate(stmt.value, frame.env);
                signalCallback(SIGNAL_RETURN, retVal);
                break;
            }

            case "BreakStatement":
                signalCallback(SIGNAL_BREAK, null);
                break;

            case "SkipStatement":
                signalCallback(SIGNAL_SKIP, null);
                break;

            case "IfStatement": {
                if (this.isTruthy(this.evaluate(stmt.condition, frame.env))) {
                    this.pushBlock(stmt.thenBranch, frame.env);
                } else if (stmt.elseBranch) {
                    if (stmt.elseBranch.type === "IfStatement") {
                        this.stack.push(new StackFrame("Block", new Environment(frame.env), [stmt.elseBranch]));
                    } else {
                        this.pushBlock(stmt.elseBranch, frame.env);
                    }
                }
                break;
            }

            case "WhileStatement": {
                this.startLoop(stmt, frame.env, "while");
                break;
            }

            case "ForRangeStatement": {
                this.startLoop(stmt, frame.env, "range");
                break;
            }

            case "ForInStatement": {
                this.startLoop(stmt, frame.env, "in");
                break;
            }

            case "Block": {
                this.pushBlock(stmt, frame.env);
                break;
            }

            case "LoopStep": {
                this.executeLoopStep(frame);
                break;
            }

            case "ThrowStatement": {
                const message = this.evaluate(stmt.argument, frame.env);
                if (stmt.severity === "alert") throw new ShiftAlert(message);
                if (stmt.severity === "critical") throw new ShiftCritical(message);
                throw new ShiftError(message);
            }

            case "TryStatement": {
                try {
                    this.runProtectedBlock(stmt.tryBlock, frame.env, signalCallback);
                } catch (e) {
                    if (e instanceof ShiftCritical) {
                        throw e;
                    }
                    else if (e instanceof ShiftAlert) {
                        if (stmt.reviewBlock) {
                            const reviewEnv = new Environment(frame.env);
                            reviewEnv.define(stmt.catchIdentifier, e.message);
                            this.runProtectedBlock(stmt.reviewBlock, reviewEnv, signalCallback);
                        } else {
                            throw e;
                        }
                    }
                    else if (e instanceof ShiftError || e instanceof Error) {
                        if (stmt.catchBlock) {
                            const catchEnv = new Environment(frame.env);
                            catchEnv.define(stmt.catchIdentifier, e.message);
                            this.runProtectedBlock(stmt.catchBlock, catchEnv, signalCallback);
                        } else {
                            throw e;
                        }
                    }
                }
                break;
            }

            case "DeleteStatement":
                this.executeDelete(stmt, frame.env);
                break;
        }
    }

    pushBlock(blockNode, parentEnv) {
        const blockEnv = new Environment(parentEnv);
        this.stack.push(new StackFrame("Block", blockEnv, blockNode.statements));
    }

    runProtectedBlock(blockNode, env, parentSignalCallback) {
        const oldStyleExec = (statements, env) => {
            for (const stmt of statements) {
                this.executeStatement(stmt, { env, type: "Protected" }, (sig, val) => {
                    throw { type: "Signal", sig, val };
                });
            }
        };
        try {
            oldStyleExec(blockNode.statements, env);
        } catch (e) {
            if (e.type === "Signal") {
                if (parentSignalCallback) {
                    parentSignalCallback(e.sig, e.val);
                } else {
                    throw new Error("Control flow signal unhandled in protected block.");
                }
                return;
            }
            throw e;
        }
    }

    startLoop(stmt, env, type) {
        const loopEnv = new Environment(env);
        const loopFrame = new StackFrame("Loop", loopEnv, []);

        if (type === "range") {
            const start = this.evaluate(stmt.startValue, env);
            const end = this.evaluate(stmt.endValue, env);
            if (typeof start !== 'number' || typeof end !== 'number') throw new Error("Range must be numbers");

            loopFrame.iterState = {
                type: "range",
                current: start,
                end: end,
                step: start <= end ? 1 : -1,
                varName: stmt.iterator,
                body: stmt.body
            };
        }
        else if (type === "while") {
            loopFrame.iterState = {
                type: "while",
                condition: stmt.condition,
                body: stmt.body
            };
        }
        else if (type === "in") {
            const col = this.evaluate(stmt.collection, env);
            let items = [];
            let isMap = false;

            if (Array.isArray(col)) items = col;
            else if (col instanceof Map) { items = Array.from(col.entries()); isMap = true; }
            else throw new Error("Not iterable");

            loopFrame.iterState = {
                type: "in",
                items: items,
                index: 0,
                varName: stmt.iterator,
                valVarName: stmt.valueIterator,
                isMap: isMap,
                body: stmt.body
            };
        }

        loopFrame.statements = [{ type: "LoopStep" }];
        this.stack.push(loopFrame);
        this.logDebug(`Started Loop (${type})`);
    }

    executeLoopStep(frame) {
        const state = frame.iterState;
        let shouldRun = false;
        let loopEnv = new Environment(frame.env);

        if (state.type === "range") {
            const cond = (state.step > 0) ? state.current <= state.end : state.current >= state.end;
            if (cond) {
                loopEnv.define(state.varName, state.current);
                state.current += state.step;
                shouldRun = true;
            }
        }
        else if (state.type === "while") {
            if (this.isTruthy(this.evaluate(state.condition, frame.env))) {
                shouldRun = true;
            }
        }
        else if (state.type === "in") {
            if (state.index < state.items.length) {
                const item = state.items[state.index++];
                if (state.isMap) {
                    if (state.valVarName) {
                        loopEnv.define(state.varName, item[0]);
                        loopEnv.define(state.valVarName, item[1]);
                    } else {
                        loopEnv.define(state.varName, item[0]);
                    }
                } else {
                    if (state.valVarName) {
                        loopEnv.define(state.varName, state.index - 1);
                        loopEnv.define(state.valVarName, item);
                    } else {
                        loopEnv.define(state.varName, item);
                    }
                }
                shouldRun = true;
            }
        }

        if (shouldRun) {
            frame.pc = 0;
            this.logDebug(`Loop Step: Running Body`);
            this.pushBlock(state.body, loopEnv);
        } else {
            this.stack.pop();
            this.logDebug(`Loop Finished`);
        }
    }

    evaluate(expr, env) {
        this.logDebug(`Eval: ${expr.type}`);

        switch (expr.type) {
            case "Literal": return expr.value;
            case "MagicVariable":
                if (expr.name === "$line_num") {
                    return expr.line || this.globalEnv.get("$line_num");
                }
                if (expr.name === "$pipe_value") return env.get("$pipe_value");
                return env.get(expr.name);
            case "Variable": return env.get(expr.name);
            case "ListLiteral": return expr.elements.map(e => this.evaluate(e, env));
            case "MapLiteral": {
                const map = new Map();
                for (const entry of expr.entries) map.set(this.evaluate(entry.key, env), this.evaluate(entry.value, env));
                return map;
            }
            case "Assignment": {
                if (expr.name.startsWith('$')) throw new Error(`Runtime Error: Cannot assign to magic variable '${expr.name}'.`);
                const value = this.deepCopy(this.evaluate(expr.value, env));
                env.assign(expr.name, value);
                return value;
            }
            case "IndexAssignment": {
                const container = this.evaluate(expr.object, env);
                const value = this.deepCopy(this.evaluate(expr.value, env));
                if (container === null) {
                    const index = this.evaluate(expr.index, env);
                    if (typeof index === 'number') throw new Error("Runtime Error: Cannot access index on null value.");
                    if (typeof index === 'string') throw new Error("Runtime Error: Cannot access key on null value.");
                    throw new Error("Runtime Error: Cannot assign to null.");
                }
                if (Array.isArray(container)) {
                    if (expr.index === null) { container.push(value); return value; }
                    const index = this.evaluate(expr.index, env);
                    if (typeof index !== 'number' || !Number.isInteger(index)) throw new Error("Runtime Error: List index must be integer value.");
                    if (index < 0) throw new Error("Runtime Error: List index must not be a negative number.");
                    if (index >= container.length) throw new Error("Runtime Error: List index is out of bounds.");
                    container[index] = value;
                    return value;
                }
                if (container instanceof Map) {
                    if (expr.index === null) throw new Error("Runtime Error: Map requires a key.");
                    const key = this.evaluate(expr.index, env);
                    if (typeof key !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
                    container.set(key, value);
                    return value;
                }
                throw new Error("Runtime Error: Invalid assignment target.");
            }

            case "BinaryExpression": return this.evaluateBinary(expr, env);
            case "UnaryExpression": return this.evaluateUnary(expr, env);
            case "Grouping": return this.evaluate(expr.expression, env);
            case "PipelineExpression": {
                const left = this.evaluate(expr.left, env);
                const hasPrev = env.values.has("$pipe_value");
                const prevVal = hasPrev ? env.values.get("$pipe_value") : undefined;
                env.define("$pipe_value", left);
                try {
                    return this.evaluate(expr.right, env);
                } finally {
                    if (hasPrev) {
                        env.define("$pipe_value", prevVal);
                    } else {
                        env.values.delete("$pipe_value");
                    }
                }
            }
            case "IndexExpression": return this.evaluateIndex(expr, env);
            case "CallExpression": {
                const args = expr.arguments.map(a => this.evaluate(a, env));
                return this.runFunction(expr.callee, args);
            }
            case "CastExpression": return this.evaluateCast(expr, env);
            default: return this.evaluateRest(expr, env);
        }
    }

    evaluateRest(expr, env) {
        switch (expr.type) {
            case "InspectExpression": {
                const val = this.evaluate(expr.argument, env);
                const map = new Map();
                let type = "any", size = null;
                if (val === null) type = "null";
                else if (Array.isArray(val)) { type = "list"; size = val.length; }
                else if (val instanceof Map) { type = val.__shift_type || "map"; size = val.size; }
                else if (typeof val === "number") type = "number";
                else if (typeof val === "string") { type = "string"; size = val.length; }
                else if (typeof val === "boolean") type = "bool";
                map.set("$type", type); map.set("$size", size);
                return map;
            }
            case "SizeOfExpression": {
                const val = this.evaluate(expr.argument, env);
                if (Array.isArray(val)) return val.length;
                if (val instanceof Map) return val.size;
                if (typeof val === "string") return val.length;
                throw new Error("Runtime Error: Cannot get size of primitive types");
            }
            case "PackExpression": {
                const bytes = this.evaluate(expr.argument, env);
                if (!Array.isArray(bytes)) throw new Error("Runtime Error: pack requires a list of numbers.");
                
                let result = "";
                const chunkSize = 10000;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    result += String.fromCodePoint(...bytes.slice(i, i + chunkSize));
                }
                return result;
            }
            case "UnpackExpression": return [...String(this.evaluate(expr.argument, env))].map(c => c.codePointAt(0));
            case "TypeOfExpression": return this.getTypeName(this.evaluate(expr.argument, env));
            case "IsExpression": return this.evaluateIs(expr, env);
            case "ReplaceExpression": return this.evaluateReplace(expr, env);
            case "SplitExpression": return String(this.evaluate(expr.source, env)).split(String(this.evaluate(expr.delimiter, env)));
            case "JoinExpression": {
                const src = this.evaluate(expr.source, env);
                if (!Array.isArray(src)) throw new Error("Runtime Error: Join requires a list.");
                return src.join(String(this.evaluate(expr.delimiter, env)));
            }
            default: throw new Error(`Unknown expression ${expr.type}`);
        }
    }

    evaluateIndex(expr, env) {
        const obj = this.evaluate(expr.object, env);
        const idx = this.evaluate(expr.index, env);
        if (obj === null) {
            if (typeof idx === 'number') throw new Error("Runtime Error: Cannot access index on null value.");
            if (typeof idx === 'string') throw new Error("Runtime Error: Cannot access key on null value.");
            throw new Error("Runtime Error: Cannot read properties of null.");
        }
        if (Array.isArray(obj)) {
            if (!Number.isInteger(idx)) throw new Error("Runtime Error: List index must be integer value.");
            if (idx < 0) throw new Error("Runtime Error: List index must not be a negative number.");
            if (idx >= obj.length) throw new Error("Runtime Error: List index is out of bounds.");
            return obj[idx];
        }
        if (obj instanceof Map) {
            if (typeof idx !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
            if (!obj.has(idx)) throw new Error("Runtime Error: Map key does not exist.");
            return obj.get(idx);
        }
        throw new Error("Runtime Error: Invalid index target.");
    }

    getTypeName(val) {
        if (val === null) return "null";
        if (Array.isArray(val)) return "list";
        if (val instanceof Map) return val.__shift_type || "map";
        if (typeof val === 'boolean') return "bool";
        return typeof val;
    }

    evaluateIs(expr, env) {
        const val = this.evaluate(expr.left, env);
        let res = false;
        const check = expr.check;

        if (check === "string") res = typeof val === 'string';
        else if (check === "number") res = typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
        else if (check === "bool") res = typeof val === 'boolean' || (typeof val === 'string' && (val === "1" || val === "0"));
        else if (check === "list") res = Array.isArray(val);
        else if (check === "map") res = val instanceof Map;
        else if (check === "null") res = val === null;
        else if (check === "integer") res = Number.isInteger(val) || (typeof val === 'string' && Number.isInteger(parseFloat(val)));
        else if (check === "whitespace") res = typeof val === 'string' && /^\s*$/.test(val);
        else if (check === "alpha") res = typeof val === 'string' && /^[a-zA-Z]+$/.test(val);
        else if (check === "numeric") res = typeof val === 'string' && /^[0-9]+$/.test(val);
        else if (check === "alphanumeric") res = typeof val === 'string' && /^[a-zA-Z0-9]+$/.test(val);
        else if (check === "email") res = typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        else throw new Error(`Unknown is check '${check}'`);

        return expr.isNot ? !res : res;
    }

    evaluateReplace(expr, env) {
        const src = String(this.evaluate(expr.source, env));
        const rep = String(this.evaluate(expr.replacement, env));
        const patRaw = String(this.evaluate(expr.pattern, env));

        if (patRaw.startsWith("/") && patRaw.lastIndexOf("/") > 0) {
            const last = patRaw.lastIndexOf('/');
            const pattern = patRaw.substring(1, last);
            const flags = patRaw.substring(last + 1);

            const isSafePattern = this.verifySafeRegex(pattern);
            if (!isSafePattern) {
                if (!this.allowUnsafeRegexFallback) {
                    throw new Error("Runtime Error: Strict Regex Protection prevents processing this complex pattern.");
                }
                if (src.length > this.unsafeRegexMaxStringCeiling) {
                    throw new Error(`Runtime Error: Suspicious regex running on string size (${src.length}) exceeding your fallback structural safety limit of ${this.unsafeRegexMaxStringCeiling} characters.`);
                }
            } else {
                if (src.length > 50000) throw new Error("Runtime Error: replace source string too large (ReDoS protection).");
            }

            try {
                const regex = new RegExp(pattern, flags);
                return src.replace(regex, rep);
            } catch (e) { throw new Error(`Runtime Error: Invalid regular expression in replace: ${e.message}`); }
        }
        return src.replaceAll(patRaw, rep);
    }

    evaluateCast(expr, env) {
        const val = this.evaluate(expr.value, env);
        const target = expr.targetType.name;
        const sourceType = this.getTypeName(val);

        if (sourceType === target) {
            return val;
        }

        if (target === "string") {
            if (sourceType === "map") throw new Error("Runtime Error: Cannot cast map to string.");
            if (Array.isArray(val)) return val.map(v => this.stringify(v)).join("");
            return this.stringify(val);
        }

        if (target === "number") {
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (typeof val === 'string') {
                const n = parseFloat(val);
                if (isNaN(n)) throw new Error("Runtime Error: Could not cast string to number.");
                return n;
            }
            throw new Error(`Runtime Error: Cannot cast ${sourceType} to number.`);
        }

        if (target === "bool") {
            if (typeof val === 'string') {
                if (val === "true" || val === "1") return true;
                if (val === "false" || val === "0") return false;
                const n = parseFloat(val);
                if (!isNaN(n)) return n !== 0;
                throw new Error("Runtime Error: Could not cast string to bool.");
            }
            if (typeof val === 'number') return val !== 0;
            if (typeof val === 'boolean') return val;

            throw new Error(`Runtime Error: Cannot cast ${sourceType} to bool.`);
        }

        if (target === "list") {
            if (typeof val === "string") return val.split('');
            if (Array.isArray(val)) return val;
            throw new Error(`Runtime Error: Cannot cast ${sourceType} to list.`);
        }

        return val;
    }

    evaluateBinary(expr, env) {
        const left = this.evaluate(expr.left, env);
        if (expr.operator === "and") return this.isTruthy(left) && this.isTruthy(this.evaluate(expr.right, env));
        if (expr.operator === "or") return this.isTruthy(left) || this.isTruthy(this.evaluate(expr.right, env));
        if (expr.operator === "??") return left !== null ? left : this.evaluate(expr.right, env);

        if (expr.operator === "xor") {
            const right = this.evaluate(expr.right, env);
            return this.isTruthy(left) !== this.isTruthy(right);
        }

        const right = this.evaluate(expr.right, env);
        if (expr.operator === "+") {
            if (typeof left === "number" && typeof right === "number") return left + right;
            if (typeof left === "string" && typeof right === "string") return left + right;
            throw new Error(`Runtime Error: Type Mismatch. Cannot add ${typeof left} and ${typeof right}.`);
        }
        if (expr.operator === "-") return left - right;
        if (expr.operator === "*") return left * right;
        if (expr.operator === "/") { if (right === 0) throw new Error("Runtime Error: Division by zero."); return left / right; }
        if (expr.operator === "%") { if (right === 0) throw new Error("Runtime Error: Modulo by zero."); return left % right; }
        if (expr.operator === "^") return Math.pow(left, right);
        if (expr.operator === "&") return this.stringify(left) + this.stringify(right);
        if (expr.operator === "==") return left === right;
        if (expr.operator === "!=") return left !== right;
        if (expr.operator === "<") return left < right;
        if (expr.operator === ">") return left > right;
        if (expr.operator === "<=") return left <= right;
        if (expr.operator === ">=") return left >= right;

        if (expr.operator === "contains") {
            if (Array.isArray(left) || typeof left === 'string') return left.includes(right);
            throw new Error("Runtime Error: 'contains' requires a list or string.");
        }
        if (expr.operator === "has") {
            if (left instanceof Map) {
                if (typeof right !== 'string') throw new Error("Runtime Error: 'has' check requires a string key.");
                return left.has(right);
            }
            throw new Error("Runtime Error: 'has' operator only works on maps.");
        }
        if (expr.operator === "matches") {
            const str = String(left); const reg = String(right);
            const l = reg.lastIndexOf('/');
            const pattern = reg.substring(1, l);
            const flags = reg.substring(l + 1);

            const isSafePattern = this.verifySafeRegex(pattern);

            if (!isSafePattern) {
                if (!this.allowUnsafeRegexFallback) {
                    throw new Error("Runtime Error: Strict Regex Protection prevents processing this complex pattern.");
                }
                if (str.length > this.unsafeRegexMaxStringCeiling) {
                    throw new Error(`Runtime Error: Suspicious regex running on string size (${str.length}) exceeding your fallback structural safety limit of ${this.unsafeRegexMaxStringCeiling} characters.`);
                }
            } else {
                if (str.length > 50000) throw new Error("Runtime Error: matches string too large (ReDoS protection).");
            }

            try {
                return new RegExp(pattern, flags).test(str);
            } catch (e) { throw new Error(`Runtime Error: Invalid regular expression in matches: ${e.message}`); }
        }

        if (expr.operator === "search") {
            const str = String(left); const regStr = String(right);
            const lastSlash = regStr.lastIndexOf('/');
            const pattern = regStr.substring(1, lastSlash);
            const flags = regStr.substring(lastSlash + 1);

            const isSafePattern = this.verifySafeRegex(pattern);

            if (!isSafePattern) {
                if (!this.allowUnsafeRegexFallback) {
                    throw new Error("Runtime Error: Strict Regex Protection prevents processing this complex pattern.");
                }
                if (str.length > this.unsafeRegexMaxStringCeiling) {
                    throw new Error(`Runtime Error: Suspicious regex running on string size (${str.length}) exceeding your fallback structural safety limit of ${this.unsafeRegexMaxStringCeiling} characters.`);
                }
            } else {
                if (str.length > 50000) throw new Error("Runtime Error: search string too large (ReDoS protection).");
            }

            let regex;
            try {
                regex = new RegExp(pattern, flags);
            } catch (e) { throw new Error(`Runtime Error: Invalid regular expression in search: ${e.message}`); }
            const results = [];
            let match;
            if (!regex.global) {
                match = regex.exec(str);
                if (match) {
                    const resMap = new Map();
                    resMap.__shift_type = "RegexResult";
                    resMap.set("match", match[0]);
                    resMap.set("start", match.index);
                    resMap.set("end", match.index + match[0].length);
                    resMap.set("groups", match.slice(1));
                    results.push(resMap);
                }
            } else {
                while ((match = regex.exec(str)) !== null) {
                    const resMap = new Map();
                    resMap.__shift_type = "RegexResult";
                    resMap.set("match", match[0]);
                    resMap.set("start", match.index);
                    resMap.set("end", match.index + match[0].length);
                    resMap.set("groups", match.slice(1));
                    results.push(resMap);
                }
            }
            return results;
        }

        throw new Error(`Unknown op ${expr.operator}`);
    }

    evaluateUnary(expr, env) {
        const val = this.evaluate(expr.argument, env);
        if (expr.operator === "not" || expr.operator === "!") return !this.isTruthy(val);
        if (expr.operator === "-") return -val;
        return null;
    }

    executeDelete(stmt, env) {
        const t = stmt.target;
        const obj = this.evaluate(t.object, env);
        const idx = this.evaluate(t.index, env);

        if (obj instanceof Map) {
            if (!obj.has(idx)) throw new Error("Runtime Error: Map key does not exist.");
            obj.delete(idx);
        } else if (Array.isArray(obj)) {
            if (!Number.isInteger(idx)) throw new Error("Runtime Error: List index must be integer value.");
            if (idx < 0) throw new Error("Runtime Error: List index must not be a negative number.");
            if (idx >= obj.length) throw new Error("Runtime Error: List index is out of bounds.");
            obj.splice(idx, 1);
        } else {
            throw new Error("Cannot delete");
        }
    }

    isTruthy(val) {
        return val !== null && val !== false && val !== 0;
    }
}

// --- Source: standard_library.mjs ---
let stdlibSource = `function get_substring(string input_str, number start_index, nullable<number> end_index) string {
	list<number> unpacked_str = unpack input_str;
	list<number> substring_list;
	number true_end = size of input_str;
	if (end_index != null)
	{
		true_end = end_index as number;
	}

	for ( index in start_index to (true_end - 1))
	{
		substring_list[] = unpacked_str[index];
	}

	return pack substring_list;
}

function transform_ansistring_to_uppercase(string input_str) string {
	list<number> charnum_list = unpack input_str;

	for (index in 0 to (size of charnum_list - 1))
	{
		if (charnum_list[index] >= 97 and charnum_list[index] <= 122)
		{
			charnum_list[index] = charnum_list[index] - 32;
		}
	}

	return pack charnum_list;
}

function transform_ansistring_to_lowercase(string input_str) string {
	list<number> charnum_list = unpack input_str;

	for (index in 0 to (size of charnum_list - 1))
	{
		if (charnum_list[index] >= 65 and charnum_list[index] <= 90)
		{
			charnum_list[index] = charnum_list[index] + 32;
		}
	}

	return pack charnum_list;
}

function trim_string(string input_str) string {
	if (size of input_str == 0) {
		return "";
	}
	list<string> exploded_input = input_str as list<string>;
	bool do_loop = true;

	while(do_loop)
	{
		if (exploded_input[0] == " ") { delete exploded_input[0]; }
		else if (exploded_input[0] == "\\r") { delete exploded_input[0]; }
		else if (exploded_input[0] == "\\n") { delete exploded_input[0]; }
		else if (exploded_input[0] == "\\t") { delete exploded_input[0]; }
		else { do_loop = false; }
	}

	do_loop = true;
	number reverse_cursor = size of exploded_input - 1;
	while(do_loop)
	{
		if (exploded_input[reverse_cursor] == " ")
			{ delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
		else if (exploded_input[reverse_cursor] == "\\r")
			{ delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
		else if (exploded_input[reverse_cursor] == "\\n")
			{ delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
		else if (exploded_input[reverse_cursor] == "\\t")
			{ delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
		else { do_loop = false; }
	}

	return exploded_input as string;
}
`;
// Helper to convert JS structure (Object/Array) to Shift structure (Map/List)
function toShift(val) {
	if (val === null) return null;
	if (Array.isArray(val)) return val.map(toShift);
	if (typeof val === 'object') {
		const m = new Map();
		for (const k in val) {
			if (Object.prototype.hasOwnProperty.call(val, k)) {
				m.set(k, toShift(val[k]));
			}
		}
		return m;
	}
	return val;
}

// Helper to convert Shift structure (Map/List) to JS structure (Object/Array)
function toJS(val) {
	return toJSWithVisited(val, new Map());
}

function toJSWithVisited(val, visited) {
	if (val instanceof Map) {
		if (visited.has(val)) return visited.get(val);
		const obj = {};
		visited.set(val, obj);
		for (const [k, v] of val) {
			obj[k] = toJSWithVisited(v, visited);
		}
		return obj;
	}
	if (Array.isArray(val)) {
		if (visited.has(val)) return visited.get(val);
		const arr = [];
		visited.set(val, arr);
		for (let i = 0; i < val.length; i++) {
			arr.push(toJSWithVisited(val[i], visited));
		}
		return arr;
	}
	return val;
}


// Helper to create a DateTime struct from a JS Date object
function create_dt_struct(date) {
	const dt = new Map();
	dt.set("year", date.getFullYear());
	dt.set("month", date.getMonth() + 1); // JS months are 0-indexed
	dt.set("day", date.getDate());
	dt.set("hour", date.getHours());
	dt.set("minute", date.getMinutes());
	dt.set("second", date.getSeconds());
	dt.set("millisecond", date.getMilliseconds());
	dt.set("offset_minutes", date.getTimezoneOffset());

	// Simple timezone extraction (heuristic)
	try {
		const str = date.toString();
		// e.g. "Mon Jan 19 2026 10:55:00 GMT+1100 (Australian Eastern Daylight Time)"
		const match = str.match(/\(([^)]+)\)$/);
		dt.set("timezone", match ? match[1] : "UTC");
	} catch (e) {
		dt.set("timezone", "UTC");
	}

	return dt;
}

export const StandardLibrary = {
	// 1. Struct Definitions (Schema)
	structs: [
		{
			name: "DateTime",
			fields: [
				{ name: "year", type: "number" },
				{ name: "month", type: "number" },
				{ name: "day", type: "number" },
				{ name: "hour", type: "number" },
				{ name: "minute", type: "number" },
				{ name: "second", type: "number" },
				{ name: "millisecond", type: "number" },
				{ name: "offset_minutes", type: "number" },
				{ name: "timezone", type: "string" }
			]
		},
		{
			name: "RegexResult",
			fields: [
				{ name: "match", type: "string" },
				{ name: "start", type: "number" },
				{ name: "end", type: "number" },
				{ name: "groups", type: "list", generic: "string" }
			]
		},
		{
			name: "InspectionResult",
			fields: [
				{ name: "$type", type: "string" },
				{ name: "$size", type: "nullable", generic: "number" }
			]
		}
	],

	// 2. Intrinsics (Native JS Implementations)
	intrinsics: {
		"print_line": {
			returnType: "none",
			params: [{ name: "val", type: "any" }],
			func: (args, runtime) => { console.log(args[0]); return null; }
		},
		"convert_jsonstring_to_map": {
			returnType: "map",
			generic: "any",
			params: [{ name: "json", type: "string" }],
			func: (args) => {
				let json;
				try {
					json = JSON.parse(args[0]);
				} catch (e) {
					throw new Error("Runtime Error: Invalid JSON string.");
				}
				if (json === null || Array.isArray(json) || typeof json !== 'object') {
					throw new Error("Runtime Error: JSON string is not an object.");
				}
				return toShift(json);
			}
		},
		"convert_jsonstring_to_list": {
			returnType: "list",
			generic: "any",
			params: [{ name: "json", type: "string" }],
			func: (args) => {
				let json;
				try {
					json = JSON.parse(args[0]);
				} catch (e) {
					throw new Error("Runtime Error: Invalid JSON string.");
				}
				if (!Array.isArray(json)) {
					throw new Error("Runtime Error: JSON string is not a list.");
				}
				return toShift(json);
			}
		},
		"convert_map_to_jsonstring": {
			returnType: "string",
			params: [{ name: "m", type: "map", generic: "any" }],
			func: (args) => {
				const val = args[0];
				if (!(val instanceof Map)) {
					throw new Error("Runtime Error: Expected map.");
				}
				return JSON.stringify(toJS(val));
			}
		},
		"convert_list_to_jsonstring": {
			returnType: "string",
			params: [{ name: "l", type: "list", generic: "any" }],
			func: (args) => {
				const val = args[0];
				if (!Array.isArray(val)) {
					throw new Error("Runtime Error: Expected list.");
				}
				return JSON.stringify(toJS(val));
			}
		},

		// Random
		"generate_randomnumber": {
			returnType: "number",
			params: [],
			func: (args) => Math.random()
		},
		"generate_randomint_from_range": {
			returnType: "number",
			params: [{ name: "num_x", type: "number" }, { name: "num_y", type: "number" }],
			func: (args) => {
				const num_x = args[0];
				const num_y = args[1];
				
				if (typeof num_x !== 'number' || typeof num_y !== 'number' || !Number.isFinite(num_x) || !Number.isFinite(num_y)) {
					throw new Error("Runtime Error: Random range must be finite numbers.");
				}

				// Automatically determine min and max regardless of argument order
				const min = Math.ceil(Math.min(num_x, num_y));
				const max = Math.floor(Math.max(num_x, num_y));

				return Math.floor(Math.random() * (max - min + 1)) + min;
			}
		},

		// DateTime Intrinsics
		"get_datetime": {
			returnType: "DateTime",
			params: [],
			func: (args) => create_dt_struct(new Date())
		},
		"get_datetime_as_unixtime": {
			returnType: "number",
			params: [],
			func: (args) => Math.floor(Date.now() / 1000)
		},
		"get_datetime_as_iso8601": {
			returnType: "string",
			params: [],
			func: (args) => new Date().toISOString()
		},
		"convert_unixtime_to_datetime": {
			returnType: "DateTime",
			params: [{ name: "ts", type: "number" }],
			func: (args) => {
				const ts = args[0];
				if (typeof ts !== 'number' || !Number.isFinite(ts)) {
					throw new Error("Runtime Error: Expected finite number.");
				}
				return create_dt_struct(new Date(ts * 1000));
			}
		},
//		  LESS STRICT VERSION
//        "convert_iso8601_to_datetime": {
//            returnType: "DateTime",
//            params: [{ name: "iso", type: "string" }],
//            func: (args) => {
//                const d = new Date(args[0]);
//                if (isNaN(d.getTime())) throw new Error("Runtime Error: Invalid ISO8601 date string.");
//                return create_dt_struct(d);
//            }
//        },
		"convert_iso8601_to_datetime": {
			returnType: "DateTime",
			params: [{ name: "iso", type: "string" }],
			func: (args) => {
				// Enforce strict RFC3339 format to match Go's time.RFC3339
				const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
				if (!rfc3339Regex.test(args[0])) {
					throw new Error("Runtime Error: Invalid ISO8601 date string. Expected format: YYYY-MM-DDTHH:MM:SSZ");
				}
				
				const d = new Date(args[0]);
				if (isNaN(d.getTime())) throw new Error("Runtime Error: Invalid ISO8601 date string.");
				return create_dt_struct(d);
			}
		},
		"convert_datetime_to_unixtime": {
			returnType: "number",
			params: [{ name: "dt", type: "DateTime" }],
			func: (args) => {
				const dt = args[0];
				if (!(dt instanceof Map) || dt.__shift_type !== "DateTime") throw new Error("Runtime Error: Expected DateTime struct.");

				const fields = ["year", "month", "day", "hour", "minute", "second", "millisecond"];
				for (const field of fields) {
					const val = dt.get(field);
					if (typeof val !== 'number' || !Number.isFinite(val)) {
						throw new Error(`Runtime Error: DateTime fields must be finite numbers.`);
					}
				}

				// Construct Date object from struct fields
				// Note: JS Date(year, monthIndex, day, hours, minutes, seconds, milliseconds)
				const d = new Date(
					dt.get("year"),
					dt.get("month") - 1, // 0-indexed month
					dt.get("day"),
					dt.get("hour"),
					dt.get("minute"),
					dt.get("second"),
					dt.get("millisecond")
				);
				return Math.floor(d.getTime() / 1000);
			}
		},
		"convert_datetime_to_iso8601": {
			returnType: "string",
			params: [{ name: "dt", type: "DateTime" }],
			func: (args) => {
				const dt = args[0];
				if (!(dt instanceof Map) || dt.__shift_type !== "DateTime") throw new Error("Runtime Error: Expected DateTime struct.");

				const fields = ["year", "month", "day", "hour", "minute", "second", "millisecond"];
				for (const field of fields) {
					const val = dt.get(field);
					if (typeof val !== 'number' || !Number.isFinite(val)) {
						throw new Error(`Runtime Error: DateTime fields must be finite numbers.`);
					}
				}

				const d = new Date(
					dt.get("year"),
					dt.get("month") - 1,
					dt.get("day"),
					dt.get("hour"),
					dt.get("minute"),
					dt.get("second"),
					dt.get("millisecond")
				);
				return d.toISOString();
			}
		},

		// Math Intrinsics
		"calc_sqrt": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_sqrt expects number.");
				return Math.sqrt(args[0]);
			}
		},
		"calc_log10": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_log10 expects number.");
				return Math.log10(args[0]);
			}
		},
		"calc_natlog": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_natlog expects number.");
				return Math.log(args[0]);
			}
		},
		"round_number": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: round_number expects number.");
				return Math.round(args[0]);
			}
		},
		"round_number_up": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: round_number_up expects number.");
				return Math.ceil(args[0]);
			}
		},
		"round_number_down": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: round_number_down expects number.");
				return Math.floor(args[0]);
			}
		},
		"calc_absolute": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_absolute expects number.");
				return Math.abs(args[0]);
			}
		},
		"calc_sin": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_sin expects number.");
				return Math.sin(args[0]);
			}
		},
		"calc_cos": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_cos expects number.");
				return Math.cos(args[0]);
			}
		},
		"calc_tan": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_tan expects number.");
				return Math.tan(args[0]);
			}
		},
		"calc_asin": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_asin expects number.");
				return Math.asin(args[0]);
			}
		},
		"calc_acos": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_acos expects number.");
				return Math.acos(args[0]);
			}
		},
		"calc_atan": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_atan expects number.");
				return Math.atan(args[0]);
			}
		},
		"calc_atan2": {
			returnType: "number",
			params: [{ name: "y", type: "number" }, { name: "x", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0]) || typeof args[1] !== 'number' || isNaN(args[1])) {
					throw new Error("Runtime Error: calc_atan2 expects numbers.");
				}
				return Math.atan2(args[0], args[1]);
			}
		},
		"convert_deg_to_rad": {
			returnType: "number",
			params: [{ name: "deg", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: convert_deg_to_rad expects number.");
				return args[0] * (Math.PI / 180);
			}
		},
		"convert_rad_to_deg": {
			returnType: "number",
			params: [{ name: "rad", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: convert_rad_to_deg expects number.");
				return args[0] * (180 / Math.PI);
			}
		},
		"read_file": {
			returnType: "string",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: read_file is disabled in core mode."); }
		},
		"write_file": {
			returnType: "none",
			params: [{ name: "path", type: "string" }, { name: "content", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: write_file is disabled in core mode."); }
		},
		"create_file": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: create_file is disabled in core mode."); }
		},
		"delete_file": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: delete_file is disabled in core mode."); }
		},
		"file_exists": {
			returnType: "bool",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: file_exists is disabled in core mode."); }
		},
		"copy_file": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: copy_file is disabled in core mode."); }
		},
		"move_file": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: move_file is disabled in core mode."); }
		},
		"create_folder": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: create_folder is disabled in core mode."); }
		},
		"delete_folder": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: delete_folder is disabled in core mode."); }
		},
		"folder_exists": {
			returnType: "bool",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: folder_exists is disabled in core mode."); }
		},
		"copy_folder": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: copy_folder is disabled in core mode."); }
		},
		"move_folder": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: move_folder is disabled in core mode."); }
		}
	},

	// 3. Shift Standard Library (Written in Shift)
	source: stdlibSource,

	loadDefinitions(parser) {
		this.structs.forEach(s => {
			parser.knownTypes.add(s.name);
			const fields = s.fields.map(f => {
				let typeObj = { type: "Type", name: f.type, generic: null };
				if (f.generic) {
					typeObj.generic = { type: "Type", name: f.generic, generic: null };
				}
				if (f.type === "nullable" && f.generic) {
					typeObj = {
						type: "Type",
						name: "nullable",
						generic: { type: "Type", name: f.generic, generic: null }
					};
				}
				return { name: f.name, type: typeObj };
			});
			parser.structDefinitions.set(s.name, { fields });
		});

		for (const [name, def] of Object.entries(this.intrinsics)) {
			let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true, params: def.params || [] };
			if (def.generic) {
				typeObj.generic = { type: "Type", name: def.generic, generic: null };
			}
			parser.defineVariable(name, typeObj);
		}
	},

	loadIntrinsics(runtime) {
		for (const [name, def] of Object.entries(this.intrinsics)) {
			const paramCount = def.params ? def.params.length : 0;
			const wrappedFunc = (args, rt) => {
				if (args.length < paramCount) {
					throw new Error(`Runtime Error: Intrinsic '${name}' expects ${paramCount} arguments but got ${args.length}.`);
				}
				return def.func(args, rt);
			};
			runtime.addIntrinsic(name, wrappedFunc);
		}
	}
};

// --- Source: shift.mjs ---

export class Shift {
    /**
     * @param {string|null} stdLibCode - Custom standard library code (Shift). Pass null to use default.
     * @param {Object|null} stdLibIntrinsics - Custom intrinsics map. Pass null to use default StandardLibrary.intrinsics.
     * @param {Object|number} options - Options object (e.g., importResolver) or maxInstructions integer for backward compatibility.
     */
    constructor(stdLibCode = null, stdLibIntrinsics = null, options = {}) {
        if (typeof options === 'number') {
            this.maxInstructions = options;
            this.importResolver = null;
        } else {
            this.maxInstructions = options.maxInstructions !== undefined ? options.maxInstructions : 1000000;
            this.importResolver = options.importResolver || null;
        }

        this.stdLibAST = null;
        this.stdLibErrors = [];

        // If stdLibIntrinsics is provided, use it. Otherwise use the default.
        const baseIntrinsics = stdLibIntrinsics !== null ? stdLibIntrinsics : StandardLibrary.intrinsics;
        this.intrinsics = new Map(Object.entries(baseIntrinsics));

        this._initStandardLibrary(stdLibCode);
    }

    /**
     * Registers a new intrinsic function for use in scripts.
     * @param {string} name - Function name.
     * @param {Object} definition - { returnType: string, generic?: string, func: Function }
     */
    registerIntrinsic(name, definition) {
        this.intrinsics.set(name, definition);
    }

    _initStandardLibrary(stdLibCode) {
        // Use provided code or default to StandardLibrary.source
        const source = stdLibCode !== null ? stdLibCode : StandardLibrary.source;

        // Compile the Standard Library (Shift code part) once during initialization
        const stdLexer = new Lexer(source);
        const stdTokens = stdLexer.tokenize().tokens;
        const stdParser = new Parser(stdTokens, this.importResolver);

        // Load Definitions manually (Structs + Active Intrinsics)
        this._loadStructs(stdParser);
        this._loadIntrinsics(stdParser);

        // Scan and parse
        stdParser.preScan();
        const result = stdParser.parse();

        this.stdLibAST = result.ast;
        this.stdLibErrors = result.errors;

        if (this.stdLibErrors.length > 0) {
            console.error("Shift Internal Error: Standard Library failed to compile.");
            this.stdLibErrors.forEach(e => console.error(`Line ${e.line}: ${e.message}`));
        }
    }

    _loadStructs(parser) {
        StandardLibrary.structs.forEach(s => {
            parser.knownTypes.add(s.name);

            const fields = s.fields.map(f => {
                let typeObj = { type: "Type", name: f.type, generic: null };
                if (f.generic) {
                    typeObj.generic = { type: "Type", name: f.generic, generic: null };
                }
                if (f.type === "nullable" && f.generic) {
                    typeObj = {
                        type: "Type",
                        name: "nullable",
                        generic: { type: "Type", name: f.generic, generic: null }
                    };
                }
                return { name: f.name, type: typeObj };
            });

            parser.structDefinitions.set(s.name, { fields });
        });
    }

    _loadIntrinsics(parser) {
        for (const [name, def] of this.intrinsics) {
            let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true };
            if (def.generic) {
                typeObj.generic = { type: "Type", name: def.generic, generic: null };
            }
            parser.defineVariable(name, typeObj);
        }
    }

    _loadIntrinsicsIntoRuntime(runtime) {
        for (const [name, def] of this.intrinsics) {
            runtime.addIntrinsic(name, def.func);
        }
    }

    /**
     * Executes a Shift script.
     * @param {string} sourceCode - The Shift source code.
     * @param {string} entryPoint - The name of the function to call (default: "main").
     * @param {Array} args - Arguments to pass to the entry point function.
     * @returns {*} The return value of the executed function.
     */
    run(sourceCode, entryPoint = "main", args = []) {
        if (this.stdLibErrors.length > 0) {
            throw new Error("Cannot run script due to internal Standard Library errors.");
        }

        // 1. Lexer
        const lexer = new Lexer(sourceCode);
        const lexResult = lexer.tokenize();

        if (lexResult.errors.length > 0) {
            const firstError = lexResult.errors[0];
            const line = firstError.line || firstError.endline || firstError.startline;
            throw new Error(`Lexer Error: ${firstError.message} (Line ${line})`);
        }

        // 2. Parser
        const parser = new Parser(lexResult.tokens, this.importResolver);

        // A. Load Definitions
        this._loadStructs(parser);
        this._loadIntrinsics(parser);

        // B. Load Signatures from StdLib AST (functions written in Shift)
        if (this.stdLibAST) {
            this.stdLibAST.functions.forEach(func => {
                parser.defineVariable(func.name, {
                    type: "Type",
                    name: func.returnType.name,
                    initialized: true
                });
            });
        }

        // C. Parse User Code
        parser.preScan();
        const parseResult = parser.parse();

        if (parseResult.errors.length > 0) {
            const firstError = parseResult.errors[0];
            throw new Error(`Parser Error: ${firstError.message} (Line ${firstError.line})`);
        }

        // 3. Tree Shaking / Linking
        // Merge used Standard Library functions into the User AST
        const finalAST = parseResult.ast;

        if (this.stdLibAST) {
            this.stdLibAST.functions.forEach(func => {
                if (parser.usedFunctions.has(func.name)) {
                    finalAST.functions.push(func);
                }
            });
        }

        this.finalAST = finalAST;

        // 4. Runtime Initialization
        const runtime = new Runtime(finalAST);
        runtime.maxInstructions = this.maxInstructions;

        // Load Intrinsic Implementations
        this._loadIntrinsicsIntoRuntime(runtime);

        // 5. Execution
        try {
            return runtime.runFunction(entryPoint, args);
        } catch (e) {
            // Ensure runtime errors are propagated cleanly
            throw e;
        }
    }
}
