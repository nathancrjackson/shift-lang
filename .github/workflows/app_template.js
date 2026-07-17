// --- 1. State Management ---
const STORAGE_KEY = 'shift_playground_files';
const STD_LIB_STORAGE_KEY = 'shift_playground_stdlib';
const VISITED_KEY = 'shift_playground_visited';
const CSV_SETTINGS_KEY = 'shift_playground_csv';

let files = [];
let activeFileId = null;
let fileIdToDelete = null;
let fileIdToRename = null; // For rename modal
let newFileMode = 'source'; // 'source' or 'data'
let docs = [];
let activeDocFilename = null;

// Default CSV Settings
let csvSettings = { delimiter: ',', hasHeader: true };

// Retrieved from global StandardLibrary object as requested
const DEFAULT_STD_LIB_SRC = (typeof StandardLibrary !== 'undefined') ? StandardLibrary.source : '';
const DEFAULT_STD_LIB_INT = (typeof StandardLibrary !== 'undefined') ? StandardLibrary.intrinsics : {};
const DEFAULT_STD_LIB_STRUCTS = (typeof StandardLibrary !== 'undefined') ? StandardLibrary.structs : [];

// Override print_line native function
DEFAULT_STD_LIB_INT["print_line"] = {
    returnType: "none",
    func: (args, runtime) => { uiConsoleLog(args[0]); return null; }
};

// --- Active Filesystem Intrinsics ---

DEFAULT_STD_LIB_INT["file_exists"] = {
    returnType: "bool",
    func: (args, runtime) => {
        const path = args[0];
        return files.some(f => f.name === path);
    }
};

DEFAULT_STD_LIB_INT["read_file"] = {
    returnType: "string",
    func: (args, runtime) => {
        const path = args[0];
        const file = files.find(f => f.name === path);
        if (!file) {
            throw new Error(`Runtime Error: File not found: ${path}`);
        }
        return file.code;
    }
};

DEFAULT_STD_LIB_INT["write_file"] = {
    returnType: "none",
    func: (args, runtime) => {
        const path = args[0];
        const content = args[1] || "";
        const existing = files.find(f => f.name === path);
        if (existing) {
            existing.code = content;
        } else {
            files.push({
                id: (Date.now() + Math.random()).toString(),
                name: path,
                code: content
            });
        }
        saveFiles();
        renderFileList();
        if (activeFileId && existing && existing.id === activeFileId) {
            elEditor.value = content;
            updateLineNumbers();
        }
        return null;
    }
};

DEFAULT_STD_LIB_INT["create_file"] = {
    returnType: "none",
    func: (args, runtime) => {
        const path = args[0];
        const existing = files.find(f => f.name === path);
        if (!existing) {
            files.push({
                id: (Date.now() + Math.random()).toString(),
                name: path,
                code: ""
            });
            saveFiles();
            renderFileList();
        }
        return null;
    }
};

DEFAULT_STD_LIB_INT["delete_file"] = {
    returnType: "none",
    func: (args, runtime) => {
        const path = args[0];
        const idx = files.findIndex(f => f.name === path);
        if (idx !== -1) {
            const deletedId = files[idx].id;
            files.splice(idx, 1);
            saveFiles();
            renderFileList();

            if (activeFileId === deletedId) {
                elEditor.value = "";
                elEditor.disabled = true;
                elFilename.innerText = "No File Selected";
                activeFileId = null;
                updateLineNumbers();
            }
        }
        return null;
    }
};

DEFAULT_STD_LIB_INT["copy_file"] = {
    returnType: "none",
    func: (args, runtime) => {
        const src = args[0];
        const dest = args[1];
        const file = files.find(f => f.name === src);
        if (!file) {
            throw new Error(`Runtime Error: copy_file: Source file not found: ${src}`);
        }
        const existing = files.find(f => f.name === dest);
        if (existing) {
            existing.code = file.code;
        } else {
            files.push({
                id: (Date.now() + Math.random()).toString(),
                name: dest,
                code: file.code
            });
        }
        saveFiles();
        renderFileList();
        return null;
    }
};

DEFAULT_STD_LIB_INT["move_file"] = {
    returnType: "none",
    func: (args, runtime) => {
        const src = args[0];
        const dest = args[1];
        const idx = files.findIndex(f => f.name === src);
        if (idx === -1) {
            throw new Error(`Runtime Error: move_file: Source file not found: ${src}`);
        }
        const destIdx = files.findIndex(f => f.name === dest);
        if (destIdx !== -1) {
            files.splice(destIdx, 1);
        }
        const file = files.find(f => f.name === src);
        file.name = dest;
        saveFiles();
        renderFileList();
        if (activeFileId === file.id) {
            elFilename.innerText = dest;
        }
        return null;
    }
};

