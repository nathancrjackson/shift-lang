import fs from 'fs';
import path from 'path';
import { Shift } from './shift.mjs';
import { StandardLibrary } from './standard_library.mjs';
import { ShiftRuntimeError } from './errors.mjs';

/**
 * Resolves the absolute import path relative to the current importing file's directory.
 * Pure function adhering to the Single Responsibility Principle.
 * @param {string} requestedPath - The path requested by the import statement.
 * @param {string} [currentFilePath] - The path of the file containing the import.
 * @returns {string} The resolved absolute path.
 * @throws {ShiftRuntimeError} If input parameters are invalid.
 */
export function resolveImportPath(requestedPath, currentFilePath) {
    if (typeof requestedPath !== 'string') {
        throw new ShiftRuntimeError("Runtime Error: requestedPath must be a string.");
    }
    if (currentFilePath !== undefined && typeof currentFilePath !== 'string') {
        throw new ShiftRuntimeError("Runtime Error: currentFilePath must be a string.");
    }

    if (currentFilePath) {
        const parentDir = path.dirname(currentFilePath);
        return path.resolve(parentDir, requestedPath);
    }
    return path.resolve(requestedPath);
}

/**
 * Reads the content of the imported file.
 * Adheres to Dependency Injection by accepting an optional file reader.
 * @param {string} fullPath - The absolute path of the file to read.
 * @param {function(string, string): string} [fsReader=fs.readFileSync] - The file-reading dependency.
 * @returns {string} The file contents.
 * @throws {ShiftRuntimeError} If reading the file fails.
 */
export function readImportFile(fullPath, fsReader = fs.readFileSync) {
    if (typeof fullPath !== 'string') {
        throw new ShiftRuntimeError("Runtime Error: fullPath must be a string.");
    }
    if (typeof fsReader !== 'function') {
        throw new ShiftRuntimeError("Runtime Error: fsReader must be a function.");
    }

    try {
        return fsReader(fullPath, 'utf-8');
    } catch (e) {
        throw new ShiftRuntimeError(`Runtime Error: Failed to read file at '${fullPath}': ${e.message}`);
    }
}

/**
 * Default Import Resolver using Node's fs module.
 * @param {string} requestedPath - The path requested by the import statement.
 * @param {string} [currentFilePath] - The path of the file containing the import.
 * @param {function(string, string): string} [fsReader=fs.readFileSync] - The file-reading dependency.
 * @returns {{code: string, resolvedPath: string}} The file code and its resolved path.
 * @throws {ShiftRuntimeError} If resolving or reading the import fails.
 */
export function defaultImportResolver(requestedPath, currentFilePath, fsReader = fs.readFileSync) {
    const resolvedPath = resolveImportPath(requestedPath, currentFilePath);
    const code = readImportFile(resolvedPath, fsReader);
    return {
        code,
        resolvedPath
    };
}

/**
 * Active Node.js filesystem intrinsic implementations.
 * @type {Object<string, {returnType: string, params: Array<{name: string, type: string}>, func: function(Array<*>): *}>}
 */
export const NodeFSIntrinsics = {
    "read_file": {
        returnType: "string",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: read_file expects a string path.");
            try {
                return fs.readFileSync(args[0], 'utf-8');
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: read_file failed: ${e.message}`);
            }
        }
    },
    "write_file": {
        returnType: "none",
        params: [{ name: "path", type: "string" }, { name: "content", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new ShiftRuntimeError("Runtime Error: write_file expects string path and content.");
            }
            try {
                fs.writeFileSync(args[0], args[1]);
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: write_file failed: ${e.message}`);
            }
            return null;
        }
    },
    "create_file": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: create_file expects a string path.");
            try {
                fs.writeFileSync(args[0], '');
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: create_file failed: ${e.message}`);
            }
            return null;
        }
    },
    "delete_file": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: delete_file expects a string path.");
            try {
                fs.unlinkSync(args[0]);
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: delete_file failed: ${e.message}`);
            }
            return null;
        }
    },
    "file_exists": {
        returnType: "bool",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: file_exists expects a string path.");
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
                throw new ShiftRuntimeError("Runtime Error: copy_file expects string source and destination paths.");
            }
            try {
                fs.copyFileSync(args[0], args[1]);
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: copy_file failed: ${e.message}`);
            }
            return null;
        }
    },
    "move_file": {
        returnType: "none",
        params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new ShiftRuntimeError("Runtime Error: move_file expects string source and destination paths.");
            }
            try {
                fs.renameSync(args[0], args[1]);
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: move_file failed: ${e.message}`);
            }
            return null;
        }
    },
    "create_folder": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: create_folder expects a string path.");
            try {
                fs.mkdirSync(args[0], { recursive: true });
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: create_folder failed: ${e.message}`);
            }
            return null;
        }
    },
    "delete_folder": {
        returnType: "none",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: delete_folder expects a string path.");
            try {
                fs.rmSync(args[0], { recursive: true, force: true });
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: delete_folder failed: ${e.message}`);
            }
            return null;
        }
    },
    "folder_exists": {
        returnType: "bool",
        params: [{ name: "path", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string') throw new ShiftRuntimeError("Runtime Error: folder_exists expects a string path.");
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
                throw new ShiftRuntimeError("Runtime Error: copy_folder expects string source and destination paths.");
            }
            try {
                fs.cpSync(args[0], args[1], { recursive: true });
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: copy_folder failed: ${e.message}`);
            }
            return null;
        }
    },
    "move_folder": {
        returnType: "none",
        params: [{ name: "source", type: "string" }, { name: "dest", type: "string" }],
        func: (args) => {
            if (typeof args[0] !== 'string' || typeof args[1] !== 'string') {
                throw new ShiftRuntimeError("Runtime Error: move_folder expects string source and destination paths.");
            }
            try {
                fs.renameSync(args[0], args[1]);
            } catch (e) {
                throw new ShiftRuntimeError(`Runtime Error: move_folder failed: ${e.message}`);
            }
            return null;
        }
    }
};

/**
 * NodeShift extends Shift to pre-load active Node filesystem intrinsics
 * and configure a default filesystem import resolver.
 */
export class NodeShift extends Shift {
    /**
     * @param {string} [stdLibCode=null] - Custom standard library code.
     * @param {Object} [stdLibIntrinsics=null] - Custom intrinsics dictionary.
     * @param {Object|number} [options={}] - Options object or max instructions limit.
     * @throws {ShiftRuntimeError} If input options are invalid.
     */
    constructor(stdLibCode = null, stdLibIntrinsics = null, options = {}) {
        // Guard clauses / input validation
        if (stdLibCode !== null && typeof stdLibCode !== 'string') {
            throw new ShiftRuntimeError("Runtime Error: stdLibCode must be null or a string.");
        }
        if (stdLibIntrinsics !== null && typeof stdLibIntrinsics !== 'object') {
            throw new ShiftRuntimeError("Runtime Error: stdLibIntrinsics must be null or an object.");
        }

        let maxInstructions = 0;
        let importResolver = defaultImportResolver;

        if (typeof options === 'number') {
            maxInstructions = options;
        } else if (options && typeof options === 'object') {
            maxInstructions = options.maxInstructions !== undefined ? options.maxInstructions : 0;
            importResolver = options.importResolver !== undefined ? options.importResolver : defaultImportResolver;
        } else {
            throw new ShiftRuntimeError("Runtime Error: options must be a number or an object.");
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
