# Open Source Together

The personal IndieWeb site behind [opensourcetogether.dev](https://opensourcetogether.dev) — built with [EmDash](https://github.com/emdash-cms/emdash) on Cloudflare Workers (D1 + R2), with a full POSSE publishing stack provided by the sibling [`indieweb-astro`](../indieweb-astro) monorepo.

## What this site does

**Publishing**
- 28 IndieWeb post kinds (article, note, reply, like, repost, bookmark, photo, listen, watch, read, checkin, …) with kind auto-detection and per-kind rendering
- `/post` composer — mobile-friendly authoring UI gated by EmDash session auth (author role+)
- Micropub endpoint (`/micropub`) so external clients (Quill, Indigenous, …) can post here
- IndieAuth server (`/indieauth/authorize`, `/indieauth/token`, metadata at `/indieauth/metadata` and `/.well-known/oauth-authorization-server`) backing Micropub token issuance — PKCE (S256) required
- POSSE via [Bridgy](https://brid.gy): published posts are syndicated to configured silos by webmention, and returned syndication URLs render as `u-syndication` links

**Conversation**
- Webmentions: receiving (`/webmention`, with verification), sending (on publish, to every linked URL), and moderation in the admin
- h-entry / h-card microformats2 markup on posts and the homepage
- XFN relationships + `/blogroll` (an h-feed of contacts from the admin's Relationships data)

**Quality**
- courtneyr.dev design system (zine-style tokens, components, self-hosted Barlow / Roboto Slab / Rock Salt)
- Automated axe accessibility scan (`npm run a11y`) — green on all key routes
- Yoast-style content analysis (Flesch readability + keyphrase checks) via the `content-analysis` admin page
- SEO: canonical URLs, Open Graph, JSON-LD (astro-seo-graph), `sitemap.xml`, `robots.txt`, `llms.txt`, `.well-known/security.txt`

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage — hero + featured post + recent stream |
| `/posts`, `/posts/:slug` | Archive and single posts (h-entry) |
| `/category/:slug`, `/tag/:slug` | Taxonomy archives |
| `/search` | Full-text search |
| `/pages/:slug` | Static pages (about, privacy) |
| `/blogroll` | XFN blogroll (h-feed of h-cards) |
| `/post` | Session-gated post composer |
| `/webmention` | Webmention receiver (POST) and list (GET) |
| `/micropub` | Micropub endpoint (config/syndicate-to queries + create) |
| `/indieauth/authorize`, `/indieauth/token` | IndieAuth server |
| `/rss.xml`, `/sitemap.xml` | Feeds |

## Local development

This project uses **npm** (see `package-lock.json`). It depends on the sibling
repo `../indieweb-astro` via `file:` links — clone both side by side and build
the sibling first:

```bash
# in ../indieweb-astro
pnpm install && pnpm -r build

# in this repo
npm install
npx emdash dev                   # migrations + seed + type generation, then astro dev
```

The site runs at `http://localhost:4321/`, the admin at
`http://localhost:4321/_emdash/admin`. In dev a bypass link is printed to the
console that signs you in as a dev admin without passkey setup.

No environment variables are needed for local dev — see `.env.example`.
IndieWeb media-lookup API keys (TMDB, RAWG, Last.fm, …) are entered in the
admin under **IndieWeb → API Connections**, not env vars.

## Testing

```bash
npm run typecheck   # astro check
npm run a11y        # axe-core scan of key routes (needs the dev server running)

# protocol logic unit tests live in the sibling monorepo:
cd ../indieweb-astro && pnpm -r test   # indieweb-core (514) + content-analysis (29)
```

For a full manual walkthrough of the IndieWeb plugin stack (admin pages,
composer, IndieAuth→Micropub curl round-trip, webmention round-trip), see
[docs/local-testing.md](docs/local-testing.md).

## Deploying

One command after authenticating wrangler (either `npx wrangler login`
locally, or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` env vars):

```bash
./scripts/cf-provision.sh
```

The script is idempotent: it creates the D1 database, R2 bucket, and
SESSION KV namespace (writing their ids into `wrangler.jsonc`), sets the
`EMDASH_ENCRYPTION_KEY` secret (generated if not supplied — save the
printed key), builds, and deploys. EmDash applies D1 migrations at runtime
on first request, so there is no manual migration step.

Notes:
- `worker_loaders` (Dynamic Workers — used by sandboxed marketplace plugins and
  webhook-notifier) requires the Workers **paid** plan. IndieWeb and
  content-analysis run trusted and work on any plan. On the free plan, leave
  `sandboxed` / `sandboxRunner` / `marketplace` unset in `astro.config.mjs` and
  keep `worker_loaders` commented out in `wrangler.jsonc` (this repo's current
  production config).
- Uncomment the `routes` block in `wrangler.jsonc` once the
  `opensourcetogether.dev` zone is on your account, then redeploy.
- After first deploy, open `/_emdash/admin` and complete first-run setup
  (the first passkey user becomes admin), then author content or recreate
  the seed entries from the admin. `emdash seed` only targets local
  databases.
- HTTPS/TLS, HTTP→HTTPS redirect, HSTS, and compression are handled by
  Cloudflare in front of the worker.

## specification.website — required tier

All required-tier items pass or are handled by the platform:

| Area | Status |
|---|---|
| Foundations (doctype, lang, charset, viewport, title) | ✅ in `Base.astro` |
| SEO (meta robots, heading hierarchy, redirects, real 404 status) | ✅ verified |
| Accessibility (contrast, alt text, labels, keyboard, focus, skip link, landmarks, reduced motion) | ✅ axe scan green + design-system focus/skip/motion rules |
| Security headers (nosniff, frame-options, referrer-policy, permissions-policy) | ✅ EmDash middleware |
| HTTPS / HSTS / compression / Cache-Control | ✅ Cloudflare (production) + immutable `_headers` for hashed assets |
| Privacy (privacy policy; no non-essential cookies, so no consent banner needed) | ✅ `/pages/privacy` |
| Resilience (custom 404 with correct status) | ✅ |
| Stable URLs | ✅ template slugs unchanged |

## Known limitations / deferred

- **Direct silo APIs**: POSSE runs through Bridgy webmentions only. Direct
  Mastodon/Bluesky OAuth posting is deferred.
- **Micropub**: `create` only (form-encoded, JSON, and multipart fields).
  `update`/`delete` actions and the media endpoint return not-implemented.
- **Backfeed**: silo replies arrive only as Bridgy webmentions; no API polling.
- **IndieAuth**: authorization requires an admin-role EmDash session; scopes
  are limited to `create` + `profile`. Token introspection is plugin-internal.
- **Content analysis**: English syllable heuristics; an admin page (pick a
  post), not an in-editor sidebar — EmDash's plugin API has no editor-panel
  surface yet.
- **Production deploy** not yet run — needs Cloudflare credentials
  (see Deploying; `scripts/cf-provision.sh` does everything once
  wrangler is authenticated).
