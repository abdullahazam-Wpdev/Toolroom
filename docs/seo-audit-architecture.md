## Source-evidence expansion — 25 October 2026

Selected platform checks, normalized main-text duplicates, HTML hreflang checks and CSV findings are now implemented; see `docs/development-plan.md` and `apps/web/src/lib/seo-evidence.ts`. These supersede prior statements that only platform identification exists. No rendered DOM, authenticated owner data, full schema eligibility validation or semantic duplicate detection is claimed. Return-link evidence covers crawled HTML only; out-of-budget alternates stay Not tested.

# SEO audit architecture — 25 October 2026

This documents the actual current architecture of the SEO audit engine after the multi-platform audit upgrade. It is not a design proposal; everything described here is implemented and tested unless explicitly marked "planned."

## Modules

- `apps/web/src/lib/audit.ts` — single-page static HTML analysis (`analyzeHtml`), the shared engine both audit modes use. Produces `Check[]` records (id, category, status, evidence, recommendation, priority) and a transparent weighted score (`scoreAudit`). Unimplemented capabilities are explicit `not-tested` checks (`broken-links`, `image-bytes`, `rendering`, `hreflang-return`, `performance`), not silently omitted or faked.
- `apps/web/src/lib/site-audit.ts` — the crawl engine (`auditSite`). Orchestrates robots.txt, sitemap discovery, breadth-first same-origin crawling, per-page `analyzeHtml`, platform detection, broken-link verification and image resource measurement, all inside one request/time budget.
- `apps/web/src/lib/platform-detect.ts` — evidence-based CMS/platform signal detector (`detectPlatform`), new this phase.
- `apps/web/src/lib/technical.ts` — shared robots.txt/sitemap.xml parsers (`parseRobots`, `parseSitemap`), reused by both the crawl engine and the standalone robots/sitemap tools.
- `apps/web/src/lib/safe-fetch.ts` — the one SSRF-hardened network boundary every audit path goes through (DNS pinning, private/reserved IP rejection, redirect revalidation, byte/time caps). Nothing in the audit engine calls `fetch` directly.
- `apps/web/src/lib/pagespeed.ts` — Google PageSpeed Insights integration, unchanged this phase, now live-verified with the operator's key (see `docs/progress.md`).

## Two audit modes (implemented)

**Quick URL Audit** (`website-seo-checker`, `meta-tag-analyzer`, `heading-checker`): one page, `analyzeHtml` only, via `AuditTool`/`runAudit` in `audit.ts`. Unchanged from before this phase except it now also benefits from `analyzeHtml`'s existing checks; platform detection was intentionally NOT added here — see "Why platform detection lives in the crawl mode only" below.

**Full Website Audit** (`SiteAuditTool`, `/api/site-audits`, `auditSite`): this phase's main upgrade.

1. Fetch and parse `robots.txt`. An unreachable/erroring robots.txt **fails the audit** rather than crawling without permission context — unchanged conservative behavior from before this phase.
2. Fetch and parse `sitemap.xml` (new). Same-origin URLs from a `urlset` document are added to the crawl queue, up to the page cap, so pages that exist only in the sitemap (not linked from the homepage) are still inspected. A `sitemapindex` (nested child sitemaps) is detected and reported, but child documents are **not** fetched this phase — recorded honestly as a known gap, not silently skipped.
3. Breadth-first crawl, same-origin only, up to `MAX_CRAWL_PAGES` (25) and `MAX_CRAWL_REQUESTS` (80) requests, 60-second total budget (raised from the previous 5-page/32-request/45-second caps). Each visited page gets the full `analyzeHtml` treatment.
4. Platform detection (new) runs once, on the first successfully fetched page's HTML and response headers.
5. A capped sample of discovered internal (and, if opted in, external) links get a lightweight follow-up request to classify them as broken (404/410), denied, or unverified — distinct categories, not collapsed into one.
6. A capped sample of image resources get downloaded and measured with Sharp (real bytes, real dimensions, oversized/format heuristics).
7. Cross-page aggregation: duplicate titles (existing) and duplicate meta descriptions (new).

## Why platform detection lives in the crawl mode only

