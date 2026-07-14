# EmDash ↔ Yoast SEO Free gap analysis

**Audit date:** 2026-07-12  
**Yoast version:** 28.0  
**EmDash version:** 0.29.0 (`c24b7d3`)  
**Matrix:** `yoast-free-feature-matrix.csv`

## Summary counts (matrix dispositions)

| Disposition | Count | Notes |
|-------------|------:|-------|
| Already complete | 3 | Title separator, default OG image, Google/Bing verification |
| Present but incomplete | 8 | SEO title/desc/canonical/noindex/OG, meta SSR, sitemaps, robots |
| Direct parity required | 27 | 17 SEO + 7 readability + Flesch + keyphrase + previews/scores |
| Adapted equivalent required | 14 | Schema, tax/archive templates, cornerstone, link counts, list columns, llms.txt, etc. |
| Not applicable | 4 | Admin bar, WP .htaccess, Site Kit, Wincher |
| Excluded (Premium) | 5 | Link suggestions, IndexNow, AI generator, keyphrase distribution, word complexity |
| Deferred / uncertain | 3 | Insights, task list, some dashboard widgets |
| **Total matrix rows** | **56** | Expand during implementation |

## Already complete

| Feature ID | Feature | Current behavior | Evidence |
|------------|---------|------------------|----------|
| YF-C02 | Title separator | `SeoSettings` persists `seo.titleSeparator`; `getSeoMeta` uses it | `SeoSettings.tsx`, `seo/index.ts` |
| YF-C03 | Default OG image | Site default with media picker | `SeoSettings.tsx`, `EmDashHead.astro` |
| YF-C05 | Google verification | `google-site-verification` meta via site contributions | `seo-contributions.ts` |

## Present but incomplete (priority fixes)

| Feature ID | Current | Desired | User impact | Technical impact | Phase |
|------------|---------|---------|-------------|------------------|-------|
| YF-L01 | Dual head (`astro-seo-graph` + `EmDashHead`) on dogfood | Single SSR head authority | Duplicate/wrong tags in SERP | High — remove duplicate component | Slice 1 |
| YF-G02/G03 | Fields without SERP preview | Search appearance + preview | Editors can't see snippet | Add preview component | Slice 3 |
| YF-G04 | Canonical free text | Validated canonical + SSR test | Wrong canonical hurts SEO | URL validation + tests | Slice 1 |
| YF-G05 | noindex only (`noindex,nofollow` together) | Granular robots directives | Over-blocking when only noindex wanted | Extend `_emdash_seo` model | Slice 1/8 |
| YF-L07 | BlogPosting/WebSite JSON-LD only | Configurable schema graph | Rich result gaps | Extend `jsonld.ts` | Slice 8 |
| YF-L08 | Collection sitemaps only | Taxonomy/author archives | Incomplete discovery | New providers | Slice 10 |
| YF-A07 | WP import drops `seo.keywords` | Preserve focus keyphrase | Migration data loss | Add column or plugin storage | Slice 12 |

## Direct parity required (analysis & editor)

All **YF-H01–H17**, **YF-I01–I08**, **YF-G01**, **YF-G08**, **YF-G09**, **YF-G10**, **YF-B01–B03** — see matrix. EmDash has **zero** shipped analysis UI at v0.29.0 despite screenshot intent.

**Migration:** New fields for `focusKeyphrase`, optional `cornerstone`, social overrides — additive migration on `_emdash_seo` or companion table.

## Adapted equivalents

| Yoast concept | EmDash approach | Reason |
|---------------|-----------------|--------|
| Indexables | Loader queries + optional cached analysis snapshot | No PHP indexable tables |
| `.htaccess` / crawl tools | `robots.txt` + Cloudflare redirect rules UI (existing Redirects) | Workers hosting |
| Breadcrumbs | Astro component + settings templates | Theme integration differs |
| Taxonomy SEO | Per-taxonomy settings in seed/schema | EmDash taxonomy model |
| Primary category | Primary term on content | Already have terms — wire to analysis |
| Content Analysis screen | **Site-wide content-health dashboard** | Per-item analysis belongs in editor |
| REST `get_head` | Optional `/_emdash/api/seo/head?path=` | Headless parity |

## Not applicable

| Feature | Reason |
|---------|--------|
| Admin bar menu | WordPress frontend admin bar |
| Google Site Kit | WordPress plugin integration |
| Apache `.htaccess` editor | Not used on Cloudflare Workers |
| Wincher rank tracking | Commercial third-party |

## Premium — excluded from parity commitment

Link suggestions, IndexNow, AI title/description, keyphrase distribution assessment, word complexity assessment, redirect manager (Yoast Premium) — document in matrix only.

## Cross-cutting risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| GPL-3 yoastseo in MIT monorepo | **High (legal)** | Separate GPL package + legal review (ADR) |
| Dual head metadata on dogfood | **High (technical)** | Slice 1 regression tests |
| Analysis performance on long posts | Medium | Web Worker + debounce + cancel |
| Stale scores on rapid edits | Medium | Cancel token per analysis run |
| PT `htmlBlock` scoring | Medium | Exclude with explicit assessment |

## Product decisions requiring approval

1. **GPL package strategy** — accept `@emdash/seo-analysis` (GPL-3) vs MIT reimplementation?  
2. **Inclusive language** — ship English ~220 rules in v1?  
3. **Insights** — confirm Free scope before building.  
4. **Dogfood** — remove `@jdevalk/astro-seo-graph` entirely?

## Complexity estimate (T-shirt)

| Phase area | Size |
|------------|------|
| Slice 1 public metadata | M |
| Slices 2–3 settings + previews | M |
| Slices 4–7 analysis engine | L |
| Slices 8–10 schema/sitemaps/rss | L |
| Slices 11–13 list/dashboard/import | M |
