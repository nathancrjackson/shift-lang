package runtime

import (
	"fmt"
	"math"
	"regexp"
	"strings"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
)

const MaxStringLength = 10000

func (r *Runtime) evaluateBinary(expr *ast.BinaryExpression, env *Environment) (any, error) {
	left, err := r.evaluate(expr.Left, env)
	if err != nil {
		return nil, err
	}

	if expr.Operator == "and" {
		if !r.isTruthy(left) {
			return false, nil
		}
		right, err := r.evaluate(expr.Right, env)
		if err != nil {
			return nil, err
		}
		return r.isTruthy(right), nil
	}

	if expr.Operator == "or" {
		if r.isTruthy(left) {
			return true, nil
		}
		right, err := r.evaluate(expr.Right, env)
		if err != nil {
			return nil, err
		}
		return r.isTruthy(right), nil
	}

	if expr.Operator == "??" {
		if left != nil {
			return left, nil
		}
		return r.evaluate(expr.Right, env)
	}

	if expr.Operator == "xor" {
		right, err := r.evaluate(expr.Right, env)
		if err != nil {
			return nil, err
		}
		return r.isTruthy(left) != r.isTruthy(right), nil
	}

	right, err := r.evaluate(expr.Right, env)
	if err != nil {
		return nil, err
	}

	leftF, isLeftNum := left.(float64)
	rightF, isRightNum := right.(float64)

	switch expr.Operator {
	case "+":
		if isLeftNum && isRightNum {
			return leftF + rightF, nil
		}
		// String concatenation if one is string
		if _, isStr := left.(string); isStr {
			return r.stringify(left) + r.stringify(right), nil
		}
		if _, isStr := right.(string); isStr {
			return r.stringify(left) + r.stringify(right), nil
		}
		if isLeftNum && isRightNum {
			return leftF + rightF, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only add numbers or strings")

	case "-":
		if isLeftNum && isRightNum {
			return leftF - rightF, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only subtract numbers")

	case "*":
		if isLeftNum && isRightNum {
			return leftF * rightF, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only multiply numbers")

	case "/":
		if isLeftNum && isRightNum {
			if rightF == 0 {
				return nil, fmt.Errorf("Runtime Error: Division by zero.")
			}
			return leftF / rightF, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only divide numbers")

	case "%":
		if isLeftNum && isRightNum {
			if rightF == 0 {
				return nil, fmt.Errorf("Runtime Error: Modulo by zero.")
			}
			return math.Mod(leftF, rightF), nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only use modulo with numbers")

	case "^":
		if isLeftNum && isRightNum {
			return math.Pow(leftF, rightF), nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only power numbers")

	case "&":
		return r.stringify(left) + r.stringify(right), nil

	case "==":
		if leftStr, ok1 := left.(string); ok1 {
			if rightStr, ok2 := right.(string); ok2 {
				return leftStr == rightStr, nil
			}
		}
		return left == right, nil

	case "!=":
		if leftStr, ok1 := left.(string); ok1 {
			if rightStr, ok2 := right.(string); ok2 {
				return leftStr != rightStr, nil
			}
		}
		return left != right, nil

	case "<":
		if isLeftNum && isRightNum {
			return leftF < rightF, nil
		}
		// String comparison
		leftStr, isLeftStr := left.(string)
		rightStr, isRightStr := right.(string)
		if isLeftStr && isRightStr {
			return leftStr < rightStr, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only compare strings and numbers")

	case ">":
		if isLeftNum && isRightNum {
			return leftF > rightF, nil
		}
		leftStr, isLeftStr := left.(string)
		rightStr, isRightStr := right.(string)
		if isLeftStr && isRightStr {
			return leftStr > rightStr, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only compare strings and numbers")

	case "<=":
		if isLeftNum && isRightNum {
			return leftF <= rightF, nil
		}
		leftStr, isLeftStr := left.(string)
		rightStr, isRightStr := right.(string)
		if isLeftStr && isRightStr {
			return leftStr <= rightStr, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only compare strings and numbers")

	case ">=":
		if isLeftNum && isRightNum {
			return leftF >= rightF, nil
		}
		leftStr, isLeftStr := left.(string)
		rightStr, isRightStr := right.(string)
		if isLeftStr && isRightStr {
			return leftStr >= rightStr, nil
		}
		return nil, fmt.Errorf("Runtime Error: Can only compare strings and numbers")

	case "contains":
		if arr, isArr := left.([]any); isArr {
			for _, v := range arr {
				if v == right {
					return true, nil
				}
			}
			return false, nil
		}
		if s, isStr := left.(string); isStr {
			rStr := r.stringify(right)
			return strings.Contains(s, rStr), nil
		}
		return nil, fmt.Errorf("Runtime Error: 'contains' requires a list or string.")

	case "has":
		if sm, isMap := left.(*ShiftMap); isMap {
			rStr, isR := right.(string)
			if !isR {
				return nil, fmt.Errorf("Runtime Error: 'has' check requires a string key.")
			}
			_, exists := sm.Data[rStr]
			return exists, nil
		}
		return nil, fmt.Errorf("Runtime Error: 'has' operator only works on maps.")

	case "matches":
		str := r.stringify(left)
		regStr := r.stringify(right)
		lastSlash := strings.LastIndex(regStr, "/")
		if !strings.HasPrefix(regStr, "/") || lastSlash <= 0 {
			return nil, fmt.Errorf("Runtime Error: Invalid regular expression in matches: %v", regStr)
		}
		pattern := regStr[1:lastSlash]
		flags := regStr[lastSlash+1:]

		isSafePattern := r.VerifySafeRegex(pattern)
		if !isSafePattern {
			if !r.AllowUnsafeRegexFallback {
				return nil, fmt.Errorf("Runtime Error: Strict Regex Protection prevents processing this complex pattern.")
			}
			if len(str) > r.UnsafeRegexMaxStringCeiling {
				return nil, fmt.Errorf("Runtime Error: Suspicious regex running on string size (%d) exceeding your fallback structural safety limit of %d characters.", len(str), r.UnsafeRegexMaxStringCeiling)
			}
		} else {
			if len(str) > 50000 {
				return nil, fmt.Errorf("Runtime Error: matches string too large (ReDoS protection).")
			}
		}

		reStr := pattern
		if strings.Contains(flags, "i") {
			reStr = "(?i)" + pattern
		}

		re, err := regexp.Compile(reStr)
		if err != nil {
			return nil, fmt.Errorf("Runtime Error: Invalid regular expression in matches: %v", err)
		}
		return re.MatchString(str), nil

	case "search":
		str := r.stringify(left)
		regStr := r.stringify(right)
		lastSlash := strings.LastIndex(regStr, "/")
		if !strings.HasPrefix(regStr, "/") || lastSlash <= 0 {
			return nil, fmt.Errorf("Runtime Error: Invalid regular expression in search: %v", regStr)
		}
		pattern := regStr[1:lastSlash]
		flags := regStr[lastSlash+1:]

		isSafePattern := r.VerifySafeRegex(pattern)
		if !isSafePattern {
			if !r.AllowUnsafeRegexFallback {
				return nil, fmt.Errorf("Runtime Error: Strict Regex Protection prevents processing this complex pattern.")
			}
			if len(str) > r.UnsafeRegexMaxStringCeiling {
				return nil, fmt.Errorf("Runtime Error: Suspicious regex running on string size (%d) exceeding your fallback structural safety limit of %d characters.", len(str), r.UnsafeRegexMaxStringCeiling)
			}
		} else {
			if len(str) > 50000 {
				return nil, fmt.Errorf("Runtime Error: search string too large (ReDoS protection).")
			}
		}

		reStr := pattern
		if strings.Contains(flags, "i") {
			reStr = "(?i)" + pattern
		}

		re, err := regexp.Compile(reStr)
		if err != nil {
			return nil, fmt.Errorf("Runtime Error: Invalid regular expression in search: %v", err)
		}

		isGlobal := strings.Contains(flags, "g")
		var results []any

		if !isGlobal {
			match := re.FindStringSubmatchIndex(str)
			if match != nil {
				resMap := NewShiftMap()
				resMap.StructName = "RegexResult"
				resMap.Data["match"] = str[match[0]:match[1]]
				resMap.Data["start"] = float64(match[0])
				resMap.Data["end"] = float64(match[1])

				var groups []any
				for i := 2; i < len(match); i += 2 {
					if match[i] == -1 {
						groups = append(groups, nil)
					} else {
						groups = append(groups, str[match[i]:match[i+1]])
					}
				}
				resMap.Data["groups"] = groups
				results = append(results, resMap)
			}
		} else {
			matches := re.FindAllStringSubmatchIndex(str, -1)
			for _, match := range matches {
				resMap := NewShiftMap()
				resMap.StructName = "RegexResult"
				resMap.Data["match"] = str[match[0]:match[1]]
				resMap.Data["start"] = float64(match[0])
				resMap.Data["end"] = float64(match[1])

				var groups []any
				for i := 2; i < len(match); i += 2 {
					if match[i] == -1 {
						groups = append(groups, nil)
					} else {
						groups = append(groups, str[match[i]:match[i+1]])
					}
				}
				resMap.Data["groups"] = groups
				results = append(results, resMap)
			}
		}
		return results, nil
	}

	return nil, fmt.Errorf("Unknown op %s", expr.Operator)
}

func (r *Runtime) evaluateUnary(expr *ast.UnaryExpression, env *Environment) (any, error) {
	val, err := r.evaluate(expr.Argument, env)
	if err != nil {
		return nil, err
	}
	if expr.Operator == "not" || expr.Operator == "!" {
		return !r.isTruthy(val), nil
	}
	if expr.Operator == "-" {
		if f, isNum := val.(float64); isNum {
			return -f, nil
		}
	}
	return nil, nil
}
