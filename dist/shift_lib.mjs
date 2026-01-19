/**
 * Shift Script Library
 * Bundled at: 2026-01-19T00:01:37.463Z
 */

// --- Source: token_enums.mjs ---
export const TokenType = {
	// Keywords
	FUNCTION: "FUNCTION", RETURN: "RETURN", STRUCT: "STRUCT",
	IF: "IF", ELSE: "ELSE", FOR: "FOR", IN: "IN", TO: "TO",
    WHILE: "WHILE", // Added WHILE
	TRY: "TRY", CATCH: "CATCH", REVIEW: "REVIEW", THROW: "THROW",
	TRUE: "TRUE", FALSE: "FALSE",

	BREAK: "BREAK", SKIP: "SKIP",

	LOGICAL_AND: "LOGICAL_AND", LOGICAL_OR: "LOGICAL_OR",
    LOGICAL_XOR: "LOGICAL_XOR", NOT: "NOT",

    // Casting & Checks
    AS: "AS",
    HAS: "HAS",
    DELETE: "DELETE",
    SEARCH: "SEARCH",

    // Inspection & Bytes
    INSPECT: "INSPECT",
    SIZE: "SIZE",
    TYPE: "TYPE",
    OF: "OF",
    PACK: "PACK",
    UNPACK: "UNPACK",

	// Types
	TYPE_STRING: "TYPE_STRING", TYPE_NUMBER: "TYPE_NUMBER",
	TYPE_BOOL: "TYPE_BOOL", TYPE_LIST: "TYPE_LIST",
	TYPE_MAP: "TYPE_MAP", TYPE_NULL: "TYPE_NULL", 
    TYPE_NONE: "TYPE_NONE", TYPE_ANY: "TYPE_ANY",
    TYPE_NULLABLE: "TYPE_NULLABLE",

	// Symbols & Operators
	BANG: "BANG", BANG_EQUAL: "BANG_EQUAL",
    EQUAL_EQUAL: "EQUAL_EQUAL",
    LESS_EQUAL: "LESS_EQUAL", GREATER_EQUAL: "GREATER_EQUAL",
	LANGLE: "LANGLE", RANGLE: "RANGLE",              // < > - Also to be used for less than and greater than checks
	LPAREN: "LPAREN", RPAREN: "RPAREN",              // ( )
	LBRACE: "LBRACE", RBRACE: "RBRACE",              // { }
	LBRACKET: "LBRACKET", RBRACKET: "RBRACKET",      // [ ]
	COMMA: "COMMA", COLON: "COLON", SEMICOLON: "SEMICOLON",
	PIPE: "PIPE",
	ASSIGN: "ASSIGN",
	PLUS: "PLUS", MINUS: "MINUS", SLASH: "SLASH", STAR: "STAR",
	PERCENT: "PERCENT",                              // % (Modulus)
    AMPERSAND: "AMPERSAND",                          // & (Concatenation)
    CARET: "CARET",                                  // ^ (XOR)
    MAGIC_VAR: "MAGIC_VAR",                          // $

	// Literals
	IDENTIFIER: "IDENTIFIER",
	STRING: "STRING",
	NUMBER: "NUMBER",

	// Special identifiers
	PIPE_VALUE: "PIPE_VALUE",

	// Control
	EOF: "EOF"
};

export const GENERICSARRAY = [TokenType.TYPE_STRING, TokenType.TYPE_NUMBER,
	TokenType.TYPE_BOOL, TokenType.TYPE_LIST, TokenType.TYPE_MAP,
	TokenType.TYPE_ANY
];

export const KEYWORDS = {
	"function": TokenType.FUNCTION, "return": TokenType.RETURN, "struct": TokenType.STRUCT,
	"if": TokenType.IF, "else": TokenType.ELSE,
	"for": TokenType.FOR, "in": TokenType.IN, "to": TokenType.TO,
    "while": TokenType.WHILE, // Added while
	"try": TokenType.TRY, "catch": TokenType.CATCH, "review": TokenType.REVIEW, 
    "throw": TokenType.THROW, 
	"true": TokenType.TRUE, "false": TokenType.FALSE,

	"break": TokenType.BREAK, "skip": TokenType.SKIP,

	"and": TokenType.LOGICAL_AND, "or": TokenType.LOGICAL_OR,
	"xor": TokenType.LOGICAL_XOR, "not": TokenType.NOT,

    "as": TokenType.AS,
    "has": TokenType.HAS,
    "delete": TokenType.DELETE,
    "search": TokenType.SEARCH,

    "inspect": TokenType.INSPECT,
    "size": TokenType.SIZE,
    "type": TokenType.TYPE,
    "of": TokenType.OF,
    "pack": TokenType.PACK,
    "unpack": TokenType.UNPACK,

	"string": TokenType.TYPE_STRING, "number": TokenType.TYPE_NUMBER,
	"bool": TokenType.TYPE_BOOL, "list": TokenType.TYPE_LIST,
	"map": TokenType.TYPE_MAP, "null": TokenType.TYPE_NULL, 
    "none": TokenType.TYPE_NONE, "any": TokenType.TYPE_ANY,
    "nullable": TokenType.TYPE_NULLABLE
};

// --- Source: lexer.mjs ---

export class Lexer
{
	constructor(source)
	{
		this.source = source;
		this.tokens = [];
		this.errors = [];
		this.startindex = 0;
		this.currentindex = 0;
		this.startline = 1;
		this.currentline = 1;
	}

	tokenize()
	{
		while (!this.isAtEnd())
			{
			this.startindex = this.currentindex;
			this.startline = this.currentline;
			
			this.scanToken();
		}

		this.tokens.push(
			{
				t: TokenType.EOF,
				v: "",
				l: this.currentline
			}
		);

		return { 
            tokens: this.tokens, 
            errors: this.errors 
        };
	}

	addError(message)
	{
        this.errors.push(
			{
				startline: this.startline,
				endline: this.currentline,
				message: message
			}
		);
    }