// Folder intrinsics: Throw standard runtime errors
DEFAULT_STD_LIB_INT["create_folder"] = {
    returnType: "none",
    func: (args, runtime) => {
        throw new Error("Runtime Error: create_folder is not supported in the web playground.");
    }
};

DEFAULT_STD_LIB_INT["delete_folder"] = {
    returnType: "none",
    func: (args, runtime) => {
        throw new Error("Runtime Error: delete_folder is not supported in the web playground.");
    }
};

DEFAULT_STD_LIB_INT["folder_exists"] = {
    returnType: "bool",
    func: (args, runtime) => {
        throw new Error("Runtime Error: folder_exists is not supported in the web playground.");
    }
};

DEFAULT_STD_LIB_INT["copy_folder"] = {
    returnType: "none",
    func: (args, runtime) => {
        throw new Error("Runtime Error: copy_folder is not supported in the web playground.");
    }
};

DEFAULT_STD_LIB_INT["move_folder"] = {
    returnType: "none",
    func: (args, runtime) => {
        throw new Error("Runtime Error: move_folder is not supported in the web playground.");
    }
};

// DOM Elements
const elEditor = document.getElementById('code-editor');
const elLineNumbers = document.getElementById('line-numbers');
const elFilename = document.getElementById('current-filename');
const elConsole = document.getElementById('console-output');
const elDebug = document.getElementById('debug-output');
const elBtnRun = document.getElementById('btn-run');

// Sidebar Lists
const elSourceList = document.getElementById('file-list-source');
const elDataList = document.getElementById('file-list-data');

// Sidebar & Mobile Elements
const elSidebar = document.getElementById('sidebar');
const elBtnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const elMobileBackdrop = document.getElementById('mobile-backdrop');

// Header Actions
const btnExport = document.getElementById('btn-export-file');
const btnConfig = document.getElementById('btn-config');
const fileInputImportSource = document.getElementById('file-input-import-source');
const fileInputImportData = document.getElementById('file-input-import-data');
const fileInputStdLib = document.getElementById('file-input-stdlib');
const fileInputRestore = document.getElementById('file-input-restore');

// Section Actions
const btnNewSource = document.getElementById('btn-new-source');
const btnNewData = document.getElementById('btn-new-data');
const btnImportSource = document.getElementById('btn-import-source');
const btnImportData = document.getElementById('btn-import-data');

// Modals
const elDeleteModal = document.getElementById('delete-modal');
const elRenameModal = document.getElementById('rename-modal');
const elNewFileModal = document.getElementById('new-file-modal');
const elAboutModal = document.getElementById('about-modal');
const elConfigModal = document.getElementById('config-modal');

// Config CSV Inputs
const elCsvDelimiter = document.getElementById('csv-delimiter');
const elCsvHeader = document.getElementById('csv-header');

// Modal Inputs/Dynamic Elements
const elDeleteModalFilename = document.getElementById('modal-filename');
const elRenameFileInput = document.getElementById('rename-file-input');
const elNewFileNameInput = document.getElementById('new-file-name');
const elNewFileDemoCheck = document.getElementById('include-demo-code');
const elNewFileDemoLabel = document.getElementById('label-include-demo');
const elNewFileTitle = document.querySelector('#new-file-modal h3');
const elConfigEditor = document.getElementById('config-editor');
const elConfigLineNumbers = document.getElementById('config-line-numbers');
const elConfigNativeViewer = document.getElementById('config-native-viewer');
const elConfigStructsViewer = document.getElementById('config-structs-viewer');

// New File Modal Sections
const elNewFileSourceOptions = document.getElementById('new-file-source-options');
const elNewFileDataOptions = document.getElementById('new-file-data-options');
const elDataTemplateSelect = document.getElementById('data-template-select');

// AST Download
const btnDownloadAST = document.getElementById('btn-download-ast');

// Documentation elements
const elDocsList = document.getElementById('file-list-docs');
const elDocViewer = document.getElementById('doc-viewer');
const elDocViewerContent = document.getElementById('doc-viewer-content');
const elBtnCloseDoc = document.getElementById('btn-close-doc');


// --- 2. Virtual File System (LocalStorage) ---

function loadFiles() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        files = JSON.parse(stored);
    } else {
        // INJECT DEMO CODE INTO HERE
    }
    renderFileList();
    if (files.length > 0) {
        const firstSource = files.find(f => f.name.endsWith('.shift'));
        switchFile(firstSource ? firstSource.id : files[0].id);
    } else {
        elEditor.disabled = true;
        elEditor.value = "";
        elFilename.innerText = "No File Selected";
        updateLineNumbers();
    }
}

function saveFiles() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

