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

// Track processed files to avoid duplicates and ensure order
const includedFiles = new Set();
const buildOrder = [];

/**
 * Recursively analyzes imports to build a dependency list.
 * Strategy: Depth-First Search (Post-Order) to ensure dependencies 
 * are added before the files that import them.
 */
function resolveDependencies(filePath) {
    const absolutePath = path.resolve(filePath);

    if (includedFiles.has(absolutePath)) {
        return;
    }

    // specific check to prevent circular dependency loops if they existed
    // (though Shift architecture looks clean DAG-wise)
    
    const content = fs.readFileSync(absolutePath, 'utf-8');
    
    // Regex to find: import { ... } from './path.mjs';
    // capturing group 2 is the relative path
    const importRegex = /(?:import|export)\s+(?:{[^}]+}|\*|.*?)\s+from\s+['"](\.\/[^'"]+)['"];?/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const dir = path.dirname(absolutePath);
        const dependencyPath = path.join(dir, importPath);
        
        resolveDependencies(dependencyPath);
    }

    includedFiles.add(absolutePath);
    buildOrder.push({
        path: absolutePath,
        content: content
    });
}

function bundle() {
    console.log(`\n📦 Starting ${isCore ? 'CORE' : 'STANDARD'} Build from: ${ENTRY_FILE}`);

    // 1. Build Dependency Tree
    try {
        resolveDependencies(ENTRY_FILE);
    } catch (err) {
        console.error(`❌ Error resolving dependencies: ${err.message}`);
        process.exit(1);
    }

    console.log(`   Found ${buildOrder.length} files.`);

    // 2. Prepare Output Directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Sanity Checks for Core Build
    if (isCore) {
        buildOrder.forEach(fileObj => {
            const fileName = path.basename(fileObj.path);
            if (fileName === 'node_fs.mjs') {
                console.error("❌ Build Error: node_fs.mjs cannot be included in a core build!");
                process.exit(1);
            }
            if (/import\s+(?:{[^}]+}|.*?)\s+from\s+['"](?:fs|path)['"]/g.test(fileObj.content)) {
                console.error(`❌ Build Error: Native module import (fs/path) found in ${fileName} during core build!`);
                process.exit(1);
            }
        });
    }

    // 3. Combine Content
    let bundleContent = `/**
 * Shift Script Library (${isCore ? 'Core Mode' : 'Standard Mode'})
 * Bundled at: ${new Date().toISOString()}
 */
`;

    buildOrder.forEach(fileObj => {
        const fileName = path.basename(fileObj.path);
        console.log(`   + Adding ${fileName}`);

        // Strip import and export statements as code is now in one file
        // Regex matches lines starting with "import" or "export ... from" up to semicolon or newline
        let cleanedContent = fileObj.content.replace(/(?:import|export)\s+(?:{[^}]+}|\*|.*?)\s+from\s+['"]\.\/[^'"]+['"](?:\s+(?:with|assert)\s*\{[^}]+\})?;?\r?\n?/g, '');

        // Strip the Node-specific dynamic stdlib loader block (avoiding top-level await syntax errors in browsers)
        cleanedContent = cleanedContent.replace(/if\s*\(typeof\s+process\s*!==\s*['"]undefined['"]\)\s*\{[\s\S]*?stdlibSource\s*=\s*fs\.readFileSync[\s\S]*?\}\s*\}\s*\r?\n?/g, '');

        bundleContent += `\n// --- Source: ${fileName} ---\n`;
        bundleContent += cleanedContent + '\n';
    });

    // 4. Inline the Shift stdlib source code from stdlib.shift
    const stdlibPath = path.join(__dirname, '../../go_runtime/pkg/stdlib/stdlib.shift');
    if (fs.existsSync(stdlibPath)) {
        const stdlibContent = fs.readFileSync(stdlibPath, 'utf8');
        // Safely escape backticks and dollar signs if they appear in standard library
        const escapedContent = stdlibContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        bundleContent = bundleContent.replace("standardLibrarySourcePlaceholder", escapedContent);
    }

    // 5. Write Dist
    fs.writeFileSync(OUTPUT_FILE, bundleContent);
    console.log(`\n✅ Build Complete!`);
    console.log(`   Output: ${OUTPUT_FILE}`);
}

bundle();