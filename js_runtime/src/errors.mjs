/**
 * Base class for all Shift engine errors.
 */
export class ShiftEngineError extends Error {
    /**
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Error thrown during lexical analysis.
 */
export class ShiftLexerError extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     * @param {number} line - The line number where the error occurred.
     */
    constructor(message, line) {
        let msg = message;
        if (msg.startsWith("[Lexer]")) {
            msg = msg.replace(/^\[Lexer\]\s*(Line\s+\d+:\s*)?/, "");
        }
        const formatted = `[Lexer] Line ${line}: ${msg}`;
        super(formatted);
        this.line = line;
    }
}

/**
 * Error thrown during parsing.
 */
export class ShiftParserError extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     * @param {number} line - The line number where the error occurred.
     * @param {string} [token] - The token value where the error occurred.
     */
    constructor(message, line, token) {
        let msg = message;
        if (msg.startsWith("[Parser]")) {
            msg = msg.replace(/^\[Parser\]\s*(Line\s+\d+\s+)?Error\s+at\s+'[^']*':\s*/, "");
        }
        const formatted = `[Parser] Line ${line} Error at '${token || ""}': ${msg}`;
        super(formatted);
        this.line = line;
        this.token = token;
    }
}

/**
 * Error thrown during AST schema validation.
 */
export class ShiftValidationError extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     * @param {string} [path] - The JSON schema path where validation failed.
     */
    constructor(message, path) {
        super(message);
        this.path = path;
    }
}

/**
 * Error thrown during execution (Shift user-space / standard error).
 */
export class ShiftError extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);
    }
}

/**
 * Error thrown during execution (Shift user-space / alert level).
 */
export class ShiftAlert extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);
    }
}

/**
 * Error thrown during execution (Shift user-space / critical level).
 */
export class ShiftCritical extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     */
    constructor(message) {
        super(message);
    }
}

/**
 * Error thrown during execution by the engine/intrinsics (runtime error).
 */
export class ShiftRuntimeError extends ShiftEngineError {
    /**
     * @param {string} message - The error message.
     */
    constructor(message) {
        const msg = message.startsWith("[Runtime]") ? message : `[Runtime] ${message}`;
        super(msg);
    }
}
