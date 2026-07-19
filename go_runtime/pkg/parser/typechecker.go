package parser

import (
	"fmt"
	"strings"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/token"
)

func (p *Parser) inferType(expr ast.Expression, resolveNullable bool) string {
	if expr == nil {
		return "null"
	}

	switch e := expr.(type) {
	case *ast.ShareExpression:
		return p.inferType(e.Argument, resolveNullable)
	case *ast.MagicVariable:
		mv := p.getVariable("$pipe_value")
		if mv != nil {
			return mv.Name
		}
		return "any"
	case *ast.ListLiteral:
		return "list"
	case *ast.MapLiteral:
		return "map"
	case *ast.StructLiteral:
		return e.StructName
	case *ast.InspectExpression:
		return "InspectionResult"
	case *ast.PackExpression:
		return "string"
	case *ast.UnpackExpression:
		return "list"
	case *ast.SizeOfExpression:
		return "number"
	case *ast.TypeOfExpression:
		return "string"
	case *ast.PipelineExpression:
		return p.inferType(e.Right, resolveNullable)
	case *ast.Literal:
		switch e.Value.(type) {
		case float64, int, int32, int64:
			return "number"
		case string:
			return "string"
		case bool:
			return "bool"
		case nil:
			return "null"
		}
		return "any"
	case *ast.BinaryExpression:
		op := e.Operator
		if op == "==" || op == "!=" || op == "<" || op == ">" || op == "<=" || op == ">=" ||
			op == "and" || op == "or" || op == "xor" || op == "has" {
			return "bool"
		}
		if op == "-" || op == "*" || op == "/" || op == "%" {
			return "number"
		}
		if op == "+" {
			left := p.inferType(e.Left, false)
			right := p.inferType(e.Right, false)
			if left == "string" || right == "string" {
				return "string"
			}
			return "number"
		}
		if op == "&" {
			return "string"
		}
		if op == "search" {
			return "list"
		}
		return "any"
	case *ast.UnaryExpression:
		if e.Operator == "!" || e.Operator == "not" {
			return "bool"
		}
		if e.Operator == "-" {
			return "number"
		}
		return "any"
	case *ast.CallExpression:
		funcType := p.getVariable(e.Callee)
		if funcType != nil {
			return funcType.Name
		}
		return "any"
	case *ast.Variable:
		varType := p.getVariable(e.Name)
		if varType != nil {
			return varType.Name
		}
		return "any"
	case *ast.CastExpression:
		return e.TargetType.Name
	case *ast.IndexExpression:
		// traverse chain of index access
		var root ast.Expression = e
		var chain []ast.Expression
		for {
			idxExpr, ok := root.(*ast.IndexExpression)
			if !ok {
				break
			}
			// unshift
			chain = append([]ast.Expression{idxExpr.Index}, chain...)
			root = idxExpr.Object
		}

		if varRoot, ok := root.(*ast.Variable); ok {
			currentType := p.getVariable(varRoot.Name)
			if currentType == nil {
				return "any"
			}

			// Copy so we don't modify scope entry
			ctype := *currentType
			isResultNullable := false

			for _, keyNode := range chain {
				if ctype.Name == "any" {
					return "any"
				}

				wasNullable := ctype.Name == "nullable"
				if wasNullable {
					isResultNullable = true
				}

				for ctype.Name == "nullable" && ctype.Generic != nil {
					ctype = TypeDef{
						Name:    ctype.Generic.Name,
						Type:    ctype.Generic.Type,
						Generic: ctype.Generic.Generic,
					}
				}

				isNumericIndex := false
				if lit, isLit := keyNode.(*ast.Literal); isLit {
					switch lit.Value.(type) {
					case float64, int:
						isNumericIndex = true
					}
				}
				if varNode, isVar := keyNode.(*ast.Variable); isVar {
					kType := p.inferType(varNode, false)
					if kType == "number" {
						isNumericIndex = true
					}
				}

				if wasNullable {
					if isNumericIndex {
						if ctype.Name != "list" {
							p.addError(token.Token{Line: keyNode.GetLine()}, "Cannot access index on nullable that is not a list.")
							return "any"
						}
					} else {
						if ctype.Name != "map" && ctype.Type != "StructType" {
							p.addError(token.Token{Line: keyNode.GetLine()}, "Cannot access key on nullable that is not a map.")
							return "any"
						}
					}
				}

				if ctype.Generic != nil {
					ctype = TypeDef{
						Name:    ctype.Generic.Name,
						Type:    ctype.Generic.Type,
						Generic: ctype.Generic.Generic,
					}
				} else if ctype.Type == "StructType" {
					def, exists := p.structDefinitions[ctype.Name]
					if !exists {
						return "any"
					}
					if lit, isLit := keyNode.(*ast.Literal); isLit {
						if strVal, isStr := lit.Value.(string); isStr {
							var fieldFound *ast.StructField
							for _, f := range def.Fields {
								if f.Name == strVal {
									fieldFound = &f
									break
								}
							}
							if fieldFound != nil {
								ctype = TypeDef{
									Name:    fieldFound.Type.Name,
									Type:    fieldFound.Type.Type,
									Generic: fieldFound.Type.Generic,
								}
							} else {
								return "any"
							}
						} else {
							return "any"
						}
					} else {
						return "any"
					}
				} else {
					return "any"
				}
			}

			if isResultNullable {
				if resolveNullable {
					return ctype.Name
				}
				return "nullable"
			}
			return ctype.Name
		}
		return "any"
	}
	return "any"
}

