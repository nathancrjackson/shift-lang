import {TokenType, KEYWORDS} from './token_enums.mjs';

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