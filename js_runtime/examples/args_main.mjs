import { Shift } from '../src/shift.mjs';

let shift_engine = new Shift();
let entrypoint = "main";
let code = `struct Config [
    string mode,
    number max_retries
]

function main(bool is_one, number a_num, string env_name, list<string> tag_list, map<any> settings, Config cfg) number {
    number result = 0;

    if (is_one == true)
    {
        result = result + 1;
    }

    result = result + a_num;

    if (env_name == "prod")
    {
        result = result + 100;
    }

    result = result + size of tag_list;
    result = result + settings["timeout_seconds"];
    result = result + cfg["max_retries"];

    return result;
}`;

// 1. Primitives
let arg_bool   = true;
let arg_number = 10;
let arg_string = "prod";

// 2. Lists (JS Arrays)
let arg_list = ["api", "backend", "v2"];

// 3. Maps (JS Maps)
let arg_map = new Map();
arg_map.set("timeout_seconds", 30);
arg_map.set("region", "us-east");

// 4. Structs (Also JS Maps, matching the struct schema)
let arg_struct = new Map();
arg_struct.set("mode", "production");
arg_struct.set("max_retries", 700);

// 5. Pack them into the args array IN THE SAME ORDER as the function signature
let args = [
    arg_bool, 
    arg_number, 
    arg_string, 
    arg_list, 
    arg_map, 
    arg_struct
];

// Execute
let result = shift_engine.run(code, entrypoint, args);
console.log("Returned: " + result);