`detectPlatform` needs real response headers (for header-based signals like `X-ShopId`) in addition to HTML, and `analyzeHtml`'s signature is shared with contexts that only have HTML (e.g. pasted-HTML audits with no network response). Rather than complicate that shared function's contract, platform detection is called directly from `auditSite` on the first fetched page. A future pass could surface it from the Quick Audit too when a live network response is available.

## Background crawl jobs (100/500/1000-page tiers) — Phase 3

Added `apps/web/src/lib/site-audit.ts`'s `crawlPages()` as the one shared crawl core, used by both:

- **Synchronous quick mode** (`auditSite`, ≤`MAX_CRAWL_PAGES`=25): unchanged behavior, no delay, request/time-budget caps, used by `/api/site-audits` and `SiteAuditTool`.
- **Background job mode** (`packages/jobs/crawl-process.ts`'s `processCrawl`, tiers 100/500/1000 via `CRAWL_SIZE_TIERS`): the same crawl core, larger page/request/time budgets scaled per tier (see `TIER_BUDGET` in that file), a politeness delay (a stated robots.txt `Crawl-delay` or a 250ms default), and real progress/cancellation callbacks wired to a Postgres row.

Infrastructure: a repurposed `AuditJob` Prisma model (pre-existing but unused before this phase — see `infra/schema.prisma`), a second BullMQ `Worker` instance in `scripts/backend/worker.ts` consuming the `toolroom-crawl-v1` queue alongside the existing media-job worker, and `/api/crawl-jobs` + `/api/crawl-jobs/[id]` routes shaped like the existing `/api/jobs` media-job API (submit → poll `pagesCrawled`/`pagesDiscovered` → cancel → the final/partial report embedded in the poll response once `completed` or `cancelled`). This is the exact same infrastructure the AI/video tools use, not new infrastructure — one more BullMQ queue and job kind on it.

**Verified live** (not just unit-tested): a real 100-page background crawl of `wordpress.org/news/` was submitted, its `pagesCrawled`/`pagesDiscovered` counters were watched increasing across real polls, it was cancelled mid-run, and the worker correctly persisted `status: "cancelled"` with the partial report still attached (both the status-detection and report-visibility bugs this surfaced are described in `docs/progress.md`). A 25-page `example.com` crawl was also run through the new background path end to end to completion.

**Important scope boundary**: the background job mode does the same per-page `analyzeHtml`/platform-detection/canonical-conflict/redirect-chain work as the synchronous mode, but does **not** do the synchronous mode's separate broken-link byte-sampling pass or image resource measurement pass — those stay specific to the quick ≤25-page audit for now. A future pass could extend the background job to include them.

## Explicitly deferred this phase (see `docs/progress.md` for status and reasoning)

- **Advanced Rendered Audit** (Playwright/Chromium comparison of server HTML vs. rendered DOM). Not implemented. This needs a new isolated browser worker with its own resource/time limits, following the same pattern just proven for the background crawl job above (and before that, the FFmpeg/ONNX workers) — a queue job, not a synchronous API call, with the browser's own network layer validated against the same public/private-IP rules `safe-fetch.ts` already enforces (likely via `page.route()` request interception, resolving and checking each target before allowing it through) rather than trusting the browser's own DNS resolution. No Playwright code runs in a production request path.
- **Verified Owner Audit** (Google Search Console OAuth, WordPress/Shopify authenticated read access). Not implemented — needs OAuth client registration and user consent flows that are a product/credentials decision, not something to build speculatively.
- **Platform-specific deep checks beyond detection** (Elementor DOM-size analysis, WooCommerce product schema validation, Shopify theme performance, etc. — section 5/6 of the original spec). Only platform *identification* is implemented; the deeper, platform-specific rule sets are design work for a following phase (see `docs/seo-platform-specific-rules.md` for what's specified vs. built).
- **Google Search Console and expanded Semrush integrations** (section 9/10 of the original spec) — both explicitly gated behind credentials/entitlements per the instruction to continue only with functionality that needs none.
- **Dashboard redesign** (searchable issue tables, severity filters, PDF/CSV exports for the crawl tiers). The background-crawl UI added this phase is functional (submit, live progress, cancel, JSON download) but intentionally minimal — it reuses the existing collapsible-panel pattern rather than building the full redesigned dashboard the later "Phase 3" priorities ask for.
- **Broken-link sampling and image measurement in the background-job mode.** Present in the synchronous ≤25-page mode only — see the scope boundary note above.
