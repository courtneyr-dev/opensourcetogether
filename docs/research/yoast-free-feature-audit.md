# Yoast SEO Free feature audit

**Audit date:** 2026-07-12  
**Yoast SEO plugin:** **28.0** (WordPress.org stable tag 2026-07-06)  
**Yoast SEO source commit (tag 28.0):** `f1a17a1412c69f5721d7fc986c4dca9368c8096a`  
**Bundled analysis package:** **yoastseo 3.6.0** (npm published 2026-02-13, GPL-3.0)  
**WordPress tested:** 7.0.1 (wordpress.org API)  
**PHP required:** 7.4+ (readme.txt)  
**Browser:** Not used for black-box UI in this run  
**Black-box WordPress install:** **Not performed** — classifications rely on tagged source, official docs, and wordpress.org metadata unless noted.

## Evidence hierarchy used

1. Tagged source `/tmp/wordpress-seo-audit` @ 28.0  
2. wordpress.org plugin API (version 28.0)  
3. Official Yoast developer/help URLs  
4. Marketing pages (leads only; conflicts recorded below)

## Free vs Premium resolution table (selected conflicts)

| Feature | Source A | Source B | Conflict | Test performed | Final classification | Confidence |
|---------|----------|----------|----------|----------------|----------------------|------------|
| Insights metabox | Feature toggle lists `premium_url` | Toggle exists in Free file without `premium: true` | Marketing implies Premium | Source read `class-yoast-feature-toggles.php:111-118` | **Uncertain** — likely upsell CTA; needs live WP | Low |
| IndexNow | Marketing Premium pages | Listed in Free toggles with `premium: true` | Label in Free settings vs paid feature | Source read line 191-199 | **Premium** | High |
| Link suggestions | Help/marketing Premium | `premium: true` in toggles | None after source | Source read line 121 | **Premium** | High |
| Inclusive language | Some old docs implied Premium | Toggle in Free + full assessor in yoastseo | Historical | Source: assessor + toggle | **Free (English)** | High |
| Keyphrase distribution | Listed in SCORING SEO.md | Not registered in `seoAssessor.js` | Docs vs wiring | Source compare assessor list | **Premium** | High |
| Word complexity readability | Class exists | Not in `contentAssessor.js` | Docs vs wiring | Source compare | **Premium** | High |
| AI title/description | Feature toggle `premium: true` | Marketing AI features | None | Source read line 202 | **Premium** | High |

## A. Installation, onboarding, dashboard, health

| Feature | Tier | Default | UI | Notes |
|---------|------|---------|-----|-------|
| Activation / defaults | Free | — | Plugins | Sets options, roles, indexables migration |
| Configuration wizard | Free | First run | Yoast SEO dashboard | Multi-step site representation |
| Indexables optimization | Free | Background | Tools | Performance index for head/sitemaps |
| Dashboard widgets / scores | Free | On | Dashboard | Site-wide SEO/readability summaries |
| Task list / alerts | Uncertain | — | Dashboard | Confirm in live WP |
| Content score filters (admin list) | Free | When analysis on | List tables | Requires indexables |
| Import other SEO plugins | Free | Manual | Tools | SEO, RankMath, AIOSEO paths |
| Export settings | Free | Manual | Tools | Settings export |
| Usage tracking opt-in | Free | Varies | Site features | `tracking` option |
| Admin bar menu | Free | On | Frontend admin bar | **WordPress-specific** |
| Role manager / advanced meta cap | Free | Restrict authors | Site features | `disableadvanced_meta` |

## B. Site features (verified toggles)

**Source:** `admin/views/class-yoast-feature-toggles.php`

