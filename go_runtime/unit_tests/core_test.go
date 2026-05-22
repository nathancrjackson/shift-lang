//go:build core

package runtime_test

import (
	"strings"
	"testing"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func init() {
	IsCoreMode = true
}

func TestCoreModeDisabledIntrinsics(t *testing.T) {
	code := `
	function test_read() string {
		return read_file("test.txt");
	}
	`
	rt, err := setupTestRuntime(code)
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	_, err = rt.RunFunction("test_read", []any{})
	if err == nil {
		t.Fatal("Expected read_file to throw a runtime error in core mode, but got nil")
	}
	if !strings.Contains(err.Error(), "read_file is disabled in core mode") {
		t.Errorf("Expected disabled in core mode error, got: %v", err)
	}
}

func TestCoreModeDisabledImports(t *testing.T) {
	code := `
	import "dummy.shift";
	function main() none {}
	`
	lex := lexer.NewLexer(code)
	tokens := lex.Tokenize().Tokens
	p := parser.NewParser(tokens) // No import resolver
	stdlib.LoadDefinitions(p)
	res := p.Parse()

	if len(res.Errors) == 0 {
		t.Fatal("Expected import to cause parser error in core mode, but got no errors")
	}
	found := false
	for _, e := range res.Errors {
		if strings.Contains(e.Error(), "Imports are disabled in core mode") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected 'Imports are disabled in core mode' parser error, got: %v", res.Errors)
	}
}
