let stdlibSource = `standardLibrarySourcePlaceholder`;
if (typeof process !== 'undefined') {
	try {
		const moduleLib = await import('module');
		const urlLib = await import('url');
		const require = moduleLib.createRequire(import.meta.url);
		const fs = require('fs');
		const path = require('path');
		const __dirname = path.dirname(urlLib.fileURLToPath(import.meta.url));
		const stdlibPath = path.resolve(__dirname, '../../go_runtime/pkg/stdlib/stdlib.shift');
		stdlibSource = fs.readFileSync(stdlibPath, 'utf8');
	} catch (e) {
		// Fallback
	}
}

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
	return toJSWithVisited(val, new Map());
}

function toJSWithVisited(val, visited) {
	if (val instanceof Map) {
		if (visited.has(val)) return visited.get(val);
		const obj = {};
		visited.set(val, obj);
		for (const [k, v] of val) {
			obj[k] = toJSWithVisited(v, visited);
		}
		return obj;
	}
	if (Array.isArray(val)) {
		if (visited.has(val)) return visited.get(val);
		const arr = [];
		visited.set(val, arr);
		for (let i = 0; i < val.length; i++) {
			arr.push(toJSWithVisited(val[i], visited));
		}
		return arr;
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
	} catch (e) {
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
			params: [{ name: "val", type: "any" }],
			func: (args, runtime) => { console.log(args[0]); return null; }
		},
		"convert_jsonstring_to_map": {
			returnType: "map",
			generic: "any",
			params: [{ name: "json", type: "string" }],
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
			params: [{ name: "json", type: "string" }],
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
			params: [{ name: "m", type: "map", generic: "any" }],
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
			params: [{ name: "l", type: "list", generic: "any" }],
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
			params: [],
			func: (args) => Math.random()
		},
		"generate_randomint_from_range": {
			returnType: "number",
			params: [{ name: "num_x", type: "number" }, { name: "num_y", type: "number" }],
			func: (args) => {
				const num_x = args[0];
				const num_y = args[1];
				
				if (typeof num_x !== 'number' || typeof num_y !== 'number' || !Number.isFinite(num_x) || !Number.isFinite(num_y)) {
					throw new Error("Runtime Error: Random range must be finite numbers.");
				}

				// Automatically determine min and max regardless of argument order
				const min = Math.ceil(Math.min(num_x, num_y));
				const max = Math.floor(Math.max(num_x, num_y));

				return Math.floor(Math.random() * (max - min + 1)) + min;
			}
		},

		// DateTime Intrinsics
		"get_datetime": {
			returnType: "DateTime",
			params: [],
			func: (args) => create_dt_struct(new Date())
		},
		"get_datetime_as_unixtime": {
			returnType: "number",
			params: [],
			func: (args) => Math.floor(Date.now() / 1000)
		},
		"get_datetime_as_iso8601": {
			returnType: "string",
			params: [],
			func: (args) => new Date().toISOString()
		},
		"convert_unixtime_to_datetime": {
			returnType: "DateTime",
			params: [{ name: "ts", type: "number" }],
			func: (args) => {
				const ts = args[0];
				if (typeof ts !== 'number' || !Number.isFinite(ts)) {
					throw new Error("Runtime Error: Expected finite number.");
				}
				return create_dt_struct(new Date(ts * 1000));
			}
		},
//		  LESS STRICT VERSION
//        "convert_iso8601_to_datetime": {
//            returnType: "DateTime",
//            params: [{ name: "iso", type: "string" }],
//            func: (args) => {
//                const d = new Date(args[0]);
//                if (isNaN(d.getTime())) throw new Error("Runtime Error: Invalid ISO8601 date string.");
//                return create_dt_struct(d);
//            }
//        },
		"convert_iso8601_to_datetime": {
			returnType: "DateTime",
			params: [{ name: "iso", type: "string" }],
			func: (args) => {
				// Enforce strict RFC3339 format to match Go's time.RFC3339
				const rfc3339Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
				if (!rfc3339Regex.test(args[0])) {
					throw new Error("Runtime Error: Invalid ISO8601 date string. Expected format: YYYY-MM-DDTHH:MM:SSZ");
				}
				
				const d = new Date(args[0]);
				if (isNaN(d.getTime())) throw new Error("Runtime Error: Invalid ISO8601 date string.");
				return create_dt_struct(d);
			}
		},
		"convert_datetime_to_unixtime": {
			returnType: "number",
			params: [{ name: "dt", type: "DateTime" }],
			func: (args) => {
				const dt = args[0];
				if (!(dt instanceof Map) || dt.__shift_type !== "DateTime") throw new Error("Runtime Error: Expected DateTime struct.");

				const fields = ["year", "month", "day", "hour", "minute", "second", "millisecond"];
				for (const field of fields) {
					const val = dt.get(field);
					if (typeof val !== 'number' || !Number.isFinite(val)) {
						throw new Error(`Runtime Error: DateTime fields must be finite numbers.`);
					}
				}

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
			params: [{ name: "dt", type: "DateTime" }],
			func: (args) => {
				const dt = args[0];
				if (!(dt instanceof Map) || dt.__shift_type !== "DateTime") throw new Error("Runtime Error: Expected DateTime struct.");

				const fields = ["year", "month", "day", "hour", "minute", "second", "millisecond"];
				for (const field of fields) {
					const val = dt.get(field);
					if (typeof val !== 'number' || !Number.isFinite(val)) {
						throw new Error(`Runtime Error: DateTime fields must be finite numbers.`);
					}
				}

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
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_sqrt expects number.");
				return Math.sqrt(args[0]);
			}
		},
		"calc_log10": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_log10 expects number.");
				return Math.log10(args[0]);
			}
		},
		"calc_natlog": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_natlog expects number.");
				return Math.log(args[0]);
			}
		},
		"round_number": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: round_number expects number.");
				return Math.round(args[0]);
			}
		},
		"round_number_up": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: round_number_up expects number.");
				return Math.ceil(args[0]);
			}
		},
		"round_number_down": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: round_number_down expects number.");
				return Math.floor(args[0]);
			}
		},
		"calc_absolute": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_absolute expects number.");
				return Math.abs(args[0]);
			}
		},
		"calc_sin": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_sin expects number.");
				return Math.sin(args[0]);
			}
		},
		"calc_cos": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_cos expects number.");
				return Math.cos(args[0]);
			}
		},
		"calc_tan": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_tan expects number.");
				return Math.tan(args[0]);
			}
		},
		"calc_asin": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_asin expects number.");
				return Math.asin(args[0]);
			}
		},
		"calc_acos": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_acos expects number.");
				return Math.acos(args[0]);
			}
		},
		"calc_atan": {
			returnType: "number",
			params: [{ name: "n", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: calc_atan expects number.");
				return Math.atan(args[0]);
			}
		},
		"calc_atan2": {
			returnType: "number",
			params: [{ name: "y", type: "number" }, { name: "x", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0]) || typeof args[1] !== 'number' || isNaN(args[1])) {
					throw new Error("Runtime Error: calc_atan2 expects numbers.");
				}
				return Math.atan2(args[0], args[1]);
			}
		},
		"convert_deg_to_rad": {
			returnType: "number",
			params: [{ name: "deg", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: convert_deg_to_rad expects number.");
				return args[0] * (Math.PI / 180);
			}
		},
		"convert_rad_to_deg": {
			returnType: "number",
			params: [{ name: "rad", type: "number" }],
			func: (args) => {
				if (typeof args[0] !== 'number' || isNaN(args[0])) throw new Error("Runtime Error: convert_rad_to_deg expects number.");
				return args[0] * (180 / Math.PI);
			}
		},
		"read_file": {
			returnType: "string",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: read_file is disabled in core mode."); }
		},
		"write_file": {
			returnType: "none",
			params: [{ name: "path", type: "string" }, { name: "content", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: write_file is disabled in core mode."); }
		},
		"create_file": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: create_file is disabled in core mode."); }
		},
		"delete_file": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: delete_file is disabled in core mode."); }
		},
		"file_exists": {
			returnType: "bool",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: file_exists is disabled in core mode."); }
		},
		"copy_file": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: copy_file is disabled in core mode."); }
		},
		"move_file": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: move_file is disabled in core mode."); }
		},
		"create_folder": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: create_folder is disabled in core mode."); }
		},
		"delete_folder": {
			returnType: "none",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: delete_folder is disabled in core mode."); }
		},
		"folder_exists": {
			returnType: "bool",
			params: [{ name: "path", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: folder_exists is disabled in core mode."); }
		},
		"copy_folder": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: copy_folder is disabled in core mode."); }
		},
		"move_folder": {
			returnType: "none",
			params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
			func: (args) => { throw new Error("Runtime Error: move_folder is disabled in core mode."); }
		}
	},

	// 3. Shift Standard Library (Written in Shift)
	source: stdlibSource,

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
			let typeObj = { type: "Type", name: def.returnType, generic: null, initialized: true, params: def.params || [] };
			if (def.generic) {
				typeObj.generic = { type: "Type", name: def.generic, generic: null };
			}
			parser.defineVariable(name, typeObj);
		}
	},

	loadIntrinsics(runtime) {
		for (const [name, def] of Object.entries(this.intrinsics)) {
			const paramCount = def.params ? def.params.length : 0;
			const wrappedFunc = (args, rt) => {
				if (args.length < paramCount) {
					throw new Error(`Runtime Error: Intrinsic '${name}' expects ${paramCount} arguments but got ${args.length}.`);
				}
				return def.func(args, rt);
			};
			runtime.addIntrinsic(name, wrappedFunc);
		}
	}
};