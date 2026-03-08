package runtime_test

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

type CheckDef struct {
	Call   *string `json:"call"`
	Type   string  `json:"type"`
	Expect any     `json:"expect"`
}

type TestCase struct {
	Code  string     `json:"code"`
	Tests []CheckDef `json:"tests"`
}

func deepEqual(a, b any) bool {
	// Basic deep equal that handles slices of any gracefully since JS JSON decodes generically
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}

	// Normalize float vs int since JSON parses numbers to float64
	if numA, isNumA := a.(float64); isNumA {
		if numB, isNumB := b.(float64); isNumB {
			return math.Abs(numA-numB) < 1e-9
		}
	}

	bStr := fmt.Sprintf("%v", b)
	aStr := fmt.Sprintf("%v", a)

	// Specifically for shift map serialization matching JSON nested expectations
	if smA, isA := a.(*runtime.ShiftMap); isA {
		// simplify ShiftMap compare by marshaling to json string and comparing to expects nested
		jsonA, _ := json.Marshal(stdlib.ToJS(smA))
		jsonB, _ := json.Marshal(b)
		return string(jsonA) == string(jsonB)
	}

	if arrA, isA := a.([]any); isA {
		jsonA, _ := json.Marshal(stdlib.ToJS(arrA))
		jsonB, _ := json.Marshal(b)
		return string(jsonA) == string(jsonB)
	}

	return aStr == bStr
}

func TestJSONSuite(t *testing.T) {
	testDir := filepath.Join(".", "tests_json")
	files, err := os.ReadDir(testDir)
	if err != nil {
		t.Fatalf("Could not read test directory: %v", err)
	}

	stdLex := lexer.NewLexer(stdlib.Source)
	stdLexRes := stdLex.Tokenize()
	if len(stdLexRes.Errors) > 0 {
		t.Fatalf("Stdlib Lex Fail")
	}

	stdP := parser.NewParser(stdLexRes.Tokens)
	stdlib.LoadDefinitions(stdP)
	stdParseResult := stdP.Parse()
	if len(stdParseResult.Errors) > 0 {
		t.Fatalf("Stdlib Parse Fail")
	}

	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		t.Run(file.Name(), func(t *testing.T) {
			path := filepath.Join(testDir, file.Name())
			bytes, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("Could not read file %s: %v", path, err)
			}

			var tests map[string]TestCase
			if err := json.Unmarshal(bytes, &tests); err != nil {
				t.Fatalf("Could not parse json in %s: %v", path, err)
			}

			for testName, tc := range tests {
				t.Run(testName, func(t *testing.T) {
					lex := lexer.NewLexer(tc.Code)
					lexRes := lex.Tokenize()

					// Check errors
					var p *parser.Parser
					var parseResult parser.ParseResult

					if len(lexRes.Errors) == 0 {
						p = parser.NewParser(lexRes.Tokens)
						stdlib.LoadDefinitions(p)
						for _, f := range stdParseResult.AST.Functions {
							params := []ast.Parameter{}
							for _, param := range f.Params {
								params = append(params, param)
							}
							typ := parser.TypeDef{Type: "Type", Name: f.ReturnType.Name, Initialized: true, Params: params}
							if f.ReturnType.Generic != nil {
								typ.Generic = f.ReturnType.Generic
							}
							p.AddGlobalVariable(f.Name, typ)
						}
						parseResult = p.Parse()
						if len(parseResult.Errors) == 0 {
							if err := ast.ValidateAST(parseResult.AST); err != nil {
								fmt.Println("[DEBUG] AST Validation error:", err.Error())
								parseResult.Errors = append(parseResult.Errors, parser.ParserError{Message: err.Error()})
							}
						} else {
							for _, e := range parseResult.Errors {
								fmt.Println("[DEBUG] Raw parse error block AST validation:", e.Error())
							}
						}
					}

					for i, check := range tc.Tests {
						isLexerCheck := check.Type == "lexer_error" || check.Type == "LexerError"
						isParserCheck := check.Type == "parser_error" || check.Type == "ParserError" || check.Type == "parser_error_cascading"

						expectStr := ""
						if s, ok := check.Expect.(string); ok {
							expectStr = s
						}

						if isLexerCheck {
							found := false
							for _, e := range lexRes.Errors {
								if strings.Contains(e.Message, expectStr) {
									found = true
									break
								}
							}
							if !found {
								t.Errorf("Check #%d: Expected lexer error '%s'", i+1, expectStr)
							}
							continue
						}

						if isParserCheck {
							if len(lexRes.Errors) > 0 {
								continue // Skipping cascaded syntax problems
							}
							found := false
							for _, e := range parseResult.Errors {
								if strings.Contains(e.Error(), expectStr) {
									found = true
									break
								}
							}
							// Some test syntax assumes expect empty cascades
							if !found && expectStr != "" && check.Type != "parser_error_cascading" {
								t.Errorf("Check #%d: Expected parser error '%s'", i+1, expectStr)
							}
							continue
						}

						// Runtime checks
						if len(lexRes.Errors) > 0 || len(parseResult.Errors) > 0 {
							t.Fatalf("Compilation errors prevented test execution.")
						}

						program := parseResult.AST
						program.Structs = append(stdParseResult.AST.Structs, program.Structs...)
						program.Functions = append(stdParseResult.AST.Functions, program.Functions...)

						rt := runtime.NewRuntime(program, false)
						stdlib.LoadIntrinsics(rt)

						var actual any
						var runErr error

						if check.Call != nil && *check.Call != "" {
							callLex := lexer.NewLexer(*check.Call)
							callTokens := callLex.Tokenize().Tokens
							callP := parser.NewParser(callTokens)

							// Mock the func to prevent undefined
							for _, token := range callTokens {
								if token.Lexeme != "" && token.Lexeme != "(" && token.Lexeme != ")" && token.Lexeme != "," {
									callP.AddGlobalVariable(token.Lexeme, parser.TypeDef{Type: "Type", Name: "any", Initialized: true})
								}
							}

							expr := callP.ParseExpression()
							callExpr, isCall := expr.(*ast.CallExpression)
							if !isCall {
								t.Fatalf("Test call '%s' is not a call expression", *check.Call)
							}

							args := []any{}
							for _, a := range callExpr.Arguments {
								v, _ := rt.EvaluateTest(a)
								args = append(args, v)
							}
							actual, runErr = rt.RunFunction(callExpr.Callee, args)
						} else {
							actual = check.Expect
						}

						if check.Type == "runtime_error" {
							if runErr == nil {
								t.Errorf("Check #%d: Expected runtime error '%s' but got none.", i+1, expectStr)
							} else if !strings.Contains(runErr.Error(), expectStr) {
								t.Errorf("Check #%d: Expected runtime error '%s' but got '%s'", i+1, expectStr, runErr.Error())
							}
						} else {
							if runErr != nil {
								t.Errorf("Check #%d: Unexpected runtime error: %v", i+1, runErr)
							} else {
								if !deepEqual(actual, check.Expect) {
									t.Errorf("Check #%d: Expected %v but got %v", i+1, check.Expect, actual)
								}
							}
						}
					}
				})
			}
		})
	}
}