// --- 3. Settings Logic ---
function loadSettings() {
    const storedStd = localStorage.getItem(STD_LIB_STORAGE_KEY);
    const storedCsv = localStorage.getItem(CSV_SETTINGS_KEY);
    if (storedCsv) {
        csvSettings = JSON.parse(storedCsv);
    }
    return storedStd !== null ? storedStd : DEFAULT_STD_LIB_SRC;
}

function saveStdLib(code) {
    localStorage.setItem(STD_LIB_STORAGE_KEY, code);
}

function saveCsvSettings() {
    csvSettings = {
        delimiter: elCsvDelimiter.value,
        hasHeader: elCsvHeader.checked
    };
    localStorage.setItem(CSV_SETTINGS_KEY, JSON.stringify(csvSettings));
}

function formatNativeFunctions(intrinsics) {
    let output = "{\n";
    for (const [key, value] of Object.entries(intrinsics)) {
        output += `  "${key}": {\n`;
        output += `    returnType: "${value.returnType}",\n`;
        output += `    func: ${value.func.toString()}\n`;
        output += `  },\n`;
    }
    output += "}";
    return output;
}


// --- 4. Line Numbers & Editor Logic ---
function updateLineNumbers() {
    if (elEditor.disabled) {
        elLineNumbers.innerHTML = '';
        return;
    }
    const lines = elEditor.value.split('\n').length;
    elLineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');
}

elEditor.addEventListener('scroll', () => {
    elLineNumbers.scrollTop = elEditor.scrollTop;
});

elEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = elEditor.selectionStart;
        const end = elEditor.selectionEnd;
        const val = elEditor.value;
        const selection = val.substring(start, end);

        if (e.shiftKey || selection.includes('\n')) {
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            let effectiveEnd = end;
            if (end > start && val[end - 1] === '\n') {
                effectiveEnd--;
            }
            let lineEnd = val.indexOf('\n', effectiveEnd);
            if (lineEnd === -1) lineEnd = val.length;

            const textBlock = val.substring(lineStart, lineEnd);
            const lines = textBlock.split('\n');
            const newLines = lines.map(line => {
                if (e.shiftKey) {
                    return line.startsWith('\t') ? line.substring(1) : line;
                } else {
                    return '\t' + line;
                }
            });
            const newText = newLines.join('\n');
            elEditor.setRangeText(newText, lineStart, lineEnd, 'select');
        } else {
            elEditor.setRangeText('\t', start, end, 'end');
        }
        elEditor.dispatchEvent(new Event('input'));
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFiles();
        if (!elBtnRun.disabled) {
            runInterpreter();
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const start = elEditor.selectionStart;
        const end = elEditor.selectionEnd;
        const val = elEditor.value;

        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;

        const lineContent = val.substring(lineStart, lineEnd);
        const insertText = '\n' + lineContent;

        elEditor.setRangeText(insertText, lineEnd, lineEnd, 'preserve');
        elEditor.dispatchEvent(new Event('input'));
        updateLineNumbers();
    }
});

function updateConfigLineNumbers() {
    const lines = elConfigEditor.value.split('\n').length;
    elConfigLineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');
}

elConfigEditor.addEventListener('input', updateConfigLineNumbers);
elConfigEditor.addEventListener('scroll', () => {
    elConfigLineNumbers.scrollTop = elConfigEditor.scrollTop;
});


// --- 5. Responsive Logic (Sidebar) ---
function toggleSidebar() {
    elSidebar.classList.toggle('open');
    elMobileBackdrop.classList.toggle('open');
}

function closeSidebar() {
    elSidebar.classList.remove('open');
    elMobileBackdrop.classList.remove('open');
}

elBtnToggleSidebar.addEventListener('click', toggleSidebar);
elMobileBackdrop.addEventListener('click', closeSidebar);


// --- 6. Modal Logic ---

function hideAllModals() {
    elDeleteModal.classList.add('hidden');
    elRenameModal.classList.add('hidden');
    elNewFileModal.classList.add('hidden');
    elAboutModal.classList.add('hidden');
    elConfigModal.classList.add('hidden');
}

function promptDelete(id, name, event) {
    event.stopPropagation();
    fileIdToDelete = id;
    elDeleteModalFilename.innerText = name;
    elDeleteModal.classList.remove('hidden');
}

function confirmDelete() {
    if (!fileIdToDelete) return;
    files = files.filter(f => f.id !== fileIdToDelete);
    saveFiles();
    renderFileList();

    if (activeFileId === fileIdToDelete) {
        if (files.length > 0) {
            switchFile(files[0].id);
        } else {
            elEditor.value = "";
            elEditor.disabled = true;
            elFilename.innerText = "No File Selected";
            activeFileId = null;
            updateLineNumbers();
        }
    }
    hideAllModals();
    fileIdToDelete = null;
}

