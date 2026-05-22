const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏁 Starting Shift Playground Document Bundler...');

const ROOT_DIR = path.resolve(__dirname, '../..');
const UTILS_DIR = __dirname;
const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github/workflows');
const DIST_DIR = path.join(ROOT_DIR, 'js_runtime/dist');
const OUTPUT_FILE = path.join(ROOT_DIR, 'docs/index.html');

try {
    // 1. Run standard library bundler for both standard and core distributions
    console.log('📦 Rebuilding engine standard and core distributions...');
    execSync('node lib_bundler.js', { cwd: UTILS_DIR, stdio: 'inherit' });
    execSync('node lib_bundler.js --core', { cwd: UTILS_DIR, stdio: 'inherit' });

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
    const appPath = path.join(WORKFLOWS_DIR, 'app.js');
    const coreLibPath = path.join(DIST_DIR, 'shift_core_lib.mjs');

    if (!fs.existsSync(templatePath)) throw new Error(`Missing template: ${templatePath}`);
    if (!fs.existsSync(stylePath)) throw new Error(`Missing style: ${stylePath}`);
    if (!fs.existsSync(appPath)) throw new Error(`Missing app logic: ${appPath}`);
    if (!fs.existsSync(coreLibPath)) throw new Error(`Missing core library: ${coreLibPath}`);

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const styleContent = fs.readFileSync(stylePath, 'utf8');
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Read the library code and strip 'export ' statements to make declarations global in browser context
    let libraryCode = fs.readFileSync(coreLibPath, 'utf8');
    libraryCode = libraryCode.replace(/\bexport\s+(class|const|let|function|async|default)\b/g, '$1');

    // 4. Inject contents into template placeholders
    console.log('🪄  Injecting components into layout skeleton...');
    let outputContent = templateContent;

    // Substitute placeholders
    outputContent = outputContent.replace('/* STYLE_CSS_PLACEHOLDER */', styleContent);
    
    // Using function in replace() to avoid special character replacement issues with $$ and $& in JS strings
    outputContent = outputContent.replace('/* SHIFT_LIB_PLACEHOLDER */', () => libraryCode);
    outputContent = outputContent.replace('/* APP_JS_PLACEHOLDER */', () => appContent);
    outputContent = outputContent.replace('/* VERSION_PLACEHOLDER */', versionString);

    // 5. Ensure docs folder exists and write compiled file
    const docsDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');
    console.log(`✨ Successfully generated docs/index.html at ${OUTPUT_FILE}`);

} catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
}
