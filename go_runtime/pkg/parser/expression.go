package parser

import (
	"fmt"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/token"
)

func (p *Parser) ParseExpression() ast.Expression {
	return p.parseExpression()
}

func (p *Parser) parseExpression() ast.Expression {
	p.depth++
	defer func() { p.depth-- }()
	if p.depth > MaxDepth {
		p.addError(p.peek(), "Expression too deep (stack overflow prevention).")
		return nil
	}
	return p.assignment()
}

func (p *Parser) assignment() ast.Expression {
	expr := p.pipeline()

	if p.match(token.ASSIGN) {
		equalsToken := p.previous()
		value := p.pipeline()

		if varExpr, ok := expr.(*ast.Variable); ok {
			varName := varExpr.Name
			varType := p.getVariable(varName)

			if varType == nil {
				p.addError(equalsToken, "Undefined variable.")
				return &ast.Assignment{
					BaseNode: ast.BaseNode{Type: "Assignment", Start: expr.GetStart(), End: value.GetEnd(), Line: equalsToken.Line},
					Name:     varName,
					Value:    value,
				}
			}

			if varType.Shared {
				p.addError(equalsToken, "Shared variable names cannot be reassigned.")
			}

			value = p.validateAssignment(*varType, value, equalsToken)

			return &ast.Assignment{
				BaseNode: ast.BaseNode{Type: "Assignment", Start: expr.GetStart(), End: value.GetEnd(), Line: equalsToken.Line},
				Name:     varName,
				Value:    value,
			}
		} else if idxExpr, ok := expr.(*ast.IndexExpression); ok {
			containerType := p.resolveTypeAnnotation(idxExpr.Object)
			if containerType != nil {
				// Unwrap nullable
				for containerType.Name == "nullable" && containerType.Generic != nil {
					containerType = containerType.Generic
				}

				if containerType.Type == "StructType" {
					if def, exists := p.structDefinitions[containerType.Name]; exists {
						if litIdx, ok := idxExpr.Index.(*ast.Literal); !ok || p.inferType(litIdx, false) != "string" {
							p.addError(equalsToken, "Struct keys must be string literals.")
						} else {
							fieldName := litIdx.Value.(string)
							var fieldFound *ast.StructField
							for _, f := range def.Fields {
								if f.Name == fieldName {
									fieldFound = &f
									break
								}
							}

							if fieldFound == nil {
								p.addError(equalsToken, "Cannot set Struct element that is not in its defined schema")
							} else {
								if len(fieldFound.Name) > 0 && fieldFound.Name[0] == '$' {
									p.addError(equalsToken, "Cannot assign to immutable field '"+fieldFound.Name+"'.")
								}
								value = p.validateAssignment(TypeDef{Name: fieldFound.Type.Name, Type: fieldFound.Type.Type, Generic: fieldFound.Type.Generic}, value, equalsToken, "Struct field type mismatch.")
							}
						}
					}
				} else if containerType.Name == "map" || containerType.Name == "list" {
					if containerType.Name == "map" {
						if idxExpr.Index == nil {
							p.addError(equalsToken, "Cannot push to Map without a key.")
						} else {
							inferredKey := p.inferType(idxExpr.Index, false)
							if inferredKey != "any" && inferredKey != "string" {
								p.addError(equalsToken, "Map keys must be strings.")
							}
						}
					}

					if containerType.Generic != nil {
						errorMsg := "List variable assignment type mismatch."
						if containerType.Name == "map" {
							errorMsg = "Map value type mismatch."
						}
						value = p.validateAssignment(TypeDef{Name: containerType.Generic.Name, Type: containerType.Generic.Type, Generic: containerType.Generic.Generic}, value, equalsToken, errorMsg)
					}
				}
			}

			return &ast.IndexAssignment{
				BaseNode: ast.BaseNode{Type: "IndexAssignment", Start: expr.GetStart(), End: value.GetEnd(), Line: equalsToken.Line},
				Object:   idxExpr.Object,
				Index:    idxExpr.Index,
				Value:    value,
			}
		}

		p.addError(equalsToken, "Invalid assignment target.")
		return nil
	}

	return expr
}