function promptRename(id, currentName, event) {
    event.stopPropagation();
    fileIdToRename = id;
    elRenameFileInput.value = currentName;
    elRenameModal.classList.remove('hidden');
    elRenameFileInput.focus();
    elRenameFileInput.select();
}

function confirmRename() {
    if (!fileIdToRename) return;
    let newName = elRenameFileInput.value.trim();
    if (!newName) return;

    const file = files.find(f => f.id === fileIdToRename);
    if (file) {
        if (file.name.toLowerCase().endsWith('.shift')) {
            if (!newName.toLowerCase().endsWith('.shift')) {
                newName += '.shift';
            }
        }
        file.name = newName;
        if (activeFileId === fileIdToRename) {
            elFilename.innerText = newName;
        }
        saveFiles();
        renderFileList();
    }
    hideAllModals();
    fileIdToRename = null;
}

function openNewSourceModal() {
    newFileMode = 'source';
    elNewFileTitle.innerText = "Create New Source File";
    elNewFileNameInput.placeholder = "untitled.shift";
    elNewFileNameInput.value = "untitled.shift";
    elNewFileSourceOptions.style.display = 'flex';
    elNewFileDataOptions.style.display = 'none';
    elNewFileDemoCheck.checked = false;
    elNewFileModal.classList.remove('hidden');
    elNewFileNameInput.focus();
    elNewFileNameInput.select();
    closeSidebar();
}

function openNewDataModal() {
    newFileMode = 'data';
    elNewFileTitle.innerText = "Create New Data File";
    elNewFileNameInput.placeholder = "untitled.file";
    elNewFileNameInput.value = "untitled.file";
    elNewFileSourceOptions.style.display = 'none';
    elNewFileDataOptions.style.display = 'flex';
    elDataTemplateSelect.value = "none";
    elNewFileModal.classList.remove('hidden');
    elNewFileNameInput.focus();
    elNewFileNameInput.select();
    closeSidebar();
}

function createNewFile() {
    let name = elNewFileNameInput.value.trim();
    let initialCode = '';

    if (newFileMode === 'source') {
        const useDemo = elNewFileDemoCheck.checked;
        if (!name) name = "untitled.shift";
        if (!name.toLowerCase().endsWith('.shift')) {
            name += ".shift";
        }
        initialCode = useDemo ? demoCode : '';
    } else {
        const template = elDataTemplateSelect.value;
        if (!name) name = "untitled.file";
        switch (template) {
            case 'csv': initialCode = demoCsv; break;
            case 'json': initialCode = demoJson; break;
            case 'tsv': initialCode = demoTsv; break;
            default: initialCode = '';
        }
    }

    const newFile = {
        id: (Date.now() + Math.random()).toString(),
        name: name,
        code: initialCode
    };

    files.push(newFile);
    saveFiles();
    renderFileList();
    switchFile(newFile.id);
    hideAllModals();
}

function openAboutModal() {
    elAboutModal.classList.remove('hidden');
    closeSidebar();
}

function openConfigModal() {
    const currentCode = loadSettings();
    elConfigEditor.value = currentCode;
    elConfigNativeViewer.textContent = formatNativeFunctions(DEFAULT_STD_LIB_INT);
    elConfigStructsViewer.textContent = JSON.stringify(DEFAULT_STD_LIB_STRUCTS, null, 4);
    elCsvDelimiter.value = csvSettings.delimiter;
    elCsvHeader.checked = csvSettings.hasHeader;
    updateConfigLineNumbers();

    document.querySelectorAll('[data-config-target]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-config-target="csv"]').classList.add('active');
    document.getElementById('config-tab-csv').classList.add('active');
    elConfigModal.classList.remove('hidden');
    closeSidebar();
}

function saveAndCloseConfigModal() {
    const newCode = elConfigEditor.value;
    saveStdLib(newCode);
    saveCsvSettings();
    elConfigModal.classList.add('hidden');
}

function dismissConfigModal() {
    elConfigModal.classList.add('hidden');
}

document.getElementById('btn-save-config').addEventListener('click', saveAndCloseConfigModal);
document.getElementById('btn-dismiss-config').addEventListener('click', dismissConfigModal);
document.getElementById('btn-save-config-csv').addEventListener('click', saveAndCloseConfigModal);
document.getElementById('btn-dismiss-config-csv').addEventListener('click', dismissConfigModal);
document.getElementById('btn-close-config-native').addEventListener('click', dismissConfigModal);
document.getElementById('btn-close-config-structs').addEventListener('click', dismissConfigModal);
document.getElementById('btn-close-config-backup').addEventListener('click', dismissConfigModal);

document.querySelectorAll('[data-config-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-config-target]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetId = 'config-tab-' + btn.dataset.configTarget;
        document.getElementById(targetId).classList.add('active');
    });
});

