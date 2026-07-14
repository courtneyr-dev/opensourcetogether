# ADR: SEO analysis engine for EmDash

**Status:** Proposed (research run 2026-07-12)  
**Decision makers:** Fable 5 orchestrator; pending product approval  
**Context:** Yoast SEO Free parity for editor analysis + EmDash MIT distribution model

## Versions pinned

| Package | Version |
|---------|---------|
| Yoast SEO | 28.0 |
| yoastseo (npm) | 3.6.0 |
| EmDash | 0.29.0 |

## Options considered

### Option 1 — Consume `yoastseo` npm directly

Wrap the official package in admin analysis worker.

**Pros**
- Exact parity for 17 SEO + 7 readability + inclusive language rules  
- Maintained release cadence (3.6.0 published 2026-02-13)  
- Web Worker architecture already matches EmDash editor needs  
- Extensive language researchers in-tree  

**Cons**
- **GPL-3.0** copyleft on `yoastseo` — conflicts with EmDash MIT unless isolated  
- Depends on `@wordpress/i18n`, lodash, WordPress-oriented Paper model  
- Premium assessments/morphology data not in Free tree  
- Bundle size (~researcher language packs)  

### Option 2 — Adapt GPL components into EmDash (copy/modify yoastseo sources)

Fork selected assessors into monorepo.

**Pros**
- Can strip unused WordPress coupling over time  
- Still starts from verified scoring rules  

**Cons**
- Still GPL-3 unless rewritten; fork maintenance burden  
- Merge pain on upstream updates  
- Same license contamination if distributed with MIT core  

### Option 3 — EmDash-native analysis engine (reimplement from SCORING *.md + fixtures)

Implement assessors in TypeScript under MIT, validated by Yoast fixture parity tests.

**Pros**
- Clean MIT licensing for core  
- PT-native input model (no WordPress Paper)  
- Full control over bundle size and Workers integration  

**Cons**
- Highest initial cost  
- Drift risk vs Yoast updates  
- Must reimplement or license language resources  

### Option 4 — Hybrid (recommended)

| Layer | Approach |
|-------|----------|
| **Editor analysis** | Separate **`@emdash/seo-analysis`** package, **GPL-3.0**, thin wrapper around **`yoastseo@3.6.0`** + PT→Paper adapter |
| **Public metadata, schema, sitemaps** | **EmDash-native** (existing `EmDashHead`, extend `jsonld.ts`, sitemap routes) — MIT |
| **Inclusive language** | Ship via GPL package (English rules from yoastseo) or defer to slice 7 |

## Decision

**Adopt Option 4 (Hybrid).**

### Why it wins

1. **Parity where it matters:** Analysis scoring is the hardest to reimplement correctly; yoastseo is the authoritative Free implementation.  
2. **License boundary:** GPL isolation in a dedicated package preserves MIT for `emdash` core if packaging, notices, and source-offer requirements are met (legal review required).  
3. **Architecture fit:** Worker-based analysis matches existing SeoPanel debounce patterns without blocking saves.  
4. **SSR stays native:** Yoast PHP schema/sitemap code is a poor fit for Astro Workers; EmDash already has superior SSR head pipeline.

### What would revisit the decision

- Legal review rejects GPL adjunct package → fall back to **Option 3** with reduced scope (top 10 assessments + fixtures).  
- yoastseo maintenance stalls (>12 months no release aligned to plugin).  
- Bundle size exceeds budget after language pack tree-shaking fails.  
- Product chooses **not** to pursue Yoast parity depth → smaller MIT heuristic engine.

## Technical design (hybrid)

```mermaid
flowchart LR
  PT[Portable Text editor state]
  NORM[PT to AnalysisDocument adapter]
  WRAP["@emdash/seo-analysis (GPL)"]
  YOAST[yoastseo worker]
  UI[Editor Analysis panel]

  PT --> NORM --> WRAP --> YOAST --> UI
```

- **AnalysisDocument:** plain text, headings[], links[], images{alt}, meta{title,description,slug}, locale, cornerstone flag, siteUrl.  
- **Worker:** instantiate `AnalysisWebWorker` from yoastseo; debounce 500–800ms; cancel stale runs.  
- **Scores:** advisory only; never block publish.  
- **Storage:** focus keyphrase + optional last-run snapshot in `_emdash_seo` extension migration (slice 4+); avoid storing redundant aggregates unless list view requires it.

## Non-goals (this ADR)

- Premium assessments (keyphrase distribution, word complexity, link suggestions, IndexNow, AI generator)  
- WordPress indexables PHP port  
- Semrush/Wincher unless approved as extension

## Security

- Analysis runs **locally** in worker; no content sent to Yoast cloud in Free path  
- Sanitize meta fields on save (existing API validation)  
- Do not eval user HTML in analysis adapter — strip `htmlBlock` or exclude from scoring with explicit “unsupported block” assessment

## Test strategy

- Pin fixtures to Yoast **28.0 / yoastseo 3.6.0**  
- Golden-file expected assessment results per fixture post  
- Upgrade process: re-run fixture suite when bumping yoastseo version

## Compliance checklist (before ship)

- [ ] GPL-3 notices in `@emdash/seo-analysis`  
- [ ] Source availability / repository link  
- [ ] Dependency graph documents GPL → MIT boundary  
- [ ] Counsel review for combined distribution model
