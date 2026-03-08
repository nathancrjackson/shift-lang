package lexer

import (
	"strings"
	"testing"
)

func TestLexer_Errors(t *testing.T) {
	tests := []struct {
		name          string
		code          string
		expectedError string
	}{
		{
			name:          "Unexpected character",
			code:          "function start() number { return @; }",
			expectedError: "Unexpected character '@'",
		},
		{
			name:          "Unterminated string",
			code:          "function start() string { return \"Unterminated; }",
			expectedError: "Unterminated string",
		},
		{
			name:          "Unterminated block comment",
			code:          "function start() number { return 10; } /*",
			expectedError: "Unterminated block comment",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lex := NewLexer(tt.code)
			res := lex.Tokenize()

			if len(res.Errors) == 0 {
				t.Fatalf("Expected error containing '%s', but got no errors", tt.expectedError)
			}

			found := false
			for _, err := range res.Errors {
				if strings.Contains(err.Message, tt.expectedError) {
					found = true
					break
				}
			}

			if !found {
				t.Errorf("Expected error containing '%s', but got: %v", tt.expectedError, res.Errors)
			}
		})
	}
}
