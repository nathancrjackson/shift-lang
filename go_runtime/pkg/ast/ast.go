package ast

type Node interface {
	NodeType() string
	GetStart() int
	GetEnd() int
	GetLine() int
}

type Statement interface {
	Node
	stmtNode()
}

type Expression interface {
	Node
	exprNode()
}

type BaseNode struct {
	Type  string `json:"type"`
	Start int    `json:"start"`
	End   int    `json:"end"`
	Line  int    `json:"line"`
}

func (b *BaseNode) NodeType() string { return b.Type }
func (b *BaseNode) GetStart() int    { return b.Start }
func (b *BaseNode) GetEnd() int      { return b.End }
func (b *BaseNode) GetLine() int     { return b.Line }

// Structural
type Program struct {
	BaseNode
	Structs   []StructDeclaration   `json:"structs"`
	Functions []FunctionDeclaration `json:"functions"`
}

type TypeAnnotation struct {
	Type    string          `json:"type"`
	Name    string          `json:"name"`
	Generic *TypeAnnotation `json:"generic,omitempty"`
}

type StructField struct {
	Name string         `json:"name"`
	Type TypeAnnotation `json:"type"`
}

type StructDeclaration struct {
	BaseNode
	Name   string        `json:"name"`
	Fields []StructField `json:"fields"`
}

type Parameter struct {
	Type     string         `json:"type"` // always "Parameter"
	Name     string         `json:"name"`
	DataType TypeAnnotation `json:"dataType"`
}

type FunctionDeclaration struct {
	BaseNode
	Name       string         `json:"name"`
	Params     []Parameter    `json:"params"`
	ReturnType TypeAnnotation `json:"returnType"`
	Body       *Block         `json:"body"`
}

type Block struct {
	BaseNode
	Statements []Statement `json:"statements"`
}

// Statements
type VariableDeclaration struct {
	BaseNode
	Name        string         `json:"name"`
	VarType     TypeAnnotation `json:"varType"`
	Initializer Expression     `json:"initializer,omitempty"` // null if none
}

type ExpressionStatement struct {
	BaseNode
	Expression Expression `json:"expression"`
}

type IfStatement struct {
	BaseNode
	Condition  Expression `json:"condition"`
	ThenBranch *Block     `json:"thenBranch"`
	ElseBranch Statement  `json:"elseBranch,omitempty"` // Block or IfStatement
}

type WhileStatement struct {
	BaseNode
	Condition Expression `json:"condition"`
	Body      *Block     `json:"body"`
}

type ForRangeStatement struct {
	BaseNode
	Iterator   string     `json:"iterator"`
	StartValue Expression `json:"startValue"`
	EndValue   Expression `json:"endValue"`
	Body       *Block     `json:"body"`
}

type ForInStatement struct {
	BaseNode
	Iterator      string     `json:"iterator"`
	ValueIterator string     `json:"valueIterator,omitempty"`
	Collection    Expression `json:"collection"`
	Body          *Block     `json:"body"`
}

type ReturnStatement struct {
	BaseNode
	Value Expression `json:"value,omitempty"`
}

type ThrowStatement struct {
	BaseNode
	Severity string     `json:"severity"`
	Argument Expression `json:"argument"`
}

type TryStatement struct {
	BaseNode
	TryBlock        *Block `json:"tryBlock"`
	CatchIdentifier string `json:"catchIdentifier"`
	CatchBlock      *Block `json:"catchBlock"`
	ReviewBlock     *Block `json:"reviewBlock,omitempty"`
}

type BreakStatement struct {
	BaseNode
}

type SkipStatement struct {
	BaseNode
}

type DeleteStatement struct {
	BaseNode
	Target *IndexExpression `json:"target"`
}

// Expressions
type Assignment struct {
	BaseNode
	Name  string     `json:"name"`
	Value Expression `json:"value"`
}

type IndexAssignment struct {
	BaseNode
	Object Expression `json:"object"`
	Index  Expression `json:"index,omitempty"`
	Value  Expression `json:"value"`
}

type BinaryExpression struct {
	BaseNode
	Operator string     `json:"operator"`
	Left     Expression `json:"left"`
	Right    Expression `json:"right"`
}

