package ast

import "fmt"

func ValidateAST(prog *Program) error {
	if prog == nil {
		return fmt.Errorf("AST Validation Error: Program cannot be nil")
	}

	// 1. Recursive structural validation
	if err := validateNode(prog); err != nil {
		return err
	}

	// 2. Struct recursion validation
	for _, s := range prog.Structs {
		if err := validateStructRecursion(s, prog, []string{s.Name}); err != nil {
			return err
		}
	}
	return nil
}

func validateNode(node Node) error {
	if node == nil {
		return nil
	}

	switch n := node.(type) {
	case *Program:
		for _, s := range n.Structs {
			if err := validateNode(&s); err != nil {
				return err
			}
		}
		for _, f := range n.Functions {
			if err := validateNode(&f); err != nil {
				return err
			}
		}

	case *StructDeclaration:
		if n.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: StructDeclaration missing Name", n.Line)
		}
		for _, f := range n.Fields {
			if f.Name == "" {
				return fmt.Errorf("AST Validation Error at line %d: StructField missing Name", n.Line)
			}
			if f.Type.Name == "" {
				return fmt.Errorf("AST Validation Error at line %d: StructField '%s' missing Type Name", n.Line, f.Name)
			}
		}

	case *FunctionDeclaration:
		if n.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: FunctionDeclaration missing Name", n.Line)
		}
		if n.ReturnType.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: FunctionDeclaration '%s' missing ReturnType Name", n.Line, n.Name)
		}
		for _, p := range n.Params {
			if p.Name == "" {
				return fmt.Errorf("AST Validation Error at line %d: Parameter missing Name in function '%s'", n.Line, n.Name)
			}
			if p.DataType.Name == "" {
				return fmt.Errorf("AST Validation Error at line %d: Parameter '%s' missing Type Name in function '%s'", n.Line, p.Name, n.Name)
			}
		}
		if n.Body == nil {
			return fmt.Errorf("AST Validation Error at line %d: FunctionDeclaration '%s' has nil Body", n.Line, n.Name)
		}
		if err := validateNode(n.Body); err != nil {
			return err
		}

	case *Block:
		for _, s := range n.Statements {
			if s == nil {
				return fmt.Errorf("AST Validation Error at line %d: Block contains nil Statement", n.Line)
			}
			if err := validateNode(s); err != nil {
				return err
			}
		}

	case *VariableDeclaration:
		if n.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: VariableDeclaration missing Name", n.Line)
		}
		if n.VarType.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: VariableDeclaration '%s' missing VarType Name", n.Line, n.Name)
		}
		if n.Initializer != nil {
			if err := validateNode(n.Initializer); err != nil {
				return err
			}
		}

	case *ExpressionStatement:
		if n.Expression == nil {
			return fmt.Errorf("AST Validation Error at line %d: ExpressionStatement has nil Expression", n.Line)
		}
		if err := validateNode(n.Expression); err != nil {
			return err
		}

	case *IfStatement:
		if n.Condition == nil {
			return fmt.Errorf("AST Validation Error at line %d: IfStatement has nil Condition", n.Line)
		}
		if n.ThenBranch == nil {
			return fmt.Errorf("AST Validation Error at line %d: IfStatement has nil ThenBranch", n.Line)
		}
		if err := validateNode(n.Condition); err != nil {
			return err
		}
		if err := validateNode(n.ThenBranch); err != nil {
			return err
		}
		if n.ElseBranch != nil {
			if err := validateNode(n.ElseBranch); err != nil {
				return err
			}
		}

	case *WhileStatement:
		if n.Condition == nil {
			return fmt.Errorf("AST Validation Error at line %d: WhileStatement has nil Condition", n.Line)
		}
		if n.Body == nil {
			return fmt.Errorf("AST Validation Error at line %d: WhileStatement has nil Body", n.Line)
		}
		if err := validateNode(n.Condition); err != nil {
			return err
		}
		if err := validateNode(n.Body); err != nil {
			return err
		}

	case *ForRangeStatement:
		if n.Iterator == "" {
			return fmt.Errorf("AST Validation Error at line %d: ForRangeStatement missing Iterator", n.Line)
		}
		if n.StartValue == nil {
			return fmt.Errorf("AST Validation Error at line %d: ForRangeStatement has nil StartValue", n.Line)
		}
		if n.EndValue == nil {
			return fmt.Errorf("AST Validation Error at line %d: ForRangeStatement has nil EndValue", n.Line)
		}
		if n.Body == nil {
			return fmt.Errorf("AST Validation Error at line %d: ForRangeStatement has nil Body", n.Line)
		}
		if err := validateNode(n.StartValue); err != nil {
			return err
		}
		if err := validateNode(n.EndValue); err != nil {
			return err
		}
		if err := validateNode(n.Body); err != nil {
			return err
		}

	case *ForInStatement:
		if n.Iterator == "" {
			return fmt.Errorf("AST Validation Error at line %d: ForInStatement missing Iterator", n.Line)
		}
		if n.Collection == nil {
			return fmt.Errorf("AST Validation Error at line %d: ForInStatement has nil Collection", n.Line)
		}
		if n.Body == nil {
			return fmt.Errorf("AST Validation Error at line %d: ForInStatement has nil Body", n.Line)
		}
		if err := validateNode(n.Collection); err != nil {
			return err
		}
		if err := validateNode(n.Body); err != nil {
			return err
		}

	case *ReturnStatement:
		if n.Value != nil {
			if err := validateNode(n.Value); err != nil {
				return err
			}
		}

	case *ThrowStatement:
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: ThrowStatement has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *TryStatement:
		if n.TryBlock == nil {
			return fmt.Errorf("AST Validation Error at line %d: TryStatement has nil TryBlock", n.Line)
		}
		if n.CatchBlock == nil && n.ReviewBlock == nil {
			return fmt.Errorf("AST Validation Error at line %d: TryStatement must have at least a CatchBlock or ReviewBlock", n.Line)
		}
		if n.CatchBlock != nil {
			if n.CatchIdentifier == "" {
				return fmt.Errorf("AST Validation Error at line %d: TryStatement with catch block missing CatchIdentifier", n.Line)
			}
			if err := validateNode(n.CatchBlock); err != nil {
				return err
			}
		}
		if err := validateNode(n.TryBlock); err != nil {
			return err
		}
		if n.ReviewBlock != nil {
			if err := validateNode(n.ReviewBlock); err != nil {
				return err
			}
		}

	case *BreakStatement, *SkipStatement:
		// No child fields to validate

	case *DeleteStatement:
		if n.Target == nil {
			return fmt.Errorf("AST Validation Error at line %d: DeleteStatement has nil Target", n.Line)
		}
		if err := validateNode(n.Target); err != nil {
			return err
		}

	case *Literal:
		// n.Value can be nil (literal null)

	case *Variable:
		if n.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: Variable missing Name", n.Line)
		}

	case *MagicVariable:
		if n.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: MagicVariable missing Name", n.Line)
		}

	case *Assignment:
		if n.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: Assignment missing Name", n.Line)
		}
		if n.Value == nil {
			return fmt.Errorf("AST Validation Error at line %d: Assignment '%s' has nil Value", n.Line, n.Name)
		}
		if err := validateNode(n.Value); err != nil {
			return err
		}

	case *IndexAssignment:
		if n.Object == nil {
			return fmt.Errorf("AST Validation Error at line %d: IndexAssignment has nil Object", n.Line)
		}
		if n.Value == nil {
			return fmt.Errorf("AST Validation Error at line %d: IndexAssignment has nil Value", n.Line)
		}
		if err := validateNode(n.Object); err != nil {
			return err
		}
		if n.Index != nil {
			if err := validateNode(n.Index); err != nil {
				return err
			}
		}
		if err := validateNode(n.Value); err != nil {
			return err
		}

	case *BinaryExpression:
		if n.Operator == "" {
			return fmt.Errorf("AST Validation Error at line %d: BinaryExpression missing Operator", n.Line)
		}
		if n.Left == nil {
			return fmt.Errorf("AST Validation Error at line %d: BinaryExpression has nil Left", n.Line)
		}
		if n.Right == nil {
			return fmt.Errorf("AST Validation Error at line %d: BinaryExpression has nil Right", n.Line)
		}
		if err := validateNode(n.Left); err != nil {
			return err
		}
		if err := validateNode(n.Right); err != nil {
			return err
		}

	case *UnaryExpression:
		if n.Operator == "" {
			return fmt.Errorf("AST Validation Error at line %d: UnaryExpression missing Operator", n.Line)
		}
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: UnaryExpression has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *PipelineExpression:
		if n.Left == nil {
			return fmt.Errorf("AST Validation Error at line %d: PipelineExpression has nil Left", n.Line)
		}
		if n.Right == nil {
			return fmt.Errorf("AST Validation Error at line %d: PipelineExpression has nil Right", n.Line)
		}
		if err := validateNode(n.Left); err != nil {
			return err
		}
		if err := validateNode(n.Right); err != nil {
			return err
		}

	case *CallExpression:
		if n.Callee == "" {
			return fmt.Errorf("AST Validation Error at line %d: CallExpression missing Callee", n.Line)
		}
		for _, arg := range n.Arguments {
			if arg == nil {
				return fmt.Errorf("AST Validation Error at line %d: CallExpression '%s' has nil Argument", n.Line, n.Callee)
			}
			if err := validateNode(arg); err != nil {
				return err
			}
		}

	case *IndexExpression:
		if n.Object == nil {
			return fmt.Errorf("AST Validation Error at line %d: IndexExpression has nil Object", n.Line)
		}
		if n.Index == nil {
			return fmt.Errorf("AST Validation Error at line %d: IndexExpression has nil Index", n.Line)
		}
		if err := validateNode(n.Object); err != nil {
			return err
		}
		if err := validateNode(n.Index); err != nil {
			return err
		}

	case *ListLiteral:
		for _, el := range n.Elements {
			if el == nil {
				return fmt.Errorf("AST Validation Error at line %d: ListLiteral contains nil Element", n.Line)
			}
			if err := validateNode(el); err != nil {
				return err
			}
		}

	case *MapLiteral:
		for _, entry := range n.Entries {
			if entry.Key == nil {
				return fmt.Errorf("AST Validation Error at line %d: MapLiteral entry has nil Key", n.Line)
			}
			if entry.Value == nil {
				return fmt.Errorf("AST Validation Error at line %d: MapLiteral entry has nil Value", n.Line)
			}
			if err := validateNode(entry.Key); err != nil {
				return err
			}
			if err := validateNode(entry.Value); err != nil {
				return err
			}
		}

	case *Grouping:
		if n.Expression == nil {
			return fmt.Errorf("AST Validation Error at line %d: Grouping has nil Expression", n.Line)
		}
		if err := validateNode(n.Expression); err != nil {
			return err
		}

	case *CastExpression:
		if n.Value == nil {
			return fmt.Errorf("AST Validation Error at line %d: CastExpression has nil Value", n.Line)
		}
		if n.TargetType.Name == "" {
			return fmt.Errorf("AST Validation Error at line %d: CastExpression missing TargetType Name", n.Line)
		}
		if err := validateNode(n.Value); err != nil {
			return err
		}

	case *InspectExpression:
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: InspectExpression has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *PackExpression:
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: PackExpression has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *UnpackExpression:
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: UnpackExpression has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *SizeOfExpression:
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: SizeOfExpression has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *TypeOfExpression:
		if n.Argument == nil {
			return fmt.Errorf("AST Validation Error at line %d: TypeOfExpression has nil Argument", n.Line)
		}
		if err := validateNode(n.Argument); err != nil {
			return err
		}

	case *IsExpression:
		if n.Left == nil {
			return fmt.Errorf("AST Validation Error at line %d: IsExpression has nil Left", n.Line)
		}
		if n.Check == "" {
			return fmt.Errorf("AST Validation Error at line %d: IsExpression missing Check", n.Line)
		}
		if err := validateNode(n.Left); err != nil {
			return err
		}

	case *ReplaceExpression:
		if n.Source == nil {
			return fmt.Errorf("AST Validation Error at line %d: ReplaceExpression has nil Source", n.Line)
		}
		if n.Pattern == nil {
			return fmt.Errorf("AST Validation Error at line %d: ReplaceExpression has nil Pattern", n.Line)
		}
		if n.Replacement == nil {
			return fmt.Errorf("AST Validation Error at line %d: ReplaceExpression has nil Replacement", n.Line)
		}
		if err := validateNode(n.Source); err != nil {
			return err
		}
		if err := validateNode(n.Pattern); err != nil {
			return err
		}
		if err := validateNode(n.Replacement); err != nil {
			return err
		}

	case *SplitExpression:
		if n.Source == nil {
			return fmt.Errorf("AST Validation Error at line %d: SplitExpression has nil Source", n.Line)
		}
		if n.Delimiter == nil {
			return fmt.Errorf("AST Validation Error at line %d: SplitExpression has nil Delimiter", n.Line)
		}
		if err := validateNode(n.Source); err != nil {
			return err
		}
		if err := validateNode(n.Delimiter); err != nil {
			return err
		}

	case *JoinExpression:
		if n.Source == nil {
			return fmt.Errorf("AST Validation Error at line %d: JoinExpression has nil Source", n.Line)
		}
		if n.Delimiter == nil {
			return fmt.Errorf("AST Validation Error at line %d: JoinExpression has nil Delimiter", n.Line)
		}
		if err := validateNode(n.Source); err != nil {
			return err
		}
		if err := validateNode(n.Delimiter); err != nil {
			return err
		}

	default:
		return fmt.Errorf("AST Validation Error: Unknown AST node type: %T", node)
	}

	return nil
}

func validateStructRecursion(s StructDeclaration, prog *Program, path []string) error {
	for _, field := range s.Fields {
		// Only flat struct types can cause direct looping, omitting nullable or list which are refs
		if field.Type.Type == "StructType" && field.Type.Name != "nullable" && field.Type.Name != "list" && field.Type.Name != "map" {
			target := field.Type.Name

			for i, prev := range path {
				if prev == target {
					if i == len(path)-1 {
						return fmt.Errorf("Recursive struct definition detected for '%s'. Use 'nullable<%s>' or 'list<%s>' to break the cycle.", target, target, target)
					}

					cycle := ""
					for _, p := range path[i:] {
						cycle += p + " -> "
					}
					cycle += target
					return fmt.Errorf("Circular struct definition detected: %s. Use 'nullable' or 'list' generics to break the cycle.", cycle)
				}
			}

			// find struct and crawl deeper
			for _, childStruct := range prog.Structs {
				if childStruct.Name == target {
					newPath := append([]string{}, path...)
					newPath = append(newPath, target)
					if err := validateStructRecursion(childStruct, prog, newPath); err != nil {
						return err
					}
				}
			}
		}
	}
	return nil
}
