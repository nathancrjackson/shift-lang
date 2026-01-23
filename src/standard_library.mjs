// Helper to convert JS structure (Object/Array) to Shift structure (Map/List)
function toShift(val) {
    if (val === null) return null;
    if (Array.isArray(val)) return val.map(toShift);
    if (typeof val === 'object') {
        const m = new Map();
        for (const k in val) {
            if (Object.prototype.hasOwnProperty.call(val, k)) {
                m.set(k, toShift(val[k]));
            }
        }
        return m;
    }
    return val;
}

// Helper to convert Shift structure (Map/List) to JS structure (Object/Array)
function toJS(val) {
    if (val instanceof Map) {
        const obj = {};
        for (const [k, v] of val) {
            obj[k] = toJS(v);
        }
        return obj;
    }
    if (Array.isArray(val)) {
        return val.map(toJS);
    }
    return val;
}

// Helper to create a DateTime struct from a JS Date object
function create_dt_struct(date) {
    const dt = new Map();
    dt.set("year", date.getFullYear());
    dt.set("month", date.getMonth() + 1); // JS months are 0-indexed
    dt.set("day", date.getDate());
    dt.set("hour", date.getHours());
    dt.set("minute", date.getMinutes());
    dt.set("second", date.getSeconds());
    dt.set("millisecond", date.getMilliseconds());
    dt.set("offset_minutes", date.getTimezoneOffset());
    
    // Simple timezone extraction (heuristic)
    try {
        const str = date.toString(); 
        // e.g. "Mon Jan 19 2026 10:55:00 GMT+1100 (Australian Eastern Daylight Time)"
        const match = str.match(/\(([^)]+)\)$/);
        dt.set("timezone", match ? match[1] : "UTC");
    } catch(e) {
        dt.set("timezone", "UTC");
    }
    
    return dt;
}

