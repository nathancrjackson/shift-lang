/**
 * Lightweight structured logger and tracer for the Shift engine.
 */
export class ShiftLogger {
    /**
     * @param {boolean} [enabled=true] - Whether logging is enabled.
     */
    constructor(enabled = true) {
        /**
         * @type {boolean}
         */
        this.enabled = enabled;
    }

    /**
     * Log a structured checkpoint message.
     * @param {string} phase - The phase name (e.g., "LEXER", "PARSER", "VALIDATOR", "RUNTIME").
     * @param {string} message - A description of what is happening.
     * @param {Object} [details={}] - Optional metadata/context to log (excluding any sensitive data).
     */
    trace(phase, message, details = {}) {
        if (!this.enabled) return;
        const timestamp = new Date().toISOString();
        console.log(JSON.stringify({
            timestamp,
            phase,
            message,
            ...details
        }));
    }
}

// Global default logger instance
export const logger = new ShiftLogger(typeof process !== 'undefined' && process.env && process.env.SHIFT_LOG_ENABLED === "true");
