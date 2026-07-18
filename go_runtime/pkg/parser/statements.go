package parser

import (
	"fmt"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/token"
)

func (p *Parser) structDeclaration() *ast.StructDeclaration {
	startToken := p.previous() // STRUCT
	nameToken, err := p.consume(token.IDENTIFIER, "Expect struct name.")
	if err != nil {
		return nil
	}

	_, err = p.consume(token.LBRACKET, "Expect '[' to begin struct fields.")
	if err != nil {
		return nil
	}

	fields := []ast.StructField{}

	if !p.check(token.RBRACKET) {
		for {
			if p.check(token.STRUCT) {
				p.addError(p.peek(), "Nested structs are not allowed. Define types at top level.")
				return nil
			}

			typeInfo, tErr := p.parseType("Expect valid type name.", "Expect valid type name.")
			if tErr != nil {
				p.synchronize()
				return nil
			}

			var fieldNameToken token.Token
			if p.match(token.MAGIC_VAR) {
				fieldNameToken = p.previous()
			} else {
				fieldNameToken, err = p.consume(token.IDENTIFIER, "Expect field name.")
				if err != nil {
					p.synchronize()
					return nil
				}
			}

			fields = append(fields, ast.StructField{
				Name: fieldNameToken.Lexeme,
				Type: *typeInfo,
			})

			if !p.match(token.COMMA) {
				break
			}
		}
	}

	endToken, err := p.consume(token.RBRACKET, "Expect ']' after struct fields.")
	if err != nil {
		return nil
	}

	p.structDefinitions[nameToken.Lexeme] = StructDef{Fields: fields}

	return &ast.StructDeclaration{
		BaseNode: ast.BaseNode{
			Type:  "StructDeclaration",
			Start: startToken.Position,
			End:   endToken.Position, // rough end position mapping, Go slices/runes might defer
			Line:  startToken.Line,
		},
		Name:   nameToken.Lexeme,
		Fields: fields,
	}
}

