package runtime

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
)

var backreferenceRegex = regexp.MustCompile(`\\\d`)
var nestedQuantifiersRegex = regexp.MustCompile(`\([^)]*[\*\+\?\}][^)]*\)[\*\+\?\}]`)
var overlappingQuantifiersRegex = regexp.MustCompile(`\([^)]*[\*\+\?\}].*\|.*[\*\+\?\}][^)]*\)[\*\+\?\}]`)

// FunctionMeta holds metadata about a running function, such as its return type and name.
type FunctionMeta struct {
	ReturnType   ast.TypeAnnotation
	FunctionName string
}

// IterState maintains progress and collection info during loop executions.
type IterState struct {
	Type       string // "range", "while", "in"
	Current    float64
	End        float64
	Step       float64
	VarName    string
	ValVarName string
	Condition  ast.Expression
	Body       *ast.Block
	Items      []any    // for "in" loops
	MapKeys    []string // for map iteration
	MapValues  []any
	Index      int
	IsMap      bool
}

// StackFrame represents an execution environment stack frame (e.g. for functions, loops, or blocks).
type StackFrame struct {
	Type           string // "Function", "Block", "Loop", "Protected"
	Env            *Environment
	Statements     []ast.Statement
	PC             int
	WaitingForExpr bool
	ExprResult     any
	Meta           *FunctionMeta
	Iter           *IterState
}

// Runtime is the execution engine that interprets the program AST.
type Runtime struct {
	AST                         *ast.Program
	DebugMode                   bool
	IgnoreASTVersionMismatch    bool
	LogWriter                   io.Writer
	GlobalEnv                   *Environment
	Functions                   map[string]ast.FunctionDeclaration
	Intrinsics                  map[string]func([]any, *Runtime) any
	Stack                       []*StackFrame
	instructionCount            int
	maxInstructions             int
	AllowUnsafeRegexFallback    bool
	UnsafeRegexMaxStringCeiling int
}

// NewRuntime constructs and initializes a new Runtime interpreter with standard intrinsics.
func NewRuntime(prog *ast.Program, debugMode bool) *Runtime {
	if prog == nil {
		panic("Runtime Error: Program AST cannot be nil")
	}

	if !ast.IgnoreVersionMismatch && prog.Version != "1.0.0" {
		panic(fmt.Sprintf("Schema Error: Unsupported AST schema version: '%s'. Expected '1.0.0'.", prog.Version))
	}

	r := &Runtime{
		AST:                         prog,
		DebugMode:                   debugMode,
		LogWriter:                   os.Stdout,
		GlobalEnv:                   NewEnvironment(nil),
		Functions:                   make(map[string]ast.FunctionDeclaration),
		Intrinsics:                  make(map[string]func([]any, *Runtime) any),
		Stack:                       []*StackFrame{},
		instructionCount:            0,
		maxInstructions:             0,
		AllowUnsafeRegexFallback:    true,
		UnsafeRegexMaxStringCeiling: 120,
	}

	r.loadFunctions()

	r.GlobalEnv.Define("$line_num", 0)
	r.GlobalEnv.Define("$pi", math.Pi)
	r.GlobalEnv.Define("$e", math.E)

	return r
}

// AddIntrinsic registers a new Go-native function in the Shift execution context.
func (r *Runtime) AddIntrinsic(name string, f func([]any, *Runtime) any) {
	if name == "" {
		panic("Runtime Error: Intrinsic name cannot be empty")
	}
	if f == nil {
		panic("Runtime Error: Intrinsic function callback cannot be nil")
	}
	r.Intrinsics[name] = f
}

// SetMaxInstructions configures the instruction ceiling constraint to limit execution duration.
func (r *Runtime) SetMaxInstructions(limit int) {
	if limit < 0 {
		panic("Runtime Error: Max instructions limit cannot be negative")
	}
	r.maxInstructions = limit
}

