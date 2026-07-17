const fs = require('fs');
const path = require('path');

// Configuration
const isCore = process.argv.includes('--core') || process.env.SHIFT_BUILD_CORE === 'true';

const ENTRY_FILE = isCore 
    ? path.join(__dirname, '../src', 'shift.mjs')
    : path.join(__dirname, '../src', 'node_fs.mjs');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const OUTPUT_FILE = isCore
    ? path.join(OUTPUT_DIR, 'shift_core_lib.mjs')
    : path.join(OUTPUT_DIR, 'shift_lib.mjs');

/**
 * Ensures the target output directory exists.
 * 
 * @param {string} dirPath - Absolute path of the output directory.
 * @throws {Error} If input parameter is invalid or creation fails.
 */
function ensureOutputDir(dirPath) {
    if (typeof dirPath !== 'string' || dirPath.trim() === '') {
        throw new Error("Invalid output directory path.");
    }
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (err) {
            throw new Error(`Failed to create output directory '${dirPath}': ${err.message}`);
        }
    }
}

/**
 * Recursively analyzes imports to build a dependency list.
 * Strategy: Depth-First Search (Post-Order) to ensure dependencies 
 * are added before the files that import them.
 * 
 * @param {string} filePath - Absolute path to the file.
 * @param {Set<string>} includedFiles - Set tracking already included absolute paths.
 * @param {Array<{path: string, content: string}>} buildOrder - Ordered list of files to bundle.
 * @throws {Error} If input validation fails or reading a dependency fails.
 */
function resolveDependencies(filePath, includedFiles, buildOrder) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        throw new Error("resolveDependencies requires a valid non-empty string path.");
    }
    if (!(includedFiles instanceof Set)) {
        throw new Error("resolveDependencies requires a valid Set for includedFiles.");
    }
    if (!Array.isArray(buildOrder)) {
        throw new Error("resolveDependencies requires a valid Array for buildOrder.");
    }

    const absolutePath = path.resolve(filePath);

    if (includedFiles.has(absolutePath)) {
        return;
    }

    let content;
    try {
        content = fs.readFileSync(absolutePath, 'utf-8');
    } catch (err) {
        throw new Error(`Failed to read source file at '${absolutePath}': ${err.message}`);
    }
    
    // Regex to find: import { ... } from './path.mjs';
    // capturing group 1 is the relative path
    const importRegex = /(?:import|export)\s+(?:{[^}]+}|\*|.*?)\s+from\s+['"](\.\/[^'"]+)['"];?/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const dir = path.dirname(absolutePath);
        const dependencyPath = path.join(dir, importPath);
        
        try {
            resolveDependencies(dependencyPath, includedFiles, buildOrder);
        } catch (err) {
            throw new Error(`Dependency resolution failed in '${absolutePath}' -> '${dependencyPath}': ${err.message}`);
        }
    }

    includedFiles.add(absolutePath);
    buildOrder.push({
        path: absolutePath,
        content: content
    });
}

/**
 * Runs structural/import sanity checks for Core Build mode.
 * 
 * @param {Array<{path: string, content: string}>} buildOrder - Ordered list of files to bundle.
 * @throws {Error} If a core constraint is violated.
 */
function verifyCoreSafety(buildOrder) {
    if (!Array.isArray(buildOrder)) {
        throw new Error("verifyCoreSafety expects an array of build order files.");
    }

    buildOrder.forEach(fileObj => {
        if (!fileObj || typeof fileObj.path !== 'string' || typeof fileObj.content !== 'string') {
            throw new Error("Invalid file object in build order.");
        }

        const fileName = path.basename(fileObj.path);
        if (fileName === 'node_fs.mjs') {
            throw new Error("Core mode build constraint violation: node_fs.mjs cannot be included in a core build!");
        }
        if (/import\s+(?:{[^}]+}|.*?)\s+from\s+['"](?:fs|path)['"]/g.test(fileObj.content)) {
            throw new Error(`Core mode build constraint violation: Native module import (fs/path) found in '${fileName}' during core build!`);
        }
    });
}

/**
 * Preprocesses and cleans a file's content for inclusion in the bundle.
 * Strips local import/export statements and adjusts duplicate exports.
 * 
 * @param {string} fileName - Base name of the file.
 * @param {string} content - Original file content.
 * @returns {string} The cleaned file content.
 * @throws {Error} If input validation fails.
 */
