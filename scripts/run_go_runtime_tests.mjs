// ./scripts/run_go_runtime_tests.mjs
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory relative to project root
const goRuntimeDir = path.resolve(__dirname, '../go_runtime');

// Test commands to execute sequentially
const testCmds = [
  { label: 'Standard Tests', cmd: 'go test ./...' },
  { label: 'Core Tag Tests', cmd: 'go test -tags core ./...' }
];

try {
  for (const { label, cmd } of testCmds) {
    console.log(`\nRunning Go tests (${label}): ${cmd}...`);

    execSync(cmd, {
      cwd: goRuntimeDir,
      stdio: 'inherit',
      env: process.env
    });

    console.log(`✓ Succeeded: ${label}`);
  }

  console.log('\nAll tests completed successfully!');
} catch (error) {
  console.error('\nTest suite failed.');
  process.exit(1);
}