func (r *Runtime) loadFunctions() {
	if r.AST == nil {
		return
	}
	for _, fn := range r.AST.Functions {
		r.Functions[fn.Name] = fn
	}
}

type LogEntry struct {
	Timestamp string         `json:"timestamp"`
	Phase     string         `json:"phase"`
	Message   string         `json:"message"`
	Details   map[string]any `json:"details,omitempty"`
}

func (r *Runtime) trace(phase string, message string, details map[string]any) {
	if !r.DebugMode {
		return
	}
	writer := r.LogWriter
	if writer == nil {
		writer = os.Stdout
	}
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		Phase:     phase,
		Message:   message,
		Details:   details,
	}
	bytes, err := json.Marshal(entry)
	if err == nil {
		fmt.Fprintln(writer, string(bytes))
	}
}

func (r *Runtime) stringify(val any) string {
	if b, ok := val.(bool); ok {
		if b {
			return "1"
		}
		return "0"
	}
	if val == nil {
		return "null"
	}
	return fmt.Sprintf("%v", val)
}

func (r *Runtime) deepCopy(value any) any {
	return r.deepCopyWithVisited(value, make(map[uintptr]any))
}

func (r *Runtime) deepCopyWithVisited(value any, visited map[uintptr]any) any {
	if value == nil {
		return nil
	}
	
	val := reflect.ValueOf(value)
	if val.Kind() == reflect.Ptr || val.Kind() == reflect.Slice || val.Kind() == reflect.Map {
		ptr := val.Pointer()
		if ptr != 0 {
			if _, exists := visited[ptr]; exists {
				return value
			}
			visited[ptr] = value
		}
	}

	switch v := value.(type) {
	case []any:
		res := make([]any, len(v))
		for i, item := range v {
			res[i] = r.deepCopyWithVisited(item, visited)
		}
		return res
	case *ShiftMap:
		newMap := NewShiftMap()
		newMap.StructName = v.StructName
		newMap.Keys = make([]string, len(v.Keys))
		copy(newMap.Keys, v.Keys)
		for k, val := range v.Data {
			newMap.Data[k] = r.deepCopyWithVisited(val, visited)
		}
		if len(newMap.Keys) == 0 && len(v.Data) > 0 {
			for k := range v.Data {
				newMap.Keys = append(newMap.Keys, k)
			}
		}
		return newMap
	default:
		return v // primitive types are passed by value in Go ANYWAY
	}
}

func (r *Runtime) getDefaultValue(typeInfo ast.TypeAnnotation) any {
	switch typeInfo.Name {
	case "number":
		return 0.0
	case "string":
		return ""
	case "bool":
		return false
	case "list":
		return []any{}
	case "map":
		return NewShiftMap()
	case "null", "none", "nullable", "any":
		return nil
	default:
		return nil
	}
}