func (p *Parser) pipeline() ast.Expression {
	expr := p.nullCoalescing()

	for p.match(token.PIPE) {
		operatorToken := p.previous()
		leftType := p.inferType(expr, false)
		p.defineVariable("$pipe_value", TypeDef{Type: "Type", Name: leftType, Initialized: true}, false)
		right := p.nullCoalescing()
		expr = &ast.PipelineExpression{
			BaseNode: ast.BaseNode{Type: "PipelineExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) nullCoalescing() ast.Expression {
	expr := p.logicalOr()

	for p.match(token.QUESTION_QUESTION) {
		operatorToken := p.previous()
		right := p.logicalOr()
		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) logicalOr() ast.Expression {
	expr := p.logicalAnd()

	for p.match(token.LOGICAL_OR) {
		operatorToken := p.previous()
		right := p.logicalAnd()
		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) logicalAnd() ast.Expression {
	expr := p.logicalXor()

	for p.match(token.LOGICAL_AND) {
		operatorToken := p.previous()
		right := p.logicalXor()
		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) logicalXor() ast.Expression {
	expr := p.equality()

	for p.match(token.LOGICAL_XOR) {
		operatorToken := p.previous()
		right := p.equality()
		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) equality() ast.Expression {
	expr := p.comparison()

	for p.match(token.BANG_EQUAL) || p.match(token.EQUAL_EQUAL) {
		operatorToken := p.previous()
		right := p.comparison()

		leftType := p.inferType(expr, false)
		rightType := p.inferType(right, false)

		if leftType != "any" && rightType != "any" {
			match := false
			if leftType == rightType {
				match = true
			}
			if leftType == "null" || rightType == "null" {
				match = true
			}
			if leftType == "nullable" || rightType == "nullable" {
				match = true
			}
			if !match {
				p.addError(operatorToken, "Cannot compare different types: "+leftType+" and "+rightType)
			}
		}

		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) comparison() ast.Expression {
	expr := p.concatenation()

	for p.match(token.LANGLE) || p.match(token.RANGLE) ||
		p.match(token.LESS_EQUAL) || p.match(token.GREATER_EQUAL) ||
		p.match(token.HAS) || p.match(token.SEARCH) ||
		p.match(token.CONTAINS) || p.match(token.IS) ||
		p.match(token.REPLACE) || p.match(token.SPLIT) || p.match(token.JOINED) ||
		p.match(token.MATCHES) {

		operatorToken := p.previous()

		if operatorToken.Type == token.IS {
			isNot := false
			if p.match(token.NOT) {
				isNot = true
			}

			checkType := ""
			endPos := operatorToken.Position + len(operatorToken.Lexeme)

			if p.matchTypeKeyword() != nil {
				tok := p.advance()
				checkType = tok.Lexeme
				endPos = tok.Position + len(tok.Lexeme)
			} else if p.match(token.IDENTIFIER) {
				tok := p.previous()
				checkType = tok.Lexeme
				endPos = tok.Position + len(tok.Lexeme)
			} else {
				p.addError(p.peek(), "Expect type or check name after 'is'.")
			}

			expr = &ast.IsExpression{
				BaseNode: ast.BaseNode{Type: "IsExpression", Start: expr.GetStart(), End: endPos, Line: operatorToken.Line},
				Left:     expr,
				Check:    checkType,
				IsNot:    isNot,
			}
			continue
		}

		if operatorToken.Type == token.REPLACE {
			pattern := p.concatenation()
			p.consume(token.WITH, "Expect 'with' after replace pattern.")
			replacement := p.concatenation()

			expr = &ast.ReplaceExpression{
				BaseNode:    ast.BaseNode{Type: "ReplaceExpression", Start: expr.GetStart(), End: replacement.GetEnd(), Line: operatorToken.Line},
				Source:      expr,
				Pattern:     pattern,
				Replacement: replacement,
			}
			continue
		}

		if operatorToken.Type == token.SPLIT || operatorToken.Type == token.JOINED {
			p.consume(token.WITH, "Expect 'with' after "+operatorToken.Lexeme+".")
			delimiter := p.concatenation()

			tName := "SplitExpression"
			if operatorToken.Type == token.JOINED {
				tName = "JoinExpression"
			}

			if tName == "SplitExpression" {
				expr = &ast.SplitExpression{
					BaseNode:  ast.BaseNode{Type: tName, Start: expr.GetStart(), End: delimiter.GetEnd(), Line: operatorToken.Line},
					Source:    expr,
					Delimiter: delimiter,
				}
			} else {
				expr = &ast.JoinExpression{
					BaseNode:  ast.BaseNode{Type: tName, Start: expr.GetStart(), End: delimiter.GetEnd(), Line: operatorToken.Line},
					Source:    expr,
					Delimiter: delimiter,
				}
			}
			continue
		}

		right := p.concatenation()

		if operatorToken.Type == token.SEARCH || operatorToken.Type == token.MATCHES {
			leftType := p.inferType(expr, false)
			rightType := p.inferType(right, false)

			name := "Search"
			if operatorToken.Type == token.MATCHES {
				name = "Matches"
			}

			if leftType != "any" && leftType != "string" {
				p.addError(operatorToken, name+" data must be a string.")
			}
			if rightType != "any" && rightType != "string" {
				p.addError(operatorToken, name+" expression must be a string.")
			}

			if lit, ok := right.(*ast.Literal); ok {
				if str, ok := lit.Value.(string); ok {
					if len(str) == 0 || str[0] != '/' {
						p.addError(operatorToken, name+" expression must be a valid regular expression.")
					}
				}
			}
		}

		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}

	return expr
}

func (p *Parser) concatenation() ast.Expression {
	expr := p.term()

	for p.match(token.AMPERSAND) {
		operatorToken := p.previous()
		right := p.term()

		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) term() ast.Expression {
	expr := p.factor()

	for p.match(token.PLUS) || p.match(token.MINUS) {
		operatorToken := p.previous()
		right := p.factor()

		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) factor() ast.Expression {
	expr := p.power()

	for p.match(token.SLASH) || p.match(token.STAR) || p.match(token.PERCENT) {
		operatorToken := p.previous()
		right := p.power()

		if operatorToken.Lexeme == "/" || operatorToken.Lexeme == "%" {
			if lit, ok := right.(*ast.Literal); ok {
				var val float64
				switch v := lit.Value.(type) {
				case float64:
					val = v
				case int:
					val = float64(v)
				}
				if val == 0 {
					msg := "Explicit attempt to divide by zero"
					if operatorToken.Lexeme == "%" {
						msg = "Explicit attempt to modulus by zero"
					}
					p.addError(operatorToken, msg)
				}
			}
		}

		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) power() ast.Expression {
	expr := p.unary()

	for p.match(token.CARET) {
		operatorToken := p.previous()
		right := p.unary()

		expr = &ast.BinaryExpression{
			BaseNode: ast.BaseNode{Type: "BinaryExpression", Start: expr.GetStart(), End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Left:     expr,
			Right:    right,
		}
	}
	return expr
}

func (p *Parser) unary() ast.Expression {
	if p.match(token.SHARE) {
		startToken := p.previous()
		right := p.unary()

		if _, isMagic := right.(*ast.MagicVariable); isMagic {
			p.addError(startToken, "Magic variables cannot be used for shared arguments.")
		}

		inferredType := p.inferType(right, false)
		if inferredType == "number" || inferredType == "string" || inferredType == "bool" {
			p.addError(startToken, "Primitive variables cannot be shared arguments.")
		}

		return &ast.ShareExpression{
			BaseNode: ast.BaseNode{Type: "ShareExpression", Start: startToken.Position, End: right.GetEnd(), Line: startToken.Line},
			Argument: right,
		}
	}

	if p.match(token.NOT) || p.match(token.MINUS) {
		operatorToken := p.previous()
		right := p.unary()

		return &ast.UnaryExpression{
			BaseNode: ast.BaseNode{Type: "UnaryExpression", Start: operatorToken.Position, End: right.GetEnd(), Line: operatorToken.Line},
			Operator: operatorToken.Lexeme,
			Argument: right,
		}
	}

	if p.match(token.INSPECT) {
		operatorToken := p.previous()
		right := p.unary()
		return &ast.InspectExpression{
			BaseNode: ast.BaseNode{Type: "InspectExpression", Start: operatorToken.Position, End: right.GetEnd(), Line: operatorToken.Line},
			Argument: right,
		}
	}

	if p.match(token.PACK) {
		operatorToken := p.previous()
		right := p.unary()
		return &ast.PackExpression{
			BaseNode: ast.BaseNode{Type: "PackExpression", Start: operatorToken.Position, End: right.GetEnd(), Line: operatorToken.Line},
			Argument: right,
		}
	}

	if p.match(token.UNPACK) {
		operatorToken := p.previous()
		right := p.unary()
		return &ast.UnpackExpression{
			BaseNode: ast.BaseNode{Type: "UnpackExpression", Start: operatorToken.Position, End: right.GetEnd(), Line: operatorToken.Line},
			Argument: right,
		}
	}

	if p.match(token.SIZE) {
		operatorToken := p.previous()
		p.consume(token.OF, "Expect 'of' after 'size'.")
		right := p.unary()

		argType := p.inferType(right, false)
		if argType == "number" || argType == "bool" || argType == "null" || argType == "none" || argType == "nullable" {
			p.addError(p.previous(), "Cannot get size of primitive types")
		}

		return &ast.SizeOfExpression{
			BaseNode: ast.BaseNode{Type: "SizeOfExpression", Start: operatorToken.Position, End: right.GetEnd(), Line: operatorToken.Line},
			Argument: right,
		}
	}

	if p.match(token.TYPE) {
		operatorToken := p.previous()
		p.consume(token.OF, "Expect 'of' after 'type'.")
		right := p.unary()
		return &ast.TypeOfExpression{
			BaseNode: ast.BaseNode{Type: "TypeOfExpression", Start: operatorToken.Position, End: right.GetEnd(), Line: operatorToken.Line},
			Argument: right,
		}
	}

	return p.cast()
}

func (p *Parser) cast() ast.Expression {
	expr := p.primary()

	for p.match(token.AS) {
		asToken := p.previous()
		typeInfo, _ := p.parseType("Expect valid type name.", "Expect valid type name.")
		endToken := p.previous()

		fromType := p.inferType(expr, false)
		toType := typeInfo.Name

		var fromGeneric *string = nil
		if varExpr, ok := expr.(*ast.Variable); ok {
			varDef := p.getVariable(varExpr.Name)
			if varDef != nil && varDef.Generic != nil {
				fromGeneric = &varDef.Generic.Name
			}
		}

		checkFrom := fromType
		checkTo := toType

		if fromType == "nullable" && fromGeneric != nil {
			checkFrom = *fromGeneric
		}
		if toType == "nullable" && typeInfo.Generic != nil {
			checkTo = typeInfo.Generic.Name
		}

		if checkFrom != "any" && checkTo != "any" {
			fromName := fromType
			if fromType == "nullable" && fromGeneric != nil {
				fromName = "nullable<" + *fromGeneric + ">"
			}

			if checkFrom == "bool" {
				if checkTo == "list" || checkTo == "map" {
					p.addError(asToken, "Error cannot cast from "+fromName+" to "+checkTo)
				}
			}

			if checkFrom == "number" {
				if checkTo == "list" {
					sub := "unknown"
					if typeInfo.Generic != nil {
						sub = typeInfo.Generic.Name
					}
					p.addError(asToken, "Cannot cast from "+fromName+" to list<"+sub+">")
				} else if checkTo == "map" {
					p.addError(asToken, "Error cannot cast from "+fromName+" to map")
				}
			}

			if checkFrom == "string" && checkTo == "map" {
				p.addError(asToken, "Error cannot cast from "+fromName+" to map")
			}

			if checkFrom == "list" {
				if checkTo == "map" || checkTo == "bool" {
					p.addError(asToken, "Error cannot cast from "+fromName+" to "+checkTo)
				} else if checkTo == "number" {
					if fromGeneric != nil && (*fromGeneric == "bool" || *fromGeneric == "number") {
						p.addError(asToken, "Error cannot cast from list<"+*fromGeneric+"> to number")
					}
				}
			}

			if checkFrom == "map" {
				if checkTo == "bool" || checkTo == "list" || checkTo == "number" || checkTo == "string" {
					p.addError(asToken, "Error cannot cast from "+fromName+" to "+checkTo)
				}
			}
		}

		expr = &ast.CastExpression{
			BaseNode:   ast.BaseNode{Type: "CastExpression", Start: expr.GetStart(), End: endToken.Position + len(endToken.Lexeme), Line: asToken.Line},
			Value:      expr,
			TargetType: *typeInfo,
		}
	}
	return expr
}

func (p *Parser) primary() ast.Expression {
	if p.match(token.FALSE) {
		t := p.previous()
		return &ast.Literal{BaseNode: ast.BaseNode{Type: "Literal", Start: t.Position, End: t.Position + 5, Line: t.Line}, Value: false}
	}
	if p.match(token.TRUE) {
		t := p.previous()
		return &ast.Literal{BaseNode: ast.BaseNode{Type: "Literal", Start: t.Position, End: t.Position + 4, Line: t.Line}, Value: true}
	}
	if p.match(token.TYPE_NULL) {
		t := p.previous()
		return &ast.Literal{BaseNode: ast.BaseNode{Type: "Literal", Start: t.Position, End: t.Position + 4, Line: t.Line}, Value: nil}
	}

	if p.match(token.MAGIC_VAR) {
		t := p.previous()
		return &ast.MagicVariable{
			BaseNode: ast.BaseNode{Type: "MagicVariable", Start: t.Position, End: t.Position + len(t.Lexeme), Line: t.Line},
			Name:     t.Lexeme,
		}
	}

	if p.match(token.NUMBER) {
		t := p.previous()
		var n float64
		fmt.Sscanf(t.Lexeme, "%f", &n)
		return &ast.Literal{
			BaseNode: ast.BaseNode{Type: "Literal", Start: t.Position, End: t.Position + len(t.Lexeme), Line: t.Line},
			Value:    n,
		}
	}

	if p.match(token.STRING) {
		t := p.previous()
		return &ast.Literal{
			BaseNode: ast.BaseNode{Type: "Literal", Start: t.Position, End: t.Position + len(t.Lexeme), Line: t.Line},
			Value:    t.Lexeme,
		}
	}

	if p.match(token.LBRACKET) {
		return p.collectionLiteral()
	}

	if p.match(token.IDENTIFIER) {
		t := p.previous()
		name := t.Lexeme

		symbol := p.getVariable(name)
		if symbol == nil {
			p.addError(t, "Undefined variable.")
		}

		var expr ast.Expression

		if p.match(token.LPAREN) {
			expr = p.finishCall(name, t)
		} else {
			expr = &ast.Variable{
				BaseNode: ast.BaseNode{Type: "Variable", Start: t.Position, End: t.Position + len(name), Line: t.Line},
				Name:     name,
			}
		}

		for p.match(token.LBRACKET) {
			expr = p.finishIndex(expr)
		}

		return expr
	}

	if p.match(token.LPAREN) {
		startToken := p.previous()
		expr := p.parseExpression()
		endToken, _ := p.consume(token.RPAREN, "Expect ')' after expression.")
		return &ast.Grouping{
			BaseNode:   ast.BaseNode{Type: "Grouping", Start: startToken.Position, End: endToken.Position + 1, Line: startToken.Line},
			Expression: expr,
		}
	}

	p.addError(p.peek(), "Expect expression.")
	return &ast.Literal{Value: nil, BaseNode: ast.BaseNode{Type: "Literal"}} // return dummy to avoid panic
}

func (p *Parser) collectionLiteral() ast.Expression {
	startToken := p.previous()

	if p.check(token.RBRACKET) {
		endToken, _ := p.consume(token.RBRACKET, "Compiler error")
		return &ast.ListLiteral{
			BaseNode: ast.BaseNode{Type: "ListLiteral", Start: startToken.Position, End: endToken.Position + 1, Line: startToken.Line},
			Elements: []ast.Expression{},
		}
	}

	firstExpr := p.parseExpression()

	if p.match(token.COLON) {
		entries := []ast.MapEntry{}
		firstValue := p.parseExpression()
		entries = append(entries, ast.MapEntry{Key: firstExpr, Value: firstValue})

		for p.match(token.COMMA) {
			key := p.parseExpression()
			p.consume(token.COLON, "Expect ':' in map entry.")
			value := p.parseExpression()
			entries = append(entries, ast.MapEntry{Key: key, Value: value})
		}

		endToken, _ := p.consume(token.RBRACKET, "Expect ']' after map literal.")
		return &ast.MapLiteral{
			BaseNode: ast.BaseNode{Type: "MapLiteral", Start: startToken.Position, End: endToken.Position + 1, Line: startToken.Line},
			Entries:  entries,
		}
	}

	elements := []ast.Expression{firstExpr}
	for p.match(token.COMMA) {
		elements = append(elements, p.parseExpression())
	}

	endToken, _ := p.consume(token.RBRACKET, "Expect ']' after list literal.")
	return &ast.ListLiteral{
		BaseNode: ast.BaseNode{Type: "ListLiteral", Start: startToken.Position, End: endToken.Position + 1, Line: startToken.Line},
		Elements: elements,
	}
}

func (p *Parser) finishCall(calleeName string, calleeToken token.Token) ast.Expression {
	p.markFunctionUsed(calleeName)

	args := []ast.Expression{}
	if !p.check(token.RPAREN) {
		for {
			args = append(args, p.parseExpression())
			if !p.match(token.COMMA) {
				break
			}
		}
	}

	endToken, _ := p.consume(token.RPAREN, "Expect ')' after arguments.")

	calleeVar := p.getVariable(calleeName)
	if calleeVar != nil && calleeVar.Params != nil {
		if len(args) != len(calleeVar.Params) {
			p.addError(calleeToken, fmt.Sprintf("Function '%s' expects %d arguments but got %d.", calleeName, len(calleeVar.Params), len(args)))
		} else {
			for i, arg := range args {
				param := calleeVar.Params[i]
				_, isShare := arg.(*ast.ShareExpression)

				if param.Shared {
					if !isShare {
						p.addError(calleeToken, "Function expects shared argument.")
					}
				} else {
					if isShare {
						p.addError(calleeToken, "Function does not expect shared argument.")
					}
				}

				typeObj := TypeDef{Type: "Type", Name: param.DataType.Name, Generic: param.DataType.Generic}
				args[i] = p.validateAssignment(typeObj, arg, calleeToken, fmt.Sprintf("Argument '%s' expects type '%s' in call to '%s'.", param.Name, param.DataType.Name, calleeName))
			}
		}
	}

	return &ast.CallExpression{
		BaseNode:  ast.BaseNode{Type: "CallExpression", Start: calleeToken.Position, End: endToken.Position + 1, Line: calleeToken.Line},
		Callee:    calleeName,
		Arguments: args,
	}
}

func (p *Parser) finishIndex(objectExpr ast.Expression) ast.Expression {
	var index ast.Expression = nil
	if !p.check(token.RBRACKET) {
		index = p.parseExpression()
	}

	endToken, _ := p.consume(token.RBRACKET, "Expect ']' after index.")

	return &ast.IndexExpression{
		BaseNode: ast.BaseNode{Type: "IndexExpression", Start: objectExpr.GetStart(), End: endToken.Position + 1, Line: objectExpr.GetLine()},
		Object:   objectExpr,
		Index:    index,
	}
}
