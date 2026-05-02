package parser

import (
	"fmt"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/token"
)

type ParserError struct {
	Line    int
	Token   string
	Message string
}

func (e ParserError) Error() string {
	return fmt.Sprintf("Line %d Error at '%s': %s", e.Line, e.Token, e.Message)
}

type TypeDef struct {
	Type        string
	Name        string
	Generic     *ast.TypeAnnotation
	Params      []ast.Parameter
	Initialized bool
}

type StructDef struct {
	Fields []ast.StructField
}

type ParseResult struct {
	AST    *ast.Program
	Errors []ParserError
}

type Parser struct {
	tokens            []token.Token
	current           int
	errors            []ParserError
	currentReturnType *string
	loopDepth         int
	scopes            []map[string]TypeDef
	knownTypes        map[string]bool
	structDefinitions map[string]StructDef
	usedFunctions     map[string]bool
	depth             int
}

const MaxDepth = 500

func NewParser(tokens []token.Token) *Parser {
	p := &Parser{
		tokens:            tokens,
		current:           0,
		errors:            []ParserError{},
		currentReturnType: nil,
		loopDepth:         0,
		scopes:            []map[string]TypeDef{},
		knownTypes: map[string]bool{
			"string": true, "number": true, "bool": true,
			"list": true, "map": true, "any": true,
			"null": true, "none": true, "nullable": true,
		},
		structDefinitions: make(map[string]StructDef),
		usedFunctions:     make(map[string]bool),
		depth:             0,
	}
	p.enterScope()
	return p
}

func (p *Parser) Parse() ParseResult {
	p.preScan()

	program := &ast.Program{
		BaseNode: ast.BaseNode{
			Type:  "Program",
			Start: 0,
			End:   0,
			Line:  1,
		},
		Structs:   []ast.StructDeclaration{},
		Functions: []ast.FunctionDeclaration{},
	}

	if len(p.tokens) > 0 {
		program.Start = p.tokens[0].Position
		program.End = p.tokens[len(p.tokens)-1].Position
	}

	p.errors = []ParserError{}

	for !p.isAtEnd() {
		if p.match(token.STRUCT) {
			structDecl := p.structDeclaration()
			if structDecl != nil {
				program.Structs = append(program.Structs, *structDecl)
			}
		} else if p.match(token.FUNCTION) {
			funcDecl := p.functionDeclaration()
			if funcDecl != nil {
				program.Functions = append(program.Functions, *funcDecl)
			}
		} else {
			p.addError(p.peek(), "Expect 'function' or 'struct' at top level.")
			p.advance()
			p.synchronize()
		}
	}

	return ParseResult{AST: program, Errors: p.errors}
}

// ---- Scanning & Pre-Parse ----

func (p *Parser) preScan() {
	startPos := p.current

	// PASS 1: Struct Discovery
	p.current = 0
	for !p.isAtEnd() {
		if p.match(token.STRUCT) {
			p.preParseStruct()
		} else {
			p.advance()
		}
	}

	// PASS 2: Function Discovery
	p.current = 0
	for !p.isAtEnd() {
		if p.match(token.FUNCTION) {
			p.preParseFunction()
		} else {
			p.advance()
		}
	}

	p.current = startPos
}

func (p *Parser) preParseStruct() {
	nameToken, err := p.consume(token.IDENTIFIER, "Expect struct name.")
	if err != nil {
		p.synchronize()
		return
	}
	p.knownTypes[nameToken.Lexeme] = true

	_, err = p.consume(token.LBRACKET, "Expect '[' to begin struct fields.")
	if err != nil {
		p.synchronize()
		return
	}
	p.skipList()
}

func (p *Parser) preParseFunction() {
	nameToken, err := p.consume(token.IDENTIFIER, "Expect function name.")
	if err != nil {
		p.synchronize()
		return
	}
	_, err = p.consume(token.LPAREN, "Expect '(' after function name.")
	if err != nil {
		p.synchronize()
		return
	}

	params := []ast.Parameter{}
	if !p.check(token.RPAREN) {
		for {
			typeInfo, tErr := p.parseType("Expect parameter type.", "Invalid parameter type.")
			if tErr != nil {
				p.synchronize() // rough recovery
				return
			}
			paramName, nErr := p.consume(token.IDENTIFIER, "Expect parameter name.")
			if nErr != nil {
				p.synchronize()
				return
			}
			params = append(params, ast.Parameter{
				Type:     "Parameter",
				Name:     paramName.Lexeme,
				DataType: *typeInfo,
			})
			if !p.match(token.COMMA) {
				break
			}
		}
	}

	_, err = p.consume(token.RPAREN, "Expect ')' after parameters.")
	if err != nil {
		p.synchronize()
		return
	}

	returnType, err := p.parseType("Expect function return type.", "Invalid function return type.")
	if err != nil {
		p.synchronize()
		return
	}

	p.defineVariable(nameToken.Lexeme, TypeDef{
		Type:        "Type",
		Name:        returnType.Name,
		Generic:     returnType.Generic,
		Params:      params,
		Initialized: true,
	}, false)

	_, err = p.consume(token.LBRACE, "Expect '{' before function body.")
	if err != nil {
		p.synchronize()
		return
	}
	p.skipBlock()
}

