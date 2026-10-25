# SEO audit checks — exact current coverage, 25 October 2026

Every check below is real and tested. "Not tested" entries are explicit placeholders the engine itself reports — they never become a fabricated pass or fail.

## Per-page checks (`analyzeHtml`, runs on every crawled/audited page)

| Check | Category | Evidence source |
|---|---|---|
| Page title present | metadata | `<title>` |
| Title length | metadata | character count, editorial guideline not a hard limit |
| Meta description present/length | metadata | `<meta name="description">` |
| Canonical declaration + HTML/HTTP-header conflict | metadata | `<link rel=canonical>` vs. `Link:` response header |
| Primary heading (H1 count) | structure | `<h1>` count |
| Empty headings | structure | heading text content |
| Heading hierarchy (skipped levels) | structure | adapted from SEONaut's MIT-licensed rule, see `THIRD_PARTY_NOTICES.md` |
| Document language | technical | `<html lang>` |
| Viewport declaration | technical | `<meta name="viewport">` |
| HTTPS | technical | request URL scheme |
| Robots indexability indicator | technical | meta robots + `X-Robots-Tag` header (reports both; never claims confirmed Google indexing) |
| HTTP status | technical | real response status |
| Basic security headers | technical | CSP / `X-Content-Type-Options` presence |
| Link text | links | visible anchor text |
| HTTP destinations on an HTTPS page | links | resolved `href` scheme |
| Image alt attributes | images | `alt` presence/emptiness, decorative-image awareness |
| Image dimension attributes | images | `width`/`height` presence |
| Structured data JSON validity | social | `application/ld+json` parse success |
| Social metadata (Open Graph/Twitter) | social | `og:`/`twitter:` meta tags |
| robots.txt / sitemap.xml availability | technical | real fetch, availability only |

**Explicit `not-tested` placeholders** (the engine says so, rather than guessing): broken-link verification, image resource byte size, rendered-JavaScript content, hreflang reciprocity, lab/field performance (point users to the PageSpeed tool). The crawl mode below fills in the first two for real.

## Crawl-level checks (`auditSite`, "Full Website Audit" mode only)

| Check | What's real |
|---|---|
| Robots.txt permission | Real fetch + parse; an unreachable/erroring robots.txt fails the audit rather than crawling without confirmed permission. |
| Sitemap discovery | Real fetch of `/sitemap.xml`; same-origin URLs seed the crawl queue so pages not linked from the homepage are still found. A `sitemapindex` is detected and reported; its child documents are not fetched (recorded as a limit, not hidden). |
| Platform/CMS detection | Real evidence from one page's HTML/headers — see `docs/seo-platform-specific-rules.md`. Reports "uncertain" rather than asserting a platform on thin evidence. |
| Broken internal links | Real HTTP status per checked link; 404/410 are broken, everything else (403, timeout, etc.) is reported separately as "not verified broken," never silently merged into "broken." |
| Image resource measurement | Real downloaded bytes, real decoded dimensions (Sharp), oversized-resource and source-vs-declared-width heuristics. |
| Structured data field checks | Real JSON-LD parse plus a small required-field table per `@type` (Article, Product, Organization, BreadcrumbList, FAQPage) — explicitly not full Schema.org/rich-result eligibility validation. |
| Duplicate titles / duplicate meta descriptions | Real cross-page comparison across every page actually crawled this run. |

## Scoring

Unchanged methodology from before this phase (`scoreAudit` in `audit.ts`): weighted category scores (technical 30, metadata 20, structure 15, links 15, images 10, social 10), `not-tested` checks excluded from the denominator and reported separately as coverage, never counted as a pass or a zero. The score is explicitly labeled "not a Google score or ranking predictor" in its own output.

## What this is not

- Not full XSD sitemap validation (syntax/structure/URL checks only, matching the standalone sitemap tool).
- Not a crawler-rule evaluator for every bot-matching edge case (directive inventory and basic syntax, matching the standalone robots tool).
- Not a rich-results eligibility checker (JSON-LD syntax and a handful of required fields only).
- Not proof of Google indexing (crawlability/indexability *signals* only — the report says so explicitly wherever this distinction matters).
