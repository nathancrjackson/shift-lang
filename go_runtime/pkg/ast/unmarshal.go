package ast

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// StatementWrapper wraps a Statement interface for custom JSON unmarshaling.
type StatementWrapper struct {
	Statement Statement
}

// UnmarshalJSON implements json.Unmarshaler for StatementWrapper.
func (sw *StatementWrapper) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		sw.Statement = nil
		return nil
	}

	var typeHelper struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeHelper); err != nil {
		return err
	}

	var stmt Statement
	switch typeHelper.Type {
	case "Block":
		var b Block
		if err := json.Unmarshal(data, &b); err != nil {
			return err
		}
		stmt = &b
	case "VariableDeclaration":
		var v VariableDeclaration
		if err := json.Unmarshal(data, &v); err != nil {
			return err
		}
		stmt = &v
	case "ExpressionStatement":
		var e ExpressionStatement
		if err := json.Unmarshal(data, &e); err != nil {
			return err
		}
		stmt = &e
	case "IfStatement":
		var i IfStatement
		if err := json.Unmarshal(data, &i); err != nil {
			return err
		}
		stmt = &i
	case "WhileStatement":
		var w WhileStatement
		if err := json.Unmarshal(data, &w); err != nil {
			return err
		}
		stmt = &w
	case "ForRangeStatement":
		var f ForRangeStatement
		if err := json.Unmarshal(data, &f); err != nil {
			return err
		}
		stmt = &f
	case "ForInStatement":
		var f ForInStatement
		if err := json.Unmarshal(data, &f); err != nil {
			return err
		}
		stmt = &f
	case "ReturnStatement":
		var r ReturnStatement
		if err := json.Unmarshal(data, &r); err != nil {
			return err
		}
		stmt = &r
	case "ThrowStatement":
		var t ThrowStatement
		if err := json.Unmarshal(data, &t); err != nil {
			return err
		}
		stmt = &t
	case "TryStatement":
		var t TryStatement
		if err := json.Unmarshal(data, &t); err != nil {
			return err
		}
		stmt = &t
	case "BreakStatement":
		var b BreakStatement
		if err := json.Unmarshal(data, &b); err != nil {
			return err
		}
		stmt = &b
	case "SkipStatement":
		var s SkipStatement
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		stmt = &s
	case "DeleteStatement":
		var d DeleteStatement
		if err := json.Unmarshal(data, &d); err != nil {
			return err
		}
		stmt = &d
	default:
		return fmt.Errorf("unknown statement type: %s", typeHelper.Type)
	}

	sw.Statement = stmt
	return nil
}

// ExpressionWrapper wraps an Expression interface for custom JSON unmarshaling.
type ExpressionWrapper struct {
	Expression Expression
}

// UnmarshalJSON implements json.Unmarshaler for ExpressionWrapper.
func (ew *ExpressionWrapper) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		ew.Expression = nil
		return nil
	}

	var typeHelper struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeHelper); err != nil {
		return err
	}

	var expr Expression
	switch typeHelper.Type {
	case "Assignment":
		var a Assignment
		if err := json.Unmarshal(data, &a); err != nil {
			return err
		}
		expr = &a
	case "IndexAssignment":
		var i IndexAssignment
		if err := json.Unmarshal(data, &i); err != nil {
			return err
		}
		expr = &i
	case "BinaryExpression":
		var b BinaryExpression
		if err := json.Unmarshal(data, &b); err != nil {
			return err
		}
		expr = &b
	case "UnaryExpression":
		var u UnaryExpression
		if err := json.Unmarshal(data, &u); err != nil {
			return err
		}
		expr = &u
	case "PipelineExpression":
		var p PipelineExpression
		if err := json.Unmarshal(data, &p); err != nil {
			return err
		}
		expr = &p
	case "CallExpression":
		var c CallExpression
		if err := json.Unmarshal(data, &c); err != nil {
			return err
		}
		expr = &c
	case "IndexExpression":
		var i IndexExpression
		if err := json.Unmarshal(data, &i); err != nil {
			return err
		}
		expr = &i
	case "CastExpression":
		var c CastExpression
		if err := json.Unmarshal(data, &c); err != nil {
			return err
		}
		expr = &c
	case "InspectExpression":
		var i InspectExpression
		if err := json.Unmarshal(data, &i); err != nil {
			return err
		}
		expr = &i
	case "PackExpression":
		var p PackExpression
		if err := json.Unmarshal(data, &p); err != nil {
			return err
		}
		expr = &p
	case "UnpackExpression":
		var u UnpackExpression
		if err := json.Unmarshal(data, &u); err != nil {
			return err
		}
		expr = &u
	case "SizeOfExpression":
		var s SizeOfExpression
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		expr = &s
	case "TypeOfExpression":
		var t TypeOfExpression
		if err := json.Unmarshal(data, &t); err != nil {
			return err
		}
		expr = &t
	case "IsExpression":
		var i IsExpression
		if err := json.Unmarshal(data, &i); err != nil {
			return err
		}
		expr = &i
	case "ReplaceExpression":
		var r ReplaceExpression
		if err := json.Unmarshal(data, &r); err != nil {
			return err
		}
		expr = &r
	case "SplitExpression":
		var s SplitExpression
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		expr = &s
	case "JoinExpression":
		var j JoinExpression
		if err := json.Unmarshal(data, &j); err != nil {
			return err
		}
		expr = &j
	case "Literal":
		var l Literal
		if err := json.Unmarshal(data, &l); err != nil {
			return err
		}
		expr = &l
	case "Variable":
		var v Variable
		if err := json.Unmarshal(data, &v); err != nil {
			return err
		}
		expr = &v
	case "MagicVariable":
		var m MagicVariable
		if err := json.Unmarshal(data, &m); err != nil {
			return err
		}
		expr = &m
	case "ListLiteral":
		var l ListLiteral
		if err := json.Unmarshal(data, &l); err != nil {
			return err
		}
		expr = &l
	case "MapLiteral":
		var m MapLiteral
		if err := json.Unmarshal(data, &m); err != nil {
			return err
		}
		expr = &m
	case "Grouping":
		var g Grouping
		if err := json.Unmarshal(data, &g); err != nil {
			return err
		}
		expr = &g
	default:
		return fmt.Errorf("unknown expression type: %s", typeHelper.Type)
	}

	ew.Expression = expr
	return nil
}

