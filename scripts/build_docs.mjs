// ./scripts/build_docs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏁 Starting Shift Playground Document Bundler...');

const ROOT_DIR = path.resolve(__dirname, '..');
const UTILS_DIR = __dirname;
const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github/workflows');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_FILE = path.join(ROOT_DIR, 'docs/index.html');
const EXAMPLE_SCRIPT_DIR = path.join(ROOT_DIR, 'example_script');

try {
    // 1. Run standard library bundler for both standard and core distributions
    console.log('📦 Rebuilding engine standard and core distributions...');
    const execOpts = { cwd: UTILS_DIR, stdio: 'inherit', shell: process.platform === 'win32' ? 'powershell.exe' : true };
    execSync('node build_js_lib.mjs', execOpts);
    execSync('node build_js_lib.mjs --core', execOpts);

    // 2. Format build date version string: Version YY.MM.DD.HHMM
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const versionString = `Version ${yy}.${mm}.${dd}.${hh}${min}`;
    console.log(`🏷️  Generated version: ${versionString}`);

    // 3. Read template and source assets
    const templatePath = path.join(WORKFLOWS_DIR, 'index.template.html');
    const stylePath = path.join(WORKFLOWS_DIR, 'style.css');
    const appTemplatePath = path.join(WORKFLOWS_DIR, 'app_template.js');
    const coreLibPath = path.join(DIST_DIR, 'shift_core_lib.mjs');

    if (!fs.existsSync(templatePath)) throw new Error(`Missing template: ${templatePath}`);
    if (!fs.existsSync(stylePath)) throw new Error(`Missing style: ${stylePath}`);
    if (!fs.existsSync(appTemplatePath)) throw new Error(`Missing app template: ${appTemplatePath}`);
    if (!fs.existsSync(coreLibPath)) throw new Error(`Missing core library: ${coreLibPath}`);

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const styleContent = fs.readFileSync(stylePath, 'utf8');
    let appContent = fs.readFileSync(appTemplatePath, 'utf8');

    // Read and populate files array from demo_script folder
    const demoFiles = fs.readdirSync(EXAMPLE_SCRIPT_DIR);
    const filesArray = [];
    
    // Sort files to put .shift first
    demoFiles.sort((a, b) => {
        if (a.endsWith('.shift') && !b.endsWith('.shift')) return -1;
        if (!a.endsWith('.shift') && b.endsWith('.shift')) return 1;
        return a.localeCompare(b);
    });

    let idCounter = 1;
    for (const filename of demoFiles) {
        const filePath = path.join(EXAMPLE_SCRIPT_DIR, filename);
        if (fs.statSync(filePath).isDirectory()) continue;
        // Do not include temp stree files or gitignores
        if (filename.startsWith('.') || filename.endsWith('.stree.json') || filename === 'ast_stree.json') continue;
        
        const content = fs.readFileSync(filePath, 'utf8');
        filesArray.push({
            id: `demo${idCounter++}`,
            name: filename,
            code: content
        });
    }

    const filesArrayString = JSON.stringify(filesArray, null, 8);
    
    // Inject the dynamically loaded files list into loadFiles() placeholder
    appContent = appContent.replace(/\/\/\s*INJECT DEMO CODE INTO HERE/g, `files = ${filesArrayString};`);
    
    // Read the library code and strip 'export ' statements to make declarations global in browser context
    let libraryCode = fs.readFileSync(coreLibPath, 'utf8');
    libraryCode = libraryCode.replace(/\bexport\s+(class|const|let|function|async|default)\b/g, '$1');
    // Replace export alias with global binding for browser context
    libraryCode = libraryCode.replace(/export\s*\{\s*validateASTFunc\s+as\s+validateAST\s*\}\s*;?/g, 'const validateASTFunc = validateAST;');

    // 4. Ensure docs folder exists
    const docsDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    // 5. Copy/write modular assets
    console.log('🪄  Generating modular assets inside docs/ directory...');
    fs.writeFileSync(path.join(docsDir, 'style.css'), styleContent, 'utf8');
    fs.writeFileSync(path.join(docsDir, 'app.js'), appContent, 'utf8');
    fs.writeFileSync(path.join(docsDir, 'marked.umd.js'), fs.readFileSync(path.join(WORKFLOWS_DIR, 'marked.umd.js')), 'utf8');
    fs.writeFileSync(path.join(docsDir, 'purify.min.js'), fs.readFileSync(path.join(WORKFLOWS_DIR, 'purify.min.js')), 'utf8');
    fs.writeFileSync(path.join(docsDir, 'shift_core_lib.js'), libraryCode, 'utf8');

    // Substitute version string in index.template.html and save to docs/index.html
    let outputContent = templateContent.replace('/* VERSION_PLACEHOLDER */', versionString);
    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');
    console.log(`✨ Successfully generated docs/index.html`);

    // 6. Scan docs directory for Markdown files and generate content.json
    console.log('🔍 Scanning docs directory for Markdown documentation...');
    const filesInDocs = fs.readdirSync(docsDir);
    const docItems = [];

    for (const filename of filesInDocs) {
        if (filename.endsWith('.md')) {
            const filePath = path.join(docsDir, filename);
            const content = fs.readFileSync(filePath, 'utf8');
            const firstLine = content.split('\n')[0] || '';
            const title = firstLine.replace(/^#+\s*/, '').trim() || filename;
            docItems.push({
                filename: filename,
                title: title
            });
            console.log(`   + Found doc: ${filename} ("${title}")`);
        }
    }

    fs.writeFileSync(path.join(docsDir, 'content.json'), JSON.stringify(docItems, null, 4), 'utf8');
    console.log(`✨ Successfully generated docs/content.json`);

} catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
}