export const StandardLibrary = {
    // 1. Struct Definitions (Schema)
    structs: [
        {
            name: "DateTime",
            fields: [
                { name: "year", type: "number" },
                { name: "month", type: "number" },
                { name: "day", type: "number" },
                { name: "hour", type: "number" },
                { name: "minute", type: "number" },
                { name: "second", type: "number" },
                { name: "millisecond", type: "number" },
                { name: "offset_minutes", type: "number" },
                { name: "timezone", type: "string" }
            ]
        },
        {
            name: "RegexResult",
            fields: [
                { name: "match", type: "string" },
                { name: "start", type: "number" },
                { name: "end", type: "number" },
                { name: "groups", type: "list", generic: "string" }
            ]
        },
        {
            name: "InspectionResult",
            fields: [
                { name: "$type", type: "string" },
                { name: "$size", type: "nullable", generic: "number" }
            ]
        }
    ],

    // 2. Intrinsics (Native JS Implementations)
    intrinsics: {
        "print_line": { 
            returnType: "none", 
            func: (args, runtime) => { console.log(args[0]); return null; } 
        },
        "convert_jsonstring_to_map": {
            returnType: "map",
            generic: "any",
            func: (args) => {
                let json;
                try {
                    json = JSON.parse(args[0]);
                } catch (e) {
                    throw new Error("Runtime Error: Invalid JSON string.");
                }
                if (json === null || Array.isArray(json) || typeof json !== 'object') {
                    throw new Error("Runtime Error: JSON string is not an object.");
                }
                return toShift(json);
            }
        },
        "convert_jsonstring_to_list": {
            returnType: "list",
            generic: "any",
            func: (args) => {
                let json;
                try {
                    json = JSON.parse(args[0]);
                } catch (e) {
                    throw new Error("Runtime Error: Invalid JSON string.");
                }
                if (!Array.isArray(json)) {
                    throw new Error("Runtime Error: JSON string is not a list.");
                }
                return toShift(json);
            }
        },
        "convert_map_to_jsonstring": {
            returnType: "string",
            func: (args) => {
                const val = args[0];
                if (!(val instanceof Map)) {
                    throw new Error("Runtime Error: Expected map.");
                }
                return JSON.stringify(toJS(val));
            }
        },
        "convert_list_to_jsonstring": {
            returnType: "string",
            func: (args) => {
                const val = args[0];
                if (!Array.isArray(val)) {
                    throw new Error("Runtime Error: Expected list.");
                }
                return JSON.stringify(toJS(val));
            }
        },
        
        // Random
        "generate_randomnumber": {
            returnType: "number",
            func: (args) => Math.random()
        },
        "generate_randomint_from_range": {
            returnType: "number",
            func: (args) => {
                const min = Math.ceil(args[0]);
                const max = Math.floor(args[1]);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
        },

        // DateTime Intrinsics
        "get_datetime": {
            returnType: "DateTime",
            func: (args) => create_dt_struct(new Date())
        },
        "get_datetime_as_unixtime": {
            returnType: "number",
            func: (args) => Math.floor(Date.now() / 1000)
        },
        "get_datetime_as_iso8601": {
            returnType: "string",
            func: (args) => new Date().toISOString()
        },
        "convert_unixtime_to_datetime": {
            returnType: "DateTime",
            func: (args) => create_dt_struct(new Date(args[0] * 1000))
        },
        "convert_iso8601_to_datetime": {
            returnType: "DateTime",
            func: (args) => {
                const d = new Date(args[0]);
                if (isNaN(d.getTime())) throw new Error("Runtime Error: Invalid ISO8601 date string.");
                return create_dt_struct(d);
            }
        },
        "convert_datetime_to_unixtime": {
            returnType: "number",
            func: (args) => {
                const dt = args[0];
                if (!(dt instanceof Map)) throw new Error("Runtime Error: Expected DateTime struct.");
                
                // Construct Date object from struct fields
                // Note: JS Date(year, monthIndex, day, hours, minutes, seconds, milliseconds)
                const d = new Date(
                    dt.get("year"),
                    dt.get("month") - 1, // 0-indexed month
                    dt.get("day"),
                    dt.get("hour"),
                    dt.get("minute"),
                    dt.get("second"),
                    dt.get("millisecond")
                );
                return Math.floor(d.getTime() / 1000);
            }
        },
        "convert_datetime_to_iso8601": {
            returnType: "string",
            func: (args) => {
                const dt = args[0];
                if (!(dt instanceof Map)) throw new Error("Runtime Error: Expected DateTime struct.");
                
                const d = new Date(
                    dt.get("year"),
                    dt.get("month") - 1,
                    dt.get("day"),
                    dt.get("hour"),
                    dt.get("minute"),
                    dt.get("second"),
                    dt.get("millisecond")
                );
                return d.toISOString();
            }
        },

        // Math Intrinsics
        "calc_sqrt": {
            returnType: "number",
            func: (args) => Math.sqrt(args[0])
        },
        "calc_log10": {
            returnType: "number",
            func: (args) => Math.log10(args[0])
        },
        "calc_natlog": {
            returnType: "number",
            func: (args) => Math.log(args[0])
        },
        "round_number": {
            returnType: "number",
            func: (args) => Math.round(args[0])
        },
        "round_number_up": {
            returnType: "number",
            func: (args) => Math.ceil(args[0])
        },
        "round_number_down": {
            returnType: "number",
            func: (args) => Math.floor(args[0])
        },
        "calc_absolute": {
            returnType: "number",
            func: (args) => Math.abs(args[0])
        },
        "calc_sin": {
            returnType: "number",
            func: (args) => Math.sin(args[0])
        },
        "calc_cos": {
            returnType: "number",
            func: (args) => Math.cos(args[0])
        },
        "calc_tan": {
            returnType: "number",
            func: (args) => Math.tan(args[0])
        },
        "calc_asin": {
            returnType: "number",
            func: (args) => Math.asin(args[0])
        },
        "calc_acos": {
            returnType: "number",
            func: (args) => Math.acos(args[0])
        },
        "calc_atan": {
            returnType: "number",
            func: (args) => Math.atan(args[0])
        },
        "calc_atan2": {
            returnType: "number",
            func: (args) => Math.atan2(args[0], args[1])
        },
        "convert_deg_to_rad": {
            returnType: "number",
            func: (args) => args[0] * (Math.PI / 180)
        },
        "convert_rad_to_deg": {
            returnType: "number",
            func: (args) => args[0] * (180 / Math.PI)
        }

    },

    // 3. Shift Standard Library (Written in Shift)
    source: `function get_substring(string input_str, number start_index, nullable<number> end_index) string {
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
}`,

    loadDefinitions(parser) {
        this.structs.forEach(s => {
            parser.knownTypes.add(s.name);
            const fields = s.fields.map(f => {
                let typeObj = { type: "Type", name: f.type, generic: null };
                if (f.generic) {
                    typeObj.generic = { type: "Type", name: f.generic, generic: null };
                }
                if (f.type === "nullable" && f.generic) {
                     typeObj = { 
                         type: "Type", 
                         name: "nullable", 
                         generic: { type: "Type", name: f.generic, generic: null } 
                     };
                }
                return { name: f.name, type: typeObj };
            });
            parser.structDefinitions.set(s.name, { fields });
        });

        for (const [name, def] of Object.entries(this.intrinsics)) {
            let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true };
            if (def.generic) {
                typeObj.generic = { type: "Type", name: def.generic, generic: null };
            }
            parser.defineVariable(name, typeObj);
        }
    },

    loadIntrinsics(runtime) {
        for (const [name, def] of Object.entries(this.intrinsics)) {
            runtime.addIntrinsic(name, def.func);
        }
    }
};