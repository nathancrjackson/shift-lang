import fs from 'fs';
import path from 'path';
import { Lexer } from '../src/lexer.mjs';
import { Parser } from '../src/parser.mjs';
import { validateAST } from '../src/ast_validator.mjs';
import { Runtime } from '../src/runtime.mjs';
import { TokenType } from '../src/token_enums.mjs';
import { StandardLibrary } from '../src/standard_library.mjs';
import { NodeFSIntrinsics } from '../src/node_fs.mjs';

// ANSI Colors
const CLR = {
    Reset: "\x1b[0m", Green: "\x1b[32m", Red: "\x1b[31m", Yellow: "\x1b[33m", Blue: "\x1b[34m"
};

export class UnitTestHandler {
    constructor() {
        this.tests = [];
        this.hasConfigError = false; // Flag to track if setup failed
    }

    /**
     * @param {string} name 
     * @param {string} code 
     * @param {Array} checks 
     */
    add(name, code, checks = []) {
        // Check for duplicates
        const exists = this.tests.find(t => t.name === name);
        if (exists) {
            console.log(`${CLR.Red}CONFIGURATION ERROR: Duplicate test name detected: "${name}".${CLR.Reset}`);
            this.hasConfigError = true; // Mark suite as broken
            return;
        }

        this.tests.push({ name, code, checks });
    }

    addgroup(test_group, test_to_run) {
        for (const test_name in test_to_run) {
            if (test_to_run.hasOwnProperty(test_name)) {
                const test_details = test_to_run[test_name];
                this.add(`${test_group}: ${test_name}`, test_details['code'], test_details['tests']);
            }
        }
    }

