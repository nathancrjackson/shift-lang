package runtime_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
)

func TestValidateAST(t *testing.T) {
	// 1. Nil Program validation
	if err := ast.ValidateAST(nil); err == nil {
		t.Error("Expected error when validating nil Program, got nil")
	} else if !strings.Contains(err.Error(), "Program cannot be nil") {
		t.Errorf("Expected 'Program cannot be nil' error, got: %v", err)
	}

	// 2. Unsupported Version validation
	badVersionJSON := `{"type":"Program","version":"2.0.0","structs":[],"functions":[]}`
	var badProg ast.Program
	if err := json.Unmarshal([]byte(badVersionJSON), &badProg); err == nil {
		t.Error("Expected version checking to fail on unmarshal, but got nil")
	}

	// 3. Structural validation - missing function body
	missingBodyJSON := `{
		"type": "Program",
		"version": "1.0.0",
		"structs": [],
		"functions": [
			{
				"type": "FunctionDeclaration",
				"line": 5,
				"name": "foo",
				"params": [],
				"returnType": {"type": "TypeAnnotation", "name": "none"}
			}
		]
	}`
	var missingBodyProg ast.Program
	// Note: Unmarshaling itself succeeds because Go allows nil body pointer,
	// but ValidateAST should catch it!
	if err := json.Unmarshal([]byte(missingBodyJSON), &missingBodyProg); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	if err := ast.ValidateAST(&missingBodyProg); err == nil {
		t.Error("Expected ValidateAST to fail on nil FunctionDeclaration Body, got nil")
	} else if !strings.Contains(err.Error(), "FunctionDeclaration 'foo' has nil Body") {
		t.Errorf("Expected 'has nil Body' error, got: %v", err)
	}

	// 4. Missing IfStatement Condition
	missingCondJSON := `{
		"type": "Program",
		"version": "1.0.0",
		"structs": [],
		"functions": [
			{
				"type": "FunctionDeclaration",
				"line": 2,
				"name": "test",
				"params": [],
				"returnType": {"type": "TypeAnnotation", "name": "none"},
				"body": {
					"type": "Block",
					"line": 3,
					"statements": [
						{
							"type": "IfStatement",
							"line": 4,
							"thenBranch": {
								"type": "Block",
								"line": 5,
								"statements": []
							}
						}
					]
				}
			}
		]
	}`
	var missingCondProg ast.Program
	if err := json.Unmarshal([]byte(missingCondJSON), &missingCondProg); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	if err := ast.ValidateAST(&missingCondProg); err == nil {
		t.Error("Expected ValidateAST to fail on nil IfStatement Condition, got nil")
	} else if !strings.Contains(err.Error(), "IfStatement has nil Condition") {
		t.Errorf("Expected 'has nil Condition' error, got: %v", err)
	}

	// 5. Block contains nil Statement
	nilStmtJSON := `{
		"type": "Program",
		"version": "1.0.0",
		"structs": [],
		"functions": [
			{
				"type": "FunctionDeclaration",
				"line": 2,
				"name": "test",
				"params": [],
				"returnType": {"type": "TypeAnnotation", "name": "none"},
				"body": {
					"type": "Block",
					"line": 3,
					"statements": [
						null
					]
				}
			}
		]
	}`
	var nilStmtProg ast.Program
	if err := json.Unmarshal([]byte(nilStmtJSON), &nilStmtProg); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	if err := ast.ValidateAST(&nilStmtProg); err == nil {
		t.Error("Expected ValidateAST to fail on nil statement in Block, got nil")
	} else if !strings.Contains(err.Error(), "Block contains nil Statement") {
		t.Errorf("Expected 'contains nil Statement' error, got: %v", err)
	}

	// 6. BinaryExpression with nil operand
	nilOperandJSON := `{
		"type": "Program",
		"version": "1.0.0",
		"structs": [],
		"functions": [
			{
				"type": "FunctionDeclaration",
				"line": 2,
				"name": "test",
				"params": [],
				"returnType": {"type": "TypeAnnotation", "name": "none"},
				"body": {
					"type": "Block",
					"line": 3,
					"statements": [
						{
							"type": "ExpressionStatement",
							"line": 4,
							"expression": {
								"type": "BinaryExpression",
								"line": 4,
								"operator": "+",
								"left": {
									"type": "Literal",
									"line": 4,
									"value": 10
								}
							}
						}
					]
				}
			}
		]
	}`
	var nilOperandProg ast.Program
	if err := json.Unmarshal([]byte(nilOperandJSON), &nilOperandProg); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}
	if err := ast.ValidateAST(&nilOperandProg); err == nil {
		t.Error("Expected ValidateAST to fail on nil BinaryExpression operand, got nil")
	} else if !strings.Contains(err.Error(), "BinaryExpression has nil Right") {
		t.Errorf("Expected 'has nil Right' error, got: %v", err)
	}
}