	scanToken()
	{
		const char = this.advance();

		switch (char)
		{
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
            case '|': this.addToken(TokenType.PIPE, "|"); break;
            case '$': this.magicVariable(); break;

			// Could it be generic definition or could it be a comparison?
			case '<':
				if (this.match('='))
				{
					this.addToken(TokenType.LESS_EQUAL, "<=");
				}
				else
				{
					this.addToken(TokenType.LANGLE, "<");
				}
				break;
		
			case '>':
				if (this.match('='))
				{
					this.addToken(TokenType.GREATER_EQUAL, ">=");
				}
				else
				{
					this.addToken(TokenType.RANGLE, ">");
				}
				break;

			// Other comparisons
			case '!':
				if (this.match('='))
				{
					this.addToken(TokenType.BANG_EQUAL, "!=");
				}
				else
				{
					this.addToken(TokenType.BANG, "!");
				}
				break;
		
			case '=':
				if (this.match('='))
				{
					this.addToken(TokenType.EQUAL_EQUAL, "==");
				}
				else
				{
					this.addToken(TokenType.ASSIGN, "=");
				}
				break;
            
            // Concatenation or Logic?
            case '&':
                if (this.match('&')) {
                    this.addToken(TokenType.AMPERSAND_AMPERSAND, "&&");
                } else {
                    this.addToken(TokenType.AMPERSAND, "&");
                }
                break;
			
			// Is it a comment or a math division?
			case '/':
				if (this.match('/'))
				{
					this.advanceUntil('\n')
				}
				else if (this.match('*'))
				{
					// Block comment /* ... */
					this.skipBlockComment();
				}
				else
				{
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
			case '"': this.string(); break;

			default:
				if (this.isDigit(char))
				{
					this.number();
				}
				else if (this.isAlpha(char))
				{
					this.identifier();
				}
				else if (!this.isWhitespace(char))
				{
					this.addError(`Unexpected character '${char}'`);
				}
				break;
		}
	}

	identifier()
	{
		while (this.isAlphaNumeric(this.peek())) this.advance();

		const text = this.source.substring(this.startindex, this.currentindex);

		const type = KEYWORDS[text] || TokenType.IDENTIFIER;

		this.addToken(type, text);
	}

	number()
	{
		while (this.isDigit(this.peek())) this.advance();

		// Look for fractional part
		if (this.peek() === '.' && this.isDigit(this.peekNext())) {
			this.advance(); // Consume the "."
			while (this.isDigit(this.peek())) this.advance();
		}

		const value = this.source.substring(this.startindex, this.currentindex);
		this.addToken(TokenType.NUMBER, value);
	}

	string()
	{
		while (!this.isAtEnd())
		{

			// Handle the backslah case
			if (this.peek() === '\\')
			{
				this.advance(); // Consume slash
                
                // Track newline if we are escaping a line break
                if (this.peek() === '\n') {
                    this.currentline++;
                }

                this.advance(); // Consume escaped character
				continue;
			}

			// 
			if (this.peek() === '"') {
				break;
			}

			// Don't forget to track newlines inside strings for correct error reporting
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

	skipBlockComment()
	{
		while (!this.isAtEnd())
		{
			if (this.peek() === '*' && this.peekNext() === '/')
			{
				this.advance(); // *
				this.advance(); // /
				return;
			}

			if (this.peek() === '\n')
			{
				this.currentline++;
			}

			this.advance();
		}
		this.addError("Unterminated block comment");
	}

	advance()
	{
		const char = this.source.charAt(this.currentindex);
		this.currentindex++;
		return char;
	}

	advanceUntil(char)
	{
		while (this.peek() !== char && !this.isAtEnd())
		{
			// Keep tracking line numbers
			if (this.peek() === '\n')
			{
				this.currentline++;
			}

			this.advance();
		}

		// False if we encountered EOF first
		return !this.isAtEnd();
	}

	peek()
	{
		if (this.isAtEnd())
		{
			return '\0';
		}

		return this.source.charAt(this.currentindex);
	}

	peekNext()
	{
		if (this.currentindex + 1 >= this.source.length)
		{
			return '\0';
		}

		return this.source.charAt(this.currentindex + 1);
	}

	match(expected)
	{
		if (this.isAtEnd())
		{
			return false;
		}

		const currentCharacter = this.source.charAt(this.currentindex);
		if (currentCharacter !== expected)
		{
			return false;
		}

		this.currentindex++;
		return true;
	}

	// t = Token type, v = Token value, l = Line Token is on
	addToken(t, v)
	{
		this.tokens.push({ t, v, l: this.currentline });
	}

	magicVariable() {
        // We already consumed the '$', now consume the rest
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }

        const text = this.source.substring(this.startindex, this.currentindex);

        this.addToken(TokenType.MAGIC_VAR, text);
    }

	isAtEnd()
	{
		return this.currentindex >= this.source.length;
	}

	isDigit(char)
	{
		return char >= '0' && char <= '9';
	}

	isAlpha(char)
	{
		return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
	}

	isAlphaNumeric(char) {
		return this.isAlpha(char) || this.isDigit(char);
	}

	isWhitespace(char) {
		if (char === '\n') {
			this.currentline++;
			return true;
		}
		return [' ', '\r', '\t'].includes(char);
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
        const expr = this.pipeline();

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
                } catch(e) {
                    // Errors already added by validator
                }
                
                return { type: "Assignment", name: varName, value: value };
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
                             } catch(e) {
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
        let expr = this.logicalOr();

        while (this.parser.match(TokenType.PIPE)) {
            const operatorToken = this.parser.previous();
            const right = this.logicalOr(); 

            expr = {
                type: "PipelineExpression",
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
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }

        return expr;
    }

    // Level 5: Comparison (<, >, <=, >=, has, search)
    comparison() {
        let expr = this.concatenation();

        while (this.parser.match(TokenType.LANGLE) || this.parser.match(TokenType.RANGLE) || 
            this.parser.match(TokenType.LESS_EQUAL) || this.parser.match(TokenType.GREATER_EQUAL) ||
            this.parser.match(TokenType.HAS) || this.parser.match(TokenType.SEARCH)) {
            const operatorToken = this.parser.previous();
            const right = this.concatenation();

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

            expr = {
                type: "BinaryExpression",
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
                operator: operatorToken.v,
                left: expr,
                right: right
            };
        }
        return expr;
    }

    // Level 7: Factor (*, /, %)
    factor() {
        let expr = this.unary();

        while (this.parser.match(TokenType.SLASH) || this.parser.match(TokenType.STAR) || this.parser.match(TokenType.PERCENT)) {
            const operatorToken = this.parser.previous();
            const right = this.unary();

            if (operatorToken.v === '/' || operatorToken.v === '%') {
                if (right.type === "Literal" && right.value === 0) {
                    const isMod = operatorToken.v === '%';
                    throw this.parser.addError(operatorToken, isMod ? "Explicit attempt to modulus by zero" : "Explicit attempt to divide by zero");
                }
            }

            expr = {
                type: "BinaryExpression",
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
                operator: operatorToken.v,
                argument: right
            };
        }

        // inspect <expr>
        if (this.parser.match(TokenType.INSPECT)) {
            const right = this.unary();
            return { type: "InspectExpression", argument: right };
        }

        // pack <expr>
        if (this.parser.match(TokenType.PACK)) {
            const right = this.unary();
            return { type: "PackExpression", argument: right };
        }

        // unpack <expr>
        if (this.parser.match(TokenType.UNPACK)) {
            const right = this.unary();
            return { type: "UnpackExpression", argument: right };
        }

        // size of <expr>
        if (this.parser.match(TokenType.SIZE)) {
            this.parser.consume(TokenType.OF, "Expect 'of' after 'size'.");
            const right = this.unary();
            
            const argType = this.parser.inferType(right);
            if (["number", "bool", "null", "none", "nullable"].includes(argType)) {
                 throw this.parser.addError(this.parser.previous(), "Cannot get size of primitive types");
            }

            return { type: "SizeOfExpression", argument: right };
        }

        // type of <expr>
        if (this.parser.match(TokenType.TYPE)) {
            this.parser.consume(TokenType.OF, "Expect 'of' after 'type'.");
            const right = this.unary();
            return { type: "TypeOfExpression", argument: right };
        }

        return this.cast();
    }

    // Level 8.5: Cast (as)
    cast() {
        let expr = this.primary();

        while(this.parser.match(TokenType.AS)) {
            const asToken = this.parser.previous();
            const typeInfo = this.parser.parseType(); 
            
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
                value: expr,
                targetType: typeInfo
            };
        }

        return expr;
    }

    // Level 9: Primary (Atomic values)
    primary() {
        if (this.parser.match(TokenType.FALSE)) return { type: "Literal", value: false };
        if (this.parser.match(TokenType.TRUE)) return { type: "Literal", value: true };
        if (this.parser.match(TokenType.TYPE_NULL)) return { type: "Literal", value: null };

        if (this.parser.match(TokenType.MAGIC_VAR)) {
            // FIX: Capture the line number from the token
            const token = this.parser.previous();
            return { type: "MagicVariable", name: token.v, line: token.l };
        }

        if (this.parser.match(TokenType.NUMBER)) {
            return { type: "Literal", value: parseFloat(this.parser.previous().v) };
        }

        if (this.parser.match(TokenType.STRING)) {
            return { type: "Literal", value: this.parser.previous().v };
        }

        if (this.parser.match(TokenType.LBRACKET)) {
            return this.collectionLiteral();
        }

        if (this.parser.match(TokenType.IDENTIFIER)) {
            const name = this.parser.previous().v;
            
            const symbol = this.parser.getVariable(name);
            if (!symbol) {
                throw this.parser.addError(this.parser.previous(), "Undefined variable.");
            }

            let expr;

            if (this.parser.match(TokenType.LPAREN)) {
                expr = this.finishCall(name);
            } else {
                expr = { type: "Variable", name: name };
            }

            while (this.parser.match(TokenType.LBRACKET)) {
                expr = this.finishIndex(expr);
            }

            return expr;
        }

        if (this.parser.match(TokenType.LPAREN)) {
            const expr = this.parse(); 
            this.parser.consume(TokenType.RPAREN, "Expect ')' after expression.");
            return { type: "Grouping", expression: expr };
        }

        throw this.parser.addError(this.parser.peek(), "Expect expression.");
    }

    collectionLiteral() {
        if (this.parser.check(TokenType.RBRACKET)) {
            this.parser.consume(TokenType.RBRACKET, "Compiler error");
            return { type: "ListLiteral", elements: [] };
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

            this.parser.consume(TokenType.RBRACKET, "Expect ']' after map literal.");
            return { type: "MapLiteral", entries: entries };
        }

        const elements = [firstExpr];

        while (this.parser.match(TokenType.COMMA)) {
            elements.push(this.parse());
        }

        this.parser.consume(TokenType.RBRACKET, "Expect ']' after list literal.");
        return { type: "ListLiteral", elements: elements };
    }

    finishCall(calleeName) {
        // Track that this function is used
        this.parser.markFunctionUsed(calleeName);

        const args = [];
        if (!this.parser.check(TokenType.RPAREN)) {
            do {
                args.push(this.parse()); 
            } while (this.parser.match(TokenType.COMMA));
        }

        this.parser.consume(TokenType.RPAREN, "Expect ')' after arguments.");

        return {
            type: "CallExpression",
            callee: calleeName,
            arguments: args
        };
    }

    finishIndex(objectExpr) {
        let index = null;
        if (!this.parser.check(TokenType.RBRACKET)) {
            index = this.parse();
        }

        this.parser.consume(TokenType.RBRACKET, "Expect ']' after index.");

        return {
            type: "IndexExpression",
            object: objectExpr,
            index: index
        };
    }
}

// --- Source: parser.mjs ---

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
        
