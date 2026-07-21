package stdlib

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"reflect"
	"time"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
)

// ToShift converts standard Go types (like slices and maps) to Shift-native types (like lists and ShiftMap).
func ToShift(val any) any {
	if val == nil {
		return nil
	}
	switch v := val.(type) {
	case []any:
		res := make([]any, len(v))
		for i, x := range v {
			res[i] = ToShift(x)
		}
		return res
	case map[string]any:
		m := runtime.NewShiftMap()
		for k, x := range v {
			m.Data[k] = ToShift(x)
		}
		return m
	default:
		return val
	}
}

func isFinite(f float64) bool {
	return !math.IsNaN(f) && !math.IsInf(f, 0)
}

func unwrapShared(arg any) any {
	if ref, ok := arg.(runtime.VariableRef); ok {
		val, _ := ref.Env.Get(ref.Name)
		return val
	}
	return arg
}

// ToJS converts Shift-native structures back to standard Go/JSON representations (map[string]any, []any).
func ToJS(val any) any {
	return toJSWithVisited(val, make(map[uintptr]any))
}

func toJSWithVisited(val any, visited map[uintptr]any) any {
	if val == nil {
		return nil
	}
	switch v := val.(type) {
	case *runtime.ShiftMap:
		ptr := reflect.ValueOf(v).Pointer()
		if ptr != 0 {
			if cached, exists := visited[ptr]; exists {
				return cached
			}
		}
		m := make(map[string]any)
		if ptr != 0 {
			visited[ptr] = m
		}
		for k, x := range v.Data {
			m[k] = toJSWithVisited(x, visited)
		}
		return m
	case []any:
		ptr := reflect.ValueOf(v).Pointer()
		if ptr != 0 {
			if cached, exists := visited[ptr]; exists {
				return cached
			}
		}
		res := make([]any, len(v))
		if ptr != 0 {
			visited[ptr] = res
		}
		for i, x := range v {
			res[i] = toJSWithVisited(x, visited)
		}
		return res
	default:
		return val
	}
}

// CreateDTStruct mapping time.Time values into Shift DateTime structures.
func CreateDTStruct(d time.Time) *runtime.ShiftMap {
	m := runtime.NewShiftMap()
	m.StructName = "DateTime"
	m.Data["year"] = float64(d.Year())
	m.Data["month"] = float64(d.Month())
	m.Data["day"] = float64(d.Day())
	m.Data["hour"] = float64(d.Hour())
	m.Data["minute"] = float64(d.Minute())
	m.Data["second"] = float64(d.Second())
	m.Data["millisecond"] = float64(d.Nanosecond() / 1e6)
	_, offset := d.Zone()
	m.Data["offset_minutes"] = float64(-offset / 60)
	loc, _ := d.Zone()
	m.Data["timezone"] = loc
	return m
}

// IntrinsicDef encapsulates metadata and the Go function pointer for a Shift stdlib intrinsic.
type IntrinsicDef struct {
	ReturnType string
	Generic    string
	Params     []ast.Parameter
	Func       func([]any, *runtime.Runtime) any
}

