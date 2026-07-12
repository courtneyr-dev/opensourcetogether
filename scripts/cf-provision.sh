#!/usr/bin/env bash
# One-shot Cloudflare provisioning + first deploy.
#
# Prerequisites — ONE of:
#   • `npx wrangler login` (interactive, local machine), or
#   • CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env vars (CI / agents).
#     The token needs: Workers Scripts:Edit, D1:Edit, Workers R2 Storage:Edit,
#     Workers KV Storage:Edit.
#
# What it does (idempotent — reruns skip resources that already exist):
#   1. wrangler d1 create opensourcetogether        → paste id into wrangler.jsonc
#   2. wrangler r2 bucket create opensourcetogether-media
#   3. wrangler kv namespace create SESSION         → paste id into wrangler.jsonc
#   4. wrangler secret put EMDASH_ENCRYPTION_KEY    (generated if not supplied)
#   5. npm run build && wrangler deploy
#
# EmDash runs its D1 migrations at runtime on first request (with a
# migration lock), so no manual migration step is needed.
#
# After deploy:
#   • open https://opensourcetogether.<subdomain>.workers.dev/_emdash/admin
#     and complete the passkey setup (first user becomes admin)
#   • seed content from the admin, or author from scratch
#   • uncomment the "routes" block in wrangler.jsonc once the
#     opensourcetogether.dev zone is on the account, then redeploy

set -euo pipefail
cd "$(dirname "$0")/.."

WRANGLER="npx wrangler"
CONFIG="wrangler.jsonc"

if ! $WRANGLER whoami >/dev/null 2>&1; then
  echo "ERROR: wrangler is not authenticated." >&2
  echo "Run 'npx wrangler login' or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID." >&2
  exit 1
fi

echo "==> Authenticated:"
$WRANGLER whoami | head -5

# --- 1. D1 database ---------------------------------------------------------
if grep -q "REPLACE_WITH_D1_DATABASE_ID" "$CONFIG"; then
  echo "==> Creating D1 database 'opensourcetogether'..."
  # `d1 create` errors if it already exists; in that case look the id up.
  if OUT=$($WRANGLER d1 create opensourcetogether 2>&1); then
    echo "$OUT"
  else
    echo "$OUT" | grep -qi "already exists" || { echo "$OUT" >&2; exit 1; }
    echo "    (database already exists, reusing)"
    OUT=$($WRANGLER d1 info opensourcetogether 2>&1)
  fi
  DB_ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  [ -n "$DB_ID" ] || { echo "ERROR: could not extract D1 database id" >&2; exit 1; }
  sed -i.bak "s/REPLACE_WITH_D1_DATABASE_ID/$DB_ID/" "$CONFIG" && rm -f "$CONFIG.bak"
  echo "    database_id = $DB_ID written to $CONFIG"
else
  echo "==> D1 database id already configured, skipping"
fi

# --- 2. R2 bucket ------------------------------------------------------------
echo "==> Creating R2 bucket 'opensourcetogether-media' (skips if it exists)..."
$WRANGLER r2 bucket create opensourcetogether-media 2>&1 | grep -vi "already exists" || true

# --- 3. SESSION KV namespace --------------------------------------------------
if grep -q "REPLACE_WITH_KV_NAMESPACE_ID" "$CONFIG"; then
  echo "==> Creating KV namespace 'SESSION'..."
  OUT=$($WRANGLER kv namespace create SESSION 2>&1) || {
    echo "$OUT" | grep -qi "already exists" || { echo "$OUT" >&2; exit 1; }
    echo "    (namespace already exists — find its id with 'wrangler kv namespace list' and paste it into $CONFIG)"
    exit 1
  }
  echo "$OUT"
  KV_ID=$(echo "$OUT" | grep -oE '"?id"?[": =]+[0-9a-f]{32}' | grep -oE '[0-9a-f]{32}' | head -1)
  [ -n "$KV_ID" ] || { echo "ERROR: could not extract KV namespace id" >&2; exit 1; }
  sed -i.bak "s/REPLACE_WITH_KV_NAMESPACE_ID/$KV_ID/" "$CONFIG" && rm -f "$CONFIG.bak"
  echo "    kv id = $KV_ID written to $CONFIG"
else
  echo "==> SESSION KV namespace already configured, skipping"
fi

# --- 4. Encryption key secret --------------------------------------------------
# Encrypts plugin secrets at rest (IndieWeb API keys, etc.). Generated once;
# KEEP A COPY — losing it means losing every secret encrypted with it.
if $WRANGLER secret list 2>/dev/null | grep -q "EMDASH_ENCRYPTION_KEY"; then
  echo "==> EMDASH_ENCRYPTION_KEY secret already set, skipping"
else
  echo "==> Setting EMDASH_ENCRYPTION_KEY secret..."
  if [ -z "${EMDASH_ENCRYPTION_KEY:-}" ]; then
    EMDASH_ENCRYPTION_KEY=$(npx emdash secrets generate 2>/dev/null | grep -oE 'emdash_enc_v1_[A-Za-z0-9_-]{43}' | head -1)
    [ -n "$EMDASH_ENCRYPTION_KEY" ] || { echo "ERROR: could not generate encryption key" >&2; exit 1; }
    echo "    Generated a new key. SAVE THIS SOMEWHERE SAFE:"
    echo "    EMDASH_ENCRYPTION_KEY=$EMDASH_ENCRYPTION_KEY"
  fi
  printf '%s' "$EMDASH_ENCRYPTION_KEY" | $WRANGLER secret put EMDASH_ENCRYPTION_KEY
fi

# --- 5. Build + deploy ----------------------------------------------------------
echo "==> Building..."
npm run build
echo "==> Deploying..."
$WRANGLER deploy

echo ""
echo "Done. Next steps:"
echo "  1. Open the workers.dev URL printed above and visit /_emdash/admin"
echo "     to complete first-run setup (first passkey user becomes admin)."
echo "  2. Configure IndieWeb settings (site URL, syndication targets,"
echo "     API connections) under IndieWeb in the admin."
echo "  3. When the opensourcetogether.dev zone is on this account,"
echo "     uncomment the routes block in wrangler.jsonc and redeploy."
