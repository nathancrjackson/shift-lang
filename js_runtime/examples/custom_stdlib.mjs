import { Shift } from '../src/shift.mjs';
import { StandardLibrary } from '../src/standard_library.mjs';

// Adding a function to the end of our std_lib source
const source = StandardLibrary.source + "\n\n" + `function divide_number(number dividend, number divisor) number {
     return dividend / divisor;
}`;

// Getting std_lib intrinsics and adding a custom function
const intrinsics = StandardLibrary.intrinsics;
intrinsics["print_error"] = { 
    returnType: "none", 
    func: (args, runtime) => { console.error(args[0]); return null; } 
}

// Loading our custom source and intrinsics into Shift
let shift_engine = new Shift(source, intrinsics);

let entrypoint = "main";
let args = [];
let code = `function main() number {
    number return_code = 1;

    try {
        // Using custom std_lib source function
        divide_number(0, 0);
        return_code = 0;
    }
    catch {
        // Using custom std_lib intrinsic function
        print_error($thrown_message);
    }

    return return_code;
}`;

let result = shift_engine.run(code, entrypoint, args);
console.log(entrypoint + "(" + args + ") ran and returned exit code: " + result);