func (p *Parser) skipBlock() {
	braceDepth := 1
	for braceDepth > 0 && !p.isAtEnd() {
		if p.check(token.LBRACE) {
			braceDepth++
		} else if p.check(token.RBRACE) {
			braceDepth--
		}
		p.advance()
	}
}

func (p *Parser) skipList() {
	bracketDepth := 1
	for bracketDepth > 0 && !p.isAtEnd() {
		if p.check(token.LBRACKET) {
			bracketDepth++
		} else if p.check(token.RBRACKET) {
			bracketDepth--
		}
		p.advance()
	}
}

// ---- Scope Helpers ----

func (p *Parser) enterScope() {
	p.scopes = append(p.scopes, make(map[string]TypeDef))
}

func (p *Parser) exitScope() {
	if len(p.scopes) > 0 {
		p.scopes = p.scopes[:len(p.scopes)-1]
	}
}

func (p *Parser) defineVariable(name string, typeInfo TypeDef, checkShadowing bool) error {
	if len(p.scopes) > 0 {
		if checkShadowing {
			for i := len(p.scopes) - 1; i > 0; i-- { // intentionally avoiding global scope 0
				if _, exists := p.scopes[i][name]; exists {
					return fmt.Errorf("Variable cannot be redeclared inside the same function.")
				}
			}
		}
		p.scopes[len(p.scopes)-1][name] = typeInfo
	}
	return nil
}

func (p *Parser) getVariable(name string) *TypeDef {
	for i := len(p.scopes) - 1; i >= 0; i-- {
		if val, exists := p.scopes[i][name]; exists {
			return &val
		}
	}
	return nil
}

// ---- Token Helpers ----

func (p *Parser) match(expectedType token.TokenType) bool {
	if p.check(expectedType) {
		p.advance()
		return true
	}
	return false
}

func (p *Parser) matchTypeKeyword() *token.TokenType {
	if p.isAtEnd() {
		return nil
	}
	tType := p.peek().Type
	// All primitive type tokens start with TYPE_ in the token enum string,
	// e.g. token.TYPE_STRING.
	if len(tType) > 5 && tType[:5] == "TYPE_" {
		return &tType
	}
	return nil
}

func (p *Parser) check(expectedType token.TokenType) bool {
	if p.isAtEnd() {
		return false
	}
	return p.peek().Type == expectedType
}

func (p *Parser) advance() token.Token {
	if !p.isAtEnd() {
		p.current++
	}
	return p.previous()
}

func (p *Parser) consume(expectedType token.TokenType, message string) (token.Token, error) {
	if p.check(expectedType) {
		return p.advance(), nil
	}
	err := p.addError(p.peek(), message)
	return token.Token{}, err
}

func (p *Parser) isAtEnd() bool {
	return p.peek().Type == token.EOF
}

func (p *Parser) peek() token.Token {
	if p.current >= len(p.tokens) {
		return p.tokens[len(p.tokens)-1]
	}
	return p.tokens[p.current]
}

func (p *Parser) previous() token.Token {
	if p.current == 0 {
		return p.tokens[0]
	}
	return p.tokens[p.current-1]
}

func (p *Parser) addError(t token.Token, message string) error {
	err := ParserError{
		Line:    t.Line,
		Token:   t.Lexeme,
		Message: message,
	}
	p.errors = append(p.errors, err)
	return err
}

func (p *Parser) markFunctionUsed(name string) {
	p.usedFunctions[name] = true
}

func (p *Parser) synchronize() {
	p.advance()

	braceDepth := 0
	for !p.isAtEnd() {
		t := p.peek()

		if t.Type == token.LBRACE {
			braceDepth++
		} else if t.Type == token.RBRACE {
			if braceDepth > 0 {
				braceDepth--
				p.advance()
				if braceDepth == 0 {
					return
				}
				continue
			} else {
				return
			}
		}

		if p.previous().Type == token.SEMICOLON && braceDepth == 0 {
			return
		}

		if braceDepth == 0 {
			switch t.Type {
			case token.FUNCTION, token.STRUCT, token.FOR, token.WHILE, token.IF, token.RETURN:
				return
			}
		}
		p.advance()
	}
}

// APIs for stdlib injection
func (p *Parser) AddKnownType(name string) {
	p.knownTypes[name] = true
}

func (p *Parser) AddStructDefinition(name string, def StructDef) {
	p.structDefinitions[name] = def
}

func (p *Parser) AddGlobalVariable(name string, typeInfo TypeDef) {
	if len(p.scopes) > 0 {
		p.scopes[0][name] = typeInfo
	}
}
