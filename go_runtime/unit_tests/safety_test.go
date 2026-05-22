package runtime_test

import (
	"fmt"
	"math"
	"strings"
	"testing"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func setupTestRuntime(code string) (*runtime.Runtime, error) {
	lex := lexer.NewLexer(code)
	lexRes := lex.Tokenize()
	if len(lexRes.Errors) > 0 {
		return nil, fmt.Errorf("Lexer error: %s", lexRes.Errors[0].Message)
	}
	p := parser.NewParser(lexRes.Tokens)
	stdlib.LoadDefinitions(p)
	parseResult := p.Parse()
	if len(parseResult.Errors) > 0 {
		return nil, fmt.Errorf("Parser error: %s", parseResult.Errors[0].Message)
	}
	rt := runtime.NewRuntime(parseResult.AST, false)
	rt.SetMaxInstructions(1000000)
	stdlib.LoadIntrinsics(rt)
	return rt, nil
}

func TestNaNAndInfIndexAccess(t *testing.T) {
	code := `
	function test_access(any idx) any {
		list<number> x = [10, 20, 30];
		return x[idx];
	}
	`
	rt, err := setupTestRuntime(code)
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	tests := []struct {
		name        string
		idx         any
		expectError string
	}{
		{"NaN index", math.NaN(), "List index must be integer value"},
		{"PosInf index", math.Inf(1), "List index must be integer value"},
		{"NegInf index", math.Inf(-1), "List index must be integer value"},
		{"Negative index", -1.0, "List index must not be a negative number"},
		{"Out of bounds index", 3.0, "List index is out of bounds"},
		{"Valid index", 1.0, ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			val, err := rt.RunFunction("test_access", []any{tc.idx})
			if tc.expectError != "" {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tc.expectError)
				} else if !strings.Contains(err.Error(), tc.expectError) {
					t.Errorf("Expected error containing '%s', got '%v'", tc.expectError, err)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if val != 20.0 {
					t.Errorf("Expected 20.0, got %v", val)
				}
			}
		})
	}
}

func TestNaNAndInfIndexAssignment(t *testing.T) {
	code := `
	function test_assign(any idx, any val) any {
		list<number> x = [10, 20, 30];
		x[idx] = val;
		return x[idx];
	}
	`
	rt, err := setupTestRuntime(code)
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	tests := []struct {
		name        string
		idx         any
		expectError string
	}{
		{"NaN index", math.NaN(), "List index must be integer value"},
		{"PosInf index", math.Inf(1), "List index must be integer value"},
		{"NegInf index", math.Inf(-1), "List index must be integer value"},
		{"Negative index", -1.0, "List index must not be a negative number"},
		{"Out of bounds index", 3.0, "List index is out of bounds"},
		{"Valid index", 1.0, ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			val, err := rt.RunFunction("test_assign", []any{tc.idx, 99.0})
			if tc.expectError != "" {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tc.expectError)
				} else if !strings.Contains(err.Error(), tc.expectError) {
					t.Errorf("Expected error containing '%s', got '%v'", tc.expectError, err)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if val != 99.0 {
					t.Errorf("Expected 99.0, got %v", val)
				}
			}
		})
	}
}

func TestNaNAndInfIndexDelete(t *testing.T) {
	code := `
	function test_delete(any idx) any {
		list<number> x = [10, 20, 30];
		delete x[idx];
		return x;
	}
	`
	rt, err := setupTestRuntime(code)
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	tests := []struct {
		name        string
		idx         any
		expectError string
	}{
		{"NaN index", math.NaN(), "List index must be integer value"},
		{"PosInf index", math.Inf(1), "List index must be integer value"},
		{"NegInf index", math.Inf(-1), "List index must be integer value"},
		{"Negative index", -1.0, "List index must not be a negative number"},
		{"Out of bounds index", 3.0, "List index is out of bounds"},
		{"Valid index", 1.0, ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := rt.RunFunction("test_delete", []any{tc.idx})
			if tc.expectError != "" {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tc.expectError)
				} else if !strings.Contains(err.Error(), tc.expectError) {
					t.Errorf("Expected error containing '%s', got '%v'", tc.expectError, err)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
			}
		})
	}
}

func TestIntrinsicParameterCountValidation(t *testing.T) {
	rt, err := setupTestRuntime("")
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	// print_line expects 1 param. Call with 0.
	_, err = rt.RunFunction("print_line", []any{})
	if err == nil {
		t.Fatal("Expected error calling print_line with 0 arguments, got nil")
	}
	if !strings.Contains(err.Error(), "Intrinsic 'print_line' expects 1 arguments but got 0") {
		t.Errorf("Expected specific argument count error, got: %v", err)
	}
}

