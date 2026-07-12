# Local testing — full IndieWeb plugin walkthrough

End-to-end manual test plan for the IndieWeb stack (emdash-indieweb +
emdash-content-analysis) on a local machine. Everything here runs against
local D1/R2 emulation; no Cloudflare account or env vars needed.

## 1. Setup

Clone both repos side by side and build the plugin monorepo first (the site
consumes it via `file:` links):

```bash
git clone https://github.com/courtneyr-dev/indieweb-astro
git clone https://github.com/courtneyr-dev/opensourcetogether

cd indieweb-astro
pnpm install && pnpm -r build && pnpm -r test   # 543 tests should pass

cd ../opensourcetogether
npm install
npx emdash dev        # migrations + seed + types, then astro dev on :4321
```

After editing plugin code, rebuild and restart:

```bash
cd ../indieweb-astro && pnpm -r build
cd ../opensourcetogether && npm install && npx emdash dev
```

## 2. Sign in

The dev server prints a **Dev bypass** link
(`/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`) that signs you in
as a dev admin without passkey setup. Open it once — the session cookie is
used by everything below.

## 3. Admin plugin surfaces

At `/_emdash/admin`, check the plugin pages:

- **IndieWeb → Webmentions** — moderation list (verified/unverified, delete)
- **IndieWeb → Syndication** — Bridgy targets (e.g. `https://brid.gy/publish/mastodon`)
- **IndieWeb → Relationships** — XFN contacts that feed `/blogroll`
- **IndieWeb → API Connections** — media-lookup keys (TMDB, RAWG, Last.fm, …)
- **Content Analysis** — pick a post, run Flesch readability + keyphrase checks

## 4. Composer (`/post`)

Open `http://localhost:4321/post` (requires the session from step 2):

1. Post a **note** (no title) — verify it appears on `/posts` with a derived
   excerpt and renders with an h-entry `<article>` and a date-based heading.
2. Post a **reply** with an `in_reply_to` URL — verify the citation renders
   with `u-in-reply-to` markup. Try a `javascript:alert(1)` URL — it must be
   rejected at submit and never rendered as a link.
3. Post an **article** with title + tags — verify kind auto-detection said
   "article".

## 5. IndieAuth + Micropub round-trip (curl)

Generate a PKCE pair:

```bash
node -e '
const c = require("crypto");
const v = c.randomBytes(32).toString("base64url");
const ch = c.createHash("sha256").update(v).digest("base64url");
console.log("VERIFIER=" + v + "\nCHALLENGE=" + ch);'
```

Get an admin session cookie (the dev bypass sets `astro-session`):

```bash
BASE=http://localhost:4321
curl -sc /tmp/cookies.txt "$BASE/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin" -o /dev/null

# Consent (POST as the signed-in admin) — returns 302 with ?code= in Location
curl -si -b /tmp/cookies.txt -X POST "$BASE/indieauth/authorize" \
  --data-urlencode "client_id=https://quill.p3k.io/" \
  --data-urlencode "redirect_uri=https://quill.p3k.io/redirect" \
  --data-urlencode "state=teststate" \
  --data-urlencode "code_challenge=$CHALLENGE" \
  --data-urlencode "scope=create profile" \
  --data-urlencode "scope_create=on" \
  --data-urlencode "scope_profile=on" \
  --data-urlencode "action=approve" | grep -i "^location:"

# Token exchange (public — no cookie)
curl -s -X POST "$BASE/indieauth/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=<code from Location header>" \
  --data-urlencode "client_id=https://quill.p3k.io/" \
  --data-urlencode "redirect_uri=https://quill.p3k.io/redirect" \
  --data-urlencode "code_verifier=$VERIFIER"
# → {"access_token":"...","token_type":"Bearer","scope":"create profile","me":"http://localhost:4321/"}

# Micropub create (form-encoded note)
curl -s -X POST "$BASE/micropub" \
  -H "Authorization: Bearer <access_token>" \
  --data-urlencode "h=entry" \
  --data-urlencode "content=Hello from Micropub!"
# → 201 with a Location header pointing at the new post

# Config query
curl -s "$BASE/micropub?q=config" -H "Authorization: Bearer <access_token>"
```

Negative checks: a bad token must get `401 invalid_token`; a token without
the `create` scope must get `403 insufficient_scope`; a body over 1 MB must
be rejected with 413.

Real Micropub clients (Quill, Indigenous) work the same way — point them at
`http://localhost:4321/` and they discover the endpoints from the link tags.

## 6. Webmention round-trip

Send a webmention whose source actually links to the target — the receiver
fetches the source and verifies the link before storing:

```bash
# Target: any local post. Source: any URL that links to it.
curl -si -X POST http://localhost:4321/webmention \
  -d "source=https://example.com/some-page" \
  -d "target=http://localhost:4321/posts/hello-indieweb"
```

- An unreachable / non-linking source → `400` and **no row stored**
  (check IndieWeb → Webmentions in the admin).
- A genuine linking source → `202`, and the mention appears verified in the
  admin and under "Responses" on the post.

Outbound: publish a post whose body links to another local post — the
sender fires on publish and the linked post receives the mention.

## 7. Automated checks

```bash
npm run typecheck    # astro check — 0 errors
npm run a11y         # axe scan, needs the dev server running — all PASS
cd ../indieweb-astro && pnpm -r test   # 543 unit tests
```
