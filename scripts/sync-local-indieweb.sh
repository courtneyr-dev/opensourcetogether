#!/usr/bin/env bash
# Copy built local IndieWeb packages into node_modules (real dirs, not file: symlinks).
# Cloudflare Workers Vite plugin fails on file: URL module fallback for symlinks.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IW="$ROOT/../indieweb-astro/packages/emdash-indieweb"
CORE="$ROOT/../indieweb-astro/packages/indieweb-core"

if [[ ! -f "$IW/dist/index.mjs" ]]; then
  echo "Build emdash-indieweb first" >&2
  exit 1
fi
if [[ ! -f "$CORE/dist/index.mjs" ]]; then
  echo "Build indieweb-core first" >&2
  exit 1
fi

rm -rf "$ROOT/node_modules/@opensourcetogether/emdash-indieweb" "$ROOT/node_modules/@opensourcetogether/indieweb-core"
mkdir -p "$ROOT/node_modules/@opensourcetogether/emdash-indieweb" "$ROOT/node_modules/@opensourcetogether/indieweb-core"
cp "$IW/package.json" "$ROOT/node_modules/@opensourcetogether/emdash-indieweb/"
cp -R "$IW/dist" "$ROOT/node_modules/@opensourcetogether/emdash-indieweb/dist"
cp "$CORE/package.json" "$ROOT/node_modules/@opensourcetogether/indieweb-core/"
cp -R "$CORE/dist" "$ROOT/node_modules/@opensourcetogether/indieweb-core/dist"
mkdir -p "$ROOT/node_modules/@opensourcetogether/emdash-indieweb/node_modules/@opensourcetogether"
ln -sfn ../../../indieweb-core "$ROOT/node_modules/@opensourcetogether/emdash-indieweb/node_modules/@opensourcetogether/indieweb-core"
echo "Synced flattened indieweb packages into node_modules"