document.getElementById('btn-revert-stdlib').addEventListener('click', () => {
    if (confirm("Are you sure you want to revert the Standard Library to default? All changes will be lost.")) {
        elConfigEditor.value = DEFAULT_STD_LIB_SRC;
        updateConfigLineNumbers();
    }
});

document.getElementById('btn-export-stdlib').addEventListener('click', () => {
    const content = elConfigEditor.value;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stdlib.shift';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('btn-import-stdlib').addEventListener('click', () => {
    fileInputStdLib.click();
});

fileInputStdLib.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        elConfigEditor.value = event.target.result;
        updateConfigLineNumbers();
        fileInputStdLib.value = '';
    };
    reader.readAsText(file);
});

document.getElementById('btn-backup-download').addEventListener('click', () => {
    const backupData = {
        files: localStorage.getItem(STORAGE_KEY),
        stdlib: localStorage.getItem(STD_LIB_STORAGE_KEY),
        visited: localStorage.getItem(VISITED_KEY),
        csv: localStorage.getItem(CSV_SETTINGS_KEY)
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift_playground_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('btn-backup-restore').addEventListener('click', () => {
    fileInputRestore.click();
});

fileInputRestore.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Restoring will overwrite your current files and standard library settings. Continue?")) {
        fileInputRestore.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const backupData = JSON.parse(event.target.result);
            if (backupData.files) localStorage.setItem(STORAGE_KEY, backupData.files);
            if (backupData.stdlib) localStorage.setItem(STD_LIB_STORAGE_KEY, backupData.stdlib);
            if (backupData.visited) localStorage.setItem(VISITED_KEY, backupData.visited);
            if (backupData.csv) localStorage.setItem(CSV_SETTINGS_KEY, backupData.csv);
            alert("Restore successful. Reloading...");
            location.reload();
        } catch (err) {
            alert("Error restoring backup: " + err.message);
        }
        fileInputRestore.value = '';
    };
    reader.readAsText(file);
});

document.getElementById('btn-wipe-all').addEventListener('click', () => {
    if (confirm("DANGER: This will permanently delete all your files and custom settings. Are you sure?")) {
        localStorage.clear();
        location.reload();
    }
});


// --- 7. Import / Export Logic (Main) ---

btnExport.addEventListener('click', () => {
    if (!activeFileId) {
        alert("No file selected to export.");
        return;
    }
    const file = files.find(f => f.id === activeFileId);
    if (!file) return;

    let filename = file.name;
    if (filename.toLowerCase().endsWith('.shift')) {
        if (!filename.toLowerCase().endsWith('.shift')) filename += '.shift';
    }

    const blob = new Blob([file.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function handleFileImport(file, isSource) {
    if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        alert("Error: It looks like you are trying to upload a binary file. Only text-based files are supported.");
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        if (content.indexOf('\0') !== -1) {
            alert("Error: The uploaded file appears to contain binary data and cannot be opened.");
            return;
        }
        const newFile = {
            id: (Date.now() + Math.random()).toString(),
            name: file.name,
            code: content
        };
        files.push(newFile);
        saveFiles();
        renderFileList();
        switchFile(newFile.id);
    };
    reader.readAsText(file);
}

btnImportSource.addEventListener('click', () => fileInputImportSource.click());
btnImportData.addEventListener('click', () => fileInputImportData.click());

fileInputImportSource.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        handleFileImport(e.target.files[0], true);
        fileInputImportSource.value = '';
    }
});

fileInputImportData.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        handleFileImport(e.target.files[0], false);
        fileInputImportData.value = '';
    }
});


// --- 8. Debug / AST Download Logic ---
function checkDebugContent() {
    const content = elDebug.innerText;
    try {
        if (content.trim()) {
            JSON.parse(content);
            btnDownloadAST.style.display = 'block';
        } else {
            btnDownloadAST.style.display = 'none';
        }
    } catch (e) {
        btnDownloadAST.style.display = 'none';
    }
}

btnDownloadAST.addEventListener('click', () => {
    const astContent = elDebug.innerText;
    if (!astContent.trim()) return;

    const activeFile = files.find(f => f.id === activeFileId);
    const baseName = activeFile ? activeFile.name : 'output';
    const filename = baseName + '.debug.json';

    const blob = new Blob([astContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});


// --- Event Listeners (Global) ---

[elDeleteModal, elRenameModal, elNewFileModal, elAboutModal, elConfigModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideAllModals();
    });
});

btnNewSource.addEventListener('click', openNewSourceModal);
btnNewData.addEventListener('click', openNewDataModal);
document.getElementById('btn-about').addEventListener('click', openAboutModal);
btnConfig.addEventListener('click', openConfigModal);

