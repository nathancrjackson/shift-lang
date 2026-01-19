const fs = require('fs');
const path = require('path');

// Configuration
const ENTRY_FILE = path.join(__dirname, '../src', 'shift.mjs');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'shift_lib.mjs');

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
    const importRegex = /import\s+(?:{[^}]+}|.*?)\s+from\s+['"](\.\/[^'"]+)['"];?/g;
    
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
    console.log(`\n📦 Starting Build from: ${ENTRY_FILE}`);

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

    // 3. Combine Content
    let bundleContent = `/**
 * Shift Script Library
 * Bundled at: ${new Date().toISOString()}
 */
`;

    buildOrder.forEach(fileObj => {
        const fileName = path.basename(fileObj.path);
        console.log(`   + Adding ${fileName}`);

        // Strip import statements as code is now in one file
        // Regex matches lines starting with "import" up to semicolon or newline
        let cleanedContent = fileObj.content.replace(/import\s+(?:{[^}]+}|.*?)\s+from\s+['"]\.\/[^'"]+['"];?\r?\n?/g, '');

        bundleContent += `\n// --- Source: ${fileName} ---\n`;
        bundleContent += cleanedContent + '\n';
    });

    // 4. Write Dist
    fs.writeFileSync(OUTPUT_FILE, bundleContent);
    console.log(`\n✅ Build Complete!`);
    console.log(`   Output: ${OUTPUT_FILE}`);
}

bundle();