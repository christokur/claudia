#!/usr/bin/env bun

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { $ } from 'bun';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const hasCleanFlag = args.includes('--clean');
const hasChangedFlag = args.includes('--changed');

async function main() {
  // Change to project root
  process.chdir(projectRoot);

  // Check required directories exist
  const requiredDirs = ['cc_agents', 'public', 'scripts', 'src'];
  for (const dir of requiredDirs) {
    if (!existsSync(dir)) {
      console.error(`Required directory '${dir}' not found`);
      process.exit(1);
    }
  }

  // Clean if requested
  if (hasCleanFlag) {
    console.log('Cleaning build artifacts...');
    try {
      await $`rm -rf src-tauri/target`;
      await $`rm -rf src-tauri/binaries`;
      await $`rm -rf dist`;
      await $`rm -rf node_modules`;
      console.log('Clean completed');
      return;
    } catch (error) {
      console.error('Clean failed:', error.message);
      process.exit(1);
    }
  }

  // Changed if requested
  if (hasChangedFlag) {
    console.log('Looking for changed files...');
    try {
      await $`find . -type f -mmin -180 -not -path './.git/*' -exec ls -la {} \; | grep "$(date '+%b %d %H:')"`;
      return;
    } catch (error) {
      console.error('Changed failed:', error.message);
      process.exit(1);
    }
  }

  // Install dependencies
  await $`bun install`;

  // Build the application
  await $`bun run tauri build`;

  // Check if bundle directory exists
  if (!existsSync('src-tauri/target/release/bundle')) {
    console.error('Build failed - bundle directory not found');
    process.exit(2);
  }

  await $`ls -al src-tauri/target/release/bundle/`;

  // Platform-specific builds
  const platform = process.platform;

  switch (platform) {
    case 'linux':
      console.log('Linux');
      await $`bun run tauri build --no-bundle`;
      break;

    case 'darwin':
      console.log('macOS');
      await $`rustup target add x86_64-apple-darwin`;

      await $`bun run build:executables:macos`;
      await $`lipo -create -output src-tauri/binaries/claude-code-universal-apple-darwin src-tauri/binaries/claude-code-x86_64-apple-darwin src-tauri/binaries/claude-code-aarch64-apple-darwin`;

      await $`bun run tauri build --target universal-apple-darwin`;
      console.log('./src-tauri/target/release/claudia');
      break;

    case 'win32':
      console.log('Windows');
      await $`bun run tauri build --no-bundle`;
      console.log('./src-tauri/target/release/claudia.exe');
      break;

    default:
      console.log('Unknown platform');
      await $`bun run tauri build --no-bundle`;
      break;
  }
}

main().catch((error) => {
  console.error('Build failed:', error.message);
  process.exit(1);
});