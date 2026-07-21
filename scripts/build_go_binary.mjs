// ./scripts/build_go_binary.mjs
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory relative to project root
const goRuntimeDir = path.resolve(__dirname, '../go_runtime');

// Build matrix for target OS and output paths
const targets = [
  {
    os: 'windows',
    arch: 'amd64',
    outputPath: '../dist/shift.exe'
  },
  {
    os: 'linux',
    arch: 'amd64',
    outputPath: '../dist/shift'
  }
];

const buildCmd = 'go build -o';

try {
  for (const target of targets) {
    console.log(`\nBuilding Go binary for ${target.os}/${target.arch}...`);

    execSync(`${buildCmd} ${target.outputPath} ./cmd/shift`, {
      cwd: goRuntimeDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        GOOS: target.os,
        GOARCH: target.arch
      }
    });

    console.log(`✓ Succeeded: ${target.outputPath}`);
  }

  console.log('\nAll builds completed successfully!');
} catch (error) {
  console.error('\nBuild failed.');
  process.exit(1);
}