#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKS="${EMDASH_PACKS:-/tmp/emdash-packs}"
EMDASH_ROOT="$ROOT/../emdash"

if [[ ! -f "$PACKS/emdash-0.29.0.tgz" ]]; then
  mkdir -p "$PACKS"
  (cd "$EMDASH_ROOT" && pnpm --filter emdash --filter @emdash-cms/admin --filter @emdash-cms/auth --filter @emdash-cms/cloudflare --filter @emdash-cms/gutenberg-to-portable-text --filter @emdash-cms/plugin-types --filter @emdash-cms/registry-client --filter @emdash-cms/registry-lexicons --filter @emdash-cms/blocks exec npm pack --pack-destination "$PACKS")
fi

extract() {
  local tgz="$1" dest="$2"
  rm -rf "$dest"
  mkdir -p "$dest"
  tar -xzf "$tgz" -C "$dest" --strip-components=1
  node -e '
    const fs=require("fs");
    const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    for (const section of ["dependencies","peerDependencies","optionalDependencies","devDependencies"]) {
      if (!p[section]) continue;
      for (const [k,v] of Object.entries(p[section])) {
        if (String(v).startsWith("catalog:") || String(v).startsWith("workspace:")) delete p[section][k];
      }
    }
    fs.writeFileSync(process.argv[1], JSON.stringify(p,null,2)+"\n");
  ' "$dest/package.json"
  echo "synced $dest"
}

extract "$PACKS/emdash-0.29.0.tgz" "$ROOT/node_modules/emdash"
extract "$PACKS/emdash-cms-admin-0.29.0.tgz" "$ROOT/node_modules/@emdash-cms/admin"
extract "$PACKS/emdash-cms-auth-0.29.0.tgz" "$ROOT/node_modules/@emdash-cms/auth"
extract "$PACKS/emdash-cms-cloudflare-0.29.0.tgz" "$ROOT/node_modules/@emdash-cms/cloudflare"
extract "$PACKS/emdash-cms-blocks-0.29.0.tgz" "$ROOT/node_modules/@emdash-cms/blocks"
extract "$PACKS/emdash-cms-gutenberg-to-portable-text-0.29.0.tgz" "$ROOT/node_modules/@emdash-cms/gutenberg-to-portable-text"
extract "$PACKS/emdash-cms-plugin-types-0.2.0.tgz" "$ROOT/node_modules/@emdash-cms/plugin-types"
extract "$PACKS/emdash-cms-registry-client-0.3.3.tgz" "$ROOT/node_modules/@emdash-cms/registry-client"
extract "$PACKS/emdash-cms-registry-lexicons-0.2.0.tgz" "$ROOT/node_modules/@emdash-cms/registry-lexicons"
echo "Done. Do not npm install emdash packages (catalog:/workspace:)."
