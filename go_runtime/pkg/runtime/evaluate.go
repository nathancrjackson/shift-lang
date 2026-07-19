package runtime

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
)

// EvaluateTest parses and evaluates an AST expression using the global environment (primarily for testing purposes).
func (r *Runtime) EvaluateTest(expr ast.Expression) (any, error) {
	return r.evaluate(expr, r.GlobalEnv)
}

func (r *Runtime) evaluate(expr ast.Expression, env *Environment) (any, error) {
	if expr == nil {
		return nil, nil
	}
	if env == nil {
		return nil, fmt.Errorf("Runtime Error: Environment cannot be nil during evaluation")
	}

	r.trace("RUNTIME", "Eval", map[string]any{"nodeType": expr.NodeType(), "line": expr.GetLine()})

	switch e := expr.(type) {
	case *ast.Literal:
		return e.Value, nil
	case *ast.MagicVariable:
		if e.Name == "$line_num" {
			v, _ := r.GlobalEnv.Get("$line_num")
			return v, nil
		}
		if e.Name == "$pipe_value" {
			v, _ := env.Get("$pipe_value")
			return v, nil
		}
		v, err := env.Get(e.Name)
		return v, err
	case *ast.Variable:
		return env.Get(e.Name)
	case *ast.ListLiteral:
		list := make([]any, 0, len(e.Elements))
		for _, el := range e.Elements {
			v, err := r.evaluate(el, env)
			if err != nil {
				return nil, err
			}
			list = append(list, v)
		}
		return list, nil
	case *ast.MapLiteral:
		m := NewShiftMap()
		for _, entry := range e.Entries {
			k, err := r.evaluate(entry.Key, env)
			if err != nil {
				return nil, err
			}
			kStr, ok := k.(string)
			if !ok {
				return nil, fmt.Errorf("Map literal keys must be string")
			}
			v, err := r.evaluate(entry.Value, env)
			if err != nil {
				return nil, err
			}
			m.Set(kStr, v)
		}
		return m, nil
	case *ast.StructLiteral:
		m := NewShiftMap()
		m.StructName = e.StructName
		for _, entry := range e.Entries {
			k, err := r.evaluate(entry.Key, env)
			if err != nil {
				return nil, err
			}
			kStr, ok := k.(string)
			if !ok {
				return nil, fmt.Errorf("Struct literal keys must be string")
			}
			v, err := r.evaluate(entry.Value, env)
			if err != nil {
				return nil, err
			}
			m.Set(kStr, v)
		}
		return m, nil
	case *ast.Assignment:
		if strings.HasPrefix(e.Name, "$") {
			return nil, fmt.Errorf("Runtime Error: Cannot assign to magic variable '%s'.", e.Name)
		}
		val, err := r.evaluate(e.Value, env)
		if err != nil {
			return nil, err
		}
		val = r.deepCopy(val)
		err = env.Assign(e.Name, val)
		return val, err
	case *ast.IndexAssignment:
		container, err := r.evaluate(e.Object, env)
		if err != nil {
			return nil, err
		}
		val, err := r.evaluate(e.Value, env)
		if err != nil {
			return nil, err
		}
		val = r.deepCopy(val)

		if container == nil {
			idx, iErr := r.evaluate(e.Index, env)
			if iErr != nil {
				return nil, iErr
			}
			switch idx.(type) {
			case float64:
				return nil, fmt.Errorf("Runtime Error: Cannot access index on null value.")
			case string:
				return nil, fmt.Errorf("Runtime Error: Cannot access key on null value.")
			}
			return nil, fmt.Errorf("Runtime Error: Cannot assign to null.")
		}

		if arr, ok := container.([]any); ok {
			if e.Index == nil {
				arr = append(arr, val)
				err := r.reassignLHS(e.Object, arr, env)
				if err != nil {
					return nil, err
				}
				return val, nil
			}

			idxRaw, idxErr := r.evaluate(e.Index, env)
			if idxErr != nil {
				return nil, idxErr
			}
			idxF, isF := idxRaw.(float64)
			if !isF || math.IsNaN(idxF) || math.IsInf(idxF, 0) || idxF != math.Trunc(idxF) {
				return nil, fmt.Errorf("Runtime Error: List index must be integer value.")
			}
			idxI := int(idxF)
			if idxI < 0 {
				return nil, fmt.Errorf("Runtime Error: List index must not be a negative number.")
			}
			if idxI >= len(arr) {
				return nil, fmt.Errorf("Runtime Error: List index is out of bounds.")
			}
			arr[idxI] = val
			return val, nil
		}

		if m, ok := container.(*ShiftMap); ok {
			if e.Index == nil {
				return nil, fmt.Errorf("Runtime Error: Map requires a key.")
			}
			keyRaw, err := r.evaluate(e.Index, env)
			if err != nil {
				return nil, err
			}
			keyStr, isStr := keyRaw.(string)
			if !isStr {
				return nil, fmt.Errorf("Runtime Error: Map keys must be strings.")
			}
			m.Set(keyStr, val)
			return val, nil
		}

		return nil, fmt.Errorf("Runtime Error: Invalid assignment target.")

	case *ast.BinaryExpression:
		return r.evaluateBinary(e, env)
	case *ast.UnaryExpression:
		return r.evaluateUnary(e, env)
	case *ast.Grouping:
		return r.evaluate(e.Expression, env)
	case *ast.PipelineExpression:
		left, err := r.evaluate(e.Left, env)
		if err != nil {
			return nil, err
		}
		prevVal, hasPrev := env.Values["$pipe_value"]
		env.Define("$pipe_value", left)
		res, err := r.evaluate(e.Right, env)
		if hasPrev {
			env.Define("$pipe_value", prevVal)
		} else {
			delete(env.Values, "$pipe_value")
		}
		return res, err
	case *ast.IndexExpression:
		return r.evaluateIndex(e, env)
	case *ast.CallExpression:
		args := make([]any, len(e.Arguments))
		for i, a := range e.Arguments {
			argVal, err := r.evaluate(a, env)
			if err != nil {
				return nil, err
			}
			args[i] = argVal
		}
		return r.RunFunction(e.Callee, args)
	case *ast.CastExpression:
		return r.evaluateCast(e, env)
	default:
		return r.evaluateRest(expr, env)
	}
}

