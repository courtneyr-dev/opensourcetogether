# EmDash SEO implementation plan

**Date:** 2026-07-12  
**Architecture:** Hybrid per `seo-analysis-engine-adr.md`  
**Orchestration:** Fable 5 + bounded Grok sub-agents  
**Repository:** Primary implementation in `/Users/crobertson/Projects/emdash`; dogfood in `/Users/crobertson/Projects/opensourcetogether`

## Target UX (EmDash-native)

### Editor sidebar structure (per post/page)

```
┌─ Content status strip ─────────────────────┐
│ SEO: Needs work · Readability: Good        │
│ [icons + text labels, not color-only]    │
└──────────────────────────────────────────┘
▼ Search appearance (accordion)
    SERP preview (desktop / mobile tabs)
    SEO title [inherited ●] [reset]
    Meta description
    Slug / URL preview
▼ SEO analysis
    Focus keyphrase
    Assessment list (expandable, jump-to-text)
▼ Readability
    Flesch + assessments
▼ Inclusive language (if en)
▼ Social appearance
    Social title / description / image
▼ Schema
    Page type / article type [admin only if restricted]
▼ Advanced
    Indexing (index/noindex, follow/nofollow)
    Canonical [reset]
    Cornerstone toggle
```

**Content Analysis screen disposition:** **Convert to site-wide content-health dashboard** — list-level scores, filters, orphaned/missing-keyphrase views. Per-item analysis moves into editor (user requirement).

### Global settings (`Settings > SEO`)

Extend existing `SeoSettings` into sections: Site identity, Content type defaults, Taxonomies, Schema, Tools (import/export), Features (analysis toggles mirroring Yoast site features).

## Vertical slices (validated order)

### Slice 1 — Public metadata correctness (FIRST APPROVED SLICE)

**User story:** As a publisher, saved SEO fields appear correctly in the initial HTML response.

**Includes:** Canonical, title, description, robots, OG/Twitter, dedupe dogfood dual head, regression tests.

**Excludes:** Analysis, schema expansion, new editor panels.

| Area | Likely files |
|------|----------------|
| Core | `packages/core/src/seo/`, `page/seo-contributions.ts`, `components/EmDashHead.astro` |
| Dogfood | `src/layouts/Base.astro`, `src/pages/posts/[slug].astro` |
| Tests | `packages/core/tests/integration/seo/`, new public HTML fixture test |

**Data changes:** None  
**API changes:** None  
**A11y:** N/A (SSR output)  
**Security:** Escape meta; validate canonical URLs  
**Tests:** Unit existing + new integration fetch rendered HTML  
**Migration:** None  
**Rollback:** Revert layout to dual head if needed  
**DoD:** CI green; one post fixture asserts single `<title>`, `meta description`, `canonical`, `og:title`, `robots` when set

**Tasks (issue-sized):**
1. Add HTML snapshot test harness for dogfood post page  
2. Remove or gate `astro-seo-graph` on dogfood; rely on `EmDashHead`  
3. Add canonical URL validation tests (malicious/relative)  
4. Document SSR metadata path in core skill reference (optional, if requested later)

---

### Slice 2 — Global settings & inherited defaults

**Includes:** Site representation, title templates per collection, default robots, feature toggles (analysis on/off).

**Excludes:** Per-item analysis

**Data:** `site_settings.seo` schema extension; collection-level SEO defaults in schema/seed

**DoD:** New post inherits SEO title template; reset-to-default in editor works

---

### Slice 3 — Search appearance + previews

**Includes:** Desktop/mobile SERP preview, width indicators, slug preview

**Excludes:** Analysis assessments

**UI:** Kumo tabs inside `ContentSettingsPanel`

**DoD:** Preview updates debounced with SeoPanel fields

---

### Slice 4 — Analysis engine foundation

**Includes:** `@emdash/seo-analysis` GPL package, PT adapter, Web Worker wiring, debounce/cancel

**Excludes:** Full assessment parity

**DoD:** Worker returns mock assessment list for fixture PT doc

---

### Slice 5 — SEO assessments (17)

