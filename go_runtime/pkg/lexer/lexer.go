package lexer

import (
	"fmt"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/token"
)

type LexerError struct {
	StartLine int
	EndLine   int
	Message   string
}

type TokenizeResult struct {
	Tokens []token.Token
	Errors []LexerError
}

type Lexer struct {
	source       []rune
	tokens       []token.Token
	errors       []LexerError
	startIndex   int
	currentIndex int
	startLine    int
	currentLine  int
}

func NewLexer(source string) *Lexer {
	return &Lexer{
		source:       []rune(source),
		tokens:       []token.Token{},
		errors:       []LexerError{},
		startIndex:   0,
		currentIndex: 0,
		startLine:    1,
		currentLine:  1,
	}
}

func (l *Lexer) Tokenize() TokenizeResult {
	for !l.isAtEnd() {
		l.startIndex = l.currentIndex
		l.startLine = l.currentLine
		l.scanToken()
	}

	l.tokens = append(l.tokens, token.Token{
		Type:     token.EOF,
		Lexeme:   "",
		Literal:  nil,
		Line:     l.currentLine,
		Position: l.currentIndex,
	})

	return TokenizeResult{
		Tokens: l.tokens,
		Errors: l.errors,
	}
}

func (l *Lexer) addError(message string) {
	l.errors = append(l.errors, LexerError{
		StartLine: l.startLine,
		EndLine:   l.currentLine,
		Message:   message,
	})
}

func (l *Lexer) scanToken() {
	char := l.advance()

	switch char {
	case '(':
		l.addToken(token.LPAREN, "(")
	case ')':
		l.addToken(token.RPAREN, ")")
	case '{':
		l.addToken(token.LBRACE, "{")
	case '}':
		l.addToken(token.RBRACE, "}")
	case '[':
		l.addToken(token.LBRACKET, "[")
	case ']':
		l.addToken(token.RBRACKET, "]")
	case ',':
		l.addToken(token.COMMA, ",")
	case ':':
		l.addToken(token.COLON, ":")
	case ';':
		l.addToken(token.SEMICOLON, ";")
	case '+':
		l.addToken(token.PLUS, "+")
	case '-':
		l.addToken(token.MINUS, "-")
	case '*':
		l.addToken(token.STAR, "*")
	case '%':
		l.addToken(token.PERCENT, "%")
	case '|':
		l.addToken(token.PIPE, "|")
	case '^':
		l.addToken(token.CARET, "^")
	case '$':
		l.magicVariable()
	case '?':
		if l.match('?') {
			l.addToken(token.QUESTION_QUESTION, "??")
		} else {
			l.addError("Unexpected character '?'")
		}
	case '<':
		if l.match('=') {
			l.addToken(token.LESS_EQUAL, "<=")
		} else {
			l.addToken(token.LANGLE, "<")
		}
	case '>':
		if l.match('=') {
			l.addToken(token.GREATER_EQUAL, ">=")
		} else {
			l.addToken(token.RANGLE, ">")
		}
	case '!':
		if l.match('=') {
			l.addToken(token.BANG_EQUAL, "!=")
		} else {
			l.addToken(token.BANG, "!")
		}
	case '=':
		if l.match('=') {
			l.addToken(token.EQUAL_EQUAL, "==")
		} else {
			l.addToken(token.ASSIGN, "=")
		}
	case '&':
		if l.match('&') {
			// Simulating JS AMPERSAND_AMPERSAND behavior described in lexer.mjs
			l.addToken(token.TokenType("AMPERSAND_AMPERSAND"), "&&")
		} else {
			l.addToken(token.AMPERSAND, "&")
		}
	case '/':
		if l.match('/') {
			l.advanceUntil('\n')
		} else if l.match('*') {
			l.skipBlockComment()
		} else {
			l.addToken(token.SLASH, "/")
		}
	case ' ', '\r', '\t':
		// whitespace, do nothing
	case '\n':
		l.currentLine++
	case '"':
		l.string()
	default:
		if l.isDigit(char) {
			l.number()
		} else if l.isAlpha(char) {
			l.identifier()
		} else if !l.isWhitespace(char) {
			l.addError(fmt.Sprintf("Unexpected character '%c'", char))
		}
	}
}

func (l *Lexer) identifier() {
	for l.isAlphaNumeric(l.peek()) {
		l.advance()
	}

	text := string(l.source[l.startIndex:l.currentIndex])

	tType, exists := token.Keywords[text]
	if !exists {
		tType = token.IDENTIFIER
	}

	l.addToken(tType, text)
}