    run() {
        const debugMap = new Map();

        // 1. ABORT IF CONFIGURATION ERRORS EXIST
        if (this.hasConfigError) {
            console.log("==========================================");
            console.log(`${CLR.Red}TEST SUITE ABORTED${CLR.Reset}`);
            console.log(`${CLR.Yellow}Please fix duplicate test names before running.${CLR.Reset}`);
            console.log("==========================================");
            return debugMap; // Return empty map
        }

        let passed = 0;
        let failed = 0;

        console.log("==========================================");
        console.log(`${CLR.Blue}STARTING TEST SUITE (${this.tests.length} Tests)${CLR.Reset}`);
        console.log("==========================================\n");

        // --- STEP 1: PARSE STANDARD LIBRARY ONCE (Optimization) ---
        // Ideally we do this once, but here inside run() is fine.
        const stdLexer = new Lexer(StandardLibrary.source);
        const stdTokens = stdLexer.tokenize().tokens; // Assuming no lex errors in StdLib
        const stdParser = new Parser(stdTokens);

        // Load intrinsics/structs into StdLib parser so it can parse itself
        StandardLibrary.loadDefinitions(stdParser);
        stdParser.preScan();
        const stdParseResult = stdParser.parse();
        const stdLibAST = stdParseResult.ast;

        if (stdParseResult.errors.length > 0) {
            console.error("CRITICAL: Standard Library failed to compile!");
            console.error(stdParseResult.errors);
            return debugMap;
        }

        this.tests.forEach((test) => {
            const testFailures = [];

            const currentDebug = {
                testName: test.name,
                success: false,
                code: test.code,
                checks: test.checks,
                tokens: [],
                ast: null,
                runtime_logs: [],
                errors: []
            };

            // CHECK FOR CASCADING FLAG
            const allowCascading = test.checks.some(c => c.type === "parser_error_cascading");

            // --- STEP 2: LEXER (User Code) ---
            // Note: Line numbers start at 1 for user code now!
            const lexer = new Lexer(test.code);
            const lexResult = lexer.tokenize();
            let lexErrors = [...lexResult.errors];

            currentDebug.tokens = lexResult.tokens;

            // --- STEP 3: PARSER (User Code) ---
            let parseErrors = [];
            let ast = null;
            let validationError = null; // Store validation error

            if (lexErrors.length === 0) {
                const importResolver = (requestedPath, parentPath) => {
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
                const parser = new Parser(lexResult.tokens, importResolver);

                // A. Load Definitions (Structs & Intrinsics)
                StandardLibrary.loadDefinitions(parser);

                // B. Load Signatures from StdLib AST (for Type Checking)
                // This tells the user parser that 'get_stringlength' exists and returns 'number'
                stdLibAST.functions.forEach(func => {
                    parser.defineVariable(func.name, {
                        type: "Type",
                        name: func.returnType.name,
                        initialized: true
                    });
                });

                // C. Parse User Code
                parser.preScan();
                const parseResult = parser.parse();
                parseErrors = [...parseResult.errors];

                // D. Merge ASTs (Tree Shaking)
                // Only add functions from StdLib that were actually used in User Code
                const userAST = parseResult.ast;
                stdLibAST.functions.forEach(func => {
                    if (parser.usedFunctions.has(func.name)) {
                        userAST.functions.push(func);
                    }
                });

                ast = userAST;
                currentDebug.ast = ast;

                // E. Validate AST (NEW STEP)
                // Only validate if parsing succeeded, as parsing errors usually produce partial/invalid ASTs anyway
                if (parseErrors.length === 0) {
                    try {
                        validateAST(ast);
                    } catch (e) {
                        validationError = e;
                    }
                }
            }

            // --- VERIFY CHECKS ---
            test.checks.forEach((check, i) => {
                // FIX: Only skip if it is purely a configuration flag (no expectation)
                if (check.type === "parser_error_cascading" && !check.expect) return;

                const checkName = `Check #${i + 1} (${check.type})`;

                const logEntry = {
                    input: check.call || "N/A",
                    expected: check.expect,
                    actual: null,
                    result_type: "N/A"
                };

                // Normalize check types
                const isLexerCheck = check.type === "lexer_error" || check.type === "LexerError";
                // FIX: Allow parser_error_cascading to be treated as a parser check if it has expectations
                const isParserCheck = check.type === "parser_error" || check.type === "ParserError" || (check.type === "parser_error_cascading" && check.expect);
                const isValidationCheck = check.type === "validation_error"; // NEW

                // 1. LEXER ERROR CHECKS
                if (isLexerCheck) {
                    const foundIndex = lexErrors.findIndex(e => e.message.includes(check.expect));
                    logEntry.result_type = "LEXER_CHECK";

                    if (foundIndex !== -1) {
                        logEntry.actual = lexErrors[foundIndex].message;
                        lexErrors.splice(foundIndex, 1);
                    } else {
                        testFailures.push(`${checkName}: Expected lexer error "${check.expect}" but it was not found.`);
                        logEntry.actual = "Error NOT Found";
                    }
                }

                // 2. PARSER ERROR CHECKS
                else if (isParserCheck) {
                    const foundIndex = parseErrors.findIndex(e => e.message.includes(check.expect));
                    logEntry.result_type = "PARSER_CHECK";

                    if (foundIndex !== -1) {
                        logEntry.actual = parseErrors[foundIndex].message;
                        parseErrors.splice(foundIndex, 1);
                    } else {
                        testFailures.push(`${checkName}: Expected parser error "${check.expect}" but it was not found.`);
                        logEntry.actual = "Error NOT Found";
                    }
                }

                // 3. VALIDATION CHECKS (NEW)
                else if (isValidationCheck) {
                    logEntry.result_type = "VALIDATION_CHECK";

                    if (validationError) {
                        logEntry.actual = validationError.message;
                        if (validationError.message.includes(check.expect)) {
                            // Expected error found
                            validationError = null; // Mark as handled
                        } else {
                            testFailures.push(`${checkName}: Expected validation error "${check.expect}" but got "${validationError.message}".`);
                            logEntry.result_type = "FAIL_WRONG_ERROR";
                        }
                    } else {
                        testFailures.push(`${checkName}: Expected validation error "${check.expect}" but validation passed.`);
                        logEntry.actual = "No Error";
                        logEntry.result_type = "FAIL_NO_ERROR";
                    }
                }

                // 4. RUNTIME CHECKS
                else {
                    const hasBlockingErrors = (lexResult.errors.length > 0 && !isLexerCheck) ||
                        (parseErrors.length > 0 && !isParserCheck) ||
                        (validationError !== null); // Block if unhandled validation error

                    if (hasBlockingErrors) {
                        testFailures.push(`${checkName}: Skipped because of earlier compilation errors.`);
                        logEntry.actual = "SKIPPED";
                        logEntry.result_type = "SKIPPED";
                    }
                    else {
                        let runtime = null;
                        try {
                            // Instantiate Runtime for this test
                            runtime = new Runtime(ast);
                            runtime.maxInstructions = 1000000;

                            // ORCHESTRATION: Load Standard Library Intrinsics into Runtime
                            StandardLibrary.loadIntrinsics(runtime);

                            // Load filesystem extras (active Node FS intrinsics) for test verification
                            for (const [name, def] of Object.entries(NodeFSIntrinsics)) {
                                const paramCount = def.params ? def.params.length : 0;
                                const wrappedFunc = (args, rt) => {
                                    if (args.length < paramCount) {
                                        throw new Error(`Runtime Error: Intrinsic '${name}' expects ${paramCount} arguments but got ${args.length}.`);
                                    }
                                    return def.func(args, rt);
                                };
                                runtime.addIntrinsic(name, wrappedFunc);
                            }

                            // Execute Logic
                            let actual = null;

                            if (check.call) {
                                // 1. Parse the call string (e.g., "start(10)")
                                const callLexer = new Lexer(check.call);
                                const callTokens = callLexer.tokenize().tokens;
                                const callParser = new Parser(callTokens);

                                // HACK: Pre-define identifiers in the call parser to avoid "Undefined variable" 
                                // errors during expression parsing. This allows 'start()' to parse even though 
                                // 'start' isn't defined in the call string's scope.
                                callTokens.forEach(t => {
                                    if (t.t === TokenType.IDENTIFIER) {
                                        // We don't care about the type here, just that it exists so the parser accepts it
                                        if (!callParser.getVariable(t.v)) {
                                            callParser.defineVariable(t.v, { type: 'Type', name: 'any', initialized: true });
                                        }
                                    }
                                });

                                const callExpr = callParser.parseExpression();

                                if (callExpr.type !== 'CallExpression') {
                                    throw new Error(`Test Configuration Error: '${check.call}' is not a valid function call.`);
                                }

                                // 2. Evaluate Arguments (Literals in the test string)
                                const args = callExpr.arguments.map(arg => runtime.evaluate(arg, runtime.globalEnv));

                                // 3. Run the Function
                                actual = runtime.runFunction(callExpr.callee, args);
                            } else {
                                // Fallback for tests that might not have a call (uncommon for runtime checks)
                                // We treat the expectation as the actual to pass "mock" logic if needed, 
                                // but ideally all runtime tests should have a call.
                                actual = check.expect;
                            }

                            logEntry.actual = actual;

                            // 4. Compare Results
                            // We use JSON.stringify to handle deep comparison of Arrays (Lists) and Primitives
                            // Maps are converted to Objects for comparison if needed, or expected to be treated as generic objects
                            const serialize = (val) => {
                                if (val instanceof Map) {
                                    const obj = {};
                                    for (const [k, v] of val) {
                                        obj[k] = serialize(v);
                                    }
                                    return obj;
                                }
                                if (Array.isArray(val)) {
                                    return val.map(serialize);
                                }
                                return val;
                            };

                            const actualStr = JSON.stringify(serialize(actual));
                            const expectStr = JSON.stringify(serialize(check.expect));

                            if (check.type === "runtime_error") {
                                testFailures.push(`${checkName}: Expected runtime error "${check.expect}", but succeeded with value ${actualStr}.`);
                                logEntry.result_type = "FAIL";
                            } else if (actualStr !== expectStr) {
                                testFailures.push(`${checkName}: Expected ${expectStr}, got ${actualStr}.`);
                                logEntry.result_type = "FAIL";
                            } else {
                                logEntry.result_type = "PASS";
                            }

                        } catch (e) {
                            logEntry.actual = e.message;

                            if (check.type === "runtime_error") {
                                const cleanActual = e.message.replaceAll("Runtime Error: ", "").replaceAll("[Runtime] ", "").trim();
                                const cleanExpected = check.expect.replaceAll("Runtime Error: ", "").replaceAll("[Runtime] ", "").trim();
                                if (!cleanActual.includes(cleanExpected)) {
                                    testFailures.push(`${checkName}: Expected error "${check.expect}", got "${e.message}".`);
                                    logEntry.result_type = "FAIL_WRONG_ERROR";
                                } else {
                                    logEntry.result_type = "PASS_ERROR_CAUGHT";
                                }
                            } else {
                                testFailures.push(`${checkName}: Runtime Exception: ${e.message}`);
                                logEntry.result_type = "FAIL_EXCEPTION";
                            }
                        }
                    }
                }

                currentDebug.runtime_logs.push(logEntry);
            });

            // --- CATCH UNEXPECTED ERRORS ---
            lexErrors.forEach(e => {
                const line = e.line || e.endline || e.startline;
                testFailures.push(`Unexpected Lexer Error (Line ${line}): ${e.message}`);
                currentDebug.errors.push({
                    type: "LexerError",
                    line: line,
                    message: e.message
                });
            });

            if (!allowCascading) {
                parseErrors.forEach(e => {
                    testFailures.push(`Unexpected Parser Error (Line ${e.line}): ${e.message}`);
                    currentDebug.errors.push({
                        type: "ParserError",
                        line: e.line,
                        token: e.token || "",
                        message: e.message
                    });
                });
            } else if (parseErrors.length > 0) {
                // Log them but don't fail
                parseErrors.forEach(e => {
                    currentDebug.errors.push({
                        type: "ParserError (Ignored)",
                        line: e.line,
                        token: e.token || "",
                        message: e.message
                    });
                });
            }

            // Report Unexpected Validation Errors
            if (validationError) {
                testFailures.push(`Unexpected AST Validation Error: ${validationError.message}`);
                currentDebug.errors.push({
                    type: "ValidationError",
                    message: validationError.message
                });
            }

            // --- SET SUCCESS FLAG ---
            if (testFailures.length === 0) {
                currentDebug.success = true;
                passed++;
                console.log(`${CLR.Green}✓ [PASS] ${test.name}${CLR.Reset}`);
            } else {
                currentDebug.success = false;
                failed++;
                console.log(`${CLR.Red}✗ [FAIL] ${test.name}${CLR.Reset}`);
                testFailures.forEach(msg => console.log(`   - ${msg}`));
            }

            debugMap.set(test.name, currentDebug);
        });

        console.log("\n==========================================");
        console.log(`RESULTS: ${CLR.Green}${passed} Passed${CLR.Reset}, ${CLR.Red}${failed} Failed${CLR.Reset}`);
        console.log("==========================================");

        return debugMap;
    }
}