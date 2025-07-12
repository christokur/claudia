#!/usr/bin/env bash

cd $(dirname $0)/..

[ -d cc_agents ] || exit 1
[ -d public ] || exit 1
[ -d scripts ] || exit 1
[ -d src ] || exit 1

bun install
# Build the application
bun run tauri build

# The built executable will be in:
# - Linux: src-tauri/target/release/bundle/
# - macOS: src-tauri/target/release/bundle/
# - Windows: src-tauri/target/release/bundle/

[ -d src-tauri/target/release/bundle ] || exit 2
ls -al src-tauri/target/release/bundle/


case "$(uname -s)" in
  Linux)
    echo "Linux"
    bun run tauri build --no-bundle
    ;;
  Darwin)
    echo "macOS"
    rustup target add x86_64-apple-darwin
    bun run tauri build --target universal-apple-darwin
    echo ./src-tauri/target/release/claudia
    ;;
  CYGWIN* | MINGW32* | MSYS* | MINGW*)
    echo "Windows"
    bun run tauri build --no-bundle
    echo ./src-tauri/target/release/claudia.exe
    ;;
  *)
    echo "Unknown"
    bun run tauri build --no-bundle
    ;;
esac
