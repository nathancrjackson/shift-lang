# Shift Language Editors Support

The `editors` directory within the repository contains syntax highlighting configurations for the Shift language in a few common text editors.

## 1. VSCode

To install the VSCode extension manually:

1. Copy the contents of the `vscode` folder into a new directory inside your VSCode extensions folder, named exactly `nathancrjackson.shift-lang-1.0.0`:
   - **Linux / macOS**: `~/.vscode/extensions/nathancrjackson.shift-lang-1.0.0/`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\nathancrjackson.shift-lang-1.0.0\`

2. Inside that folder, ensure the files are placed directly at the root:
```text
nathancrjackson.shift-lang-1.0.0/
├── package.json
├── language-configuration.json
└── syntaxes/
      └── shift.tmLanguage.json
```

3. Restart or reload VSCode (Ctrl+R / Cmd+R in command palette). All `.shift` files will now render with full syntax highlighting.

---

## 2. Notepad++

To install the User Defined Language (UDL) in Notepad++:

1. Open Notepad++.

2. Go to the menu bar: **Language** ➔ **User Defined Language** ➔ **Define your language...**

3. Click the **Import...** button.

4. Select the `editors/notepadplusplus/shift_udl.xml` file.

5. Restart Notepad++. All `.shift` files will now be highlighted according to the imported rules.

---

## 3. Kate

To install the syntax highlighting definition in Kate:

1. Copy the `shift.xml` file into your local user syntax directory (create the `syntax` folder if it does not already exist):
* **Linux**: `~/.local/share/org.kde.syntax-highlighting/syntax/`
* **Windows**: `%USERPROFILE%\AppData\Local\org.kde.syntax-highlighting\syntax\`
* **macOS**: `~/Library/Application Support/org.kde.syntax-highlighting/syntax/`

2. Restart Kate. All `.shift` files will now render with full syntax highlighting and block code folding support.