document.getElementById('btn-confirm-delete').addEventListener('click', confirmDelete);
document.getElementById('btn-cancel-delete').addEventListener('click', hideAllModals);
document.getElementById('btn-confirm-rename').addEventListener('click', confirmRename);
document.getElementById('btn-cancel-rename').addEventListener('click', hideAllModals);
elRenameFileInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRename();
});

document.getElementById('btn-confirm-new').addEventListener('click', createNewFile);
document.getElementById('btn-cancel-new').addEventListener('click', hideAllModals);
elNewFileNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewFile();
});

document.getElementById('btn-close-about').addEventListener('click', hideAllModals);


// --- 9. UI Interaction ---

function showStatusBanner(type, message) {
    const existing = elConsole.querySelector('.status-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = `status-banner ${type}`;

    if (type === 'success') {
        banner.innerHTML = `<span>✔</span> <span>${message}</span>`;
    } else {
        banner.innerHTML = `<span>✖</span> <span>${message}</span>`;
    }
    elConsole.prepend(banner);
}

function renderFileList() {
    elSourceList.innerHTML = '';
    elDataList.innerHTML = '';

    files.forEach(file => {
        const li = document.createElement('li');
        li.className = `file-item ${file.id === activeFileId ? 'active' : ''}`;
        li.onclick = () => switchFile(file.id);

        li.innerHTML = `
            <span>${file.name}</span>
            <div class="file-actions">
                <button class="action-icon-btn" title="Rename">✎</button>
                <button class="action-icon-btn delete" title="Delete">×</button>
            </div>
        `;

        const btns = li.querySelectorAll('button');
        btns[0].onclick = (e) => promptRename(file.id, file.name, e);
        btns[1].onclick = (e) => promptDelete(file.id, file.name, e);

        if (file.name.toLowerCase().endsWith('.shift')) {
            elSourceList.appendChild(li);
        } else {
            elDataList.appendChild(li);
        }
    });
}

function switchFile(id) {
    activeDocFilename = null;
    elDocViewer.classList.add('hidden');
    document.querySelector('.split-view').classList.remove('hidden');
    renderDocsList();

    if (activeFileId) {
        const currentFile = files.find(f => f.id === activeFileId);
        if (currentFile) currentFile.code = elEditor.value;
    }

    activeFileId = id;
    const file = files.find(f => f.id === id);

    if (file) {
        elEditor.disabled = false;
        elEditor.value = file.code;
        elFilename.innerText = file.name;
        elBtnRun.disabled = false;
        const isSource = file.name.toLowerCase().endsWith('.shift');
        elBtnRun.title = isSource ? "Run Script" : "Preview Data";
    }

    renderFileList();
    saveFiles();
    updateLineNumbers();

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

elEditor.addEventListener('input', () => {
    if (activeFileId) {
        const file = files.find(f => f.id === activeFileId);
        if (file) {
            file.code = elEditor.value;
            saveFiles();
            updateLineNumbers();
        }
    }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.hasAttribute('data-config-target')) return;
        document.querySelectorAll('.tab-btn:not([data-config-target])').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`view-${btn.dataset.target}`).classList.add('active');
    });
});

document.getElementById('btn-clear').addEventListener('click', () => {
    elConsole.innerHTML = '';
    elDebug.innerHTML = '';
    checkDebugContent();
});


// --- 10. The Interpreter & Data Viewer Bridge ---

function uiConsoleLog(message, isError = false) {
    const line = document.createElement('div');
    line.className = isError ? 'log-line log-error' : 'log-line';
    line.innerText = message;
    elConsole.appendChild(line);
    const container = document.getElementById('view-console');
    container.scrollTop = container.scrollHeight;
}

function uiConsoleInfo(message) {
    const line = document.createElement('div');
    line.className = 'log-line log-info';
    line.innerText = message;
    elConsole.appendChild(line);
}

function uiDebugLog(message) {
    if (typeof message === 'object' && message !== null) {
        elDebug.innerText += JSON.stringify(message, null, 2) + "\n";
    } else {
        elDebug.innerText += message + "\n";
    }
}

/**
 * Parses CSV/TSV formatted string data and renders it as an HTML table in the console output.
 * Ensures structural consistency across all rows.
 * @param {string} content - The raw CSV/TSV source text.
 * @param {string} delimiter - The field delimiter character (e.g. ',' or '\t').
 * @param {boolean} hasHeader - Whether the first line is treated as a table header.
 * @throws {TypeError} If parameters do not match required types.
 */
