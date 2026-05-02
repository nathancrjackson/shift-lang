import { Shift } from '../src/shift.mjs';
import fs from 'fs';
import path from 'path';

let shift_engine = new Shift(null, null, {
    importResolver: (requestedPath, parentPath) => {
        let fullPath;

        if (parentPath) {
            // If this import comes from an existing file, resolve relative to that file's folder
            const parentDir = path.dirname(parentPath);
            fullPath = path.resolve(parentDir, requestedPath);
        } else {
            // If this is a top-level import from the main string, resolve relative to the working directory
            fullPath = path.resolve(process.cwd(), requestedPath);
        }

        return {
            code: fs.readFileSync(fullPath, 'utf-8'),
            resolvedPath: fullPath // Return this so the Parser can prevent cycle duplicates properly!
        };
    }
});

let entrypoint = "bootstrap";
let args = [];
let code = `import "import.shift";

function bootstrap() number {
    // Main is imported from 'import.shift'
    number result = main();
    return result;
}`;

let result = shift_engine.run(code, entrypoint, args);
console.log(entrypoint + "(" + args + ") ran and returned exit code: " + result);
