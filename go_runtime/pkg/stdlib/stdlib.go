package stdlib

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
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

func ToJS(val any) any {
	if val == nil {
		return nil
	}
	switch v := val.(type) {
	case *runtime.ShiftMap:
		m := make(map[string]any)
		for k, x := range v.Data {
			m[k] = ToJS(x)
		}
		return m
	case []any:
		res := make([]any, len(v))
		for i, x := range v {
			res[i] = ToJS(x)
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
			s, _ := args[0].(string)
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
			s, _ := args[0].(string)
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
			if !ok1 || !ok2 {
				panic(runtime.ShiftError{Message: "Runtime Error: Random range must be numbers."})
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
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected number."})
			}
			
			// Preserve sub-second precision (milliseconds/nanoseconds)
			sec, dec := math.Modf(ts)
			return CreateDTStruct(time.Unix(int64(sec), int64(dec*1e9)))
		},
	},
	"convert_iso8601_to_datetime": {
		ReturnType: "DateTime",
		Params:     []ast.Parameter{{Name: "iso", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			iso, _ := args[0].(string)
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
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected DateTime struct."})
			}
			y, _ := dt.Data["year"].(float64)
			m, _ := dt.Data["month"].(float64)
			d, _ := dt.Data["day"].(float64)
			h, _ := dt.Data["hour"].(float64)
			min, _ := dt.Data["minute"].(float64)
			s, _ := dt.Data["second"].(float64)
			ms, _ := dt.Data["millisecond"].(float64)

			t := time.Date(int(y), time.Month(m), int(d), int(h), int(min), int(s), int(ms)*1e6, time.Local)
			return float64(t.Unix())
		},
	},
	"convert_datetime_to_iso8601": {
		ReturnType: "string",
		Params:     []ast.Parameter{{Name: "dt", DataType: ast.TypeAnnotation{Name: "DateTime"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			dt, ok := args[0].(*runtime.ShiftMap)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: Expected DateTime struct."})
			}
			y, _ := dt.Data["year"].(float64)
			m, _ := dt.Data["month"].(float64)
			d, _ := dt.Data["day"].(float64)
			h, _ := dt.Data["hour"].(float64)
			min, _ := dt.Data["minute"].(float64)
			s, _ := dt.Data["second"].(float64)
			ms, _ := dt.Data["millisecond"].(float64)

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
			n, _ := args[0].(float64)
			return math.Round(n)
		},
	},
	"round_number_up": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, _ := args[0].(float64)
			return math.Ceil(n)
		},
	},
	"round_number_down": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, _ := args[0].(float64)
			return math.Floor(n)
		},
	},
	"calc_absolute": {
		ReturnType: "number",
		Params:     []ast.Parameter{{Name: "n", DataType: ast.TypeAnnotation{Name: "number"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			n, _ := args[0].(float64)
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

const Source = `function get_substring(string input_str, number start_index, nullable<number> end_index) string {
    list<number> unpacked_str = unpack input_str;
    list<number> substring_list;
    number true_end = size of input_str;
    if (end_index != null)
    {
        true_end = end_index as number;
    }

    for ( index in start_index to (true_end - 1))
    {
        substring_list[] = unpacked_str[index];
    }

    return pack substring_list;
}

function transform_ansistring_to_uppercase(string input_str) string {
    list<number> charnum_list = unpack input_str;

    for (index in 0 to (size of charnum_list - 1))
    {
        if (charnum_list[index] >= 97 and charnum_list[index] <= 122)
        {
            charnum_list[index] = charnum_list[index] - 32;
        }
    }

    return pack charnum_list;
}

function transform_ansistring_to_lowercase(string input_str) string {
    list<number> charnum_list = unpack input_str;

    for (index in 0 to (size of charnum_list - 1))
    {
        if (charnum_list[index] >= 65 and charnum_list[index] <= 90)
        {
            charnum_list[index] = charnum_list[index] + 32;
        }
    }

    return pack charnum_list;
}

function trim_string(string input_str) string {
    list<string> exploded_input = input_str as list<string>;
    bool do_loop = true;

    while(do_loop)
    {
        if (exploded_input[0] == " ") { delete exploded_input[0]; }
        else if (exploded_input[0] == "\r") { delete exploded_input[0]; }
        else if (exploded_input[0] == "\n") { delete exploded_input[0]; }
        else if (exploded_input[0] == "\t") { delete exploded_input[0]; }
        else { do_loop = false; }
    }

    do_loop = true;
    number reverse_cursor = size of exploded_input - 1;
    while(do_loop)
    {
        if (exploded_input[reverse_cursor] == " ")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else if (exploded_input[reverse_cursor] == "\r")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else if (exploded_input[reverse_cursor] == "\n")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else if (exploded_input[reverse_cursor] == "\t")
            { delete exploded_input[reverse_cursor]; reverse_cursor = reverse_cursor - 1; }
        else { do_loop = false; }
    }

    return exploded_input as string;
}`

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
		r.AddIntrinsic(name, def.Func)
	}
}