func TestIntrinsicInputValidation(t *testing.T) {
	rt, err := setupTestRuntime("")
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	// 1. round_number expects float64, test with nil
	_, err = rt.RunFunction("round_number", []any{nil})
	if err == nil {
		t.Fatal("Expected error calling round_number with nil, got nil")
	}
	if !strings.Contains(err.Error(), "expected number") {
		t.Errorf("Expected 'expected number' error, got: %v", err)
	}

	// 2. convert_datetime_to_unixtime with nil
	_, err = rt.RunFunction("convert_datetime_to_unixtime", []any{nil})
	if err == nil {
		t.Fatal("Expected error calling convert_datetime_to_unixtime with nil, got nil")
	}
	if !strings.Contains(err.Error(), "Expected DateTime struct") {
		t.Errorf("Expected 'Expected DateTime struct' error, got: %v", err)
	}

	// 3. convert_datetime_to_unixtime with wrong struct type
	wrongMap := runtime.NewShiftMap()
	wrongMap.StructName = "NotDateTime"
	_, err = rt.RunFunction("convert_datetime_to_unixtime", []any{wrongMap})
	if err == nil {
		t.Fatal("Expected error calling convert_datetime_to_unixtime with NotDateTime, got nil")
	}
	if !strings.Contains(err.Error(), "Expected DateTime struct") {
		t.Errorf("Expected 'Expected DateTime struct' error, got: %v", err)
	}

	// 4. convert_datetime_to_unixtime with DateTime struct but missing fields
	dtMap := runtime.NewShiftMap()
	dtMap.StructName = "DateTime"
	_, err = rt.RunFunction("convert_datetime_to_unixtime", []any{dtMap})
	if err == nil {
		t.Fatal("Expected error calling convert_datetime_to_unixtime with missing fields, got nil")
	}
	if !strings.Contains(err.Error(), "DateTime fields must be numbers") {
		t.Errorf("Expected 'DateTime fields must be numbers' error, got: %v", err)
	}

	// 5. convert_datetime_to_unixtime with DateTime struct but NaN fields
	dtMapFull := runtime.NewShiftMap()
	dtMapFull.StructName = "DateTime"
	dtMapFull.Data["year"] = math.NaN()
	dtMapFull.Data["month"] = 1.0
	dtMapFull.Data["day"] = 1.0
	dtMapFull.Data["hour"] = 1.0
	dtMapFull.Data["minute"] = 1.0
	dtMapFull.Data["second"] = 1.0
	dtMapFull.Data["millisecond"] = 1.0
	_, err = rt.RunFunction("convert_datetime_to_unixtime", []any{dtMapFull})
	if err == nil {
		t.Fatal("Expected error calling convert_datetime_to_unixtime with NaN year, got nil")
	}
	if !strings.Contains(err.Error(), "DateTime fields must be finite numbers") {
		t.Errorf("Expected 'DateTime fields must be finite numbers' error, got: %v", err)
	}

	// 6. convert_unixtime_to_datetime with NaN timestamp
	_, err = rt.RunFunction("convert_unixtime_to_datetime", []any{math.NaN()})
	if err == nil {
		t.Fatal("Expected error calling convert_unixtime_to_datetime with NaN, got nil")
	}
	if !strings.Contains(err.Error(), "Expected finite number") {
		t.Errorf("Expected 'Expected finite number' error, got: %v", err)
	}

	// 7. generate_randomint_from_range with NaN
	_, err = rt.RunFunction("generate_randomint_from_range", []any{math.NaN(), 10.0})
	if err == nil {
		t.Fatal("Expected error calling generate_randomint_from_range with NaN, got nil")
	}
	if !strings.Contains(err.Error(), "Random range must be finite numbers") {
		t.Errorf("Expected 'Random range must be finite numbers' error, got: %v", err)
	}
}

func TestToJSCircularReference(t *testing.T) {
	m := runtime.NewShiftMap()
	m.Set("self", m)

	res := stdlib.ToJS(m)
	resMap, ok := res.(map[string]any)
	if !ok {
		t.Fatalf("Expected map[string]any from ToJS, got %T", res)
	}

	// Verify it successfully converted without crash/overflow
	selfVal := resMap["self"]
	if selfVal == nil {
		t.Fatal("Expected circular self reference not to be nil")
	}
}