func (r *Runtime) evaluateInspect(e *ast.InspectExpression, env *Environment) (any, error) {
	val, err := r.evaluate(e.Argument, env)
	if err != nil {
		return nil, err
	}
	m := NewShiftMap()
	typ := "any"
	var size any = nil

	if val == nil {
		typ = "null"
	} else if arr, ok := val.([]any); ok {
		typ = "list"
		size = float64(len(arr))
	} else if sm, ok := val.(*ShiftMap); ok {
		if sm.StructName != "" {
			typ = sm.StructName
		} else {
			typ = "map"
		}
		size = float64(len(sm.Data))
	} else if _, ok := val.(float64); ok {
		typ = "number"
	} else if s, ok := val.(string); ok {
		typ = "string"
		size = float64(len(s))
	} else if _, ok := val.(bool); ok {
		typ = "bool"
	}

	m.Data["$type"] = typ
	m.Data["$size"] = size
	return m, nil
}

func (r *Runtime) evaluateSizeOf(e *ast.SizeOfExpression, env *Environment) (any, error) {
	val, err := r.evaluate(e.Argument, env)
	if err != nil {
		return nil, err
	}
	if arr, ok := val.([]any); ok {
		return float64(len(arr)), nil
	}
	if m, ok := val.(*ShiftMap); ok {
		return float64(len(m.Data)), nil
	}
	if s, ok := val.(string); ok {
		return float64(len(s)), nil
	}
	return nil, fmt.Errorf("Runtime Error: Cannot get size of primitive types")
}

func (r *Runtime) evaluatePack(e *ast.PackExpression, env *Environment) (any, error) {
	val, err := r.evaluate(e.Argument, env)
	if err != nil {
		return nil, err
	}
	if arr, ok := val.([]any); ok {
		var sb strings.Builder
		for _, v := range arr {
			if num, ok := v.(float64); ok {
				sb.WriteRune(rune(num))
			}
		}
		return sb.String(), nil
	}
	return nil, fmt.Errorf("Pack requires list of numbers")
}