// Intrinsics maps intrinsic function names to their metadata and Go callbacks.
var Intrinsics = map[string]IntrinsicDef{
	"print_line": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "val", DataType: ast.TypeAnnotation{Name: "any"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			// Basic print line implementation
			fmt.Println(args[0])
			return nil
		},
	},
	"convert_jsonstring_to_map": {
		ReturnType: "map",
		Generic:    "any",
		Params:     []ast.Parameter{{Name: "json", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected string."})
			}
			var raw any
			err := json.Unmarshal([]byte(s), &raw)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: Invalid JSON string."})
			}
			m, ok := raw.(map[string]any)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: JSON string is not an object."})
			}
			return ToShift(m)
		},
	},
	"convert_jsonstring_to_list": {
		ReturnType: "list",
		Generic:    "any",
		Params:     []ast.Parameter{{Name: "json", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected string."})
			}
			var raw any
			err := json.Unmarshal([]byte(s), &raw)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: Invalid JSON string."})
			}
			l, ok := raw.([]any)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: JSON string is not a list."})
			}
			return ToShift(l)
		},
	},
	"convert_map_to_jsonstring": {
		ReturnType: "string",
		Params:     []ast.Parameter{{Name: "m", DataType: ast.TypeAnnotation{Name: "map", Generic: &ast.TypeAnnotation{Name: "any"}}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			val, ok := args[0].(*runtime.ShiftMap)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected map."})
			}
			b, err := json.Marshal(ToJS(val))
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: " + err.Error()})
			}
			return string(b)
		},
	},
	"convert_list_to_jsonstring": {
		ReturnType: "string",
		Params:     []ast.Parameter{{Name: "l", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			val, ok := args[0].([]any)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected list."})
			}
			b, err := json.Marshal(ToJS(val))
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: " + err.Error()})
			}
			return string(b)
		},
	},
	"generate_randomnumber": {
		ReturnType: "number",
		Params:     []ast.Parameter{},
		Func: func(args []any, rt *runtime.Runtime) any {
			return rand.Float64()
		},
	},
	"generate_randomint_from_range": {
		ReturnType: "number",
		Params: []ast.Parameter{
			{Name: "num_x", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "num_y", DataType: ast.TypeAnnotation{Name: "number"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			num_x, ok1 := args[0].(float64)
			num_y, ok2 := args[1].(float64)
			if !ok1 || !ok2 || !isFinite(num_x) || !isFinite(num_y) {
				panic(runtime.ShiftError{Message: "Runtime Error: Random range must be finite numbers."})
			}

			// Determine true boundaries using math.Min/Max
			min := int(math.Ceil(math.Min(num_x, num_y)))
			max := int(math.Floor(math.Max(num_x, num_y)))
			
			// rand.Intn requires n > 0
			rangeSize := max - min + 1
			if rangeSize <= 0 {
				return float64(min)
			}

			return float64(rand.Intn(rangeSize) + min)
		},
	},
	"get_datetime": {
		ReturnType: "DateTime",
		Params:     []ast.Parameter{},
		Func: func(args []any, rt *runtime.Runtime) any {
			return CreateDTStruct(time.Now())
		},
	},
	"get_datetime_as_unixtime": {
		ReturnType: "number",
		Params:     []ast.Parameter{},
		Func: func(args []any, rt *runtime.Runtime) any {
			return float64(time.Now().Unix())
		},
	},
	"get_datetime_as_iso8601": {
		ReturnType: "string",
		Params:     []ast.Parameter{},
		Func: func(args []any, rt *runtime.Runtime) any {
			return time.Now().UTC().Format(time.RFC3339)
		},
	},
	"convert_unixtime_to_datetime": {
		ReturnType: "DateTime",
		Params:     []ast.Parameter{{Name: "ts", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			ts, ok := args[0].(float64)
			if !ok || !isFinite(ts) {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected finite number."})
			}
			
			// Preserve sub-second precision (milliseconds)
			msec := math.Round(ts * 1000)
			return CreateDTStruct(time.Unix(int64(msec)/1000, (int64(msec)%1000)*1e6))
		},
	},
	"convert_iso8601_to_datetime": {
		ReturnType: "DateTime",
		Params:     []ast.Parameter{{Name: "iso", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			iso, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected string."})
			}
			t, err := time.Parse(time.RFC3339, iso)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: Invalid ISO8601 date string."})
			}
			return CreateDTStruct(t)
		},
	},
	"convert_datetime_to_unixtime": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "dt", DataType: ast.TypeAnnotation{Name: "DateTime"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			dt, ok := args[0].(*runtime.ShiftMap)
			if !ok || dt.StructName != "DateTime" {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected DateTime struct."})
			}
			y, okY := dt.Data["year"].(float64)
			m, okM := dt.Data["month"].(float64)
			d, okD := dt.Data["day"].(float64)
			h, okH := dt.Data["hour"].(float64)
			min, okMin := dt.Data["minute"].(float64)
			s, okS := dt.Data["second"].(float64)
			ms, okMs := dt.Data["millisecond"].(float64)
			if !okY || !okM || !okD || !okH || !okMin || !okS || !okMs {
				panic(runtime.ShiftError{Message: "Runtime Error: DateTime fields must be numbers."})
			}
			if !isFinite(y) || !isFinite(m) || !isFinite(d) || !isFinite(h) || !isFinite(min) || !isFinite(s) || !isFinite(ms) {
				panic(runtime.ShiftError{Message: "Runtime Error: DateTime fields must be finite numbers."})
			}

			t := time.Date(int(y), time.Month(m), int(d), int(h), int(min), int(s), int(ms)*1e6, time.Local)
			return float64(t.Unix())
		},
	},
	"convert_datetime_to_iso8601": {
		ReturnType: "string",
		Params:     []ast.Parameter{{Name: "dt", DataType: ast.TypeAnnotation{Name: "DateTime"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			dt, ok := args[0].(*runtime.ShiftMap)
			if !ok || dt.StructName != "DateTime" {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected DateTime struct."})
			}
			y, okY := dt.Data["year"].(float64)
			m, okM := dt.Data["month"].(float64)
			d, okD := dt.Data["day"].(float64)
			h, okH := dt.Data["hour"].(float64)
			min, okMin := dt.Data["minute"].(float64)
			s, okS := dt.Data["second"].(float64)
			ms, okMs := dt.Data["millisecond"].(float64)
			if !okY || !okM || !okD || !okH || !okMin || !okS || !okMs {
				panic(runtime.ShiftError{Message: "Runtime Error: DateTime fields must be numbers."})
			}
			if !isFinite(y) || !isFinite(m) || !isFinite(d) || !isFinite(h) || !isFinite(min) || !isFinite(s) || !isFinite(ms) {
				panic(runtime.ShiftError{Message: "Runtime Error: DateTime fields must be finite numbers."})
			}

			t := time.Date(int(y), time.Month(m), int(d), int(h), int(min), int(s), int(ms)*1e6, time.Local)
			return t.UTC().Format(time.RFC3339)
		},
	},
	"calc_sqrt": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_sqrt expects number."})
			}
			return math.Sqrt(n)
		},
	},
	"calc_log10": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_log10 expects number."})
			}
			return math.Log10(n)
		},
	},
	"calc_natlog": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_natlog expects number."})
			}
			return math.Log(n)
		},
	},
	"round_number": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: expected number."})
			}
			return math.Round(n)
		},
	},
	"round_number_up": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: expected number."})
			}
			return math.Ceil(n)
		},
	},
	"round_number_down": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: expected number."})
			}
			return math.Floor(n)
		},
	},
	"calc_absolute": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: expected number."})
			}
			return math.Abs(n)
		},
	},
	"calc_sin": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_sin expects number."})
			}
			return math.Sin(n)
		},
	},
	"calc_cos": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_cos expects number."})
			}
			return math.Cos(n)
		},
	},
	"calc_tan": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_tan expects number."})
			}
			return math.Tan(n)
		},
	},
	"calc_asin": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_asin expects number."})
			}
			return math.Asin(n)
		},
	},
	"calc_acos": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_acos expects number."})
			}
			return math.Acos(n)
		},
	},
	"calc_atan": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_atan expects number."})
			}
			return math.Atan(n)
		},
	},
	"calc_atan2": {
		ReturnType: "number",
		Params: []ast.Parameter{
			{Name: "y", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "x", DataType: ast.TypeAnnotation{Name: "number"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			y, okY := args[0].(float64)
			x, okX := args[1].(float64)
			if !okY || !okX {
				panic(runtime.ShiftError{Message: "Runtime Error: calc_atan2 expects numbers."})
			}
			return math.Atan2(y, x)
		},
	},
	"convert_deg_to_rad": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "deg", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			deg, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: convert_deg_to_rad expects number."})
			}
			return deg * (math.Pi / 180.0)
		},
	},
	"convert_rad_to_deg": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "rad", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			rad, ok := args[0].(float64)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: convert_rad_to_deg expects number."})
			}
			return rad * (180.0 / math.Pi)
		},
	},
	"get_substring": {
		ReturnType: "string",
		Params: []ast.Parameter{
			{Name: "input_str", DataType: ast.TypeAnnotation{Name: "string"}},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "end_index", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			input_str, ok1 := args[0].(string)
			start_index, ok2 := args[1].(float64)
			end_index := args[2]
			if !ok1 || !ok2 || !isFinite(start_index) {
				panic(runtime.ShiftError{Message: "Runtime Error: get_substring expects string and finite number."})
			}
			runes := []rune(input_str)
			n := len(runes)

			startIdx := int(start_index)
			if float64(startIdx) != start_index || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}

			true_end := n
			if end_index != nil {
				endVal, ok := end_index.(float64)
				if !ok || !isFinite(endVal) {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index must be a finite number."})
				}
				endIdx := int(endVal)
				if float64(endIdx) != endVal || endIdx < 0 || endIdx > n {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index out of bounds."})
				}
				if endIdx < startIdx {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index cannot be less than start_index."})
				}
				true_end = endIdx
			}
			return string(runes[startIdx:true_end])
		},
	},
	"transform_ansistring_to_uppercase": {
		ReturnType: "string",
		Params: []ast.Parameter{
			{Name: "input_str", DataType: ast.TypeAnnotation{Name: "string"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_ansistring_to_uppercase expects string."})
			}
			runes := []rune(s)
			for i, r := range runes {
				if r >= 97 && r <= 122 {
					runes[i] = r - 32
				}
			}
			return string(runes)
		},
	},
	"transform_ansistring_to_lowercase": {
		ReturnType: "string",
		Params: []ast.Parameter{
			{Name: "input_str", DataType: ast.TypeAnnotation{Name: "string"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_ansistring_to_lowercase expects string."})
			}
			runes := []rune(s)
			for i, r := range runes {
				if r >= 65 && r <= 90 {
					runes[i] = r + 32
				}
			}
			return string(runes)
		},
	},
	"trim_string": {
		ReturnType: "string",
		Params: []ast.Parameter{
			{Name: "input_str", DataType: ast.TypeAnnotation{Name: "string"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_string expects string."})
			}
			runes := []rune(s)
			start := 0
			end := len(runes)
			for start < end {
				r := runes[start]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					start++
				} else {
					break
				}
			}
			for end > start {
				r := runes[end-1]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					end--
				} else {
					break
				}
			}
			return string(runes[start:end])
		},
	},
	"trim_string_left": {
		ReturnType: "string",
		Params: []ast.Parameter{
			{Name: "input_str", DataType: ast.TypeAnnotation{Name: "string"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_string_left expects string."})
			}
			runes := []rune(s)
			start := 0
			end := len(runes)
			for start < end {
				r := runes[start]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					start++
				} else {
					break
				}
			}
			return string(runes[start:end])
		},
	},
	"trim_string_right": {
		ReturnType: "string",
		Params: []ast.Parameter{
			{Name: "input_str", DataType: ast.TypeAnnotation{Name: "string"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			s, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_string_right expects string."})
			}
			runes := []rune(s)
			start := 0
			end := len(runes)
			for end > start {
				r := runes[end-1]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					end--
				} else {
					break
				}
			}
			return string(runes[start:end])
		},
	},
	"get_sublist": {
		ReturnType: "list",
		Generic:    "any",
		Params: []ast.Parameter{
			{Name: "items", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "end_index", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			items, ok1 := unwrapShared(args[0]).([]any)
			start_index, ok2 := args[1].(float64)
			end_index := args[2]
			if !ok1 || !ok2 || !isFinite(start_index) {
				panic(runtime.ShiftError{Message: "Runtime Error: get_sublist expects list and finite number."})
			}
			n := len(items)
			startIdx := int(start_index)
			if float64(startIdx) != start_index || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}
			true_end := n
			if end_index != nil {
				endVal, ok := end_index.(float64)
				if !ok || !isFinite(endVal) {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index must be a finite number."})
				}
				endIdx := int(endVal)
				if float64(endIdx) != endVal || endIdx < 0 || endIdx > n {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index out of bounds."})
				}
				if endIdx < startIdx {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index cannot be less than start_index."})
				}
				true_end = endIdx
			}
			return items[startIdx:true_end]
		},
	},
	"trim_shared_string": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "string"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string expects a VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			if val == nil {
				return nil
			}
			box, ok := val.(*runtime.NullableBox)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string expects a NullableBox."})
			}
			if box.Value == nil {
				return nil
			}
			s, ok := box.Value.(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string expects a string payload."})
			}
			runes := []rune(s)
			start := 0
			end := len(runes)
			for start < end {
				r := runes[start]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					start++
				} else {
					break
				}
			}
			for end > start {
				r := runes[end-1]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					end--
				} else {
					break
				}
			}
			box.Value = string(runes[start:end])
			return nil
		},
	},
	"trim_shared_string_left": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "string"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string_left expects a VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			if val == nil {
				return nil
			}
			box, ok := val.(*runtime.NullableBox)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string_left expects a NullableBox."})
			}
			if box.Value == nil {
				return nil
			}
			s, ok := box.Value.(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string_left expects a string payload."})
			}
			runes := []rune(s)
			start := 0
			end := len(runes)
			for start < end {
				r := runes[start]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					start++
				} else {
					break
				}
			}
			box.Value = string(runes[start:end])
			return nil
		},
	},
	"trim_shared_string_right": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "string"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string_right expects a VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			if val == nil {
				return nil
			}
			box, ok := val.(*runtime.NullableBox)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string_right expects a NullableBox."})
			}
			if box.Value == nil {
				return nil
			}
			s, ok := box.Value.(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: trim_shared_string_right expects a string payload."})
			}
			runes := []rune(s)
			start := 0
			end := len(runes)
			for end > start {
				r := runes[end-1]
				if r == ' ' || r == '\r' || r == '\n' || r == '\t' {
					end--
				} else {
					break
				}
			}
			box.Value = string(runes[start:end])
			return nil
		},
	},
	"transform_shared_ansistring_to_uppercase": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "string"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_shared_ansistring_to_uppercase expects a VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			if val == nil {
				return nil
			}
			box, ok := val.(*runtime.NullableBox)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_shared_ansistring_to_uppercase expects a NullableBox."})
			}
			if box.Value == nil {
				return nil
			}
			s, ok := box.Value.(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_shared_ansistring_to_uppercase expects a string payload."})
			}
			runes := []rune(s)
			for i, r := range runes {
				if r >= 'a' && r <= 'z' {
					runes[i] = r - 32
				}
			}
			box.Value = string(runes)
			return nil
		},
	},
	"transform_shared_ansistring_to_lowercase": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "string"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_shared_ansistring_to_lowercase expects a VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			if val == nil {
				return nil
			}
			box, ok := val.(*runtime.NullableBox)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_shared_ansistring_to_lowercase expects a NullableBox."})
			}
			if box.Value == nil {
				return nil
			}
			s, ok := box.Value.(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: transform_shared_ansistring_to_lowercase expects a string payload."})
			}
			runes := []rune(s)
			for i, r := range runes {
				if r >= 'A' && r <= 'Z' {
					runes[i] = r + 32
				}
			}
			box.Value = string(runes)
			return nil
		},
	},
	"get_shared_substring": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "string"}}, Shared: true},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "end_index", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: get_shared_substring expects a VariableRef."})
			}
			startVal, ok1 := args[1].(float64)
			if !ok1 || !isFinite(startVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index must be a finite number."})
			}
			val, _ := ref.Env.Get(ref.Name)
			if val == nil {
				return nil
			}
			box, ok := val.(*runtime.NullableBox)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: get_shared_substring expects a NullableBox."})
			}
			if box.Value == nil {
				return nil
			}
			s, ok := box.Value.(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: get_shared_substring expects a string payload."})
			}
			runes := []rune(s)
			n := len(runes)
			startIdx := int(startVal)
			if float64(startIdx) != startVal || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}
			true_end := n
			if args[2] != nil {
				endVal, ok3 := args[2].(float64)
				if !ok3 || !isFinite(endVal) {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index must be a finite number."})
				}
				endIdx := int(endVal)
				if float64(endIdx) != endVal || endIdx < 0 || endIdx > n {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index out of bounds."})
				}
				if endIdx < startIdx {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index cannot be less than start_index."})
				}
				true_end = endIdx
			}
			box.Value = string(runes[startIdx:true_end])
			return nil
		},
	},
	"clear_shared_list": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: clear_shared_list expects VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			slice, ok := val.([]any)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: clear_shared_list expects list."})
			}
			ref.Env.Assign(ref.Name, slice[:0])
			return nil
		},
	},
	"clear_shared_map": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "map", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: clear_shared_map expects VariableRef."})
			}
			val, _ := ref.Env.Get(ref.Name)
			m, ok := val.(*runtime.ShiftMap)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: clear_shared_map expects map."})
			}
			m.Data = make(map[string]any)
			m.Keys = make([]string, 0)
			return nil
		},
	},
	"reserve_shared_list_capacity": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
			{Name: "extra_capacity", DataType: ast.TypeAnnotation{Name: "number"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref, ok := args[0].(runtime.VariableRef)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: reserve_shared_list_capacity expects VariableRef."})
			}
			capVal, ok1 := args[1].(float64)
			if !ok1 || !isFinite(capVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: extra_capacity must be a finite number."})
			}
			extraCap := int(capVal)
			if float64(extraCap) != capVal || extraCap < 0 {
				panic(runtime.ShiftError{Message: "Runtime Error: extra_capacity must be non-negative integer."})
			}
			val, _ := ref.Env.Get(ref.Name)
			slice, ok := val.([]any)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: reserve_shared_list_capacity expects list."})
			}
			newSlice := make([]any, len(slice), len(slice)+extraCap)
			copy(newSlice, slice)
			ref.Env.Assign(ref.Name, newSlice)
			return nil
		},
	},
	"append_shared_list": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
			{Name: "source", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref1, ok1 := args[0].(runtime.VariableRef)
			ref2, ok2 := args[1].(runtime.VariableRef)
			if !ok1 || !ok2 {
				panic(runtime.ShiftError{Message: "Runtime Error: append_shared_list expects VariableRefs."})
			}
			val1, _ := ref1.Env.Get(ref1.Name)
			val2, _ := ref2.Env.Get(ref2.Name)
			slice1, isSlice1 := val1.([]any)
			slice2, isSlice2 := val2.([]any)
			if !isSlice1 || !isSlice2 {
				panic(runtime.ShiftError{Message: "Runtime Error: append_shared_list expects lists."})
			}
			ref1.Env.Assign(ref1.Name, append(slice1, slice2...))
			return nil
		},
	},
	"find_next_byte": {
		ReturnType: "number",
		Params: []ast.Parameter{
			{Name: "bytes", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}, Shared: true},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "target_bytes", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			bytesVal := unwrapShared(args[0])
			startVal, ok1 := args[1].(float64)
			targetVal, ok2 := args[2].([]any)
			if !ok1 || !ok2 || !isFinite(startVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: find_next_byte expects start_index and target_bytes."})
			}
			bytesList, ok3 := bytesVal.([]any)
			if !ok3 {
				panic(runtime.ShiftError{Message: "Runtime Error: find_next_byte expects list for bytes."})
			}
			n := len(bytesList)
			startIdx := int(startVal)
			if float64(startIdx) != startVal || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}
			targets := make(map[float64]bool)
			for _, t := range targetVal {
				f, ok := t.(float64)
				if !ok {
					panic(runtime.ShiftError{Message: "Runtime Error: target_bytes must contain numbers."})
				}
				targets[f] = true
			}
			for i := startIdx; i < n; i++ {
				f, ok := bytesList[i].(float64)
				if ok && targets[f] {
					return float64(i)
				}
			}
			return float64(-1)
		},
	},
	"find_next_non_matching_byte": {
		ReturnType: "number",
		Params: []ast.Parameter{
			{Name: "bytes", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}, Shared: true},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "ignore_bytes", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			bytesVal := unwrapShared(args[0])
			startVal, ok1 := args[1].(float64)
			ignoreVal, ok2 := args[2].([]any)
			if !ok1 || !ok2 || !isFinite(startVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: find_next_non_matching_byte expects start_index and ignore_bytes."})
			}
			bytesList, ok3 := bytesVal.([]any)
			if !ok3 {
				panic(runtime.ShiftError{Message: "Runtime Error: find_next_non_matching_byte expects list for bytes."})
			}
			n := len(bytesList)
			startIdx := int(startVal)
			if float64(startIdx) != startVal || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}
			ignores := make(map[float64]bool)
			for _, t := range ignoreVal {
				f, ok := t.(float64)
				if !ok {
					panic(runtime.ShiftError{Message: "Runtime Error: ignore_bytes must contain numbers."})
				}
				ignores[f] = true
			}
			for i := startIdx; i < n; i++ {
				f, ok := bytesList[i].(float64)
				if !ok || !ignores[f] {
					return float64(i)
				}
			}
			return float64(-1)
		},
	},
	"find_next_sequence": {
		ReturnType: "number",
		Params: []ast.Parameter{
			{Name: "bytes", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}, Shared: true},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "sequence", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			bytesVal := unwrapShared(args[0])
			startVal, ok1 := args[1].(float64)
			seqVal, ok2 := args[2].([]any)
			if !ok1 || !ok2 || !isFinite(startVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: find_next_sequence expects start_index and sequence."})
			}
			bytesList, ok3 := bytesVal.([]any)
			if !ok3 {
				panic(runtime.ShiftError{Message: "Runtime Error: find_next_sequence expects list for bytes."})
			}
			n := len(bytesList)
			startIdx := int(startVal)
			if float64(startIdx) != startVal || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}
			m := len(seqVal)
			if m == 0 {
				return float64(startIdx)
			}
			for i := startIdx; i <= n-m; i++ {
				match := true
				for j := 0; j < m; j++ {
					if bytesList[i+j] != seqVal[j] {
						match = false
						break
					}
				}
				if match {
					return float64(i)
				}
			}
			return float64(-1)
		},
	},
	"count_byte_occurrences": {
		ReturnType: "number",
		Params: []ast.Parameter{
			{Name: "bytes", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "number"}}, Shared: true},
			{Name: "start_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "end_index", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "number"}}},
			{Name: "byte_code", DataType: ast.TypeAnnotation{Name: "number"}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			bytesVal := unwrapShared(args[0])
			startVal, ok1 := args[1].(float64)
			byteVal, ok2 := args[3].(float64)
			if !ok1 || !ok2 || !isFinite(startVal) || !isFinite(byteVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: count_byte_occurrences expects start_index and byte_code."})
			}
			bytesList, ok3 := bytesVal.([]any)
			if !ok3 {
				panic(runtime.ShiftError{Message: "Runtime Error: count_byte_occurrences expects list for bytes."})
			}
			n := len(bytesList)
			startIdx := int(startVal)
			if float64(startIdx) != startVal || startIdx < 0 || startIdx > n {
				panic(runtime.ShiftError{Message: "Runtime Error: start_index out of bounds."})
			}
			trueEnd := n
			if args[2] != nil {
				endVal, ok := args[2].(float64)
				if !ok || !isFinite(endVal) {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index must be a finite number."})
				}
				endIdx := int(endVal)
				if float64(endIdx) != endVal || endIdx < startIdx || endIdx > n {
					panic(runtime.ShiftError{Message: "Runtime Error: end_index out of bounds."})
				}
				trueEnd = endIdx
			}
			count := 0
			for i := startIdx; i < trueEnd; i++ {
				if bytesList[i] == byteVal {
					count++
				}
			}
			return float64(count)
		},
	},
	"copy_shared_list_slice": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
			{Name: "dest_index", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "source", DataType: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
			{Name: "source_start", DataType: ast.TypeAnnotation{Name: "number"}},
			{Name: "source_end", DataType: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref1, ok1 := args[0].(runtime.VariableRef)
			destVal, ok2 := args[1].(float64)
			sourceVal := unwrapShared(args[2])
			startVal, ok3 := args[3].(float64)
			if !ok1 || !ok2 || !ok3 || !isFinite(destVal) || !isFinite(startVal) {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_shared_list_slice expects target ref, dest_index, source list, and source_start."})
			}
			val1, _ := ref1.Env.Get(ref1.Name)
			targetSlice, ok4 := val1.([]any)
			sourceSlice, ok5 := sourceVal.([]any)
			if !ok4 || !ok5 {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_shared_list_slice expects list types."})
			}
			destIdx := int(destVal)
			if float64(destIdx) != destVal || destIdx < 0 || destIdx > len(targetSlice) {
				panic(runtime.ShiftError{Message: "Runtime Error: dest_index out of bounds."})
			}
			startIdx := int(startVal)
			if float64(startIdx) != startVal || startIdx < 0 || startIdx > len(sourceSlice) {
				panic(runtime.ShiftError{Message: "Runtime Error: source_start out of bounds."})
			}
			trueSourceEnd := len(sourceSlice)
			if args[4] != nil {
				endVal, ok := args[4].(float64)
				if !ok || !isFinite(endVal) {
					panic(runtime.ShiftError{Message: "Runtime Error: source_end must be a finite number."})
				}
				endIdx := int(endVal)
				if float64(endIdx) != endVal || endIdx < startIdx || endIdx > len(sourceSlice) {
					panic(runtime.ShiftError{Message: "Runtime Error: source_end out of bounds."})
				}
				trueSourceEnd = endIdx
			}
			sliceToCopy := sourceSlice[startIdx:trueSourceEnd]
			neededLen := destIdx + len(sliceToCopy)
			if neededLen > len(targetSlice) {
				newTarget := make([]any, neededLen)
				copy(newTarget, targetSlice)
				targetSlice = newTarget
			}
			for i, v := range sliceToCopy {
				targetSlice[destIdx+i] = v
			}
			ref1.Env.Assign(ref1.Name, targetSlice)
			return nil
		},
	},
	"merge_shared_map": {
		ReturnType: "none",
		Params: []ast.Parameter{
			{Name: "target", DataType: ast.TypeAnnotation{Name: "map", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
			{Name: "source", DataType: ast.TypeAnnotation{Name: "map", Generic: &ast.TypeAnnotation{Name: "any"}}, Shared: true},
		},
		Func: func(args []any, rt *runtime.Runtime) any {
			ref1, ok1 := args[0].(runtime.VariableRef)
			ref2, ok2 := args[1].(runtime.VariableRef)
			if !ok1 || !ok2 {
				panic(runtime.ShiftError{Message: "Runtime Error: merge_shared_map expects VariableRefs."})
			}
			val1, _ := ref1.Env.Get(ref1.Name)
			val2, _ := ref2.Env.Get(ref2.Name)
			map1, isMap1 := val1.(*runtime.ShiftMap)
			map2, isMap2 := val2.(*runtime.ShiftMap)
			if !isMap1 || !isMap2 {
				panic(runtime.ShiftError{Message: "Runtime Error: merge_shared_map expects maps."})
			}
			for _, k := range map2.Keys {
				map1.Set(k, map2.Data[k])
			}
			return nil
		},
	},
	"read_file": {
		ReturnType: "string",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: read_file is disabled in core mode."})
		},
	},
	"write_file": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "content", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: write_file is disabled in core mode."})
		},
	},
	"create_file": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: create_file is disabled in core mode."})
		},
	},
	"delete_file": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: delete_file is disabled in core mode."})
		},
	},
	"file_exists": {
		ReturnType: "bool",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: file_exists is disabled in core mode."})
		},
	},
	"copy_file": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: copy_file is disabled in core mode."})
		},
	},
	"move_file": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: move_file is disabled in core mode."})
		},
	},
	"create_folder": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: create_folder is disabled in core mode."})
		},
	},
	"delete_folder": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: delete_folder is disabled in core mode."})
		},
	},
	"folder_exists": {
		ReturnType: "bool",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: folder_exists is disabled in core mode."})
		},
	},
	"copy_folder": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: copy_folder is disabled in core mode."})
		},
	},
	"move_folder": {
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			panic(runtime.ShiftError{Message: "Runtime Error: move_folder is disabled in core mode."})
		},
	},
}