func (p *Parser) functionDeclaration() *ast.FunctionDeclaration {
	startToken := p.previous() // FUNCTION
	line := startToken.Line

	nameToken, err := p.consume(token.IDENTIFIER, "Expect function name.")
	if err != nil {
		return nil
	}
	_, err = p.consume(token.LPAREN, "Expect '(' after function name.")
	if err != nil {
		return nil
	}

	params := []ast.Parameter{}
	if !p.check(token.RPAREN) {
		for {
			typeInfo, tErr := p.parseType("Expect valid type name.", "Expect valid type name.")
			if tErr != nil {
				return nil
			}
			paramName, nErr := p.consume(token.IDENTIFIER, "Expect parameter name.")
			if nErr != nil {
				return nil
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
		return nil
	}

	returnType, rErr := p.parseType("Expect function return type.", "Invalid function return type.")
	if rErr != nil {
		return nil
	}

	p.defineVariable(nameToken.Lexeme, TypeDef{
		Type:        "Type",
		Name:        returnType.Name,
		Initialized: true,
	}, false)

	_, err = p.consume(token.LBRACE, "Expect '{' before function body.")
	if err != nil {
		return nil
	}
	p.enterScope()

	for _, param := range params {
		dErr := p.defineVariable(param.Name, TypeDef{Type: "Type", Name: param.DataType.Name, Generic: param.DataType.Generic, Initialized: true}, true)
		if dErr != nil {
			p.addError(token.Token{Line: line, Lexeme: param.Name}, "Duplicate parameter name.")
		}
	}

	previousReturnType := p.currentReturnType
	retStr := returnType.Name
	p.currentReturnType = &retStr

	startErrorCount := len(p.errors)
	body := p.parseBlock()
	hasBodyErrors := len(p.errors) > startErrorCount

	if !hasBodyErrors && retStr != "none" && retStr != "null" && retStr != "any" {
		if !p.hasGuaranteedReturn(body) {
			p.addError(token.Token{Line: line, Lexeme: nameToken.Lexeme}, "Not all code paths return a value.")
		}
	}

	p.currentReturnType = previousReturnType
	p.exitScope()

	endPosition := 0
	if body != nil {
		endPosition = body.End
	}

	return &ast.FunctionDeclaration{
		BaseNode: ast.BaseNode{
			Type:  "FunctionDeclaration",
			Start: startToken.Position,
			End:   endPosition,
			Line:  line,
		},
		Name:       nameToken.Lexeme,
		Params:     params,
		ReturnType: *returnType,
		Body:       body,
	}
}

func (p *Parser) parseType(missingMsg string, invalidMsg string) (*ast.TypeAnnotation, error) {
	baseKeyword := p.matchTypeKeyword()
	if baseKeyword != nil {
		baseTypeToken, _ := p.consume(*baseKeyword, "Compiler error")
		var generic *ast.TypeAnnotation = nil

		if p.match(token.LANGLE) {
			gen, err := p.parseType(missingMsg, invalidMsg)
			if err != nil {
				return nil, err
			}
			generic = gen
			_, err = p.consume(token.RANGLE, "Expect '>' after generic type.")
			if err != nil {
				return nil, err
			}

			if *baseKeyword != token.TYPE_LIST && *baseKeyword != token.TYPE_MAP && *baseKeyword != token.TYPE_NULLABLE {
				p.addError(baseTypeToken, "Base type does not support generics.")
			}
		}
		return &ast.TypeAnnotation{Type: "Type", Name: baseTypeToken.Lexeme, Generic: generic}, nil
	}

	if p.check(token.IDENTIFIER) {
		t := p.peek()
		if p.knownTypes[t.Lexeme] {
			p.advance()
			return &ast.TypeAnnotation{Type: "StructType", Name: t.Lexeme}, nil
		}
		return nil, p.addError(p.peek(), invalidMsg)
	}

	return nil, p.addError(p.peek(), missingMsg)
}

func (p *Parser) parseBlock() *ast.Block {
	startToken := p.previous() // LBRACE

	p.enterScope()
	statements := []ast.Statement{}
	for !p.check(token.RBRACE) && !p.isAtEnd() {
		prevPos := p.current
		stmt := p.parseStatement()
		if stmt != nil {
			statements = append(statements, stmt)
		}
		if p.current == prevPos {
			p.synchronize()
			if p.current == prevPos {
				p.advance() // force forward if sync didn't move
			}
		}
	}
	endToken, _ := p.consume(token.RBRACE, "Expect '}' after block.")
	p.exitScope()

	return &ast.Block{
		BaseNode: ast.BaseNode{
			Type:  "Block",
			Start: startToken.Position,
			End:   endToken.Position,
			Line:  startToken.Line,
		},
		Statements: statements,
	}
}

func (p *Parser) parseStatement() ast.Statement {
	if p.match(token.RETURN) {
		return p.returnStatement()
	}
	if p.match(token.IF) {
		return p.ifStatement()
	}
	if p.match(token.FOR) {
		return p.forStatement()
	}
	if p.match(token.WHILE) {
		return p.whileStatement()
	}
	if p.match(token.BREAK) {
		return p.breakStatement()
	}
	if p.match(token.SKIP) {
		return p.skipStatement()
	}
	if p.match(token.TRY) {
		return p.tryStatement()
	}
	if p.match(token.THROW) {
		return p.throwStatement()
	}
	if p.match(token.DELETE) {
		return p.deleteStatement()
	}
	if p.matchTypeKeyword() != nil {
		return p.variableDeclaration()
	}

	if p.check(token.IDENTIFIER) && p.knownTypes[p.peek().Lexeme] {
		return p.variableDeclaration()
	}

	return p.expressionStatement()
}

func (p *Parser) whileStatement() *ast.WhileStatement {
	startToken := p.previous()
	p.consume(token.LPAREN, "Expect '(' after 'while'.")
	condition := p.parseExpression()
	p.consume(token.RPAREN, "Expect ')' after while condition.")
	p.consume(token.LBRACE, "Expect '{' before loop body.")

	p.loopDepth++
	body := p.parseBlock()
	p.loopDepth--

	return &ast.WhileStatement{
		BaseNode:  ast.BaseNode{Type: "WhileStatement", Start: startToken.Position, End: body.End, Line: startToken.Line},
		Condition: condition,
		Body:      body,
	}
}

func (p *Parser) breakStatement() *ast.BreakStatement {
	startToken := p.previous()
	if p.loopDepth == 0 {
		p.addError(startToken, "'break' can only be used inside a loop.")
	}
	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after 'break'.")
	return &ast.BreakStatement{BaseNode: ast.BaseNode{Type: "BreakStatement", Start: startToken.Position, End: endToken.Position, Line: startToken.Line}}
}

func (p *Parser) skipStatement() *ast.SkipStatement {
	startToken := p.previous()
	if p.loopDepth == 0 {
		p.addError(startToken, "'skip' can only be used inside a loop.")
	}
	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after 'skip'.")
	return &ast.SkipStatement{BaseNode: ast.BaseNode{Type: "SkipStatement", Start: startToken.Position, End: endToken.Position, Line: startToken.Line}}
}

func (p *Parser) tryStatement() *ast.TryStatement {
	startToken := p.previous()
	p.consume(token.LBRACE, "Expect '{' before try block.")
	tryBlock := p.parseBlock()

	var catchBlock *ast.Block
	catchIdentifier := ""
	var reviewBlock *ast.Block

	hasCatchOrReview := false
	endPos := tryBlock.End

	if p.match(token.CATCH) {
		hasCatchOrReview = true
		p.consume(token.LBRACE, "Expect '{' before catch block.")
		p.enterScope()
		p.defineVariable("$thrown_message", TypeDef{Type: "Type", Name: "string", Initialized: true}, false)
		catchBlock = p.parseBlock()
		p.exitScope()

		catchIdentifier = "$thrown_message"
		endPos = catchBlock.End
	}

	if p.match(token.REVIEW) {
		hasCatchOrReview = true
		p.consume(token.LBRACE, "Expect '{' before review block.")

		p.enterScope()
		p.defineVariable("$thrown_message", TypeDef{Type: "Type", Name: "string", Initialized: true}, false)
		reviewBlock = p.parseBlock()
		p.exitScope()

		if catchIdentifier == "" {
			catchIdentifier = "$thrown_message"
		}
		endPos = reviewBlock.End
	}

	if !hasCatchOrReview {
		p.addError(p.peek(), "Expect 'catch' or 'review' after try block.")
		return nil
	}

	return &ast.TryStatement{
		BaseNode:        ast.BaseNode{Type: "TryStatement", Start: startToken.Position, End: endPos, Line: startToken.Line},
		TryBlock:        tryBlock,
		CatchIdentifier: catchIdentifier,
		CatchBlock:      catchBlock,
		ReviewBlock:     reviewBlock,
	}
}

func (p *Parser) throwStatement() *ast.ThrowStatement {
	startToken := p.previous()

	severity := "error"
	if p.check(token.IDENTIFIER) {
		sevToken := p.advance()
		if sevToken.Lexeme == "alert" || sevToken.Lexeme == "error" || sevToken.Lexeme == "critical" {
			severity = sevToken.Lexeme
		} else {
			p.addError(sevToken, "Expected 'alert', 'error', or 'critical' after throw.")
		}
	} else {
		p.addError(p.peek(), "Expected severity level (alert, error, critical) after throw.")
	}

	value := p.parseExpression()
	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after throw value.")
	return &ast.ThrowStatement{
		BaseNode: ast.BaseNode{Type: "ThrowStatement", Start: startToken.Position, End: endToken.Position, Line: startToken.Line},
		Severity: severity,
		Argument: value,
	}
}

func (p *Parser) deleteStatement() *ast.DeleteStatement {
	startToken := p.previous()
	expr := p.parseExpression()

	idxExpr, isIdx := expr.(*ast.IndexExpression)
	if !isIdx {
		p.addError(startToken, "Invalid delete target. Expected index expression (e.g. collection[key]).")
	} else {
		inferredObj := p.inferType(idxExpr.Object, false)
		if _, exists := p.structDefinitions[inferredObj]; exists {
			p.addError(startToken, "Cannot delete Struct elements")
		}
	}

	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after delete statement.")

	return &ast.DeleteStatement{
		BaseNode: ast.BaseNode{Type: "DeleteStatement", Start: startToken.Position, End: endToken.Position, Line: startToken.Line},
		Target:   idxExpr,
	}
}

func (p *Parser) variableDeclaration() *ast.VariableDeclaration {
	startToken := p.peek()
	typeInfo, _ := p.parseType("Expect valid type name.", "Expect valid type name.")
	nameToken, _ := p.consume(token.IDENTIFIER, "Expect variable name.")

	if typeInfo.Name == "any" {
		p.addError(nameToken, "Type 'any' is not allowed for variable declarations.")
	}
	if typeInfo.Name == "nullable" && typeInfo.Generic != nil && typeInfo.Generic.Name == "any" {
		p.addError(nameToken, "Type 'nullable<any>' is not allowed.")
	}

	var initializer ast.Expression = nil
	isInitialized := true

	if p.match(token.ASSIGN) {
		initializer = p.parseExpression()
		initializer = p.validateAssignment(TypeDef{Name: typeInfo.Name, Type: typeInfo.Type, Generic: typeInfo.Generic}, initializer, nameToken)
	} else {
		initVal, err := p.getDefaultValue(TypeDef{Name: typeInfo.Name, Type: typeInfo.Type, Generic: typeInfo.Generic}, []string{})
		if err != nil {
			p.addError(nameToken, err.Error())
		}
		initializer = initVal
	}

	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after variable declaration.")

	err := p.defineVariable(nameToken.Lexeme, TypeDef{
		Type:        typeInfo.Type,
		Name:        typeInfo.Name,
		Generic:     typeInfo.Generic,
		Initialized: isInitialized,
	}, true)
	if err != nil {
		p.addError(nameToken, err.Error())
	}

	return &ast.VariableDeclaration{
		BaseNode:    ast.BaseNode{Type: "VariableDeclaration", Start: startToken.Position, End: endToken.Position, Line: nameToken.Line},
		VarType:     *typeInfo,
		Name:        nameToken.Lexeme,
		Initializer: initializer,
	}
}

func (p *Parser) expressionStatement() *ast.ExpressionStatement {
	expr := p.parseExpression()
	if expr == nil {
		p.addError(p.peek(), "Expect expression.")
		p.synchronize()
		return nil
	}
	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after expression.")
	return &ast.ExpressionStatement{
		BaseNode:   ast.BaseNode{Type: "ExpressionStatement", Start: expr.GetStart(), End: endToken.Position, Line: expr.GetLine()},
		Expression: expr,
	}
}

func (p *Parser) returnStatement() *ast.ReturnStatement {
	startToken := p.previous()
	var value ast.Expression = nil
	if !p.check(token.SEMICOLON) {
		value = p.parseExpression()
	}
	endToken, _ := p.consume(token.SEMICOLON, "Expect ';' after return value.")

	if p.currentReturnType != nil && *p.currentReturnType != "any" {
		if value == nil {
			if *p.currentReturnType != "none" {
				p.addError(startToken, "Return type mismatch.")
			}
		} else {
			inferredType := p.inferType(value, false)

			if *p.currentReturnType == "none" {
				p.addError(startToken, "Return type mismatch.")
			}

			isNull := inferredType == "null"
			match := inferredType == *p.currentReturnType

			if !match {
				if *p.currentReturnType == "nullable" && inferredType != "null" && inferredType != "none" {
					match = true
				}
				if inferredType == "any" || *p.currentReturnType == "any" {
					match = true
				}
			}

			isPrimitive := *p.currentReturnType == "number" || *p.currentReturnType == "bool"
			if isNull && !isPrimitive {
				match = true
			}

			if !match {
				p.addError(startToken, "Return type mismatch.")
			}
		}
	}

	lineNum := startToken.Line
	if value != nil {
		lineNum = value.GetLine()
	}

	return &ast.ReturnStatement{
		BaseNode: ast.BaseNode{Type: "ReturnStatement", Start: startToken.Position, End: endToken.Position, Line: lineNum},
		Value:    value,
	}
}

func (p *Parser) ifStatement() *ast.IfStatement {
	startToken := p.previous()
	p.consume(token.LPAREN, "Expect '(' after 'if'.")
	condition := p.parseExpression()
	p.consume(token.RPAREN, "Expect ')' after if condition.")
	p.consume(token.LBRACE, "Expect '{' before if body.")
	thenBranch := p.parseBlock()
	var elseBranch ast.Statement = nil
	endPos := thenBranch.End

	if p.match(token.ELSE) {
		if p.match(token.IF) {
			b := p.ifStatement()
			elseBranch = b
			endPos = b.End
		} else {
			p.consume(token.LBRACE, "Expect '{' before else body.")
			b := p.parseBlock()
			elseBranch = b
			endPos = b.End
		}
	}
	return &ast.IfStatement{
		BaseNode:   ast.BaseNode{Type: "IfStatement", Start: startToken.Position, End: endPos, Line: startToken.Line},
		Condition:  condition,
		ThenBranch: thenBranch,
		ElseBranch: elseBranch,
	}
}

func (p *Parser) forStatement() ast.Statement {
	startToken := p.previous()
	p.consume(token.LPAREN, "Expect '(' after 'for'.")

	iteratorToken, _ := p.consume(token.IDENTIFIER, "Expect iterator variable name.")
	var valueIteratorToken *token.Token = nil

	if p.match(token.COMMA) {
		tok, _ := p.consume(token.IDENTIFIER, "Expect value iterator variable name.")
		valueIteratorToken = &tok
	}

	p.consume(token.IN, "Expect 'in' after variable name.")
	startOrCollection := p.parseExpression()
	isRange := false
	var endValue ast.Expression = nil
	if p.match(token.TO) {
		isRange = true
		endValue = p.parseExpression()
	}
	p.consume(token.RPAREN, "Expect ')' after for clauses.")
	p.consume(token.LBRACE, "Expect '{' before loop body.")

	p.enterScope()

	iterType := "any"
	valueIterType := "any"

	if isRange {
		iterType = "number"
		if valueIteratorToken != nil {
			p.addError(*valueIteratorToken, "Range loops cannot have two iterators.")
		}
	} else {
		collectionType := p.inferType(startOrCollection, false)

		if collectionType == "list" || collectionType == "any" {
			iterType = "any"
			if valueIteratorToken != nil {
				iterType = "number"
				valueIterType = "any"
			}
		} else if collectionType == "map" || p.structDefinitions[collectionType].Fields != nil {
			iterType = "string"
			if valueIteratorToken != nil {
				valueIterType = "any"
			}
		} else if collectionType == "string" {
			p.addError(startToken, "Strings are not directly iterable. Use 'string as list<string>'.")
		} else {
			p.addError(startToken, fmt.Sprintf("Type '%s' is not iterable.", collectionType))
		}
	}

	p.defineVariable(iteratorToken.Lexeme, TypeDef{Type: "Type", Name: iterType, Initialized: true}, false)
	valIter := ""
	if valueIteratorToken != nil {
		p.defineVariable(valueIteratorToken.Lexeme, TypeDef{Type: "Type", Name: valueIterType, Initialized: true}, false)
		valIter = valueIteratorToken.Lexeme
	}

	p.loopDepth++
	body := p.parseBlock()
	p.loopDepth--
	p.exitScope()

	if isRange {
		return &ast.ForRangeStatement{
			BaseNode:   ast.BaseNode{Type: "ForRangeStatement", Start: startToken.Position, End: body.End, Line: startToken.Line},
			Iterator:   iteratorToken.Lexeme,
			StartValue: startOrCollection,
			EndValue:   endValue,
			Body:       body,
		}
	} else {
		return &ast.ForInStatement{
			BaseNode:      ast.BaseNode{Type: "ForInStatement", Start: startToken.Position, End: body.End, Line: startToken.Line},
			Iterator:      iteratorToken.Lexeme,
			ValueIterator: valIter,
			Collection:    startOrCollection,
			Body:          body,
		}
	}
}

func (p *Parser) hasGuaranteedReturn(stmt ast.Statement) bool {
	if stmt == nil {
		return false
	}

	switch s := stmt.(type) {
	case *ast.Block:
		for _, bStmt := range s.Statements {
			if p.hasGuaranteedReturn(bStmt) {
				return true
			}
		}
		return false
	case *ast.ReturnStatement:
		return true
	case *ast.ThrowStatement:
		return true
	case *ast.IfStatement:
		if s.ElseBranch != nil {
			return p.hasGuaranteedReturn(s.ThenBranch) && p.hasGuaranteedReturn(s.ElseBranch)
		}
		return false
	case *ast.TryStatement:
		tryReturns := p.hasGuaranteedReturn(s.TryBlock)
		if !tryReturns {
			return false
		}
		if s.CatchBlock != nil && !p.hasGuaranteedReturn(s.CatchBlock) {
			return false
		}
		if s.ReviewBlock != nil && !p.hasGuaranteedReturn(s.ReviewBlock) {
			return false
		}
		return true
	default:
		return false
	}
}