function uiRenderTable(content, delimiter, hasHeader) {
    // Guard Clauses / Explicit Input Validation
    if (typeof content !== 'string') {
        throw new TypeError("content must be a string.");
    }
    if (typeof delimiter !== 'string' || delimiter.length !== 1) {
        throw new TypeError("delimiter must be a single-character string.");
    }
    if (typeof hasHeader !== 'boolean') {
        throw new TypeError("hasHeader must be a boolean.");
    }

    const lines = content.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    const parseLine = (text) => {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (insideQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentValue += '"';
                        i++;
                    } else {
                        insideQuotes = false;
                    }
                } else {
                    currentValue += char;
                }
            } else {
                if (char === '"' && currentValue.trim() === '') {
                    insideQuotes = true;
                } else if (char === delimiter) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
        }
        values.push(currentValue);
        return values;
    };

    const parsedRows = lines.map(line => parseLine(line));
    if (parsedRows.length === 0) return;

    const expectedColCount = parsedRows[0].length;
    const badLines = [];

    parsedRows.forEach((row, idx) => {
        if (row.length !== expectedColCount) {
            badLines.push(idx + 1);
        }
    });

    if (badLines.length > 0) {
        uiConsoleLog(`CSV Error: Row length mismatch. Expected ${expectedColCount} columns.`, true);
        uiConsoleLog(`Check lines: ${badLines.join(', ')}`, true);
        return;
    }

    const table = document.createElement('table');
    table.className = 'csv-table';

    parsedRows.forEach((cols, index) => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const cell = (index === 0 && hasHeader) ? document.createElement('th') : document.createElement('td');
            cell.textContent = col;
            tr.appendChild(cell);
        });
        table.appendChild(tr);
    });

    elConsole.appendChild(table);
}

/**
 * Orchestrates compiling and running the currently selected script or file.
 * Automatically delegates to parser helper modes depending on file extensions.
 * @returns {Promise<void>} Resolves when execution completes.
 */
async function runInterpreter() {
    // Guard Clause
    if (!activeFileId) {
        alert("Please create or select a file first.");
        return;
    }

    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) {
        console.error("No active file matches the selection ID.");
        return;
    }

    const sourceCode = elEditor.value;
    const isShift = activeFile.name.toLowerCase().endsWith('.shift');

    elConsole.innerHTML = '';
    elDebug.innerHTML = '';
    checkDebugContent();

    if (isShift) {
        const stdLibCode = loadSettings();
        let std_lib_compiled = false;
        let shift_engine = null;

        try {
            // Supply custom importResolver to Shift to resolve scripts from explorer sidebar
            shift_engine = new Shift(stdLibCode, DEFAULT_STD_LIB_INT, {
                importResolver: (requestedPath, parentPath) => {
                    const file = files.find(f => f.name === requestedPath);
                    if (!file) {
                        throw new Error(`Import Error: File not found: ${requestedPath}`);
                    }
                    return {
                        code: file.code,
                        resolvedPath: requestedPath
                    };
                }
            });

            if (shift_engine.stdLibErrors.length === 0) {
                std_lib_compiled = true;
            } else {
                uiConsoleLog(`COULD NOT COMPILE THE STANDARD LIBRARY`, true);
                let first_error = shift_engine.stdLibErrors[0];
                uiConsoleLog(`Line ${first_error.line}: ${first_error.message}`, true);
                showStatusBanner('error', `StdLib Error (Line ${first_error.line}): ${first_error.message}`);

                shift_engine.stdLibErrors.forEach(e => {
                    const msg = `Line ${e.line}: ${e.message}`;
                    uiDebugLog(msg);
                    console.error(msg);
                });
            }

            if (std_lib_compiled) {
                let result = shift_engine.run(sourceCode, "main", []);
                uiDebugLog(shift_engine.finalAST);

                const now = new Date();
                const timeStr = now.toTimeString().split(' ')[0];
                uiConsoleLog(``);
                uiConsoleLog(`--- Script run at ${timeStr} exited with return code: ${result}`);
                showStatusBanner('success', `Script exited successfully with return code ${result}`);
            }

        } catch (e) {
            uiConsoleLog(`COULD NOT RUN SCRIPT`, true);
            uiConsoleLog(`${e.message}`, true);
            uiDebugLog(e.stack);
            showStatusBanner('error', e.message);
        }
    } else {
        let processed = false;

        try {
            const json = JSON.parse(sourceCode);
            const pre = document.createElement('pre');
            pre.innerText = JSON.stringify(json, null, 2);
            elConsole.appendChild(pre);
            uiConsoleInfo("Successfully parsed as JSON.");
            processed = true;
        } catch (e) { }

        if (!processed) {
            const isTsvExt = activeFile.name.toLowerCase().endsWith('.tsv');
            if (isTsvExt || (sourceCode.includes('\t') && sourceCode.includes('\n'))) {
                try {
                    uiRenderTable(sourceCode, '\t', csvSettings.hasHeader);
                    uiConsoleInfo(`Parsed as TSV (Tab separated).`);
                    processed = true;
                } catch (e) { }
            }
        }

        if (!processed) {
            try {
                if (sourceCode.includes(csvSettings.delimiter) && sourceCode.includes('\n')) {
                    uiRenderTable(sourceCode, csvSettings.delimiter, csvSettings.hasHeader);
                    uiConsoleInfo(`Parsed as CSV (Delimiter: "${csvSettings.delimiter}", Header: ${csvSettings.hasHeader}). Check Config to change.`);
                    processed = true;
                }
            } catch (e) { }
        }

        if (!processed) {
            uiConsoleInfo("File format not recognized as JSON or CSV/TSV. Showing raw text.");
            const pre = document.createElement('pre');
            pre.innerText = sourceCode;
            elConsole.appendChild(pre);
        }
    }

    checkDebugContent();
}