// StructDef defines the custom struct types declared by the Shift standard library.
type StructDef struct {
	Name   string
	Fields []ast.StructField
}

// Structs lists all the standard library struct types (e.g. DateTime, RegexResult, InspectionResult).
var Structs = []StructDef{
	{
		Name: "DateTime",
		Fields: []ast.StructField{
			{Name: "year", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "month", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "day", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "hour", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "minute", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "second", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "millisecond", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "offset_minutes", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "timezone", Type: ast.TypeAnnotation{Name: "string"}},
		},
	},
	{
		Name: "RegexResult",
		Fields: []ast.StructField{
			{Name: "match", Type: ast.TypeAnnotation{Name: "string"}},
			{Name: "start", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "end", Type: ast.TypeAnnotation{Name: "number"}},
			{Name: "groups", Type: ast.TypeAnnotation{Name: "list", Generic: &ast.TypeAnnotation{Name: "string"}}},
		},
	},
	{
		Name: "InspectionResult",
		Fields: []ast.StructField{
			{Name: "$type", Type: ast.TypeAnnotation{Name: "string"}},
			{Name: "$size", Type: ast.TypeAnnotation{Name: "nullable", Generic: &ast.TypeAnnotation{Name: "number"}}},
		},
	},
}

// Source holds the embedded source code of the Shift standard library written in Shift itself.
//go:embed stdlib.shift
var Source string