**Includes:** yoastseo SEOAssessor + focus keyphrase field storage

**DoD:** Fixture posts match pinned Yoast scores ±0 tolerance

---

### Slice 6 — Readability assessments (7 + Flesch)

**DoD:** Language gating matches Yoast (6 full languages)

---

### Slice 7 — Inclusive language (en)

**DoD:** Feature toggle + assessments; privacy note (local only)

---

### Slice 8 — Schema graph controls

**DoD:** Per-item schema type; expanded JSON-LD pieces

---

### Slice 9 — Social metadata (Free parity)

**DoD:** Social title/description/image overrides in head

---

### Slice 10 — Sitemaps, robots, RSS, REST head, llms.txt

**DoD:** Taxonomy sitemap provider; llms.txt route; optional head JSON API

---

### Slice 11 — List columns, filters, link counts, bulk edit

**DoD:** Content list shows SEO/readability columns; filter by score

---

### Slice 12 — Import/migration/onboarding

**Includes:** Fix `seo.keywords` import; idempotent backfill migration

**DoD:** WP import preserves focus keyphrase

---

### Slice 13 — Site health dashboard

**Replaces separate Content Analysis screen**

**DoD:** Dashboard route with aggregate filters; links into editor sections

## Karpathy & Loop Engineering enforcement

| Rule | Artifact |
|------|----------|
| Plan before code | This doc + ADR before slice 1 |
| Small slices | 13 slices, stop after slice 1 unless approved |
| Verify before done | HTML snapshot + vitest per slice |
| Maker/checker | Grok implements; Fable 5 reviews; verification agent runs tests |
| Deterministic checks | Pinned yoastseo 3.6.0 fixtures |
| No speculative code | Exclusions per slice |
| File ownership | No overlapping Grok edits (see handoff) |

## Parity test fixtures (plan)

Directory: `packages/core/tests/fixtures/seo-parity/` (to create in slice 4)

| Fixture | Purpose |
|---------|---------|
| empty-post | Text presence failures |
| short-post | Text length |
| well-optimized | All green |
| over-optimized | Density warnings |
| no-headings | Subheading distribution |
| passive-heavy | Passive voice |
| long-sentences | Sentence length |
| no-transitions | Transition words |
| images-no-alt | Image/keyphrase alt |
| internal-external-links | Link assessments |
| repeated-sentence-starts | Sentence beginnings |
| cornerstone-long | Cornerstone thresholds |
| en + de samples | Language behavior |
| html-block-heavy | Adapter edge case |
| xss-attempt | Sanitization |

**Upgrade process:** Bump `YOAST_PARITY_VERSION` env in test config when upgrading yoastseo; re-record expected JSON from reference worker script.

## Performance budgets (targets — measure in slice 4)

| Metric | Budget |
|--------|--------|
| SEO panel initial load | < 100ms JS (excl. worker) |
| Analysis start delay (debounced) | 500–800ms after typing stop |
| Short post analysis complete | < 300ms worker |
| Medium post (~1500 words) | < 800ms worker |
| Long post (~5000 words) | < 2s worker |
| Main-thread block per keystroke | < 16ms |
| Worker memory | < 50MB |
| Save latency impact | 0ms (analysis async) |

Measure baseline editor in slice 4 before finalizing.

## Security requirements

- Escape all SEO text fields in SSR and RSS  
- Validate canonical/social URLs (reject `javascript:`)  
- CSRF: existing admin API protections  
- Schema JSON-LD: `safeJsonLdSerialize` only  
- CSV export formula injection if bulk export added  
- No remote analysis without explicit consent toggle  
- DoS: cap content size for analysis input

## Migration requirements

- Idempotent migration adding `focus_keyphrase`, `robots_follow`, social fields, `cornerstone` to `_emdash_seo` or `_emdash_seo_meta`  
- Backfill nulls from content defaults  
- Preserve existing OG/title/description/canonical/noindex  
- Rollback: migration down removes new columns; data export before migration

## Observability

- Log analysis worker failures (client toast, non-blocking)  
- Migration logs via existing emdash migrate command