func (r *Runtime) checkType(value any, typeInfo ast.TypeAnnotation) error {
	if typeInfo.Name == "" {
		return fmt.Errorf("Type Error: Type annotation name cannot be empty")
	}
	if typeInfo.Name == "any" {
		return nil
	}
	if value == nil {
		if typeInfo.Name == "nullable" || typeInfo.Name == "null" || typeInfo.Name == "none" {
			return nil
		}
		return fmt.Errorf("Runtime Error: Return type mismatch.")
	}
	if typeInfo.Name == "nullable" {
		if typeInfo.Generic != nil {
			return r.checkType(value, *typeInfo.Generic)
		}
		return nil
	}
	if typeInfo.Type == "StructType" {
		m, ok := value.(*ShiftMap)
		if !ok {
			return fmt.Errorf("Runtime Error: Return type mismatch.")
		}
		m.StructName = typeInfo.Name
		return nil
	}

	actualType := reflect.TypeOf(value).String()

	expectedJS := typeInfo.Name
	if expectedJS == "bool" {
		expectedJS = "bool" // Go type mapping
	} else if expectedJS == "number" {
		expectedJS = "float64" // Parser coerces integers/floats generally
	}

	valid := false
	if expectedJS == "list" {
		if arr, isArr := value.([]any); isArr {
			valid = true
			if typeInfo.Generic != nil {
				for _, item := range arr {
					err := r.checkType(item, *typeInfo.Generic)
					if err != nil {
						return fmt.Errorf("Runtime Error: Return type mismatch. Expected list of %s", typeInfo.Generic.Name)
					}
				}
			}
		}
	} else if expectedJS == "map" {
		if sm, isMap := value.(*ShiftMap); isMap {
			valid = true
			if typeInfo.Generic != nil {
				for _, item := range sm.Data {
					err := r.checkType(item, *typeInfo.Generic)
					if err != nil {
						return fmt.Errorf("Runtime Error: Return type mismatch. Expected map of %s", typeInfo.Generic.Name)
					}
				}
			}
		}
	} else {
		// handle basic type matching
		switch value.(type) {
		case float64, int, int32, int64:
			valid = typeInfo.Name == "number"
		case string:
			valid = typeInfo.Name == "string"
		case bool:
			valid = typeInfo.Name == "bool"
		}
	}

	if !valid {
		return fmt.Errorf("Runtime Error: Return type mismatch. Expected %s but got %s", expectedJS, actualType)
	}
	return nil
}

// ---------------- Stack Machine Core ----------------