// LoadDefinitions registers standard library structs and intrinsics in the parser context for type checking.
func LoadDefinitions(p *parser.Parser) {
	for _, s := range Structs {
		p.AddKnownType(s.Name)
		p.AddStructDefinition(s.Name, parser.StructDef{Fields: s.Fields})
	}

	for name, def := range Intrinsics {
		typ := parser.TypeDef{Type: "Type", Name: def.ReturnType, Initialized: true, Params: def.Params}
		if def.Generic != "" {
			typ.Generic = &ast.TypeAnnotation{Name: def.Generic}
		}
		p.AddGlobalVariable(name, typ)
	}
}

// LoadIntrinsics binds standard library intrinsic functions to a Runtime context.
func LoadIntrinsics(r *runtime.Runtime) {
	for name, def := range Intrinsics {
		paramCount := len(def.Params)
		intrinsicFunc := def.Func
		intrinsicName := name
		wrappedFunc := func(args []any, rt *runtime.Runtime) any {
			if len(args) < paramCount {
				panic(runtime.ShiftError{Message: fmt.Sprintf("Runtime Error: Intrinsic '%s' expects %d arguments but got %d.", intrinsicName, paramCount, len(args))})
			}
			return intrinsicFunc(args, rt)
		}
		r.AddIntrinsic(name, wrappedFunc)
	}
}