| Feature | Tier | Setting key |
|---------|------|-------------|
| SEO analysis | Free | `keyword_analysis_active` |
| Readability analysis | Free | `content_analysis_active` |
| Inclusive language | Free | `inclusive_language_analysis_active` |
| Cornerstone content | Free | `enable_cornerstone_content` |
| Text link counter | Free | `enable_text_link_counter` |
| Insights | Uncertain | `enable_metabox_insights` |
| Link suggestions | **Premium** | `enable_link_suggestions` |
| XML sitemaps | Free | `enable_xml_sitemap` |
| Admin bar menu | Free | `enable_admin_bar_menu` |
| Advanced/schema for authors | Free | `disableadvanced_meta` |
| Usage tracking | Free | `tracking` |
| REST head endpoint | Free | `enable_headless_rest_endpoints` |
| Enhanced Slack sharing | Free | `enable_enhanced_slack_sharing` |
| IndexNow | **Premium** | `enable_index_now` |
| AI title & description | **Premium** | `enable_ai_generator` |

Additional Free areas in 28.0 source: **Schema framework**, **llms.txt**, **Open Graph/Twitter** (presenters), **breadcrumb** settings, **RSS** footer/header fields.

## C. Site identity & representation

| Feature | Tier | Storage |
|---------|------|---------|
| Website name / alternate name | Free | `wpseo_titles` options |
| Tagline usage in templates | Free | options |
| Title separator | Free | options |
| Default OG image | Free | options / social |
| Person vs Organization | Free | `company_or_person` |
| Organization logo / person image | Free | options + attachments |
| Social profiles (sameAs) | Free | options |
| Site verification (Google, Bing, etc.) | Free | options |
| Tracking preferences | Free | `tracking` |

## D. Content-type defaults

Yoast controls per post type (posts, pages, CPTs): search appearance templates, schema defaults, metabox visibility, sitemap inclusion, breadcrumb settings. **Free** includes template variables (`%%title%%`, `%%sep%%`, `%%sitename%%`, etc.).

**Social templates in Free:** Default OG/Twitter often inherit SEO title/description; dedicated social fields exist at post level in editor.

## E. Taxonomies & archives

Free includes taxonomy meta (title/description/noindex), primary category (posts), author/date/format archive controls, attachment redirect settings, breadcrumb templates for taxonomies.

**EmDash note:** Taxonomies map to EmDash taxonomy collections — adapted equivalent required.

## F. Advanced site configuration

| Feature | Tier |
|---------|------|
| Breadcrumbs (theme integration) | Free |
| RSS before/after content | Free |
| XML sitemap (post/tax/author) | Free |
| robots.txt (virtual) | Free |
| `.htaccess` tools | **WordPress/Apache-specific** — N/A on Workers |
| Crawl cleanup / attachment URLs | Free (WP context) |
| llms.txt | Free (28.x) |
| Schema aggregator endpoint | Free (headless) |

## G. Post editor controls (Free minimum)

| Control | Free | Stored (WP) |
|---------|------|-------------|
| Focus keyphrase | Yes | `_yoast_wpseo_focuskw` |
| SEO title | Yes | `_yoast_wpseo_title` |
| Meta description | Yes | `_yoast_wpseo_metadesc` |
| Snippet preview (desktop/mobile) | Yes | — |
| SEO score + assessments list | Yes | computed |
| Readability score + assessments | Yes | computed |
| Inclusive language (en) | Yes | computed |
| Cornerstone toggle | Yes | `_yoast_wpseo_is_cornerstone` |
| Social title/description/image | Yes | social meta keys |
| Schema page/article type | Yes* | schema fields (*advanced cap may apply) |
| noindex / nofollow / advanced robots | Yes* | `_yoast_wpseo_meta-robots-*` |
| Canonical | Yes | `_yoast_wpseo_canonical` |
| Breadcrumb title | Yes | breadcrumb title meta |
| Primary category | Yes | primary term |
| Slug / URL preview | Yes | WP permalink |
| Internal/outbound link counts | Yes | indexables |

## H. SEO assessments (Free — exact 17 wired)

**Source:** `packages/yoastseo/src/scoring/assessors/seoAssessor.js`

