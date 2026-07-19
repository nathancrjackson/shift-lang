package token

// TokenType defines a string alias representing lexical token types.
type TokenType string

// Token type constants representing the Shift language keywords, operators, symbols, and literals.
const (
	// Keywords
	FUNCTION TokenType = "FUNCTION"
	RETURN   TokenType = "RETURN"
	STRUCT   TokenType = "STRUCT"
	IF       TokenType = "IF"
	ELSE     TokenType = "ELSE"
	FOR      TokenType = "FOR"
	IN       TokenType = "IN"
	TO       TokenType = "TO"
	WHILE    TokenType = "WHILE"
	TRY      TokenType = "TRY"
	CATCH    TokenType = "CATCH"
	REVIEW   TokenType = "REVIEW"
	THROW    TokenType = "THROW"
	TRUE     TokenType = "TRUE"
	FALSE    TokenType = "FALSE"
	IMPORT   TokenType = "IMPORT"
	SHARE    TokenType = "SHARE"
	SHARED   TokenType = "SHARED"
	TRANSFER TokenType = "TRANSFER"

	BREAK TokenType = "BREAK"
	SKIP  TokenType = "SKIP"

	LOGICAL_AND TokenType = "LOGICAL_AND"
	LOGICAL_OR  TokenType = "LOGICAL_OR"
	LOGICAL_XOR TokenType = "LOGICAL_XOR"
	NOT         TokenType = "NOT"

	// Casting & Checks
	AS       TokenType = "AS"
	HAS      TokenType = "HAS"
	IS       TokenType = "IS"
	CONTAINS TokenType = "CONTAINS"
	MATCHES  TokenType = "MATCHES"
	DELETE   TokenType = "DELETE"
	SEARCH   TokenType = "SEARCH"

	// String/List Ops
	REPLACE TokenType = "REPLACE"
	WITH    TokenType = "WITH"
	SPLIT   TokenType = "SPLIT"
	JOINED  TokenType = "JOINED"

	// Inspection & Bytes
	INSPECT TokenType = "INSPECT"
	SIZE    TokenType = "SIZE"
	TYPE    TokenType = "TYPE"
	OF      TokenType = "OF"
	PACK    TokenType = "PACK"
	UNPACK  TokenType = "UNPACK"

	// Null Coalescing
	QUESTION_QUESTION TokenType = "QUESTION_QUESTION"

	// Types
	TYPE_STRING   TokenType = "TYPE_STRING"
	TYPE_NUMBER   TokenType = "TYPE_NUMBER"
	TYPE_BOOL     TokenType = "TYPE_BOOL"
	TYPE_LIST     TokenType = "TYPE_LIST"
	TYPE_MAP      TokenType = "TYPE_MAP"
	TYPE_NULL     TokenType = "TYPE_NULL"
	TYPE_NONE     TokenType = "TYPE_NONE"
	TYPE_ANY      TokenType = "TYPE_ANY"
	TYPE_NULLABLE TokenType = "TYPE_NULLABLE"

	// Symbols & Operators
	BANG          TokenType = "BANG"
	BANG_EQUAL    TokenType = "BANG_EQUAL"
	EQUAL_EQUAL   TokenType = "EQUAL_EQUAL"
	LESS_EQUAL    TokenType = "LESS_EQUAL"
	GREATER_EQUAL TokenType = "GREATER_EQUAL"
	LANGLE        TokenType = "LANGLE"   // <
	RANGLE        TokenType = "RANGLE"   // >
	LPAREN        TokenType = "LPAREN"   // (
	RPAREN        TokenType = "RPAREN"   // )
	LBRACE        TokenType = "LBRACE"   // {
	RBRACE        TokenType = "RBRACE"   // }
	LBRACKET      TokenType = "LBRACKET" // [
	RBRACKET      TokenType = "RBRACKET" // ]
	COMMA         TokenType = "COMMA"
	COLON         TokenType = "COLON"
	SEMICOLON     TokenType = "SEMICOLON"
	PIPE          TokenType = "PIPE"
	ASSIGN        TokenType = "ASSIGN"
	PLUS          TokenType = "PLUS"
	MINUS         TokenType = "MINUS"
	SLASH         TokenType = "SLASH"
	STAR          TokenType = "STAR"
	PERCENT       TokenType = "PERCENT"   // %
	AMPERSAND     TokenType = "AMPERSAND" // &
	CARET         TokenType = "CARET"     // ^
	MAGIC_VAR     TokenType = "MAGIC_VAR" // $

	// Literals
	IDENTIFIER TokenType = "IDENTIFIER"
	STRING     TokenType = "STRING"
	NUMBER     TokenType = "NUMBER"

	// Special identifiers
	PIPE_VALUE TokenType = "PIPE_VALUE"

	// Control
	EOF TokenType = "EOF"
)

// Keywords maps source string literals to their corresponding TokenTypes.
var Keywords = map[string]TokenType{
	"function": FUNCTION, "return": RETURN, "struct": STRUCT, "import": IMPORT,
	"share": SHARE, "shared": SHARED, "transfer": TRANSFER,
	"if": IF, "else": ELSE, "for": FOR, "in": IN, "to": TO, "while": WHILE,
	"try": TRY, "catch": CATCH, "review": REVIEW, "throw": THROW,
	"true": TRUE, "false": FALSE,
	"break": BREAK, "skip": SKIP,
	"and": LOGICAL_AND, "or": LOGICAL_OR, "xor": LOGICAL_XOR, "not": NOT,

	"as": AS, "has": HAS, "is": IS, "contains": CONTAINS, "matches": MATCHES,
	"replace": REPLACE, "with": WITH, "split": SPLIT, "joined": JOINED,
	"delete": DELETE, "search": SEARCH,

	"inspect": INSPECT, "size": SIZE, "type": TYPE, "of": OF, "pack": PACK, "unpack": UNPACK,

	"string": TYPE_STRING, "number": TYPE_NUMBER, "bool": TYPE_BOOL,
	"list": TYPE_LIST, "map": TYPE_MAP, "null": TYPE_NULL,
	"none": TYPE_NONE, "any": TYPE_ANY, "nullable": TYPE_NULLABLE,
}

// GenericsArray lists the primitive types that can be generic parameter constraints.
var GenericsArray = []TokenType{
	TYPE_STRING, TYPE_NUMBER, TYPE_BOOL, TYPE_LIST, TYPE_MAP, TYPE_ANY,
}

// Token represents a scanned token containing type, lexeme, parsed literal value, line, and start position.
type Token struct {
	Type     TokenType
	Lexeme   string
	Literal  any
	Line     int
	Position int // Start index in the source, optional for exact positioning
}

// NewToken constructs a new Token with the specified type, lexeme, literal value, and line number.
func NewToken(tokenType TokenType, lexeme string, literal any, line int) Token {
	return Token{
		Type:    tokenType,
		Lexeme:  lexeme,
		Literal: literal,
		Line:    line,
	}
}
