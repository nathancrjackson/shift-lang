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

export const StandardLibrary = {
    // 1. Struct Definitions (Schema)
    structs: [
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
    // These must be registered in Parser (as Types) and Runtime (as Functions)
    intrinsics: {
        "print_line": { 
            returnType: "none", 
            func: (args, runtime) => { console.log(args[0]); return null; } 
        },
        "convert_jsonstringtomap": {
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
        "convert_jsonstringtolist": {
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
        "convert_maptojsonstring": {
            returnType: "string",
            func: (args) => {
                const val = args[0];
                if (!(val instanceof Map)) {
                    throw new Error("Runtime Error: Expected map.");
                }
                return JSON.stringify(toJS(val));
            }
        },
        "convert_listtojsonstring": {
            returnType: "string",
            func: (args) => {
                const val = args[0];
                if (!Array.isArray(val)) {
                    throw new Error("Runtime Error: Expected list.");
                }
                return JSON.stringify(toJS(val));
            }
        }
    },

    // 3. Shift Standard Library (Written in Shift)
    // We implicitly trust that the parser/runtime can handle this code
    source: `
function get_substring(string input_str, number start_index, nullable<number> end_index) string {
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

function ansitransform_toupper(string input_str) string {
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

function ansitransform_tolower(string input_str) string {
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
}

function split_stringtolist(string input_str, string split_str) list<string> {
    list<string> exploded_input = input_str as list<string>;
    list<string> exploded_split = split_str as list<string>;
    list<string> resulting_list;
    string current_string;
    string buffer;
    number split_cursor;
    number split_str_size = size of exploded_split;

    for (char in exploded_input)
    {
        if (char == exploded_split[split_cursor])
        {
            buffer = buffer & char;
            split_cursor = split_cursor + 1;
            if (split_cursor == split_str_size)
            {
                buffer = "";
                split_cursor = 0;
                resulting_list[] = current_string;
                current_string = "";
            }
        }
        else
        {
            if (buffer != "")
            {
                current_string = current_string & buffer;
                buffer = "";
                split_cursor = 0;
            }
            current_string = current_string & char;
        }
    }

    if (buffer != "")
    {
        current_string = current_string & buffer;
    }

    resulting_list[] = current_string;

    return resulting_list;
}
`,

    // --- Loading Logic ---

    // Load Definitions into Parser (so it knows these functions/structs exist)
    loadDefinitions(parser) {
        // Load Structs
        this.structs.forEach(s => {
            parser.knownTypes.add(s.name);
            
            // Map simple JSON fields to Parser Internal Type Structure
            const fields = s.fields.map(f => {
                let typeObj = { type: "Type", name: f.type, generic: null };
                if (f.generic) {
                    typeObj.generic = { type: "Type", name: f.generic, generic: null };
                }
                // Handle complex nullable wrapper for InspectionResult
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

        // Load Intrinsic Signatures
        for (const [name, def] of Object.entries(this.intrinsics)) {
            let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true };
            if (def.generic) {
                typeObj.generic = { type: "Type", name: def.generic, generic: null };
            }
            parser.defineVariable(name, typeObj);
        }
    },

    // Load Implementations into Runtime
    loadIntrinsics(runtime) {
        for (const [name, def] of Object.entries(this.intrinsics)) {
            runtime.addIntrinsic(name, def.func);
        }
    }
};