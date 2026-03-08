/**
 * convert-test-groups-to-json.mjs
 *
 * For each .mjs module under --dir (default: ../unit_tests/test_modules):
 *  - imports the module (ESM),
 *  - selects the appropriate export (prefers *_tests, else default, else only export),
 *  - writes it as JSON to a mirrored path under --out (default: ../unit_tests/test_json)
 *
 * Usage:
 *   node convert-test-groups-to-json.mjs [--dir ../unit_tests/test_modules] [--out ../unit_tests/test_json] [--all-exports] [--min]
 *
 * Options:
 *   --dir <path>        Directory to scan for .mjs files (default: ../unit_tests/test_modules)
 *   --out <path>        Base directory for output .json files (default: ../unit_tests/test_json)
 *   --all-exports       Instead of picking a single export, writes an object of all exports
 *   --min               Minify JSON output (no pretty-print)
 */

import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------- CLI parsing ----------------
const args = process.argv.slice(2);
function getArg(flag, fallback = undefined) {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  return args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : true;
}

const dir = getArg('--dir', '../unit_tests/test_modules');
const outDir = getArg('--out', '../../go_runtime/unit_tests/tests_json');
const writeAll = args.includes('--all-exports');
const pretty = args.includes('--min') ? 0 : 2;

// --------------- Helpers --------------------

async function listMjsFiles(rootDir) {
  const results = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && full.endsWith('.mjs')) {
        results.push(full);
      }
    }
  }
  await walk(rootDir);
  return results;
}

/**
 * JSON replacer that safely encodes non-JSON-native values.
 * - RegExp -> { __type: 'RegExp', source, flags }
 * - BigInt -> string
 * - Map    -> { __type: 'Map', entries: [[k,v], ...] }
 * - Set    -> { __type: 'Set', values: [ ... ] }
 * - Date   -> { __type: 'Date', iso: '...' }
 * - TypedArrays/ArrayBuffer views -> { __type: 'Uint8Array'|'Float64Array'|..., base64 }
 * Functions/Promises will throw (we can't serialize them).
 */
function safeReplacer(_key, value) {
  if (value instanceof RegExp) {
    return { __type: 'RegExp', source: value.source, flags: value.flags };
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value.values()) };
  }
  if (value instanceof Date) {
    return { __type: 'Date', iso: value.toISOString() };
  }
  if (ArrayBuffer.isView(value)) {
    const buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    return { __type: value.constructor.name, base64: buf.toString('base64') };
  }
  if (value && typeof value === 'object' && typeof value.then === 'function') {
    throw new Error('Cannot serialize a Promise.');
  }
  if (typeof value === 'function') {
    throw new Error('Cannot serialize a function.');
  }
  return value;
}

/**
 * Choose which export to write:
 *  - If --all-exports: write an object with all exports.
 *  - Else, prefer an export whose name ends with `_tests` (e.g., lexer_tests).
 *  - Else, if there’s a `default`, use that.
 *  - Else, if exactly one export, use it.
 *  - Else, fallback to all exports object and warn.
 */
function pickExport(moduleNs, filePath) {
  const exportNames = Object.keys(moduleNs);
  if (exportNames.length === 0) {
    throw new Error('Module has no exports.');
  }

  if (exportNames.includes('default') && exportNames.length === 1 && !writeAll) {
    return moduleNs.default;
  }

  if (!writeAll) {
    // Prefer *_tests
    const testsKey = exportNames.find((k) => k.endsWith('_tests'));
    if (testsKey) return moduleNs[testsKey];

    // Fallback to default if present
    if (exportNames.includes('default')) return moduleNs.default;

    // If only one export, use it
    if (exportNames.length === 1) return moduleNs[exportNames[0]];
  }

  // As a fallback or when --all-exports is set: return all exports as an object
  const all = {};
  for (const k of exportNames) all[k] = moduleNs[k];
  if (!writeAll) {
    console.warn(
      `[warn] ${filePath}: multiple exports found and none matched "*_tests"; writing all exports as an object.`,
    );
  }
  return all;
}

/**
 * Builds output path by:
 *  - computing relative path from baseDir,
 *  - swapping .mjs -> .json,
 *  - joining with outBase,
 *  - ensuring parent directory exists.
 */
async function buildOutPath(filePath, baseDir, outBase) {
  const rel = path.relative(path.resolve(baseDir), path.resolve(filePath));
  const relJson = rel.replace(/\.mjs$/, '.json');
  const outPath = path.join(path.resolve(outBase), relJson);

  await mkdir(path.dirname(outPath), { recursive: true });
  return outPath;
}

async function convertMjsToJson(filePath, baseDir, outBase) {
  const url = pathToFileURL(path.resolve(filePath)).href;
  const moduleNs = await import(url);
  const data = pickExport(moduleNs, filePath);

  const outPath = await buildOutPath(filePath, baseDir, outBase);
  const json = JSON.stringify(data, safeReplacer, pretty);
  await writeFile(outPath, json, 'utf8');
  return outPath;
}

// --------------- Main -----------------------
(async () => {
  try {
    const absDir = path.resolve(dir);
    const absOut = path.resolve(outDir);

    const files = await listMjsFiles(absDir);
    if (files.length === 0) {
      console.error(`No .mjs files found under: ${absDir}`);
      process.exit(1);
    }

    console.log(`Converting ${files.length} .mjs file(s)`);
    console.log(`  Source: ${absDir}`);
    console.log(`  Output: ${absOut}`);

    for (const file of files) {
      try {
        const out = await convertMjsToJson(file, absDir, absOut);
        console.log(`✔ Wrote ${out}`);
      } catch (err) {
        console.error(`✖ Failed ${file}: ${err?.message || err}`);
      }
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