func (r *Runtime) evaluateUnpack(e *ast.UnpackExpression, env *Environment) (any, error) {
	val, err := r.evaluate(e.Argument, env)
	if err != nil {
		return nil, err
	}
	str := r.stringify(val)
	res := make([]any, len(str))
	for i, char := range str {
		res[i] = float64(char)
	}
	return res, nil
}

func (r *Runtime) evaluateTypeOf(e *ast.TypeOfExpression, env *Environment) (any, error) {
	val, err := r.evaluate(e.Argument, env)
	if err != nil {
		return nil, err
	}
	return r.getTypeName(val), nil
}

func (r *Runtime) evaluateRest(expr ast.Expression, env *Environment) (any, error) {
	switch e := expr.(type) {
	case *ast.InspectExpression:
		return r.evaluateInspect(e, env)

	case *ast.SizeOfExpression:
		return r.evaluateSizeOf(e, env)

	case *ast.PackExpression:
		return r.evaluatePack(e, env)

	case *ast.UnpackExpression:
		return r.evaluateUnpack(e, env)

	case *ast.TypeOfExpression:
		return r.evaluateTypeOf(e, env)

	case *ast.IsExpression:
		return r.evaluateIs(e, env)

	case *ast.ReplaceExpression:
		return r.evaluateReplace(e, env)

	case *ast.SplitExpression:
		srcRaw, _ := r.evaluate(e.Source, env)
		delRaw, _ := r.evaluate(e.Delimiter, env)
		src := r.stringify(srcRaw)
		del := r.stringify(delRaw)
		parts := strings.Split(src, del)
		res := make([]any, len(parts))
		for i, p := range parts {
			res[i] = p
		}
		return res, nil

	case *ast.JoinExpression:
		srcRaw, _ := r.evaluate(e.Source, env)
		delRaw, _ := r.evaluate(e.Delimiter, env)
		arr, ok := srcRaw.([]any)
		if !ok {
			return nil, fmt.Errorf("Runtime Error: Join requires a list.")
		}
		del := r.stringify(delRaw)
		strParts := make([]string, len(arr))
		for i, p := range arr {
			strParts[i] = r.stringify(p)
		}
		return strings.Join(strParts, del), nil

	case *ast.ShareExpression:
		return r.evaluate(e.Argument, env)

	default:
		return nil, fmt.Errorf("Unknown expression %s", expr.NodeType())
	}
}

func (r *Runtime) evaluateIndex(expr *ast.IndexExpression, env *Environment) (any, error) {
	obj, err := r.evaluate(expr.Object, env)
	if err != nil {
		return nil, err
	}
	idx, err := r.evaluate(expr.Index, env)
	if err != nil {
		return nil, err
	}

	if obj == nil {
		switch idx.(type) {
		case float64:
			return nil, fmt.Errorf("Runtime Error: Cannot access index on null value.")
		case string:
			return nil, fmt.Errorf("Runtime Error: Cannot access key on null value.")
		}
		return nil, fmt.Errorf("Runtime Error: Cannot read properties of null.")
	}

	if arr, ok := obj.([]any); ok {
		idxF, isF := idx.(float64)
		if !isF || math.IsNaN(idxF) || math.IsInf(idxF, 0) || idxF != math.Trunc(idxF) {
			return nil, fmt.Errorf("Runtime Error: List index must be integer value.")
		}
		idxI := int(idxF)
		if idxI < 0 {
			return nil, fmt.Errorf("Runtime Error: List index must not be a negative number.")
		}
		if idxI >= len(arr) {
			return nil, fmt.Errorf("Runtime Error: List index is out of bounds.")
		}
		return arr[idxI], nil
	}

	if m, ok := obj.(*ShiftMap); ok {
		keyStr, isStr := idx.(string)
		if !isStr {
			return nil, fmt.Errorf("Runtime Error: Map keys must be strings.")
		}
		if val, exists := m.Data[keyStr]; exists {
			return val, nil
		}
		return nil, fmt.Errorf("Runtime Error: Map key does not exist.")
	}

	return nil, fmt.Errorf("Runtime Error: Invalid index target.")
}

