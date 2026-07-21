package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/lexer"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/stdlib"
)

func main() {
	// Check for help flag before processing other args
	for _, arg := range os.Args {
		if arg == "--help" || arg == "-h" || arg == "help" {
			printHelp()
			os.Exit(0)
		}
	}

	includeStdlib := false
	cleanArgs := make([]string, 0, len(os.Args))
	for _, arg := range os.Args {
		if arg == "--stdlib" {
			includeStdlib = true
		} else {
			cleanArgs = append(cleanArgs, arg)
		}
	}
	os.Args = cleanArgs

	if len(os.Args) < 2 {
		printHelp()
		os.Exit(1)
	}

	var command string
	var fileName string
	var scriptArgsStartIdx int

	firstArg := os.Args[1]
	if firstArg == "run" || firstArg == "ast" {
		if len(os.Args) < 3 {
			fmt.Println("Usage: shift", firstArg, "<file.shift> [args...]")
			os.Exit(1)
		}
		command = firstArg
		fileName = os.Args[2]
		scriptArgsStartIdx = 3
	} else {
		command = "run"
		fileName = firstArg
		scriptArgsStartIdx = 2
	}
	sourceBytes, err := os.ReadFile(fileName)
	if err != nil {
		fmt.Println("Error reading file:", err)
		os.Exit(1)
	}

	source := string(sourceBytes)

	// Lexer
	lex := lexer.NewLexer(source)
	lexRes := lex.Tokenize()
	tokens := lexRes.Tokens
	lexErrors := lexRes.Errors

	if len(lexErrors) > 0 {
		fmt.Println("Syntax Errors:")
		for _, e := range lexErrors {
			fmt.Printf("%s\n", e.Message)
		}
		os.Exit(1)
	}

	// Lexer for stdlib
	stdLex := lexer.NewLexer(stdlib.Source)
	stdLexRes := stdLex.Tokenize()
	stdTokens := stdLexRes.Tokens
	stdLexErrs := stdLexRes.Errors
	if len(stdLexErrs) > 0 {
		fmt.Println("Critical: Standard Library syntax error")
		os.Exit(1)
	}

	// Parse Stdlib First!
	stdP := parser.NewParser(stdTokens)
	stdlib.LoadDefinitions(stdP)
	stdParseResult := stdP.Parse()

	if len(stdParseResult.Errors) > 0 {
		fmt.Println("Critical: Standard Library compile error")
		for _, e := range stdParseResult.Errors {
			fmt.Println(e.Error())
		}
		os.Exit(1)
	}

	absFileName, err := filepath.Abs(fileName)
	if err != nil {
		absFileName = fileName
	}

	// Parser
	p := parser.NewParser(tokens).
		WithImportResolver(getImportResolver()).
		WithCurrentFilePath(absFileName)
	stdlib.LoadDefinitions(p)

	// Inject standard library shift functions so typechecking passes
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

	parseResult := p.Parse()

	if len(parseResult.Errors) > 0 {
		fmt.Println("Compile Errors:")
		for _, e := range parseResult.Errors {
			fmt.Println(e.Error())
		}
		os.Exit(1)
	}

	if command == "ast" {
		astToPrint := parseResult.AST
		if includeStdlib {
			astToPrint.Structs = append(stdParseResult.AST.Structs, astToPrint.Structs...)
			astToPrint.Functions = append(stdParseResult.AST.Functions, astToPrint.Functions...)
		}

		if err := ast.ValidateAST(astToPrint); err != nil {
			fmt.Println("AST Validation Error:", err.Error())
			os.Exit(1)
		}

		b, err := json.MarshalIndent(astToPrint, "", "  ")
		if err != nil {
			fmt.Println("Error generating AST JSON:", err.Error())
			os.Exit(1)
		}
		fmt.Println(string(b))
		return
	}

	// Combine ASTs
	program := parseResult.AST
	program.Structs = append(stdParseResult.AST.Structs, program.Structs...)
	program.Functions = append(stdParseResult.AST.Functions, program.Functions...)

	if err := ast.ValidateAST(program); err != nil {
		fmt.Println("AST Validation Error:", err.Error())
		os.Exit(1)
	}

	// Initialise Runtime engine
	rt := runtime.NewRuntime(program, false)
	stdlib.LoadIntrinsics(rt)

	var scriptArgs []any
	for _, arg := range os.Args[scriptArgsStartIdx:] {
		if val, err := strconv.ParseFloat(arg, 64); err == nil {
			scriptArgs = append(scriptArgs, val)
		} else {
			scriptArgs = append(scriptArgs, arg)
		}
	}

	_, runErr := rt.RunFunction("main", scriptArgs)
	if runErr != nil {
		fmt.Printf("Fatal Runtime Error -> %s\n", runErr.Error())
		os.Exit(1)
	}
}

func printHelp() {
	fmt.Println("Shift Script CLI Runner")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  shift <file.shift> [args...]       Compile and run the specified Shift script.")
	fmt.Println("  shift run <file.shift> [args...]   Compile and run the specified Shift script.")
	fmt.Println("  shift ast <file.shift> [--stdlib]  Compile and output the JSON AST of the script.")
	fmt.Println()
	fmt.Println("Options:")
	fmt.Println("  -h, --help                         Show this help message and exit.")
	fmt.Println("  --stdlib                           Include standard library definitions when exporting the AST.")
}