// RunFunction executes a Shift function by name with the provided arguments and returns the result or an error.
func (r *Runtime) RunFunction(name string, args []any) (any, error) {
	if !ast.IgnoreVersionMismatch && !r.IgnoreASTVersionMismatch && r.AST.Version != "1.0.0" {
		return nil, fmt.Errorf("Schema Error: Unsupported AST schema version: '%s'. Expected '1.0.0'.", r.AST.Version)
	}

	previousStack := r.Stack
	r.Stack = []*StackFrame{}

	defer func() {
		r.Stack = previousStack
	}()

	if fn, ok := r.Intrinsics[name]; ok {
		r.trace("RUNTIME", "Running Intrinsic", map[string]any{"intrinsicName": name})
		var res any
		var err error
		func() {
			defer func() {
				if rec := recover(); rec != nil {
					if e, ok := rec.(error); ok {
						err = e
					} else {
						err = fmt.Errorf("panic: %v", rec)
					}
				}
			}()
			res = fn(args, r)
		}()
		if err != nil {
			return nil, err
		}
		return res, nil
	}

	fn, ok := r.Functions[name]
	if !ok {
		return nil, fmt.Errorf("Runtime Error: Function '%s' not found.", name)
	}
	if len(args) != len(fn.Params) {
		return nil, fmt.Errorf("Runtime Error: Function '%s' expects %d arguments but got %d.", name, len(fn.Params), len(args))
	}

	fnEnv := NewEnvironment(r.GlobalEnv)
	for i, p := range fn.Params {
		fnEnv.Define(p.Name, r.deepCopy(args[i]))
	}

	meta := &FunctionMeta{ReturnType: fn.ReturnType, FunctionName: name}

	statements := []ast.Statement{}
	if fn.Body != nil {
		statements = fn.Body.Statements
	}
	initialFrame := &StackFrame{
		Type:       "Function",
		Env:        fnEnv,
		Statements: statements,
		Meta:       meta,
	}
	r.Stack = append(r.Stack, initialFrame)
	r.trace("RUNTIME", "Pushed Function Frame", map[string]any{"functionName": name})

	var finalResult any = nil
	currentSignal := SignalNone
	var signalValue any = nil
	r.instructionCount = 0

	for len(r.Stack) > 0 {
		if r.maxInstructions > 0 && r.instructionCount > r.maxInstructions {
			return nil, fmt.Errorf("Runtime Error: Execution exceeded maximum instruction limit.")
		}

		frame := r.Stack[len(r.Stack)-1]

		if currentSignal == SignalReturn {
			if frame.Type == "Function" {
				finalResult = signalValue
				r.Stack = r.Stack[:len(r.Stack)-1] // pop
				r.trace("RUNTIME", "Popped Function Frame", map[string]any{"functionName": frame.Meta.FunctionName, "return": finalResult})

				if err := r.checkType(finalResult, frame.Meta.ReturnType); err != nil {
					return nil, err
				}

				if len(r.Stack) == 0 {
					return finalResult, nil
				}

				caller := r.Stack[len(r.Stack)-1]
				caller.ExprResult = finalResult
				caller.WaitingForExpr = false

				currentSignal = SignalNone
				signalValue = nil
				continue
			} else {
				r.Stack = r.Stack[:len(r.Stack)-1]
				r.trace("RUNTIME", "Popped Frame", map[string]any{"frameType": frame.Type, "signal": "Propagating Return"})
				continue
			}
		}

		if currentSignal == SignalBreak || currentSignal == SignalSkip {
			if frame.Type == "Loop" {
				if currentSignal == SignalBreak {
					r.Stack = r.Stack[:len(r.Stack)-1]
					r.trace("RUNTIME", "Loop Terminated", map[string]any{"action": "break"})
					currentSignal = SignalNone
				} else {
					r.trace("RUNTIME", "Loop Skipping", map[string]any{"action": "skip"})
					currentSignal = SignalNone
				}
				continue
			} else if frame.Type == "Function" {
				return nil, fmt.Errorf("Runtime Error: 'break' or 'skip' used outside of loop.")
			} else {
				r.Stack = r.Stack[:len(r.Stack)-1]
				continue
			}
		}

		if frame.PC >= len(frame.Statements) {
			r.Stack = r.Stack[:len(r.Stack)-1]
			r.trace("RUNTIME", "Popped Frame", map[string]any{"frameType": frame.Type, "status": "Finished"})

			if frame.Type == "Function" {
				retType := frame.Meta.ReturnType.Name
				if retType != "none" && retType != "null" && retType != "nullable" && retType != "any" {
					return nil, fmt.Errorf("Runtime Error: Expected a return but none was supplied before function end.")
				}
				if len(r.Stack) > 0 {
					caller := r.Stack[len(r.Stack)-1]
					caller.ExprResult = nil
					caller.WaitingForExpr = false
				} else {
					return nil, nil // function finished with implicit null
				}
			}
			continue
		}

		stmt := frame.Statements[frame.PC]

		if frame.Type != "Loop" {
			frame.PC++
		}

		var executeErr error
		r.executeStatement(stmt, frame, func(sig int, val any) {
			currentSignal = sig
			signalValue = val
		}, &executeErr)

		if executeErr != nil {
			return nil, executeErr
		}

		if currentSignal != SignalNone {
			continue
		}
	}

	return finalResult, nil
}

func (r *Runtime) executeVariableDeclaration(s *ast.VariableDeclaration, env *Environment) error {
	if strings.HasPrefix(s.Name, "$") {
		return fmt.Errorf("Runtime Error: Cannot declare magic variable '%s'.", s.Name)
	}
	var val any
	if s.Initializer != nil {
		v, err := r.evaluate(s.Initializer, env)
		if err != nil {
			return err
		}
		val = r.deepCopy(v)
	} else {
		val = r.getDefaultValue(s.VarType)
	}

	if s.VarType.Type == "StructType" {
		if m, ok := val.(*ShiftMap); ok {
			m.StructName = s.VarType.Name
		}
	}
	env.Define(s.Name, val)
	return nil
}