// --- 9. Integrated Documentation Viewer Logic ---

/**
 * Loads the documentation metadata list (content.json) from the host environment.
 * @returns {Promise<void>} Resolves when loading and rendering is complete.
 */
async function loadDocs() {
    // Guard Clause
    if (!elDocsList) {
        console.error("elDocsList container is not initialized.");
        return;
    }

    try {
        const response = await fetch('content.json');
        if (!response.ok) throw new Error('Could not load content.json');
        docs = await response.json();
        renderDocsList();
    } catch (e) {
        console.error('Error loading documentation list:', e);
        const docHeader = elDocsList.parentElement;
        if (docHeader) {
            docHeader.style.display = 'none';
        }
    }
}

/**
 * Redraws the sidebar elements containing discovered Markdown documentation pages.
 * @throws {TypeError} If the document list element is missing.
 */
function renderDocsList() {
    // Guard Clause
    if (!elDocsList) {
        throw new TypeError("elDocsList is not initialized.");
    }

    elDocsList.innerHTML = '';
    docs.forEach(doc => {
        const li = document.createElement('li');
        li.className = `file-item ${doc.filename === activeDocFilename ? 'active' : ''}`;
        li.onclick = () => selectDoc(doc.filename, doc.title);
        li.innerHTML = `<span>${doc.title}</span>`;
        elDocsList.appendChild(li);
    });
}

/**
 * Fetches, sanitizes, compiles, and renders a chosen documentation page.
 * @param {string} filename - The relative path or filename of the document.
 * @param {string} title - The display title.
 * @returns {Promise<void>} Resolves when rendering completes.
 * @throws {TypeError} If inputs are invalid.
 */
async function selectDoc(filename, title) {
    // Guard Clauses / Explicit Input Validation
    if (typeof filename !== 'string' || !filename) {
        throw new TypeError("filename must be a non-empty string.");
    }
    if (typeof title !== 'string' || !title) {
        throw new TypeError("title must be a non-empty string.");
    }

    try {
        if (activeFileId) {
            const currentFile = files.find(f => f.id === activeFileId);
            if (currentFile) currentFile.code = elEditor.value;
        }

        const response = await fetch(filename);
        if (!response.ok) throw new Error(`Could not fetch doc: ${filename}`);
        const markdown = await response.text();

        const html = DOMPurify.sanitize(marked.parse(markdown));
        elDocViewerContent.innerHTML = html;
        elDocViewerContent.scrollTop = 0;

        activeDocFilename = filename;
        activeFileId = null;

        elDocViewer.classList.remove('hidden');
        document.querySelector('.split-view').classList.add('hidden');

        elFilename.innerText = title;
        elBtnRun.disabled = true;

        renderFileList();
        renderDocsList();

        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    } catch (e) {
        console.error('Error rendering documentation:', e);
        alert(`Failed to load documentation: ${e.message}`);
    }
}

/**
 * Closes the active documentation reader panel and restores the code editor views.
 */
function closeDoc() {
    activeDocFilename = null;
    elDocViewer.classList.add('hidden');
    document.querySelector('.split-view').classList.remove('hidden');
    elBtnRun.disabled = false;

    if (files.length > 0) {
        const lastFile = files.find(f => f.name.endsWith('.shift'));
        switchFile(lastFile ? lastFile.id : files[0].id);
    } else {
        elEditor.disabled = true;
        elEditor.value = "";
        elFilename.innerText = "No File Selected";
        updateLineNumbers();
        renderFileList();
        renderDocsList();
    }
}

document.getElementById('btn-run').addEventListener('click', runInterpreter);
elBtnCloseDoc.addEventListener('click', closeDoc);

loadFiles();
loadDocs();

if (!localStorage.getItem(VISITED_KEY)) {
    openAboutModal();
    localStorage.setItem(VISITED_KEY, 'true');
}