type UnaryExpression struct {
	BaseNode
	Operator string     `json:"operator"`
	Argument Expression `json:"argument"`
}

type PipelineExpression struct {
	BaseNode
	Left  Expression `json:"left"`
	Right Expression `json:"right"`
}

type CallExpression struct {
	BaseNode
	Callee    string       `json:"callee"`
	Arguments []Expression `json:"arguments"`
}

type IndexExpression struct {
	BaseNode
	Object Expression `json:"object"`
	Index  Expression `json:"index"`
}

type CastExpression struct {
	BaseNode
	Value      Expression     `json:"value"`
	TargetType TypeAnnotation `json:"targetType"`
}

type InspectExpression struct {
	BaseNode
	Argument Expression `json:"argument"`
}

type PackExpression struct {
	BaseNode
	Argument Expression `json:"argument"`
}

type UnpackExpression struct {
	BaseNode
	Argument Expression `json:"argument"`
}

type SizeOfExpression struct {
	BaseNode
	Argument Expression `json:"argument"`
}

type TypeOfExpression struct {
	BaseNode
	Argument Expression `json:"argument"`
}

type IsExpression struct {
	BaseNode
	Left  Expression `json:"left"`
	Check string     `json:"check"`
	IsNot bool       `json:"isNot"`
}

type ReplaceExpression struct {
	BaseNode
	Source      Expression `json:"source"`
	Pattern     Expression `json:"pattern"`
	Replacement Expression `json:"replacement"`
}

type SplitExpression struct {
	BaseNode
	Source    Expression `json:"source"`
	Delimiter Expression `json:"delimiter"`
}

type JoinExpression struct {
	BaseNode
	Source    Expression `json:"source"`
	Delimiter Expression `json:"delimiter"`
}

type Literal struct {
	BaseNode
	Value any `json:"value"`
}

type Variable struct {
	BaseNode
	Name string `json:"name"`
}

type MagicVariable struct {
	BaseNode
	Name string `json:"name"`
}

type ListLiteral struct {
	BaseNode
	Elements []Expression `json:"elements"`
}

type MapEntry struct {
	Key   Expression `json:"key"`
	Value Expression `json:"value"`
}

type MapLiteral struct {
	BaseNode
	Entries []MapEntry `json:"entries"`
}

type Grouping struct {
	BaseNode
	Expression Expression `json:"expression"`
}

// Marker methods for statements
func (*Block) stmtNode()               {}
func (*VariableDeclaration) stmtNode() {}
func (*ExpressionStatement) stmtNode() {}
func (*IfStatement) stmtNode()         {}
func (*WhileStatement) stmtNode()      {}
func (*ForRangeStatement) stmtNode()   {}
func (*ForInStatement) stmtNode()      {}
func (*ReturnStatement) stmtNode()     {}
func (*ThrowStatement) stmtNode()      {}
func (*TryStatement) stmtNode()        {}
func (*BreakStatement) stmtNode()      {}
func (*SkipStatement) stmtNode()       {}
func (*DeleteStatement) stmtNode()     {}

// Marker methods for expressions
func (*Assignment) exprNode()         {}
func (*IndexAssignment) exprNode()    {}
func (*BinaryExpression) exprNode()   {}
func (*UnaryExpression) exprNode()    {}
func (*PipelineExpression) exprNode() {}
func (*CallExpression) exprNode()     {}
func (*IndexExpression) exprNode()    {}
func (*CastExpression) exprNode()     {}
func (*InspectExpression) exprNode()  {}
func (*PackExpression) exprNode()     {}
func (*UnpackExpression) exprNode()   {}
func (*SizeOfExpression) exprNode()   {}
func (*TypeOfExpression) exprNode()   {}
func (*IsExpression) exprNode()       {}
func (*ReplaceExpression) exprNode()  {}
func (*SplitExpression) exprNode()    {}
func (*JoinExpression) exprNode()     {}
func (*Literal) exprNode()            {}
func (*Variable) exprNode()           {}
func (*MagicVariable) exprNode()      {}
func (*ListLiteral) exprNode()        {}
func (*MapLiteral) exprNode()         {}
func (*Grouping) exprNode()           {}