1. Keyphrase in introduction  
2. Keyphrase length  
3. Keyphrase density  
4. Keyphrase in meta description  
5. Meta description length  
6. Keyphrase in subheadings  
7. Competing links  
8. Keyphrase in image alt attributes  
9. Image presence/count  
10. Text length  
11. Outbound links  
12. Keyphrase in SEO title  
13. Internal links  
14. SEO title width  
15. Keyphrase in slug  
16. Function words in keyphrase  
17. Single H1  

**Not in Free assessor (Premium / other):** Keyphrase distribution, Text title assessment, product/Woo assessments, previously-used keyphrase (plugin-level research).

Scoring details: `packages/yoastseo/src/scoring/assessments/SCORING SEO.md`

## I. Readability assessments (Free — exact 7 wired)

**Source:** `packages/yoastseo/src/scoring/assessors/contentAssessor.js`

1. Subheading distribution  
2. Paragraph length  
3. Sentence length  
4. Transition words  
5. Passive voice  
6. Text presence (not too short)  
7. Consecutive sentence beginnings  

**Flesch Reading Ease:** Displayed via `ReadabilityScoreAggregator` (languages with full support: en, nl, de, it, ru, fr, es).

**Premium (not wired):** Text alignment, word complexity, product list assessment.

## J. Inclusive language (Free)

- **Default:** Off until enabled (site feature)  
- **Languages:** English only (`Language_Helper::$languages_with_inclusive_language_support`)  
- **Categories:** age, appearance, culture, disability, gender, other, SES, sexual orientation (~220 rule IDs)  
- **Processing:** Local worker (`yoastseo`); no remote API in assessor path  
- **Source:** `SCORING INCLUSIVE LANGUAGE.md`, `inclusiveLanguageAssessor.js`

## K. Content overview & bulk management

Free includes (when indexables/analysis enabled): SEO and readability columns, cornerstone indicator, link counts, filters by SEO score, cornerstone filter, bulk title/description editors (quick edit), orphaned content filters in Premium marketing — verify Premium boundary before parity.

## L. Generated frontend & machine output

Verified in source (SSR/HTML presenters):

- `<title>`, meta description, robots, canonical  
- Open Graph + Twitter Card  
- Slack enhanced tags (optional)  
- JSON-LD graph (WebSite, WebPage, Article, Person/Organization, BreadcrumbList, etc.)  
- `sitemap_index.xml` + child sitemaps  
- Virtual `robots.txt`  
- RSS additions (optional)  
- `llms.txt`  
- REST: `GET yoast/v1/get_head?url=` (optional)

**Requirement for EmDash:** Initial server HTML must include metadata (EmDash already does via `EmDashHead`).

## M. Integrations (boundaries)

| Integration | Tier | EmDash disposition |
|-------------|------|-------------------|
| Google Site Kit | Free optional | Not applicable (WP plugin) |
| Semrush | Free optional API | Future extension (commercial API) |
| Wincher | Premium/extension | Outside scope |
| Elementor / Jetpack / WooCommerce | Free bridges | Not applicable |
| ACF content analysis | Extension | Not applicable |
| Importers (RankMath, etc.) | Free tools | Partial — EmDash WP import exists |

## Licensing summary

| Component | License |
|-----------|---------|
| wordpress-seo plugin | GPL-3.0 (`license.txt`) |
| yoastseo npm | GPL-3.0 |
| composer/package.json headers | GPL-2.0+ (inconsistent; treat analysis as **GPL-3**) |

**Inference:** Shipping `yoastseo` inside MIT EmDash requires GPL compliance strategy (separate GPL package, source offer, or reimplementation).

## Machine-readable matrix

See `yoast-free-feature-matrix.csv` (56+ rows; expand in implementation phase).

## Audit limitations

- No live WordPress 7.0 + Yoast 28.0 black-box UI session in this run  
- Insights Free/Premium boundary unresolved  
- Premium plugin not cloned (boundary checks from Free source only)
