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

type IntrinsicDef struct {
	ReturnType string
	Generic    string
	Params     []ast.Parameter
	Func       func([]any, *runtime.Runtime) any
}

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

type StructDef struct {
	Name   string
	Fields []ast.StructField
}

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

//go:embed stdlib.shift
var Source string

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
