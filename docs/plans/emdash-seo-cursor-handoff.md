# Cursor implementation handoff — EmDash SEO (Slice 1)

Copy everything below this line into a **new Cursor session** as the task prompt.

---

## How I want you to work on this

- Treat this as the whole task for this session: **Slice 1 only** unless I explicitly authorize later slices.
- Fable 5 is the orchestrator. Use Grok sub-agents for bounded implementation/review with **non-overlapping file ownership**.
- Pick reasonable defaults when ambiguous; state assumptions in the final report.
- One recommendation per design choice — no option surveys.
- Do only what this prompt asks. No drive-by refactors.
- Small commits (Emoji-Log: `📦 NEW:`, `👌 IMPROVE:`, `🐛 FIX:`, `🤖 TEST:`).
- Verify after every meaningful change (re-run tests, re-read HTML fixture).
- Fable 5 must review all Grok diffs before reporting done.
- Stop after Slice 1 completion report.

## Why I'm asking

Research run **2026-07-12** produced artifacts auditing Yoast SEO Free **28.0** vs EmDash **0.29.0**. Architecture decision: **hybrid** (GPL `@emdash/seo-analysis` later; EmDash-native SSR metadata now). First implementation slice fixes **public metadata correctness** and removes duplicate head output on the dogfood site.

## Research artifacts (read first)

| Document | Path |
|----------|------|
| EmDash current state | `/Users/crobertson/Projects/opensourcetogether/docs/research/emdash-seo-current-state.md` |
| Yoast Free audit | `/Users/crobertson/Projects/opensourcetogether/docs/research/yoast-free-feature-audit.md` |
| Feature matrix | `/Users/crobertson/Projects/opensourcetogether/docs/research/yoast-free-feature-matrix.csv` |
| Gap analysis | `/Users/crobertson/Projects/opensourcetogether/docs/research/emdash-yoast-free-gap-analysis.md` |
| Analysis engine ADR | `/Users/crobertson/Projects/opensourcetogether/docs/architecture/seo-analysis-engine-adr.md` |
| Full implementation plan | `/Users/crobertson/Projects/opensourcetogether/docs/plans/emdash-seo-implementation-plan.md` |

## Karpathy & Loop rules (mandatory)

Source paths:
- `/Users/crobertson/no-icloud/2nd Brain/1. Projects/llm-wiki-knowledge-hub/CUSTOM_INSTRUCTIONS.md`
- `/Users/crobertson/no-icloud/2nd Brain/1. Projects/llm-wiki-pkm-productivity/wiki/concepts/Loop Engineering.md`
- `/Users/crobertson/no-icloud/2nd Brain/1. Projects/Coding Project Kickoff Playbook.md`

| Principle | Enforcement |
|-----------|-------------|
| Think before coding | Read research artifacts before editing |
| Simplicity first | Slice 1 only — no analysis engine, no new schema types |
| Surgical changes | Touch only files listed below |
| Goal-driven | DoD tests must pass |
| Verify before done | Re-run vitest + HTML snapshot; checker re-derives from output |
| Maker/checker | Grok implements; Fable 5 reviews; run tests independently |

## Architecture decision (frozen for this session)

**Hybrid model** — but Slice 1 implements **EmDash-native SSR metadata path only**. Do **not** add `yoastseo` dependency in Slice 1.

## Slice 1 — Public metadata correctness

### User story

When an editor saves SEO title, meta description, canonical URL, OG image, or noindex on a post, the **initial server HTML** of the public post page reflects those values exactly once (no duplicate meta tags).

### Included

- Remove or reconcile duplicate SEO output from `@jdevalk/astro-seo-graph` on dogfood `Base.astro`
- Ensure `getSeoMeta` + `EmDashHead` path is authoritative
- Canonical URL validation hardening if gaps found
- Regression tests: unit/integration for `getSeoMeta`, `seo-contributions`, and **at least one** rendered HTML test
- Dogfood post page uses single head pipeline

### Explicit exclusions

- Focus keyphrase, analysis worker, assessments, SERP preview UI
- Schema expansion, sitemap changes, new migrations (unless required for canonical validation only)
- GPL yoastseo package
- Removing existing `_emdash_seo` fields
- Content Analysis dashboard

### File ownership (no overlap)

| Agent | Files |
|-------|-------|
| Grok-A | `opensourcetogether/src/layouts/Base.astro`, `opensourcetogether/src/pages/posts/[slug].astro`, dogfood tests |
| Grok-B | `emdash/packages/core/src/seo/`, `page/seo-contributions.ts`, `components/EmDashHead.astro`, core SEO tests |
| Grok-C (review only) | Run tests, read rendered HTML, security check on canonical/meta escaping |

### Acceptance criteria

1. With SEO fields set on a test post, rendered HTML contains **exactly one** `<title>`, one `meta name="description"`, one `link rel="canonical"` (when set), one `meta name="robots"` when noindex, and one `og:title` / `og:description` / `og:image` when applicable.
2. `cd /Users/crobertson/Projects/emdash && pnpm test --filter emdash` passes (SEO-related tests).
3. No new linter errors in touched files.
4. Existing SEO data in `_emdash_seo` unchanged (no migration).
5. Fable 5 reports anything skipped, assumed, or incomplete.

### Commands to run

```bash
cd /Users/crobertson/Projects/emdash
pnpm test --filter emdash -- src/seo src/page packages/core/tests/unit/seo packages/core/tests/integration/seo

cd /Users/crobertson/Projects/emdash/packages/core
pnpm test -- emdash-head.render.test.ts get-seo-meta.test.ts

cd /Users/crobertson/Projects/opensourcetogether
npm run typecheck
# If dev server available:
# npx emdash dev & curl -s http://localhost:4321/posts/<fixture-slug> | head -80
```

### Repositories

- Core: `/Users/crobertson/Projects/emdash` (branch: verify at start)
- Dogfood: `/Users/crobertson/Projects/opensourcetogether` (branch: `feat/xfn-per-link-dogfood`)

### Tests required before completion

- `get-seo-meta.test.ts`
- `seo.test.ts` integration
- `emdash-head.render.test.ts`
- New or updated HTML snapshot test for dogfood post (if harness added)

### Security review (Slice 1)

- Confirm meta attributes escaped
- Canonical cannot inject `javascript:` or break out of attribute
- JSON-LD still uses `safeJsonLdSerialize`

### Accessibility review (Slice 1)

- N/A for SSR metadata (no new UI)

### Rollback

- Revert `Base.astro` head changes to restore prior dual-head behavior if needed

### Non-goals

- Yoast UI parity, analysis, Premium features, WordPress-specific tools

### Orchestration

1. Fable 5 reads research artifacts (15 min).
2. Launch Grok-A and Grok-B in parallel with file locks above.
3. Fable 5 merges, resolves conflicts.
4. Launch Grok-C verification: run test commands, read HTML output.
5. Fable 5 final diff review + completion report.

### Output format

```
## Slice 1 completion report
- Files changed (path + one-line reason)
- Tests run (command + pass/fail output excerpt)
- HTML verification (what was fetched/checked)
- Assumptions
- Skipped / incomplete
- Risks for Slice 2
```

**Stop after Slice 1.** Do not start Slice 2 without new prompt.

---

_End of handoff prompt._