// Custom UnmarshalJSON implementations for AST nodes containing interfaces.

func (n *Block) UnmarshalJSON(data []byte) error {
	type Alias Block
	var aux struct {
		Statements []StatementWrapper `json:"statements"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Statements = make([]Statement, len(aux.Statements))
	for i, w := range aux.Statements {
		n.Statements[i] = w.Statement
	}
	return nil
}

func (n *VariableDeclaration) UnmarshalJSON(data []byte) error {
	type Alias VariableDeclaration
	var aux struct {
		Initializer ExpressionWrapper `json:"initializer"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Initializer = aux.Initializer.Expression
	return nil
}

func (n *ExpressionStatement) UnmarshalJSON(data []byte) error {
	type Alias ExpressionStatement
	var aux struct {
		Expression ExpressionWrapper `json:"expression"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Expression = aux.Expression.Expression
	return nil
}

func (n *IfStatement) UnmarshalJSON(data []byte) error {
	type Alias IfStatement
	var aux struct {
		Condition  ExpressionWrapper `json:"condition"`
		ElseBranch StatementWrapper  `json:"elseBranch"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Condition = aux.Condition.Expression
	n.ElseBranch = aux.ElseBranch.Statement
	return nil
}

func (n *WhileStatement) UnmarshalJSON(data []byte) error {
	type Alias WhileStatement
	var aux struct {
		Condition ExpressionWrapper `json:"condition"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Condition = aux.Condition.Expression
	return nil
}

func (n *ForRangeStatement) UnmarshalJSON(data []byte) error {
	type Alias ForRangeStatement
	var aux struct {
		StartValue ExpressionWrapper `json:"startValue"`
		EndValue   ExpressionWrapper `json:"endValue"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.StartValue = aux.StartValue.Expression
	n.EndValue = aux.EndValue.Expression
	return nil
}

func (n *ForInStatement) UnmarshalJSON(data []byte) error {
	type Alias ForInStatement
	var aux struct {
		Collection ExpressionWrapper `json:"collection"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Collection = aux.Collection.Expression
	return nil
}

func (n *ReturnStatement) UnmarshalJSON(data []byte) error {
	type Alias ReturnStatement
	var aux struct {
		Value ExpressionWrapper `json:"value"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Value = aux.Value.Expression
	return nil
}

func (n *ThrowStatement) UnmarshalJSON(data []byte) error {
	type Alias ThrowStatement
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *Assignment) UnmarshalJSON(data []byte) error {
	type Alias Assignment
	var aux struct {
		Value ExpressionWrapper `json:"value"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Value = aux.Value.Expression
	return nil
}

func (n *IndexAssignment) UnmarshalJSON(data []byte) error {
	type Alias IndexAssignment
	var aux struct {
		Object ExpressionWrapper `json:"object"`
		Index  ExpressionWrapper `json:"index"`
		Value  ExpressionWrapper `json:"value"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Object = aux.Object.Expression
	n.Index = aux.Index.Expression
	n.Value = aux.Value.Expression
	return nil
}

func (n *BinaryExpression) UnmarshalJSON(data []byte) error {
	type Alias BinaryExpression
	var aux struct {
		Left  ExpressionWrapper `json:"left"`
		Right ExpressionWrapper `json:"right"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Left = aux.Left.Expression
	n.Right = aux.Right.Expression
	return nil
}

func (n *UnaryExpression) UnmarshalJSON(data []byte) error {
	type Alias UnaryExpression
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *PipelineExpression) UnmarshalJSON(data []byte) error {
	type Alias PipelineExpression
	var aux struct {
		Left  ExpressionWrapper `json:"left"`
		Right ExpressionWrapper `json:"right"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Left = aux.Left.Expression
	n.Right = aux.Right.Expression
	return nil
}

func (n *CallExpression) UnmarshalJSON(data []byte) error {
	type Alias CallExpression
	var aux struct {
		Arguments []ExpressionWrapper `json:"arguments"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Arguments = make([]Expression, len(aux.Arguments))
	for i, w := range aux.Arguments {
		n.Arguments[i] = w.Expression
	}
	return nil
}

func (n *IndexExpression) UnmarshalJSON(data []byte) error {
	type Alias IndexExpression
	var aux struct {
		Object ExpressionWrapper `json:"object"`
		Index  ExpressionWrapper `json:"index"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Object = aux.Object.Expression
	n.Index = aux.Index.Expression
	return nil
}

func (n *CastExpression) UnmarshalJSON(data []byte) error {
	type Alias CastExpression
	var aux struct {
		Value ExpressionWrapper `json:"value"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Value = aux.Value.Expression
	return nil
}

func (n *InspectExpression) UnmarshalJSON(data []byte) error {
	type Alias InspectExpression
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *PackExpression) UnmarshalJSON(data []byte) error {
	type Alias PackExpression
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *UnpackExpression) UnmarshalJSON(data []byte) error {
	type Alias UnpackExpression
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *SizeOfExpression) UnmarshalJSON(data []byte) error {
	type Alias SizeOfExpression
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *TypeOfExpression) UnmarshalJSON(data []byte) error {
	type Alias TypeOfExpression
	var aux struct {
		Argument ExpressionWrapper `json:"argument"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Argument = aux.Argument.Expression
	return nil
}

func (n *IsExpression) UnmarshalJSON(data []byte) error {
	type Alias IsExpression
	var aux struct {
		Left ExpressionWrapper `json:"left"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Left = aux.Left.Expression
	return nil
}

func (n *ReplaceExpression) UnmarshalJSON(data []byte) error {
	type Alias ReplaceExpression
	var aux struct {
		Source      ExpressionWrapper `json:"source"`
		Pattern     ExpressionWrapper `json:"pattern"`
		Replacement ExpressionWrapper `json:"replacement"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Source = aux.Source.Expression
	n.Pattern = aux.Pattern.Expression
	n.Replacement = aux.Replacement.Expression
	return nil
}

func (n *SplitExpression) UnmarshalJSON(data []byte) error {
	type Alias SplitExpression
	var aux struct {
		Source    ExpressionWrapper `json:"source"`
		Delimiter ExpressionWrapper `json:"delimiter"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Source = aux.Source.Expression
	n.Delimiter = aux.Delimiter.Expression
	return nil
}

func (n *JoinExpression) UnmarshalJSON(data []byte) error {
	type Alias JoinExpression
	var aux struct {
		Source    ExpressionWrapper `json:"source"`
		Delimiter ExpressionWrapper `json:"delimiter"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Source = aux.Source.Expression
	n.Delimiter = aux.Delimiter.Expression
	return nil
}

func (n *ListLiteral) UnmarshalJSON(data []byte) error {
	type Alias ListLiteral
	var aux struct {
		Elements []ExpressionWrapper `json:"elements"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Elements = make([]Expression, len(aux.Elements))
	for i, w := range aux.Elements {
		n.Elements[i] = w.Expression
	}
	return nil
}

func (n *MapEntry) UnmarshalJSON(data []byte) error {
	type Alias MapEntry
	var aux struct {
		Key   ExpressionWrapper `json:"key"`
		Value ExpressionWrapper `json:"value"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Key = aux.Key.Expression
	n.Value = aux.Value.Expression
	return nil
}

func (n *Grouping) UnmarshalJSON(data []byte) error {
	type Alias Grouping
	var aux struct {
		Expression ExpressionWrapper `json:"expression"`
		*Alias
	}
	aux.Alias = (*Alias)(n)
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	n.Expression = aux.Expression.Expression
	return nil
}