func (p *Parser) resolveTypeAnnotation(expr ast.Expression) *ast.TypeAnnotation {
	if expr == nil {
		return nil
	}
	switch e := expr.(type) {
	case *ast.Variable:
		t := p.getVariable(e.Name)
		if t == nil {
			return nil
		}
		return &ast.TypeAnnotation{Type: t.Type, Name: t.Name, Generic: t.Generic}
	case *ast.IndexExpression:
		parentType := p.resolveTypeAnnotation(e.Object)
		if parentType == nil {
			return nil
		}
		// Unwrap nullable
		current := parentType
		for current.Name == "nullable" && current.Generic != nil {
			current = current.Generic
		}
		if current.Name == "map" || current.Name == "list" {
			return current.Generic
		}
		if current.Type == "StructType" {
			def, exists := p.structDefinitions[current.Name]
			if !exists {
				return nil
			}
			if litIdx, ok := e.Index.(*ast.Literal); ok {
				if fieldName, ok := litIdx.Value.(string); ok {
					for _, f := range def.Fields {
						if f.Name == fieldName {
							return &ast.TypeAnnotation{Type: f.Type.Type, Name: f.Type.Name, Generic: f.Type.Generic}
						}
					}
				}
			}
		}
	}
	typeName := p.inferType(expr, false)
	return &ast.TypeAnnotation{Type: "Type", Name: typeName}
}

func (p *Parser) validateAssignment(targetType TypeDef, valueExpr ast.Expression, t token.Token, customMsg ...string) ast.Expression {
	inferredVal := p.inferType(valueExpr, false)
	typeMatch := false
	updatedExpr := valueExpr

	if inferredVal == "any" || targetType.Name == "any" {
		typeMatch = true
	} else if inferredVal == targetType.Name {
		typeMatch = true
	} else if targetType.Type == "StructType" && inferredVal == "map" {
		typeMatch = true
		if mapLit, isMap := valueExpr.(*ast.MapLiteral); isMap {
			updatedExpr = p.validateStructLiteral(mapLit, targetType.Name, t)
		}
	} else if targetType.Name == "nullable" && targetType.Generic != nil {
		if inferredVal == targetType.Generic.Name || inferredVal == "null" || inferredVal == "nullable" {
			typeMatch = true
			if inferredVal == targetType.Generic.Name {
				if mapLit, isMap := valueExpr.(*ast.MapLiteral); isMap {
					updatedExpr = p.validateStructLiteral(mapLit, targetType.Generic.Name, t)
				}
			}
		}
	} else if inferredVal == "nullable" && targetType.Name != "nullable" {
		resolved := p.inferType(valueExpr, true)
		if resolved == targetType.Name {
			typeMatch = true
		}
	}

	if !typeMatch {
		msg := "Variable assignment type mismatch."
		if len(customMsg) > 0 {
			msg = customMsg[0]
		}
		if targetType.Name == "list" && inferredVal == "map" {
			p.addError(t, "List cannot be set using map.")
		} else if targetType.Name == "map" && inferredVal == "list" {
			p.addError(t, "Map cannot be set using list.")
		} else if targetType.Name == "nullable" {
			p.addError(t, "Nullable variable assignment type mismatch.")
		} else {
			p.addError(t, msg)
		}
	}
	return updatedExpr
}