function preprocessContent(fileName, content) {
    if (typeof fileName !== 'string' || typeof content !== 'string') {
        throw new Error("preprocessContent expects string inputs.");
    }

    if (fileName.endsWith('.json')) {
        return `const schema = ${content.trim()};`;
    }

    // 1. Strip import and export statements as code is now in one file
    let cleaned = content.replace(/(?:import|export)\s+(?:{[^}]+}|\*|.*?)\s+from\s+['"]\.\/[^'"]+['"](?:\s+(?:with|assert)\s*\{[^}]+\})?;?\r?\n?/g, '');

    // 2. Replace the export alias of validateASTFunc with a const assignment to avoid duplicate exports
    cleaned = cleaned.replace('export { validateASTFunc as validateAST };', 'const validateASTFunc = validateAST;');

    // 3. Strip the Node-specific dynamic stdlib loader block (avoiding top-level await syntax errors in browsers)
    cleaned = cleaned.replace(/if\s*\(typeof\s+process\s*!==\s*['"]undefined['"]\)\s*\{[\s\S]*?stdlibSource\s*=\s*fs\.readFileSync[\s\S]*?\}\s*\}\s*\r?\n?/g, '');

    return cleaned;
}

/**
 * Inlines the Shift standard library source code by replacing standardLibrarySourcePlaceholder.
 * 
 * @param {string} bundleContent - The current aggregated bundle content.
 * @param {string} stdlibPath - Path to the stdlib.shift file.
 * @returns {string} The updated bundle content with stdlib inlined.
 * @throws {Error} If reading or processing standard library file fails.
 */
function inlineStdLib(bundleContent, stdlibPath) {
    if (typeof bundleContent !== 'string' || typeof stdlibPath !== 'string') {
        throw new Error("inlineStdLib expects string inputs.");
    }

    if (!fs.existsSync(stdlibPath)) {
        return bundleContent;
    }

    try {
        const stdlibContent = fs.readFileSync(stdlibPath, 'utf8');
        // Safely escape backticks and dollar signs if they appear in standard library
        const escapedContent = stdlibContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        return bundleContent.replace("standardLibrarySourcePlaceholder", escapedContent);
    } catch (err) {
        throw new Error(`Failed to inline standard library from '${stdlibPath}': ${err.message}`);
    }
}

/**
 * Main orchestration function for the bundling pipeline.
 * 
 * @throws {Error} If compilation, verification, or file operations fail.
 */
function bundle() {
    console.log(`\n📦 Starting ${isCore ? 'CORE' : 'STANDARD'} Build from: ${ENTRY_FILE}`);

    const includedFiles = new Set();
    const buildOrder = [];

    // 1. Build Dependency Tree
    try {
        resolveDependencies(ENTRY_FILE, includedFiles, buildOrder);
    } catch (err) {
        console.error(`❌ Error resolving dependencies: ${err.message}`);
        process.exit(1);
    }

    console.log(`   Found ${buildOrder.length} files.`);

    // 2. Prepare Output Directory
    try {
        ensureOutputDir(OUTPUT_DIR);
    } catch (err) {
        console.error(`❌ Directory setup failed: ${err.message}`);
        process.exit(1);
    }

    // 3. Sanity Checks for Core Build
    if (isCore) {
        try {
            verifyCoreSafety(buildOrder);
        } catch (err) {
            console.error(`❌ Core sanity check failed: ${err.message}`);
            process.exit(1);
        }
    }

    // 4. Combine and Preprocess Content
    let bundleContent = `/**
 * Shift Script Library (${isCore ? 'Core Mode' : 'Standard Mode'})
 * Bundled at: ${new Date().toISOString()}
 */
`;

    buildOrder.forEach(fileObj => {
        const fileName = path.basename(fileObj.path);
        console.log(`   + Adding ${fileName}`);

        let cleanedContent;
        try {
            cleanedContent = preprocessContent(fileName, fileObj.content);
        } catch (err) {
            console.error(`❌ Error preprocessing '${fileName}': ${err.message}`);
            process.exit(1);
        }

        bundleContent += `\n// --- Source: ${fileName} ---\n`;
        bundleContent += cleanedContent + '\n';
    });

    // 5. Inline the Shift stdlib source code
    const stdlibPath = path.join(__dirname, '../../go_runtime/pkg/stdlib/stdlib.shift');
    try {
        bundleContent = inlineStdLib(bundleContent, stdlibPath);
    } catch (err) {
        console.error(`❌ Error inlining standard library: ${err.message}`);
        process.exit(1);
    }

    // 6. Write final Bundle
    try {
        fs.writeFileSync(OUTPUT_FILE, bundleContent);
        console.log(`\n✅ Build Complete!`);
        console.log(`   Output: ${OUTPUT_FILE}`);
    } catch (err) {
        console.error(`❌ Failed to write bundle to '${OUTPUT_FILE}': ${err.message}`);
        process.exit(1);
    }
}

bundle();