func (r *Runtime) getTypeName(val any) string {
	if val == nil {
		return "null"
	}
	switch v := val.(type) {
	case []any:
		return "list"
	case *ShiftMap:
		if v.StructName != "" {
			return v.StructName
		}
		return "map"
	case bool:
		return "bool"
	case float64:
		return "number"
	case string:
		return "string"
	}
	return "any"
}

func (r *Runtime) evaluateIs(expr *ast.IsExpression, env *Environment) (any, error) {
	val, err := r.evaluate(expr.Left, env)
	if err != nil {
		return nil, err
	}
	res := false
	check := expr.Check

	switch check {
	case "string":
		_, res = val.(string)
	case "number":
		_, res = val.(float64)
		if !res {
			if s, ok := val.(string); ok {
				if _, err := strconv.ParseFloat(s, 64); err == nil {
					res = true
				}
			}
		}
	case "bool":
		_, res = val.(bool)
		if !res {
			if s, ok := val.(string); ok {
				if s == "1" || s == "0" {
					res = true
				}
			}
		}
	case "list":
		_, res = val.([]any)
	case "map":
		_, res = val.(*ShiftMap)
	case "null":
		res = val == nil
	case "integer":
		if f, isF := val.(float64); isF && f == math.Trunc(f) {
			res = true
		} else if s, isS := val.(string); isS {
			if parsed, err := strconv.ParseFloat(s, 64); err == nil && parsed == math.Trunc(parsed) {
				res = true
			}
		}
	case "whitespace":
		if s, isS := val.(string); isS && strings.TrimSpace(s) == "" {
			res = true
		}
	case "alpha":
		if s, isS := val.(string); isS {
			matched, _ := regexp.MatchString(`^[a-zA-Z]+$`, s)
			res = matched
		}
	case "numeric":
		if s, isS := val.(string); isS {
			matched, _ := regexp.MatchString(`^[0-9]+$`, s)
			res = matched
		}
	case "alphanumeric":
		if s, isS := val.(string); isS {
			matched, _ := regexp.MatchString(`^[a-zA-Z0-9]+$`, s)
			res = matched
		}
	case "email":
		if s, isS := val.(string); isS {
			matched, _ := regexp.MatchString(`^[^\s@]+@[^\s@]+\.[^\s@]+$`, s)
			res = matched
		}
	default:
		return nil, fmt.Errorf("Unknown is check '%s'", check)
	}

	if expr.IsNot {
		return !res, nil
	}
	return res, nil
}

func (r *Runtime) evaluateReplace(expr *ast.ReplaceExpression, env *Environment) (any, error) {
	srcRaw, _ := r.evaluate(expr.Source, env)
	repRaw, _ := r.evaluate(expr.Replacement, env)
	patRaw, _ := r.evaluate(expr.Pattern, env)

	src := r.stringify(srcRaw)
	rep := r.stringify(repRaw)
	pat := r.stringify(patRaw)

	if strings.HasPrefix(pat, "/") && strings.LastIndex(pat, "/") > 0 {
		last := strings.LastIndex(pat, "/")
		pattern := pat[1:last]
		flags := pat[last+1:]

		isSafePattern := r.VerifySafeRegex(pattern)
		if !isSafePattern {
			if !r.AllowUnsafeRegexFallback {
				return nil, fmt.Errorf("Runtime Error: Strict Regex Protection prevents processing this complex pattern.")
			}
			if len(src) > r.UnsafeRegexMaxStringCeiling {
				return nil, fmt.Errorf("Runtime Error: Suspicious regex running on string size (%d) exceeding your fallback structural safety limit of %d characters.", len(src), r.UnsafeRegexMaxStringCeiling)
			}
		} else {
			if len(src) > 50000 {
				return nil, fmt.Errorf("Runtime Error: replace source string too large (ReDoS protection).")
			}
		}

		// Go regex doesn't exactly match JS flags, best effort:
		reStr := pattern
		if strings.Contains(flags, "i") {
			reStr = "(?i)" + pattern
		}

		re, err := regexp.Compile(reStr)
		if err != nil {
			return nil, fmt.Errorf("Runtime Error: Invalid regular expression in replace: %v", err)
		}
		return re.ReplaceAllString(src, rep), nil
	}
	return strings.ReplaceAll(src, pat, rep), nil
}