func (p *Parser) validateStructLiteral(literal *ast.MapLiteral, structName string, t token.Token) *ast.StructLiteral {
	def, exists := p.structDefinitions[structName]
	if !exists {
		return &ast.StructLiteral{
			StructName: structName,
			Entries:    literal.Entries,
			BaseNode:   ast.BaseNode{Type: "StructLiteral", Start: literal.GetStart(), End: literal.GetEnd(), Line: literal.Line},
		}
	}

	entries := make([]ast.MapEntry, 0, len(def.Fields))

	for _, field := range def.Fields {
		var entry *ast.MapEntry
		for _, e := range literal.Entries {
			if litKey, ok := e.Key.(*ast.Literal); ok && litKey.Value == field.Name {
				entry = &e
				break
			}
		}

		if entry == nil {
			if strings.HasPrefix(field.Name, "$") {
				p.addError(t, fmt.Sprintf("Missing required struct field: '%s'.", field.Name))
			} else {
				defaultVal, err := p.getDefaultValue(TypeDef{Name: field.Type.Name, Type: field.Type.Type, Generic: field.Type.Generic}, []string{structName})
				if err != nil {
					p.addError(t, err.Error())
				} else {
					entries = append(entries, ast.MapEntry{
						Key: &ast.Literal{
							Value:    field.Name,
							BaseNode: ast.BaseNode{Type: "Literal", Start: -1, End: -1, Line: -1},
						},
						Value: defaultVal,
					})
				}
			}
		} else {
			valType := p.inferType(entry.Value, false)
			typeMatch := false
			updatedVal := entry.Value

			if valType == "any" || field.Type.Name == "any" || valType == field.Type.Name {
				typeMatch = true
			} else if field.Type.Type == "StructType" && valType == "map" {
				typeMatch = true
				if mapLit, isMap := entry.Value.(*ast.MapLiteral); isMap {
					updatedVal = p.validateStructLiteral(mapLit, field.Type.Name, t)
				}
			} else if field.Type.Name == "nullable" && field.Type.Generic != nil {
				if valType == field.Type.Generic.Name || valType == "null" {
					typeMatch = true
					if valType == field.Type.Generic.Name {
						if mapLit, isMap := entry.Value.(*ast.MapLiteral); isMap {
							updatedVal = p.validateStructLiteral(mapLit, field.Type.Generic.Name, t)
						}
					}
				}
			}

			if !typeMatch {
				p.addError(t, "Struct value type mismatch.")
			}

			entries = append(entries, ast.MapEntry{
				Key:   entry.Key,
				Value: updatedVal,
			})
		}
	}

	for _, entry := range literal.Entries {
		if litKey, ok := entry.Key.(*ast.Literal); ok {
			keyStr, isStr := litKey.Value.(string)
			if isStr {
				found := false
				for _, f := range def.Fields {
					if f.Name == keyStr {
						found = true
						break
					}
				}
				if !found {
					p.addError(t, fmt.Sprintf("Unknown field in struct initialization: '%s'.", keyStr))
				}
			}
		}
	}

	return &ast.StructLiteral{
		StructName: structName,
		Entries:    entries,
		BaseNode:   ast.BaseNode{Type: "StructLiteral", Start: literal.GetStart(), End: literal.GetEnd(), Line: literal.Line},
	}
}

func (p *Parser) getDefaultValue(typeInfo TypeDef, path []string) (ast.Expression, error) {
	switch typeInfo.Name {
	case "number":
		return &ast.Literal{Value: 0.0, BaseNode: ast.BaseNode{Type: "Literal", Start: -1, End: -1, Line: -1}}, nil
	case "string":
		return &ast.Literal{Value: "", BaseNode: ast.BaseNode{Type: "Literal", Start: -1, End: -1, Line: -1}}, nil
	case "bool":
		return &ast.Literal{Value: false, BaseNode: ast.BaseNode{Type: "Literal", Start: -1, End: -1, Line: -1}}, nil
	case "list":
		return &ast.ListLiteral{Elements: []ast.Expression{}, BaseNode: ast.BaseNode{Type: "ListLiteral", Start: -1, End: -1, Line: -1}}, nil
	case "map":
		return &ast.MapLiteral{Entries: []ast.MapEntry{}, BaseNode: ast.BaseNode{Type: "MapLiteral", Start: -1, End: -1, Line: -1}}, nil
	case "null", "none", "nullable":
		return &ast.Literal{Value: nil, BaseNode: ast.BaseNode{Type: "Literal", Start: -1, End: -1, Line: -1}}, nil
	default:
		if typeInfo.Type == "StructType" {
			for i, prev := range path {
				if prev == typeInfo.Name {
					// Cycle detected
					if i == len(path)-1 {
						return nil, fmt.Errorf("Recursive struct definition detected for '%s'. Use 'nullable<%s>' or 'list<%s>' to break the cycle.", typeInfo.Name, typeInfo.Name, typeInfo.Name)
					}
					cycle := ""
					for _, p := range path[i:] {
						cycle += p + " -> "
					}
					cycle += typeInfo.Name
					return nil, fmt.Errorf("Circular struct definition detected: %s. Use 'nullable' or 'list' generics to break the cycle.", cycle)
				}
			}

			def, exists := p.structDefinitions[typeInfo.Name]
			if exists {
				newPath := append([]string{}, path...)
				newPath = append(newPath, typeInfo.Name)

				for _, f := range def.Fields {
					if strings.HasPrefix(f.Name, "$") {
						return nil, fmt.Errorf("Cannot zero-initialize struct '%s' because required field '%s' is missing.", typeInfo.Name, f.Name)
					}
				}

				entries := []ast.MapEntry{}
				for _, f := range def.Fields {
					val, err := p.getDefaultValue(TypeDef{Name: f.Type.Name, Type: f.Type.Type, Generic: f.Type.Generic}, newPath)
					if err != nil {
						return nil, err
					}
					entries = append(entries, ast.MapEntry{
						Key:   &ast.Literal{Value: f.Name, BaseNode: ast.BaseNode{Type: "Literal"}},
						Value: val,
					})
				}
				return &ast.StructLiteral{StructName: typeInfo.Name, Entries: entries, BaseNode: ast.BaseNode{Type: "StructLiteral", Start: -1, End: -1, Line: -1}}, nil
			}
		}
		return &ast.Literal{Value: nil, BaseNode: ast.BaseNode{Type: "Literal", Start: -1, End: -1, Line: -1}}, nil
	}
}