func (l *Lexer) number() {
	for l.isDigit(l.peek()) {
		l.advance()
	}

	// fractional part
	if l.peek() == '.' && l.isDigit(l.peekNext()) {
		l.advance() // Consume "."
		for l.isDigit(l.peek()) {
			l.advance()
		}
	}

	value := string(l.source[l.startIndex:l.currentIndex])
	l.addToken(token.NUMBER, value)
}

func (l *Lexer) string() {
	for !l.isAtEnd() {
		if l.peek() == '\\' {
			l.advance() // Consume slash
			if l.peek() == '\n' {
				l.currentLine++
			}
			l.advance() // Consume escaped char
			continue
		}

		if l.peek() == '"' {
			break
		}

		if l.peek() == '\n' {
			l.currentLine++
		}

		l.advance()
	}

	if l.isAtEnd() {
		l.addError("Unterminated string")
		return
	}

	l.advance() // Consume closing "

	raw := string(l.source[l.startIndex+1 : l.currentIndex-1])
	value := unescapeString(raw)

	// Since JS implementation assigns value to v (lexeme) directly. Let's do the same.
	l.tokens = append(l.tokens, token.Token{
		Type:     token.STRING,
		Lexeme:   value,
		Literal:  value,
		Line:     l.currentLine,
		Position: l.startIndex, // original uses startindex
	})
}

func unescapeString(str string) string {
	var result []rune
	runes := []rune(str)
	for i := 0; i < len(runes); i++ {
		if runes[i] == '\\' {
			i++
			if i >= len(runes) {
				break
			}
			switch runes[i] {
			case '"':
				result = append(result, '"')
			case '\\':
				result = append(result, '\\')
			case 'n':
				result = append(result, '\n')
			case 'r':
				result = append(result, '\r')
			case 't':
				result = append(result, '\t')
			default:
				result = append(result, runes[i]) // unknown escape
			}
		} else {
			result = append(result, runes[i])
		}
	}
	return string(result)
}

func (l *Lexer) skipBlockComment() {
	for !l.isAtEnd() {
		if l.peek() == '*' && l.peekNext() == '/' {
			l.advance() // *
			l.advance() // /
			return
		}

		if l.peek() == '\n' {
			l.currentLine++
		}

		l.advance()
	}
	l.addError("Unterminated block comment")
}

func (l *Lexer) advance() rune {
	char := l.source[l.currentIndex]
	l.currentIndex++
	return char
}

func (l *Lexer) advanceUntil(char rune) bool {
	for l.peek() != char && !l.isAtEnd() {
		if l.peek() == '\n' {
			l.currentLine++
		}
		l.advance()
	}
	return !l.isAtEnd()
}

func (l *Lexer) peek() rune {
	if l.isAtEnd() {
		return '\000'
	}
	return l.source[l.currentIndex]
}

func (l *Lexer) peekNext() rune {
	if l.currentIndex+1 >= len(l.source) {
		return '\000'
	}
	return l.source[l.currentIndex+1]
}

func (l *Lexer) match(expected rune) bool {
	if l.isAtEnd() {
		return false
	}
	if l.source[l.currentIndex] != expected {
		return false
	}
	l.currentIndex++
	return true
}

func (l *Lexer) addToken(t token.TokenType, lexeme string) {
	l.tokens = append(l.tokens, token.Token{
		Type:     t,
		Lexeme:   lexeme,
		Literal:  nil, // can be populated if needed for standard literal token values
		Line:     l.currentLine,
		Position: l.startIndex,
	})
}

func (l *Lexer) magicVariable() {
	for l.isAlphaNumeric(l.peek()) {
		l.advance()
	}
	text := string(l.source[l.startIndex:l.currentIndex])
	l.addToken(token.MAGIC_VAR, text)
}

func (l *Lexer) isAtEnd() bool {
	return l.currentIndex >= len(l.source)
}

func (l *Lexer) isDigit(char rune) bool {
	return char >= '0' && char <= '9'
}

func (l *Lexer) isAlpha(char rune) bool {
	return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char == '_'
}

func (l *Lexer) isAlphaNumeric(char rune) bool {
	return l.isAlpha(char) || l.isDigit(char)
}

func (l *Lexer) isWhitespace(char rune) bool {
	if char == '\n' {
		l.currentLine++
		return true
	}
	return char == ' ' || char == '\r' || char == '\t'
}