func (r *Runtime) executeIfStatement(s *ast.IfStatement, frame *StackFrame, signalCallback func(int, any)) error {
	condVal, err := r.evaluate(s.Condition, frame.Env)
	if err != nil {
		return err
	}
	if r.isTruthy(condVal) {
		err = r.runProtectedBlock(s.ThenBranch, frame.Env, signalCallback)
		if err != nil {
			return err
		}
	} else if s.ElseBranch != nil {
		if ifBranch, isIf := s.ElseBranch.(*ast.IfStatement); isIf {
			var errOut error
			r.executeStatement(ifBranch, frame, signalCallback, &errOut)
			if errOut != nil {
				return errOut
			}
		} else if b, isBlock := s.ElseBranch.(*ast.Block); isBlock {
			err = r.runProtectedBlock(b, frame.Env, signalCallback)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *Runtime) executeThrowStatement(s *ast.ThrowStatement, env *Environment) error {
	msgVal, err := r.evaluate(s.Argument, env)
	if err != nil {
		return err
	}
	msgStr := r.stringify(msgVal)
	if s.Severity == "alert" {
		return ShiftAlert{Message: msgStr}
	} else if s.Severity == "critical" {
		return ShiftCritical{Message: msgStr}
	} else {
		return ShiftError{Message: msgStr}
	}
}

func (r *Runtime) executeTryStatement(s *ast.TryStatement, frame *StackFrame, signalCallback func(int, any)) error {
	err := r.runProtectedBlock(s.TryBlock, frame.Env, signalCallback)
	if err != nil {
		if _, isCrit := err.(ShiftCritical); isCrit {
			return err
		} else if alert, isAlert := err.(ShiftAlert); isAlert {
			if s.ReviewBlock != nil {
				revEnv := NewEnvironment(frame.Env)
				revEnv.Define(s.CatchIdentifier, alert.Message)
				err2 := r.runProtectedBlock(s.ReviewBlock, revEnv, signalCallback)
				if err2 != nil {
					return err2
				}
			} else {
				return err
			}
		} else {
			// Normal error
			if s.CatchBlock != nil {
				catchEnv := NewEnvironment(frame.Env)
				errMsg := err.Error()
				if se, ok := err.(ShiftError); ok {
					errMsg = se.Message
				}
				catchEnv.Define(s.CatchIdentifier, errMsg)
				err2 := r.runProtectedBlock(s.CatchBlock, catchEnv, signalCallback)
				if err2 != nil {
					return err2
				}
			} else {
				return err
			}
		}
	}
	return nil
}

func (r *Runtime) executeStatement(stmt ast.Statement, frame *StackFrame, signalCallback func(int, any), errOut *error) {
	r.instructionCount++
	if r.maxInstructions > 0 && r.instructionCount > r.maxInstructions {
		*errOut = fmt.Errorf("Runtime Error: Execution exceeded maximum instruction limit.")
		return
	}

	if stmt.GetLine() != 0 {
		r.GlobalEnv.Assign("$line_num", stmt.GetLine())
	}
	r.trace("RUNTIME", "Exec Stmt", map[string]any{"nodeType": stmt.NodeType(), "line": stmt.GetLine()})

	// Use recovering mechanisms for protected blocks
	defer func() {
		if rec := recover(); rec != nil {
			if err, ok := rec.(error); ok {
				*errOut = err
			} else {
				*errOut = fmt.Errorf("panic: %v", rec)
			}
		}
	}()

	switch s := stmt.(type) {
	case *ast.VariableDeclaration:
		*errOut = r.executeVariableDeclaration(s, frame.Env)

	case *ast.ExpressionStatement:
		_, err := r.evaluate(s.Expression, frame.Env)
		if err != nil {
			*errOut = err
		}

	case *ast.ReturnStatement:
		var retVal any = nil
		if s.Value != nil {
			v, err := r.evaluate(s.Value, frame.Env)
			if err != nil {
				*errOut = err
				return
			}
			retVal = v
		}
		signalCallback(SignalReturn, retVal)

	case *ast.BreakStatement:
		signalCallback(SignalBreak, nil)

	case *ast.SkipStatement:
		signalCallback(SignalSkip, nil)

	case *ast.IfStatement:
		*errOut = r.executeIfStatement(s, frame, signalCallback)

	case *ast.WhileStatement:
		*errOut = r.startLoop(s, frame.Env, "while", signalCallback)

	case *ast.ForRangeStatement:
		*errOut = r.startLoop(s, frame.Env, "range", signalCallback)

	case *ast.ForInStatement:
		*errOut = r.startLoop(s, frame.Env, "in", signalCallback)

	case *ast.Block:
		*errOut = r.runProtectedBlock(s, frame.Env, signalCallback)

	case *ast.ThrowStatement:
		*errOut = r.executeThrowStatement(s, frame.Env)

	case *ast.TryStatement:
		*errOut = r.executeTryStatement(s, frame, signalCallback)

	case *ast.DeleteStatement:
		*errOut = r.executeDelete(s, frame.Env)
	}
}

func (r *Runtime) pushBlock(blockNode *ast.Block, parentEnv *Environment) {
	if blockNode == nil {
		return
	}
	blockEnv := NewEnvironment(parentEnv)
	r.Stack = append(r.Stack, &StackFrame{Type: "Block", Env: blockEnv, Statements: blockNode.Statements})
}

func (r *Runtime) runProtectedBlock(blockNode *ast.Block, env *Environment, parentSignal func(int, any)) error {
	// A synchronous sub-execution for protected blocks to capture panics locally easily vs the main stack
	if blockNode == nil {
		return nil
	}

	frame := &StackFrame{Type: "Protected", Env: env, Statements: blockNode.Statements}
	var currentSignal int = SignalNone
	var signalVal any = nil

	for frame.PC < len(frame.Statements) {
		stmt := frame.Statements[frame.PC]
		frame.PC++

		var errOut error
		r.executeStatement(stmt, frame, func(sig int, val any) {
			currentSignal = sig
			signalVal = val
		}, &errOut)

		if errOut != nil {
			return errOut // propagates up immediately in try block
		}

		if currentSignal != SignalNone {
			parentSignal(currentSignal, signalVal)
			return nil
		}
	}
	return nil
}

func (r *Runtime) executeDelete(stmt *ast.DeleteStatement, env *Environment) error {
	t := stmt.Target
	obj, err := r.evaluate(t.Object, env)
	if err != nil {
		return err
	}
	idx, err := r.evaluate(t.Index, env)
	if err != nil {
		return err
	}

	if sm, isMap := obj.(*ShiftMap); isMap {
		idxStr, isStr := idx.(string)
		if !isStr {
			return fmt.Errorf("Runtime Error: Map key must be string")
		}
		if _, has := sm.Data[idxStr]; !has {
			return fmt.Errorf("Runtime Error: Map key does not exist.")
		}
		sm.Delete(idxStr)
	} else if arr, isArr := obj.([]any); isArr {
		idxF, isF := idx.(float64)
		if !isF || math.IsNaN(idxF) || math.IsInf(idxF, 0) || idxF != math.Trunc(idxF) {
			return fmt.Errorf("Runtime Error: List index must be integer value.")
		}
		idxI := int(idxF)
		if idxI < 0 {
			return fmt.Errorf("Runtime Error: List index must not be a negative number.")
		}
		if idxI >= len(arr) {
			return fmt.Errorf("Runtime Error: List index is out of bounds.")
		}
		newArr := make([]any, 0, len(arr)-1)
		newArr = append(newArr, arr[:idxI]...)
		newArr = append(newArr, arr[idxI+1:]...)

		return r.reassignLHS(t.Object, newArr, env)
	} else {
		return fmt.Errorf("Cannot delete")
	}
	return nil
}

func (r *Runtime) isTruthy(val any) bool {
	if val == nil {
		return false
	}
	if b, ok := val.(bool); ok {
		return b
	}
	if n, ok := val.(float64); ok {
		return n != 0
	}
	return true
}

func (r *Runtime) startLoop(stmt ast.Statement, env *Environment, lType string, parentSignal func(int, any)) error {
	var currentSignal int = SignalNone
	var signalVal any = nil

	handleSignals := func() bool {
		if currentSignal == SignalBreak {
			currentSignal = SignalNone
			signalVal = nil
			return true // break loop
		}
		if currentSignal == SignalSkip {
			currentSignal = SignalNone
			signalVal = nil
			return false // continue loop
		}
		if currentSignal == SignalReturn {
			parentSignal(SignalReturn, signalVal)
			return true // exit completely
		}
		return false
	}

	execBody := func(body *ast.Block, e *Environment) error {
		var errOut error
		for _, bStmt := range body.Statements {
			r.executeStatement(bStmt, &StackFrame{Type: "Protected", Env: e}, func(sig int, val any) {
				currentSignal = sig
				signalVal = val
			}, &errOut)

			if errOut != nil {
				return errOut
			}

			if currentSignal != SignalNone {
				return nil
			}
		}
		return nil
	}

	if lType == "range" {
		s := stmt.(*ast.ForRangeStatement)
		startVal, err := r.evaluate(s.StartValue, env)
		if err != nil {
			return err
		}
		endVal, err := r.evaluate(s.EndValue, env)
		if err != nil {
			return err
		}

		startF, ok1 := startVal.(float64)
		endF, ok2 := endVal.(float64)
		if !ok1 || !ok2 {
			return fmt.Errorf("Runtime Error: Range must be numbers")
		}

		step := 1.0
		if startF > endF {
			step = -1.0
		}

		for curr := startF; (step > 0 && curr <= endF) || (step < 0 && curr >= endF); curr += step {
			iterEnv := NewEnvironment(env)
			iterEnv.Define(s.Iterator, curr)
			err := execBody(s.Body, iterEnv)
			if err != nil {
				return err
			}
			if handleSignals() {
				break
			}
		}
	} else if lType == "while" {
		s := stmt.(*ast.WhileStatement)
		for {
			condVal, err := r.evaluate(s.Condition, env)
			if err != nil {
				return err
			}
			if !r.isTruthy(condVal) {
				break
			}

			iterEnv := NewEnvironment(env)
			err = execBody(s.Body, iterEnv)
			if err != nil {
				return err
			}
			if handleSignals() {
				break
			}
		}
	} else if lType == "in" {
		s := stmt.(*ast.ForInStatement)
		col, err := r.evaluate(s.Collection, env)
		if err != nil {
			return err
		}

		if arr, isArr := col.([]any); isArr {
			for i, v := range arr {
				iterEnv := NewEnvironment(env)
				if s.ValueIterator != "" {
					iterEnv.Define(s.Iterator, float64(i))
					iterEnv.Define(s.ValueIterator, v)
				} else {
					iterEnv.Define(s.Iterator, v)
				}
				err := execBody(s.Body, iterEnv)
				if err != nil {
					return err
				}
				if handleSignals() {
					break
				}
			}
		} else if sm, isMap := col.(*ShiftMap); isMap {
			for _, k := range sm.Keys {
				v := sm.Data[k]
				iterEnv := NewEnvironment(env)
				if s.ValueIterator != "" {
					iterEnv.Define(s.Iterator, k)
					iterEnv.Define(s.ValueIterator, v)
				} else {
					iterEnv.Define(s.Iterator, k)
				}
				err := execBody(s.Body, iterEnv)
				if err != nil {
					return err
				}
				if handleSignals() {
					break
				}
			}
		} else {
			return fmt.Errorf("Runtime Error: Not iterable")
		}
	}

	return nil
}

// VerifySafeRegex analyzes a regular expression pattern to detect potential ReDoS vulnerabilities.
func (r *Runtime) VerifySafeRegex(pattern string) bool {
	if backreferenceRegex.MatchString(pattern) {
		return false
	}
	if nestedQuantifiersRegex.MatchString(pattern) {
		return false
	}
	if overlappingQuantifiersRegex.MatchString(pattern) {
		return false
	}
	return true
}