		const program = { 
            type: "Program", 
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

        this.consume(TokenType.RBRACKET, "Expect ']' after struct fields.");

        this.structDefinitions.set(nameToken.v, { fields });

        return {
            type: "StructDeclaration",
            name: nameToken.v,
            fields: fields
        };
    }

	functionDeclaration() {
        const line = this.tokens[this.current - 1].l;

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
			line: line,
			type: "FunctionDeclaration",
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
        this.enterScope();
		const statements = [];
		while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
			const statement = this.parseStatement();
			if (statement) statements.push(statement);
		}
		this.consume(TokenType.RBRACE, "Expect '}' after block.");
        this.exitScope();
		return { type: "Block", statements: statements };
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
        const keyword = this.previous();
        this.consume(TokenType.LPAREN, "Expect '(' after 'while'.");
        const condition = this.parseExpression();
        this.consume(TokenType.RPAREN, "Expect ')' after while condition.");
        this.consume(TokenType.LBRACE, "Expect '{' before loop body.");
        
        this.loopDepth++;
        const body = this.parseBlock();
        this.loopDepth--;

        return { type: "WhileStatement", condition: condition, body: body, line: keyword.l };
    }

	breakStatement() {
        const keyword = this.previous();
        if (this.loopDepth === 0) this.addError(keyword, "'break' can only be used inside a loop.");
        this.consume(TokenType.SEMICOLON, "Expect ';' after 'break'.");
        return { type: "BreakStatement", line: keyword.l };
    }

    skipStatement() {
        const keyword = this.previous();
        if (this.loopDepth === 0) this.addError(keyword, "'skip' can only be used inside a loop.");
        this.consume(TokenType.SEMICOLON, "Expect ';' after 'skip'.");
        return { type: "SkipStatement", line: keyword.l };
    }

	tryStatement() {
        const keyword = this.previous();
        this.consume(TokenType.LBRACE, "Expect '{' before try block.");
        const tryBlock = this.parseBlock();
        
        this.consume(TokenType.CATCH, "Expect 'catch' after try block.");
        this.consume(TokenType.LBRACE, "Expect '{' before catch block.");
        
        this.enterScope();
        this.defineVariable("$thrown_message", { type: "Type", name: "string", initialized: true });
        const catchBlock = this.parseBlock();
        this.exitScope();

        let reviewBlock = null;
        if (this.match(TokenType.REVIEW)) {
            this.consume(TokenType.LBRACE, "Expect '{' before review block.");
            this.enterScope();
            this.defineVariable("$thrown_message", { type: "Type", name: "string", initialized: true });
            reviewBlock = this.parseBlock();
            this.exitScope();
        }

        return {
            type: "TryStatement",
            tryBlock: tryBlock,
            catchIdentifier: "$thrown_message",
            catchBlock: catchBlock,
            reviewBlock: reviewBlock,
            line: keyword.l
        };
    }

	throwStatement() {
        const keyword = this.previous();
        
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
        this.consume(TokenType.SEMICOLON, "Expect ';' after throw value.");
        return { type: "ThrowStatement", severity: severity, argument: value, line: keyword.l };
    }

    deleteStatement() {
        const keyword = this.previous();
        const expr = this.parseExpression();
        
        if (expr.type !== "IndexExpression") {
            this.addError(keyword, "Invalid delete target. Expected index expression (e.g. collection[key]).");
        } else {
            // Check if we are deleting from a Struct
            const inferredObj = this.inferType(expr.object);
            const structDef = this.structDefinitions.get(inferredObj);
            if (structDef) {
                this.addError(keyword, "Cannot delete Struct elements");
            }
        }

        this.consume(TokenType.SEMICOLON, "Expect ';' after delete statement.");
        return { type: "DeleteStatement", target: expr, line: keyword.l };
    }

	parseExpression() { return this.expressionParser.parse(); }

	returnStatement() {
		const keyword = this.previous();
		let value = null;
		if (!this.check(TokenType.SEMICOLON)) value = this.parseExpression();
		this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");

		if (this.currentReturnType !== null && this.currentReturnType !== "any") {
            if (value === null) {
                if (this.currentReturnType !== "none") {
                    this.addError(keyword, "Return type mismatch.");
                }
            } else {
                const inferredType = this.inferType(value);
                
                if (this.currentReturnType === "none") {
                     this.addError(keyword, "Return type mismatch.");
                }
                
                const isNull = inferredType === "null";
                const isPrimitive = ["number", "bool"].includes(this.currentReturnType);
                if (isNull && !isPrimitive) { /* Allowed */ } 
                else if (inferredType !== "any" && inferredType !== this.currentReturnType) {
                    this.addError(keyword, "Return type mismatch.");
                }
            }
        }
		return { line: keyword.l, type: "ReturnStatement", value: value };
	}

	ifStatement() {
		const keyword = this.previous();
		this.consume(TokenType.LPAREN, "Expect '(' after 'if'.");
		const condition = this.parseExpression();
		this.consume(TokenType.RPAREN, "Expect ')' after if condition.");
		this.consume(TokenType.LBRACE, "Expect '{' before if body.");
		const thenBranch = this.parseBlock();
		let elseBranch = null;
		if (this.match(TokenType.ELSE)) {
			if (this.match(TokenType.IF)) {
				elseBranch = this.ifStatement();
			} else {
				this.consume(TokenType.LBRACE, "Expect '{' before else body.");
				elseBranch = this.parseBlock();
			}
		}
		return { type: "IfStatement", condition: condition, thenBranch: thenBranch, elseBranch: elseBranch, line: keyword.l };
	}

	forStatement() {
        const keyword = this.previous();
        this.consume(TokenType.LPAREN, "Expect '(' after 'for'.");
        const iteratorToken = this.consume(TokenType.IDENTIFIER, "Expect iterator variable name.");
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
        
        if (isRange) {
            iterType = "number";
        } else {
            const collectionType = this.inferType(startOrCollection);

            if (["list", "any"].includes(collectionType)) {
                 iterType = "any"; 
            }
            else if (["map"].includes(collectionType) || this.structDefinitions.has(collectionType)) {
                 iterType = "string"; // Keys 
            }
            else if (collectionType === "string") {
                 this.addError(keyword, "Strings are not directly iterable. Use 'string as list<string>'.");
            } 
            else {
                 this.addError(keyword, `Type '${collectionType}' is not iterable.`);
            }
        }

        this.defineVariable(iteratorToken.v, { type: "Type", name: iterType, initialized: true });
		this.loopDepth++;
        const body = this.parseBlock();
		this.loopDepth--;
        this.exitScope();
        if (isRange) {
            return { type: "ForRangeStatement", iterator: iteratorToken.v, startValue: startOrCollection, endValue: endValue, body: body, line: keyword.l };
        } else {
            return { type: "ForInStatement", iterator: iteratorToken.v, collection: startOrCollection, body: body, line: keyword.l };
        }
    }

	getDefaultValue(typeInfo, visited = new Set()) {
        switch (typeInfo.name) {
            case "number": return { type: "Literal", value: 0 };
            case "string": return { type: "Literal", value: "" };
            case "bool":   return { type: "Literal", value: false };
            case "list":   return { type: "ListLiteral", elements: [] };
            case "map":    return { type: "MapLiteral", entries: [] };
            case "null":   return { type: "Literal", value: null };
            case "none":   return { type: "Literal", value: null };
            case "nullable": return { type: "Literal", value: null };
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
                            key: { type: "Literal", value: field.name },
                            value: this.getDefaultValue(field.type, newVisited) 
                        }));
                        return { type: "MapLiteral", entries: entries };
                    }
                }
                return { type: "Literal", value: null }; 
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
                            key: { type: "Literal", value: field.name },
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

        this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");

		try {
            this.defineVariable(nameToken.v, { ...typeInfo, initialized: isInitialized }, true); 
        } catch (e) {
            this.addError(nameToken, e.message);
        }

		return { line: nameToken.l, type: "VariableDeclaration", varType: typeInfo, name: nameToken.v, initializer: initializer };
    }

	expressionStatement() {
		const expr = this.parseExpression();
		this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
		return { type: "ExpressionStatement", expression: expr };
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

// --- Source: runtime.mjs ---
// Signals for control flow (internal use only)
class BreakSignal {}
class SkipSignal {}
class ReturnSignal {
    constructor(value) {
        this.value = value;
    }
}

// Exception types for Shift logic
class ShiftError extends Error { constructor(message) { super(message); } }
class ShiftAlert extends Error { constructor(message) { super(message); } }
class ShiftCritical extends Error { constructor(message) { super(message); } }

export class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.values = new Map();
    }

    define(name, value) {
        this.values.set(name, value);
    }

    get(name) {
        if (this.values.has(name)) {
            return this.values.get(name);
        }
        if (this.parent) {
            return this.parent.get(name);
        }
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

export class Runtime {
    constructor(ast) {
        this.ast = ast;
        this.globalEnv = new Environment();
        this.functions = new Map();
        this.intrinsics = new Map();
        
        this.loadFunctions();
        
        // NOTE: registerIntrinsics() removed. 
        // Use external StandardLibrary.loadIntrinsics(runtime) instead.

        // Global magic variables
        this.globalEnv.define("$line_num", 0);
    }

    addIntrinsic(name, func) {
        this.intrinsics.set(name, func);
    }

    loadFunctions() {
        for (const func of this.ast.functions) {
            this.functions.set(func.name, func);
        }
    }

    // Helper for Shift-specific string conversion (Bool -> "1"/"0")
    stringify(val) {
        if (typeof val === 'boolean') {
            return val ? "1" : "0";
        }
        return String(val);
    }

    getDefaultValue(typeInfo) {
        switch (typeInfo.name) {
            case "number": return 0;
            case "string": return "";
            case "bool":   return false;
            case "list":   return []; 
            case "map":    return new Map(); 
            case "null":   return null;
            case "none":   return null;
            case "nullable": return null;
            case "any":    return null; 
            default: return null; 
        }
    }

    deepCopy(value) {
        if (value === null) return null;
        if (typeof value !== 'object') return value;
        
        if (Array.isArray(value)) {
            return value.map(item => this.deepCopy(item));
        }
        
        if (value instanceof Map) {
            const newMap = new Map();
            for (const [k, v] of value) {
                newMap.set(k, this.deepCopy(v));
            }
            return newMap;
        }
        
        return value;
    }

    runFunction(name, args = []) {
        try {
            return this.callFunction(name, args);
        } catch (e) {
            throw e; 
        }
    }

    callFunction(name, args) {
        // 1. Check Intrinsics first
        if (this.intrinsics.has(name)) {
            return this.intrinsics.get(name)(args, this);
        }

        // 2. Check User Functions
        const func = this.functions.get(name);
        
        if (!func) {
            throw new Error(`Runtime Error: Function '${name}' not found.`);
        }

        if (args.length !== func.params.length) {
             throw new Error(`Runtime Error: Function '${name}' expects ${func.params.length} arguments but got ${args.length}.`);
        }

        const fnEnv = new Environment(this.globalEnv);

        for (let i = 0; i < func.params.length; i++) {
            const paramName = func.params[i].name;
            const paramValue = this.deepCopy(args[i]);
            fnEnv.define(paramName, paramValue);
        }

        let result = null;
        try {
            this.executeBlock(func.body.statements, fnEnv);
        } catch (e) {
            if (e instanceof ReturnSignal) {
                result = e.value;
            } else {
                throw e; 
            }
        }

        // 3. Strict Return Type Check
        if (func.returnType) {
            this.checkType(result, func.returnType);
        }

        return result; 
    }

    checkType(value, typeInfo) {
        if (typeInfo.name === 'any') return;
        
        if (value === null) {
            if (typeInfo.name === 'nullable' || typeInfo.name === 'null' || typeInfo.name === 'none') return;
            throw new Error(`Runtime Error: Return type mismatch.`);
        }

        if (typeInfo.name === 'nullable') {
            if (typeInfo.generic) {
                this.checkType(value, typeInfo.generic);
            }
            return;
        }

        // Structs are Maps at runtime
        if (typeInfo.type === 'StructType') {
             if (!(value instanceof Map)) throw new Error(`Runtime Error: Return type mismatch.`);
             return;
        }

        switch (typeInfo.name) {
            case 'string':
                if (typeof value !== 'string') throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'number':
                if (typeof value !== 'number') throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'bool':
                if (typeof value !== 'boolean') throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'list':
                if (!Array.isArray(value)) throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'map':
                if (!(value instanceof Map)) throw new Error(`Runtime Error: Return type mismatch.`);
                break;
            case 'none':
                if (value !== null) throw new Error(`Runtime Error: Return type mismatch.`);
                break;
        }
    }

    executeBlock(statements, env) {
        for (const stmt of statements) {
            this.executeStatement(stmt, env);
        }
    }

    executeStatement(stmt, env) {
        if (stmt.line) {
             try { this.globalEnv.assign("$line_num", stmt.line); } catch(e) {} 
        }

        switch (stmt.type) {
            case "Block":
                this.executeBlock(stmt.statements, new Environment(env));
                break;

            case "VariableDeclaration":
                this.handleVariableDeclaration(stmt, env);
                break;
            
            case "ExpressionStatement":
                this.evaluate(stmt.expression, env);
                break;

            case "IfStatement":
                this.executeIfStatement(stmt, env);
                break;

            case "WhileStatement":
                this.executeWhileStatement(stmt, env);
                break;

            case "ForRangeStatement":
                this.executeForRangeStatement(stmt, env);
                break;
            
            case "ForInStatement":
                this.executeForInStatement(stmt, env);
                break;

            case "BreakStatement":
                throw new BreakSignal();

            case "SkipStatement":
                throw new SkipSignal();

            case "ReturnStatement": {
                let retVal = null;
                if (stmt.value) {
                    retVal = this.evaluate(stmt.value, env);
                }
                throw new ReturnSignal(retVal);
            }

            case "ThrowStatement": {
                const message = this.evaluate(stmt.argument, env);
                if (stmt.severity === "alert") {
                    throw new ShiftAlert(message);
                } else if (stmt.severity === "critical") {
                    throw new ShiftCritical(message);
                } else {
                    throw new ShiftError(message);
                }
            }

            case "TryStatement":
                this.executeTryStatement(stmt, env);
                break;
            
            case "DeleteStatement":
                this.executeDeleteStatement(stmt, env);
                break;

            default:
                // console.warn(`Runtime: Unsupported statement type '${stmt.type}' skipped.`);
        }
    }

    executeTryStatement(stmt, env) {
        try {
            this.executeBlock(stmt.tryBlock.statements, new Environment(env));
        } catch (e) {
            if (e instanceof ShiftCritical) {
                throw e; // Critical errors bubble up immediately
            }
            else if (e instanceof ShiftAlert) {
                if (stmt.reviewBlock) {
                    const reviewEnv = new Environment(env);
                    reviewEnv.define(stmt.catchIdentifier, e.message);
                    this.executeBlock(stmt.reviewBlock.statements, reviewEnv);
                } else {
                    throw e;
                }
            }
            else if (e instanceof ShiftError || e instanceof Error) {
                const catchEnv = new Environment(env);
                catchEnv.define(stmt.catchIdentifier, e.message);
                this.executeBlock(stmt.catchBlock.statements, catchEnv);
            } else {
                throw e; 
            }
        }
    }

    executeDeleteStatement(stmt, env) {
        const target = stmt.target; 
        const container = this.evaluate(target.object, env);
        const index = this.evaluate(target.index, env);

        if (container instanceof Map) {
            if (typeof index !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
            if (!container.has(index)) throw new Error("Runtime Error: Map key does not exist.");
            container.delete(index);
        } else if (Array.isArray(container)) {
            if (typeof index !== 'number') throw new Error("Runtime Error: List index must be integer value.");
            if (index < 0) throw new Error("Runtime Error: List index must not be a negative number.");
            if (index >= container.length) throw new Error("Runtime Error: List index is out of bounds.");
            container.splice(index, 1);
        } else {
             throw new Error("Runtime Error: Cannot delete from this type.");
        }
    }

    executeIfStatement(stmt, env) {
        if (this.isTruthy(this.evaluate(stmt.condition, env))) {
            this.executeStatement(stmt.thenBranch, env);
        } else if (stmt.elseBranch) {
            this.executeStatement(stmt.elseBranch, env);
        }
    }

    executeWhileStatement(stmt, env) {
        while (this.isTruthy(this.evaluate(stmt.condition, env))) {
            try {
                this.executeStatement(stmt.body, env);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof SkipSignal) continue;
                throw e; 
            }
        }
    }

    executeForRangeStatement(stmt, env) {
        const start = this.evaluate(stmt.startValue, env);
        const end = this.evaluate(stmt.endValue, env);

        if (typeof start !== 'number' || typeof end !== 'number') {
            throw new Error("Runtime Error: Range values must be numbers.");
        }

        const step = start <= end ? 1 : -1;
        let current = start;
        const condition = () => (step > 0 ? current <= end : current >= end);

        while (condition()) {
            const loopEnv = new Environment(env);
            loopEnv.define(stmt.iterator, current);

            try {
                this.executeStatement(stmt.body, loopEnv);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof SkipSignal) {
                    current += step;
                    continue;
                }
                throw e; 
            }

            current += step;
        }
    }

    executeForInStatement(stmt, env) {
        const collection = this.evaluate(stmt.collection, env);
        
        let iterable = [];

        if (Array.isArray(collection)) {
            iterable = collection;
        } else if (collection instanceof Map) {
            iterable = Array.from(collection.keys());
        } else {
            throw new Error(`Runtime Error: Cannot iterate over type '${typeof collection}'.`);
        }

        for (const item of iterable) {
            const loopEnv = new Environment(env);
            loopEnv.define(stmt.iterator, item);

            try {
                this.executeStatement(stmt.body, loopEnv);
            } catch (e) {
                if (e instanceof BreakSignal) break;
                if (e instanceof SkipSignal) continue;
                throw e; 
            }
        }
    }

    handleVariableDeclaration(stmt, env) {
        if (stmt.name.startsWith('$')) {
             throw new Error(`Runtime Error: Cannot declare magic variable '${stmt.name}'.`);
        }

        let value;
        if (stmt.initializer) {
            value = this.evaluate(stmt.initializer, env);
        } else {
            value = this.getDefaultValue(stmt.varType);
        }
        env.define(stmt.name, value);
    }

    evaluate(expr, env) {
        switch (expr.type) {
            case "Literal":
                return expr.value;
            
            case "MagicVariable":
                if (expr.name === "$pipe_value") {
                    return env.get("$pipe_value");
                }
                if (expr.name === "$line_num") {
                    // Fix: Use the line number from the expression if available
                    if (expr.line) {
                        return expr.line;
                    }
                    // Fallback to statement-level tracking (e.g. for implicit usage)
                    return this.globalEnv.get("$line_num");
                }
                return env.get(expr.name);

            case "ListLiteral":
                return expr.elements.map(e => this.evaluate(e, env));

            case "MapLiteral": {
                const map = new Map();
                for (const entry of expr.entries) {
                    const key = this.evaluate(entry.key, env);
                    const val = this.evaluate(entry.value, env);
                    map.set(key, val);
                }
                return map;
            }

            case "Grouping":
                return this.evaluate(expr.expression, env);

            case "Variable":
                return env.get(expr.name);

            case "Assignment": {
                if (expr.name.startsWith('$')) {
                    throw new Error(`Runtime Error: Cannot assign to magic variable '${expr.name}'.`);
                }
                const value = this.evaluate(expr.value, env);
                env.assign(expr.name, value);
                return value;
            }

            case "IndexAssignment": {
                const container = this.evaluate(expr.object, env);
                const value = this.evaluate(expr.value, env);
                
                if (container === null) throw new Error("Runtime Error: Cannot assign to null.");

                if (Array.isArray(container)) {
                    if (expr.index === null) {
                        container.push(value);
                        return value;
                    }
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

            case "IndexExpression": {
                const container = this.evaluate(expr.object, env);
                const index = this.evaluate(expr.index, env);

                if (container === null) throw new Error("Runtime Error: Cannot read properties of null.");

                if (Array.isArray(container)) {
                    if (typeof index !== 'number' || !Number.isInteger(index)) throw new Error("Runtime Error: List index must be integer value.");
                    if (index < 0) throw new Error("Runtime Error: List index must not be a negative number.");
                    if (index >= container.length) throw new Error("Runtime Error: List index is out of bounds.");
                    return container[index];
                }

                if (container instanceof Map) {
                    if (typeof index !== 'string') throw new Error("Runtime Error: Map keys must be strings.");
                    if (!container.has(index)) throw new Error("Runtime Error: Map key does not exist.");
                    return container.get(index);
                }
                throw new Error("Runtime Error: Invalid index target.");
            }

            case "CallExpression": {
                const args = expr.arguments.map(arg => this.evaluate(arg, env));
                return this.callFunction(expr.callee, args);
            }
            
            case "PipelineExpression": {
                const leftVal = this.evaluate(expr.left, env);
                env.define("$pipe_value", leftVal); 
                return this.evaluate(expr.right, env);
            }

            case "BinaryExpression":
                return this.evaluateBinary(expr, env);

            case "UnaryExpression":
                return this.evaluateUnary(expr, env);

            case "CastExpression":
                return this.evaluateCast(expr, env);

            case "InspectExpression":
                return this.evaluateInspect(expr, env);

            case "PackExpression":
                return String.fromCharCode(...this.evaluate(expr.argument, env));

            case "UnpackExpression":
                return String(this.evaluate(expr.argument, env)).split('').map(c => c.charCodeAt(0));

            case "SizeOfExpression":
                return this.evaluateSizeOf(expr, env);

            case "TypeOfExpression":
                return this.evaluateTypeOf(expr, env);
            
            default:
                throw new Error(`Runtime Error: Unsupported expression type '${expr.type}' in Task 6.`);
        }
    }

    evaluateCast(expr, env) {
        const val = this.evaluate(expr.value, env);
        const targetType = expr.targetType.name;

        if (targetType === "string") {
            if (Array.isArray(val)) {
                // Join list elements into a single string
                return val.map(v => this.stringify(v)).join("");
            }
            return this.stringify(val);
        }
        if (targetType === "number") {
            if (typeof val === 'boolean') return val ? 1 : 0;
            const n = parseFloat(val);
            if (isNaN(n)) throw new Error("Runtime Error: Could not cast string to number");
            return n;
        }
        if (targetType === "bool") {
             if (typeof val === 'string') {
                 if (val === "true") return true;
                 if (val === "false") return false;
                 const n = parseFloat(val);
                 if (!isNaN(n)) return n !== 0;
                 throw new Error("Runtime Error: Could not cast string to bool");
             }
             return Boolean(val);
        }
        if (targetType === "list" && typeof val === "string") {
            return val.split(''); // Explicit string to list support for get_stringlength
        }
        return val; 
    }

    evaluateInspect(expr, env) {
        const val = this.evaluate(expr.argument, env);
        const map = new Map();
        let type = "any";
        let size = null;
        
        if (val === null) { type = "null"; }
        else if (Array.isArray(val)) { 
            type = "list"; 
            size = val.length; 
        }
        else if (val instanceof Map) { 
            type = "map"; 
            size = val.size; 
        }
        else if (typeof val === 'number') { type = "number"; }
        else if (typeof val === 'string') { 
            type = "string"; 
            size = val.length;
        } 
        else if (typeof val === 'boolean') { type = "bool"; }
        
        // Ensure keys match InspectionResult struct
        map.set("$type", type);
        map.set("$size", size);
        return map;
    }

    evaluateSizeOf(expr, env) {
        const val = this.evaluate(expr.argument, env);
        if (Array.isArray(val)) return val.length;
        if (val instanceof Map) return val.size;
        if (typeof val === 'string') return val.length;
        throw new Error("Runtime Error: Cannot get size of primitive types"); 
    }

    evaluateTypeOf(expr, env) {
        const val = this.evaluate(expr.argument, env);
        if (val === null) return "null";
        if (Array.isArray(val)) return "list";
        if (val instanceof Map) return "map";
        if (typeof val === 'number') return "number";
        if (typeof val === 'string') return "string";
        if (typeof val === 'boolean') return "bool";
        return "any";
    }

    evaluateBinary(expr, env) {
        const left = this.evaluate(expr.left, env);
        
        if (expr.operator === "and") {
            if (!this.isTruthy(left)) return false;
            return this.isTruthy(this.evaluate(expr.right, env));
        }
        if (expr.operator === "or") {
            if (this.isTruthy(left)) return true;
            return this.isTruthy(this.evaluate(expr.right, env));
        }
        if (expr.operator === "xor") {
            const right = this.evaluate(expr.right, env);
            return this.isTruthy(left) !== this.isTruthy(right);
        }

        const right = this.evaluate(expr.right, env);

        if (expr.operator === "has") {
             if (left instanceof Map) {
                 if (typeof right !== 'string') throw new Error("Runtime Error: 'has' check requires a string key.");
                 return left.has(right);
             }
             throw new Error("Runtime Error: 'has' operator only works on maps.");
        }

        if (expr.operator === "search") {
            const str = String(left);
            const regexStr = String(right); 
            const lastSlash = regexStr.lastIndexOf('/');
            if (lastSlash <= 0) throw new Error("Runtime Error: Invalid regex format.");
            const pattern = regexStr.substring(1, lastSlash);
            const flags = regexStr.substring(lastSlash + 1);
            
            let regex;
            try { regex = new RegExp(pattern, flags); } 
            catch(e) { throw new Error("Runtime Error: Invalid regular expression."); }

            const results = [];
            let match;
            
            if (!regex.global) {
                match = regex.exec(str);
                if (match) {
                     const resMap = new Map();
                     resMap.set("match", match[0]);
                     resMap.set("start", match.index);
                     resMap.set("end", match.index + match[0].length);
                     resMap.set("groups", match.slice(1));
                     results.push(resMap);
                }
            } else {
                while ((match = regex.exec(str)) !== null) {
                    const resMap = new Map();
                    resMap.set("match", match[0]);
                    resMap.set("start", match.index);
                    resMap.set("end", match.index + match[0].length);
                    resMap.set("groups", match.slice(1));
                    results.push(resMap);
                }
            }
            return results;
        }

        switch (expr.operator) {
            case "+": return left + right;
            case "-": return left - right;
            case "*": return left * right;
            case "/": 
                if (right === 0) throw new Error("Runtime Error: Division by zero.");
                return left / right;
            case "%": 
                if (right === 0) throw new Error("Runtime Error: Modulo by zero.");
                return left % right;
            case "==": return left === right;
            case "!=": return left !== right;
            case "<":  return left < right;
            case ">":  return left > right;
            case "<=": return left <= right;
            case ">=": return left >= right;
            case "&":  return this.stringify(left) + this.stringify(right);
            default:
                throw new Error(`Runtime Error: Unknown operator '${expr.operator}'`);
        }
    }

    evaluateUnary(expr, env) {
        const val = this.evaluate(expr.argument, env);

        switch (expr.operator) {
            case "-": return -val;
            case "not":
            case "!": return !this.isTruthy(val);
            default:
                throw new Error(`Runtime Error: Unknown unary operator '${expr.operator}'`);
        }
    }

    isTruthy(value) {
        if (value === null) return false;
        if (value === false) return false;
        if (value === 0) return false; 
        return true;
    }
}

// --- Source: standard_library.mjs ---
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
    if (val instanceof Map) {
        const obj = {};
        for (const [k, v] of val) {
            obj[k] = toJS(v);
        }
        return obj;
    }
    if (Array.isArray(val)) {
        return val.map(toJS);
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
    } catch(e) {
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
            func: (args, runtime) => { console.log(args[0]); return null; } 
        },
        "convert_jsonstring_to_map": {
            returnType: "map",
            generic: "any",
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
            func: (args) => Math.random()
        },
        "generate_randomint_from_range": {
            returnType: "number",
            func: (args) => {
                const min = Math.ceil(args[0]);
                const max = Math.floor(args[1]);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
        },

        // DateTime Intrinsics
        "get_datetime": {
            returnType: "DateTime",
            func: (args) => create_dt_struct(new Date())
        },
        "get_datetime_as_unixtime": {
            returnType: "number",
            func: (args) => Math.floor(Date.now() / 1000)
        },
        "get_datetime_as_iso8601": {
            returnType: "string",
            func: (args) => new Date().toISOString()
        },
        "convert_unixtime_to_datetime": {
            returnType: "DateTime",
            func: (args) => create_dt_struct(new Date(args[0] * 1000))
        },
        "convert_iso8601_to_datetime": {
            returnType: "DateTime",
            func: (args) => {
                const d = new Date(args[0]);
                if (isNaN(d.getTime())) throw new Error("Runtime Error: Invalid ISO8601 date string.");
                return create_dt_struct(d);
            }
        },
        "convert_datetime_to_unixtime": {
            returnType: "number",
            func: (args) => {
                const dt = args[0];
                if (!(dt instanceof Map)) throw new Error("Runtime Error: Expected DateTime struct.");
                
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
            func: (args) => {
                const dt = args[0];
                if (!(dt instanceof Map)) throw new Error("Runtime Error: Expected DateTime struct.");
                
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
        }
    },

    // 3. Shift Standard Library (Written in Shift)
    source: `function get_substring(string input_str, number start_index, nullable<number> end_index) string {
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
    list<string> exploded_input = input_str as list<string>;
    bool do_loop = true;

    while(do_loop)
    {
        if (exploded_input[0] == " ") { delete exploded_input[0]; }
        else if (exploded_input[0] == "\r") { delete exploded_input[0]; }
        else if (exploded_input[0] == "\n") { delete exploded_input[0]; }
        else if (exploded_input[0] == "\t") { delete exploded_input[0]; }
        else { do_loop = false; }
    }

    do_loop = true;
    number reverse_cursor = size of exploded_input - 1;
    while(do_loop)
    {
        if (exploded_input[reverse_cursor] == " ")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else if (exploded_input[reverse_cursor] == "\r")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else if (exploded_input[reverse_cursor] == "\n")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else if (exploded_input[reverse_cursor] == "\t")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else { do_loop = false; }
    }

    return exploded_input as string;
}

function split_string_to_list(string input_str, string split_str) list<string> {
    list<string> exploded_input = input_str as list<string>;
    list<string> exploded_split = split_str as list<string>;
    list<string> resulting_list;
    string current_string;
    string buffer;
    number split_cursor;
    number split_str_size = size of exploded_split;

    for (char in exploded_input)
    {
        if (char == exploded_split[split_cursor])
        {
            buffer = buffer & char;
            split_cursor = split_cursor + 1;
            if (split_cursor == split_str_size)
            {
                buffer = "";
                split_cursor = 0;
                resulting_list[] = current_string;
                current_string = "";
            }
        }
        else
        {
            if (buffer != "")
            {
                current_string = current_string & buffer;
                buffer = "";
                split_cursor = 0;
            }
            current_string = current_string & char;
        }
    }

    if (buffer != "")
    {
        current_string = current_string & buffer;
    }

    resulting_list[] = current_string;

    return resulting_list;
}`,

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
            let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true };
            if (def.generic) {
                typeObj.generic = { type: "Type", name: def.generic, generic: null };
            }
            parser.defineVariable(name, typeObj);
        }
    },

    loadIntrinsics(runtime) {
        for (const [name, def] of Object.entries(this.intrinsics)) {
            runtime.addIntrinsic(name, def.func);
        }
    }
};

// --- Source: shift.mjs ---

export class Shift {
    /**
     * @param {string|null} stdLibCode - Custom standard library code (Shift). Pass null to use default.
     * @param {Object|null} stdLibIntrinsics - Custom intrinsics map. Pass null to use default StandardLibrary.intrinsics.
     */
    constructor(stdLibCode = null, stdLibIntrinsics = null) {
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
        const stdParser = new Parser(stdTokens);

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
        const parser = new Parser(lexResult.tokens);
        
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

        // 4. Runtime Initialization
        const runtime = new Runtime(finalAST);
        
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