func (r *Runtime) evaluateCast(expr *ast.CastExpression, env *Environment) (any, error) {
	val, err := r.evaluate(expr.Value, env)
	if err != nil {
		return nil, err
	}
	target := expr.TargetType.Name
	sourceType := r.getTypeName(val)

	if sourceType == target {
		return val, nil
	}

	if target == "string" {
		if sourceType == "map" {
			return nil, fmt.Errorf("Runtime Error: Cannot cast map to string.")
		}
		if arr, ok := val.([]any); ok {
			var sb strings.Builder
			for _, v := range arr {
				sb.WriteString(r.stringify(v))
			}
			return sb.String(), nil
		}
		return r.stringify(val), nil
	}

	if target == "number" {
		if b, ok := val.(bool); ok {
			if b {
				return 1.0, nil
			}
			return 0.0, nil
		}
		if s, ok := val.(string); ok {
			n, err := strconv.ParseFloat(s, 64)
			if err != nil {
				return nil, fmt.Errorf("Runtime Error: Could not cast string to number.")
			}
			return n, nil
		}
		return nil, fmt.Errorf("Runtime Error: Cannot cast %s to number.", sourceType)
	}

	if target == "bool" {
		if s, ok := val.(string); ok {
			if s == "true" || s == "1" {
				return true, nil
			}
			if s == "false" || s == "0" {
				return false, nil
			}
			n, err := strconv.ParseFloat(s, 64)
			if err == nil {
				return n != 0, nil
			}
			return false, fmt.Errorf("Runtime Error: Could not cast string to bool.")
		}
		if n, ok := val.(float64); ok {
			return n != 0, nil
		}
		if b, ok := val.(bool); ok {
			return b, nil
		}
		return nil, fmt.Errorf("Runtime Error: Cannot cast %s to bool.", sourceType)
	}

	if target == "list" {
		if s, ok := val.(string); ok {
			res := make([]any, len(s))
			for i, char := range s {
				res[i] = string(char)
			}
			return res, nil
		}
		if arr, ok := val.([]any); ok {
			return arr, nil
		}
		return nil, fmt.Errorf("Runtime Error: Cannot cast %s to list.", sourceType)
	}

	return val, nil
}

func (r *Runtime) reassignLHS(target ast.Expression, val any, env *Environment) error {
	if v, ok := target.(*ast.Variable); ok {
		return env.Assign(v.Name, val)
	}
	if idxExp, ok := target.(*ast.IndexExpression); ok {
		o, err := r.evaluate(idxExp.Object, env)
		if err != nil {
			return err
		}
		i, err := r.evaluate(idxExp.Index, env)
		if err != nil {
			return err
		}
		if m, isM := o.(*ShiftMap); isM {
			keyStr, isStr := i.(string)
			if !isStr {
				return fmt.Errorf("Runtime Error: Map key must be string")
			}
			m.Set(keyStr, val)
			return nil
		}
		if a, isA := o.([]any); isA {
			idxF, isF := i.(float64)
			if !isF || math.IsNaN(idxF) || math.IsInf(idxF, 0) || idxF != math.Trunc(idxF) {
				return fmt.Errorf("Runtime Error: List index must be integer")
			}
			idxI := int(idxF)
			if idxI < 0 || idxI >= len(a) {
				return fmt.Errorf("Runtime Error: List index out of bounds")
			}
			a[idxI] = val
			return nil
		}
	}
	return fmt.Errorf("Runtime Error: Invalid target for reassignment")
}
