import fs from 'fs';
import path from 'path';
import { Shift } from './shift.mjs';
import { StandardLibrary } from './standard_library.mjs';

/**
 * Default Import Resolver using Node's fs module.
 * Resolves paths relative to the current importing file's directory.
 */
export function defaultImportResolver(requestedPath, currentFilePath) {
    let fullPath;
    if (currentFilePath) {
        const parentDir = path.dirname(currentFilePath);
        fullPath = path.resolve(parentDir, requestedPath);
    } else {
        fullPath = path.resolve(requestedPath);
    }

    return {
        code: fs.readFileSync(fullPath, 'utf-8'),
        resolvedPath: fullPath
    };
}

/**
 * Active Node.js filesystem intrinsic implementations.
 */
export const NodeFSIntrinsics = {
    "read_file": {
        returnType: "string",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: read_file expects a string path.");
            return fs.readFileSync(args[0], 'utf-8');
        }
    },
    "write_file": {
        returnType: "none",
        params: [{ name: "path", type: "string" }, { name: "content", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new Error("Runtime Error: write_file expects string path and content.");
            }
            fs.writeFileSync(args[0], args[1]);
            return null;
        }
    },
    "create_file": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: create_file expects a string path.");
            fs.writeFileSync(args[0], '');
            return null;
        }
    },
    "delete_file": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: delete_file expects a string path.");
            fs.unlinkSync(args[0]);
            return null;
        }
    },
    "file_exists": {
        returnType: "bool",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: file_exists expects a string path.");
            try {
                const stat = fs.statSync(args[0]);
                return stat.isFile();
            } catch {
                return false;
            }
        }
    },
    "copy_file": {
        returnType: "none",
        params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new Error("Runtime Error: copy_file expects string source and destination paths.");
            }
            fs.copyFileSync(args[0], args[1]);
            return null;
        }
    },
    "move_file": {
        returnType: "none",
        params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new Error("Runtime Error: move_file expects string source and destination paths.");
            }
            fs.renameSync(args[0], args[1]);
            return null;
        }
    },
    "create_folder": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: create_folder expects a string path.");
            fs.mkdirSync(args[0], { recursive: true });
            return null;
        }
    },
    "delete_folder": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: delete_folder expects a string path.");
            fs.rmSync(args[0], { recursive: true, force: true });
            return null;
        }
    },
    "folder_exists": {
        returnType: "bool",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new Error("Runtime Error: folder_exists expects a string path.");
            try {
                const stat = fs.statSync(args[0]);
                return stat.isDirectory();
            } catch {
                return false;
            }
        }
    },
    "copy_folder": {
        returnType: "none",
        params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new Error("Runtime Error: copy_folder expects string source and destination paths.");
            }
            fs.cpSync(args[0], args[1], { recursive: true });
            return null;
        }
    },
    "move_folder": {
        returnType: "none",
        params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new Error("Runtime Error: move_folder expects string source and destination paths.");
            }
            fs.renameSync(args[0], args[1]);
            return null;
        }
    }
};

/**
 * NodeShift extends Shift to pre-load active Node filesystem intrinsics
 * and configure a default filesystem import resolver.
 */
export class NodeShift extends Shift {
    constructor(stdLibCode = null, stdLibIntrinsics = null, options = {}) {
        let maxInstructions = 0;
        let importResolver = defaultImportResolver;

        if (typeof options === 'number') {
            maxInstructions = options;
        } else {
            maxInstructions = options.maxInstructions !== undefined ? options.maxInstructions : 0;
            importResolver = options.importResolver !== undefined ? options.importResolver : defaultImportResolver;
        }

        // Merge default StandardLibrary intrinsics with Node FS implementations
        const baseIntrinsics = stdLibIntrinsics !== null ? stdLibIntrinsics : StandardLibrary.intrinsics;
        const mergedIntrinsics = {
            ...baseIntrinsics,
            ...NodeFSIntrinsics
        };

        const runtimeOptions = {
            maxInstructions,
            importResolver
        };

        super(stdLibCode, mergedIntrinsics, runtimeOptions);
    }
}

// Re-export everything from the core engine so embedding developers can import everything from this single module
export * from './shift.mjs';
export { Lexer } from './lexer.mjs';
export { Parser } from './parser.mjs';
export { Runtime } from './runtime.mjs';
export { StandardLibrary } from './standard_library.mjs';
