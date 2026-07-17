package runtime_test

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
)

func TestASTDeserialization(t *testing.T) {
	// A complex Shift script that uses almost every type of statement and expression.
	code := `
		struct User [
			string name,
			number age
		]

		function process(any val) none {
			number x = 10;
			x = 20;
			
			list<number> items = [1, 2, 3];
			items[0] = 5;

			map<number> dict = ["key": 42];
			delete dict["key"];

			if (x > 15) {
				print_line("x is large");
			} else {
				print_line("x is small");
			}

			while (x > 0) {
				x = x - 1;
				if (x == 5) {
					skip;
				}
				if (x == 2) {
					break;
				}
			}

			for (i in 0 to 5) {
				print_line(i);
			}

			for (k, v in dict) {
				print_line(k);
			}

			try {
				throw critical "error";
			} catch {
				print_line($thrown_message);
			} review {
				print_line("done");
			}

			string casted = x as string;
			print_line(inspect casted);
			print_line(size of items);
			print_line(type of casted);

			string joined_str = ["a", "b"] joined with ",";
			list<string> parts = joined_str split with ",";
			string replaced_str = joined_str replace "a" with "c";

			bool isNum = casted is numeric;
			
			string packed = pack items;
			list<number> unpacked = unpack "abc";

			// Pipeline expression
			number result = 5 | process_pipe($pipe_value);
		}

		function process_pipe(number val) number {
			return val * 2;
		}
	`

	// Lex
	lex := lexer.NewLexer(code)
	lexRes := lex.Tokenize()
	if len(lexRes.Errors) > 0 {
		t.Fatalf("Failed to tokenize test code: %v", lexRes.Errors)
	}

	// Parse to get original AST
	p := parser.NewParser(lexRes.Tokens)
	p.AddKnownType("User")
	p.AddStructDefinition("User", parser.StructDef{Fields: []ast.StructField{
		{Name: "name", Type: ast.TypeAnnotation{Name: "string"}},
		{Name: "age", Type: ast.TypeAnnotation{Name: "number"}},
	}})
	p.AddGlobalVariable("print_line", parser.TypeDef{Type: "Type", Name: "none", Initialized: true, Params: []ast.Parameter{{Name: "val", DataType: ast.TypeAnnotation{Name: "any"}}}})
	p.AddGlobalVariable("process_pipe", parser.TypeDef{Type: "Type", Name: "number", Initialized: true, Params: []ast.Parameter{{Name: "val", DataType: ast.TypeAnnotation{Name: "number"}}}})
	parseRes := p.Parse()
	if len(parseRes.Errors) > 0 {
		t.Fatalf("Failed to parse test code: %v", parseRes.Errors)
	}

	originalAST := parseRes.AST

	// Validate original AST
	if err := ast.ValidateAST(originalAST); err != nil {
		t.Fatalf("Original AST is invalid: %v", err)
	}

	// Marshal original AST to JSON
	jsonBytes, err := json.Marshal(originalAST)
	if err != nil {
		t.Fatalf("Failed to marshal AST: %v", err)
	}

	// Unmarshal back to a new ast.Program
	var deserializedAST ast.Program
	if err := json.Unmarshal(jsonBytes, &deserializedAST); err != nil {
		t.Fatalf("Failed to unmarshal AST: %v", err)
	}

	// Validate deserialized AST structure
	if err := ast.ValidateAST(&deserializedAST); err != nil {
		t.Fatalf("Deserialized AST is invalid: %v", err)
	}

	// Marshal deserialized AST back to JSON for comparison
	jsonBytes2, err := json.Marshal(&deserializedAST)
	if err != nil {
		t.Fatalf("Failed to marshal deserialized AST: %v", err)
	}

	// Compare JSON strings
	if string(jsonBytes) != string(jsonBytes2) {
		t.Errorf("JSON mismatch after unmarshal/marshal roundtrip.\nOriginal:     %s\nDeserialized: %s", string(jsonBytes), string(jsonBytes2))
	}

	// Perform a DeepEqual check
	if !reflect.DeepEqual(originalAST, &deserializedAST) {
		t.Errorf("AST structures are not DeepEqual.")
	}

	// Test case: AST missing version metadata should fail unmarshaling
	missingVersionJSON := `{"type":"Program","structs":[],"functions":[]}`
	var progMissing ast.Program
	if err := json.Unmarshal([]byte(missingVersionJSON), &progMissing); err == nil {
		t.Errorf("Expected error unmarshaling AST without version, but got nil")
	}

	// Test case: AST with incorrect version metadata should fail unmarshaling
	incorrectVersionJSON := `{"type":"Program","version":"2.0.0","structs":[],"functions":[]}`
	var progIncorrect ast.Program
	if err := json.Unmarshal([]byte(incorrectVersionJSON), &progIncorrect); err == nil {
		t.Errorf("Expected error unmarshaling AST with unsupported version '2.0.0', but got nil")
	}

	// Test case: Bypassing version validation using IgnoreVersionMismatch flag
	ast.IgnoreVersionMismatch = true
	defer func() { ast.IgnoreVersionMismatch = false }()

	var progIgnored ast.Program
	if err := json.Unmarshal([]byte(incorrectVersionJSON), &progIgnored); err != nil {
		t.Errorf("Unexpected error unmarshaling incorrect version AST when IgnoreVersionMismatch is true: %v", err)
	}
	if progIgnored.Version != "2.0.0" {
		t.Errorf("Expected version to be '2.0.0', got '%s'", progIgnored.Version)
	}
}
