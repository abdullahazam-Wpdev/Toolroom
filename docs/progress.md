## Phase 2 — findings search/filter — 26 October 2026

Before writing any code, re-inspected the existing SEO implementation rather than assuming Phase 1 was complete or incomplete. Found that most of the "Phase 2" request was already built in earlier, undocumented-to-this-session work: `seo-evidence.ts` already adds WordPress/WooCommerce/Shopify-specific JSON-LD checks, hreflang syntax/self-reference, and cross-page return-link comparison; `report-csv.ts` and `report-pdf.ts` already produce real CSV/PDF exports; `AuditTool` already has a tabbed dashboard with scores, category breakdown, and findings/metadata/headings/links/images/coverage tabs; `safe-fetch.ts`/`site-audit.ts` already enforce SSRF protection, redirect limits, response caps, crawl depth/concurrency limits and robots compliance; background crawling stays correctly disabled in production. The one concrete, genuinely-missing piece from the request was a **searchable, filterable findings list** — the dashboard listed every check but had no way to narrow it down.

Added a search box (matches title/evidence/recommendation text) and severity filter chips (critical/warning/not-tested/pass, each showing a live count) to the findings tab of `AuditTool`. Verified live: ran the actual fixture audit, searched for "heading hierarchy" and confirmed exactly one matching check remained visible while "Page title" correctly disappeared, clicked the "warning" chip and confirmed only warning-status checks remained, then cleared the filter and confirmed the full count returned. Added this as new assertions in the existing SEO fixture e2e test rather than a parallel one. 136 unit tests and 42 browser tests passed (3 skips are the AI/video/crawl tests that correctly stay off with no worker running).

## Phase 1 production acceptance — 26 October 2026

**Released:** feature commit `3606b4d` and follow-up `5853d35` pushed to GitHub main. Follow-up Vercel deployment `toolroom-71vd33yer-norax1.vercel.app` reached Ready; public origin remains https://toolroom-woad.vercel.app. No migration or credential change was needed.

**Final verification:** 135 unit/service tests passed (one Redis-dependent skip); 43 production-artifact browser tests passed (three worker-only skips); four Python migration-helper safety tests passed. TypeScript and production build passed. All **15 live browser tests passed** (44.8 seconds), covering all five PDF operations, six developer utilities, Unicode/error/reset/cancellation behavior and existing SEO CSV. Additional live clipboard check matched actual JSON output. Actual PDF and ZIP downloads were decoded, not inferred from success messages. Live PNG→JPEG decoded at 30×20. New tool pages returned 200 with public canonicals and no noindex; sitemap includes PDF/developer tools. Media/crawl POST routes remain 503. Production dependency audit reports zero vulnerabilities.

Initial live run had two five-second result-wait failures (13/15 passed) with still-busy PDF UIs. Focused reruns passed; readiness assertions now align with the unchanged 30-second worker limit, loading status is explicit, and document-preservation limits are visible before choosing files. Final full live run passed without skipped cases. Mobile/desktop screenshots reviewed. Remote builds completed; npm platform cache/install-script advisories remain documented, with no blanket script permissions granted. Existing dev preview retained; test-owned servers stopped.

**GPU:** cgpu 0.1.4 installed operator-locally; help succeeded and isolated status requires OAuth setup. No GPU allocation/model output is verified. Its Zod advisory (two propagated high package entries) blocks credentialed/service use and is not a Toolroom dependency. SeeB4 weights and WanGP hosted-use/model licensing/hardware remain gates. No public worker enabled, production SQL run, model weights silently adopted, or production readiness claimed. See `docs/phase1-gpu-research.md` and `docs/phase1-pdf-developer.md`.

Next independent work remains image crop/metadata, images-to-PDF and further bounded PDF/developer utilities. Storage/Redis/database identity, deployed workers, rendered audits, video generation and Lighthouse acceptance remain separate gates.

## Phase 1 PDF/developer milestone — 26 October 2026

Added five functional browser-local PDF tools (merge with file reordering, split/ZIP, extract, rotate, metadata) and six developer tools (JSON, UTF-8 Base64, URI components, UUID v4, SHA-256/384/512 and HEX/RGB/HSL). Registry now has 31 tools: 25 available and six requiring configuration. New PDF category/navigation, compact operation tabs, local result downloads and original server-rendered instructions use the existing Toolroom design system and SEO pipeline. PDF parsing runs in a cancellable 30-second worker with 20 MiB/200-page limits. Existing image and SEO tools remain intact.

Local acceptance: 135 unit/service tests passed, one Redis-dependent test skipped; 43 production-artifact browser tests passed, three worker-only tests skipped. Real PDF bytes are parsed back to verify page order, dimensions, rotation, extraction and ZIP contents; metadata/Unicode/hash/UUID/error/reset/cancellation/download behavior tested. Existing codec/SEO/SSRF/rate-limit tests passed. TypeScript, final production build and the final cosmetic-change browser suite passed. Four Python helper safety tests also passed. Toolroom production dependency audit: zero vulnerabilities. Mobile screenshots reviewed; primary-button styling corrected. No SQL/migrations or paid API calls ran. Both background-job flags remain false.

Installed cgpu 0.1.4 outside the app under ignored .runtime/cgpu; CLI help works, isolated status stops on missing Colab OAuth. No GPU or model output was provisioned. Its pinned Zod dependency has a high advisory, so no account credentials or public service were configured. Reviewed new GPU/video/free-tool sources and topics with explicit license/weight/provider blockers; see phase1-gpu-research.md and the master reference ledger. WanGP and SeeB4 are not deployed tools. Repeated references reuse retained same-day reviews rather than claiming exhaustive fresh audits.

Release: completed; see the newer production acceptance entry above. Full implementation/limitations: docs/phase1-pdf-developer.md. No production-readiness claim. Remaining: images-to-PDF/rendering/compression, image crop/metadata, further developer tools, securely rendered audits and verified production storage/workers/database.

## Verified production deployment — SEO milestone

Implementation commit `1095c65` pushed to existing GitHub main; automatic Vercel deployment `toolroom-7ecjy9i8z-norax1.vercel.app` reached Ready. Public origin: https://toolroom-woad.vercel.app.

Live acceptance: root, robots and sitemap returned 200 with no localhost references; root canonical matched the public origin. Actual pasted-source audit returned 200 with new WordPress/hreflang findings. A production Chromium mobile test downloaded and inspected the real CSV and passed the horizontal-overflow check. A real PNG upload to `/api/images` returned JPEG, decoded at 32×24. POST media/crawl-job routes returned 503 with disabled-worker messages. The operator-only helper did not run authenticated production SQL or migrations. Mobile screenshot reviewed under ignored artifacts.

Local verification: 124 unit/service tests passed and one Redis-dependent test skipped; 29 production-artifact browser tests passed and three worker-only tests skipped; four Python helper safety tests passed. TypeScript, production build and diff whitespace checks passed. Production dependency audit: zero vulnerabilities. Remote build completed Prisma generation and Next build; npm emitted platform cache-dir/install-script approval advisory warnings (not failures). No blanket install-script permission change was made. Lighthouse and deployed worker/storage/database acceptance remain pending; no production-readiness claim.

## SEO evidence milestone — 25 October 2026

Added source-evidence checks for WordPress reply/query variants, corroborated Shopify/WooCommerce product JSON-LD and selected fields, JavaScript source content, and HTML hreflang syntax/self-reference. Crawls now compare return links only among fetched pages and group matching normalized main text (minimum 200 characters, excluding navigation); no semantic similarity or Google eligibility claim. Added formula-safe CSV downloads alongside existing reports.

Fixed external image fetching without explicit opt-in, classified 401/403/5xx link results as unverified rather than healthy, and replaced stale 32-request guards with the declared 80-request cap. The synchronous Vercel crawl has a 45-second engine budget and a 60-second function duration; per-fetch deadlines remain enforced.

Verification: TypeScript and production build passed; 29 production-artifact browser tests passed, three worker-only tests skipped; four secure migration-helper tests passed. 124 unit/service tests passed, one Redis-dependent test skipped. Dependency audit found zero production vulnerabilities. No production SQL/migrations or paid provider calls ran. MEDIA_JOBS_ENABLED and CRAWL_JOBS_ENABLED remain false. Production canonical/robots/sitemap already use the public origin, superseding earlier pending-deployment notes. Deployment of this SEO milestone is tracked separately below.

# Progress — 25 October 2026 (authoritative)

## Production hardening update — 25 October 2026

Prepared the Vercel production fixes and private R2/S3 integration; see [production-hardening.md](production-hardening.md) for configuration, architecture, exact test coverage and release steps. Changes are local and not deployed. Vercel production Config now has `NEXT_PUBLIC_SITE_URL=https://toolroom-woad.vercel.app`; explicit updates set both media and crawl job flags false. The public deployment still serves its old built localhost/noindex metadata until redeployed. The two supplied deployment aliases lead to Vercel authentication when requested anonymously; those responses are not treated as application verification.

Normalized canonical/OG/schema/robots/sitemap origin; preserved intentional noindex and protected API routes; fixed typed quota errors to 429/Retry-After. Vercel inline image/direct-media transfers now have a truthful 4 MiB cap, with 10 MiB images supported by the prepared private-storage path. Added signed size/type-bound PUT URLs, HMAC/hash validation, one-time processing claims, Redis admission/byte budgets, private result downloads, cleanup/lifecycle templates and object-storage worker staging. AI/video jobs remain disabled; real bucket/worker deployment is not claimed.

**Verification:** 116 unit/service tests passed, one Redis-dependent test skipped; 28 production-like browser tests passed, three worker-dependent tests skipped; one additional 5 MiB direct-storage browser fixture test passed. TypeScript and production build passed; production dependency audit reports zero advisories. Confirmed the actual Vercel build logs contained the two dynamic filesystem warnings; both are absent from the new build. Test-owned servers stopped; requested local dev preview retained.

**Database gate:** Vercel exports sensitive credentials as `[SENSITIVE]`. Requested read-only Prisma migration status returned local P1012 against this placeholder; it does not establish invalid production credentials. No production migrations/writes were performed. Added read-only sanitized operator checks; actual database/Redis/migration verification waits for execution inside a trusted environment holding real values. New MediaJob storage columns have an additive, unapplied migration. No production readiness or live object-storage result is claimed.


## "Still many things are not supported" — a real labeling bug, not a missing feature (latest)

The operator pointed at live screenshots of their own running instance: Video compressor and Video converter showed "Self-hosted setup required" badges, reasonably read as "not working yet." I checked, and they genuinely do work on this exact instance — I submitted a real compression job through the same server the operator's browser was hitting and it returned `202` immediately. The bug was the badge, not the feature: `apps/web/src/components/catalog.tsx` and the tool/category pages computed their "Available" vs. "Self-hosted setup required" label purely from the registry's static `status` field, which describes what *any* deployment of this codebase needs in general — it had no way to know that *this* deployment already has `MEDIA_JOBS_ENABLED`/Postgres/Redis/the worker configured and is actually ready.

Fixed with a new `effectivelyAvailable(tool, mediaJobsEnabled)` helper (`apps/web/src/lib/catalog.ts`): a self-hosted-infra tool (`execution` is `queue` or `model`) now shows "Available" whenever `MEDIA_JOBS_ENABLED === 'true'` is actually true on the running server, computed server-side and passed down to the (client-side) `Catalog` component as a prop, since a client component can't read server env itself. Applied consistently everywhere a tool's availability is shown or counted: the catalog card badge and footer link text, the "Available now" filter (which was silently excluding these working tools), the home page's "N tools available" counts (overall and per-category), the tool detail page's indexability flag and eyebrow label, and the category page's indexability flag. Third-party-API-gated tools (PageSpeed, Semrush) are deliberately untouched by this — their own live key/quota state is what the tool itself surfaces, not a static flag.

Verified: video-tools category page now genuinely shows "Available" for both tools (checked live via `curl` against the exact running server), a new e2e test locks this in, and the full suite (110 unit + 27 browser tests) still passes.

## GitHub, and a tool that was already built but mislabeled (earlier this session)

- **Pushed to GitHub**: `git@github.com:abdullahazam-Wpdev/Toolroom.git`, branch `main`, 221 files. Verified before committing that `apps/web/.env.local` (the file holding the real PageSpeed/Pexels/Semrush credentials) is correctly excluded by `.gitignore`'s `.env.*` pattern — checked with `git check-ignore -v`, not assumed. No secrets in the pushed history. Vercel deployment is pending the operator granting access; not attempted.
- **`social-media-inspector` was already fully built and tested** (`apps/web/src/lib/provider-metadata.ts` + its route/UI/tests) but left at registry status `planned`, so real users never saw it — the same "built but mislabeled" pattern as the AI/video tools earlier in this session. It does real, keyless, official oEmbed metadata lookups (title/author/thumbnail, no view/like counts, no downloads, no raw provider HTML rendered) for YouTube and Vimeo. Verified live this session: a real YouTube video and a real public Vimeo video ("Big Buck Bunny") both returned genuine metadata through the actual API. Promoted to `available` — it needs no configuration, unlike the AI/video tools. **There are no `planned` tools left in the registry.**
- Fixing that promotion surfaced the same test-maintenance pattern as before: the "planned pages" e2e test had to be updated since its target tool is no longer planned, and a wrong assumption in my own test fix (that an `available` tool wouldn't be `noindex`) was caught and corrected — `apps/web/src/lib/seo.ts` deliberately forces `noindex` on any `localhost` origin regardless of tool status, which is a safety feature, not a bug. 110/110 unit tests and 26/26 browser tests pass after the fix.

## SEO audit Phase 3 — background crawling at scale (earlier this session)

Full detail: `docs/seo-audit-architecture.md`. This phase built Priority 1 of the "Phase 3" request for real, end to end, verified against real Postgres/Redis/the production worker and real websites — not scaffolded.

- **Nested sitemap index support**: `discoverSitemapUrls` (new, `apps/web/src/lib/site-audit.ts`) fetches up to 10 child `<sitemap>` documents from a `sitemapindex` and aggregates their same-origin URLs. One unreachable child sitemap no longer fails discovery of the others. Verified against the real `wordpress.org/sitemap.xml` index.
- **Background crawl jobs for the 100/500/1000-page tiers** (`CRAWL_SIZE_TIERS`), built on the exact same Postgres/Redis/BullMQ pattern already proven for the AI/video jobs: a repurposed `AuditJob` Prisma model (it existed before this phase but was unused in code), a new `toolroom-crawl-v1` BullMQ queue, a second `Worker` instance added to `scripts/backend/worker.ts` (long-running jobs rely on BullMQ's automatic lock renewal — `lockDuration: 120000`, no manual extension code needed), and `/api/crawl-jobs` + `/api/crawl-jobs/[id]` routes mirroring the existing media-job API shape (submit → poll → cancel → download JSON).
- **Real progress and real cancellation, verified live**: submitted a real 100-page crawl of `wordpress.org/news/`, watched `pagesCrawled`/`pagesDiscovered` increase across real polls (0→1→2, discovered jumping to 193 then 228 as the sitemap and on-page links were parsed), then cancelled it mid-run. **A real bug was caught and fixed in the same pass**: `crawlPages()` returns a normal (not thrown) partial result on cancellation, so the worker was marking a user-cancelled job `"completed"` instead of `"cancelled"` — fixed by checking the cancellation flag after the crawl returns, not just before it starts. Also fixed the API route withholding the partial report for `"cancelled"` jobs (only `"completed"` was exposed originally) — a cancelled crawl's partial results are exactly what a user cancelling mid-run wants to see.
- **The shared crawl core was extracted**: `crawlPages()` is now the one engine both the synchronous ≤25-page `auditSite()` and the new background job call, so small and large crawls discover/score pages identically rather than drifting into two implementations.
- **Explicit 5-way URL categorization** (`UrlOutcome`): `crawled` / `skipped-robots` / `skipped-not-html` / `skipped-off-origin` / `blocked` (401/403, distinct from broken) / `failed` (network error), instead of one generic "skipped" bucket.
- **Canonical conflict detection** across the crawl (HTML `<link rel=canonical>` vs. the HTTP `Link:` header canonical disagreeing on the same page) and **redirect chains** are now captured per page (`page.redirects`, reusing `safeFetch`'s existing redirect-tracking — no new network code).
- **Crawl-delay respected**: `robotsCrawlDelayMs` reads a site's own stated `Crawl-delay` directive (capped at 3s so a hostile robots.txt can't stall a whole job); the background job also applies a 250ms default politeness delay between requests when a site states none. The synchronous ≤25-page mode stays delay-free for responsiveness.
- **A real module-loading gap was found and fixed while verifying this**: `packages/jobs/` files run via plain `node --experimental-strip-types` in the worker process, which (unlike Next.js's bundler) requires explicit file extensions on relative imports. `site-audit.ts`, `audit.ts` and `technical.ts` had extension-less internal imports that worked fine under Next.js but broke the worker at runtime the moment something in `packages/jobs/` imported them. Fixed by adding explicit `.ts` extensions to those three files' own relative imports (safe here because `apps/web/tsconfig.json` already has `allowImportingTsExtensions: true`) rather than duplicating the crawl engine into a separate copy for the worker.
- **Minimal UI**: a new `CrawlJobTool` panel on the website SEO checker page (submit URL + tier, live progress, cancel, download JSON) — functional, not decorative; verified with a new Playwright test.

**Not built this pass** (Priorities 2–6 of the "Phase 3" request): the JS-rendering Playwright worker, deep WordPress/WooCommerce/Shopify rule sets beyond identification, and the full dashboard redesign (searchable tables, severity filters, PDF/CSV exports for the new crawl tiers). See `docs/seo-audit-architecture.md` for what's next and why rendering specifically needs its own careful pass rather than a rushed one.

**A real, honest limitation surfaced during verification, not hidden**: the new e2e browser test for this feature submits a real background crawl, and this session's own repeated manual testing (several 100-tier submissions while verifying progress/cancellation) exhausted the 100-tier's hourly quota (4/hour, shared across tiers) partway through today's verification — a later full-suite run correctly got HTTP 429 "Crawl job limit reached," confirmed directly via `curl`, not a code defect. The test itself passed cleanly in isolation (3.9s, real completion). This is the rate limiter working as designed; it just means this specific test can flake if rerun several times within the same hour, which is worth knowing rather than discovering by surprise later.

## Multi-platform SEO audit upgrade (earlier this session)

Full detail: `docs/seo-audit-architecture.md`, `docs/seo-audit-checks.md`, `docs/seo-platform-specific-rules.md`, `docs/seo-api-integrations.md`, `docs/deployment-requirements.md`. The "Full Website Audit" crawl engine (`apps/web/src/lib/site-audit.ts`) gained, for real and tested:

- **Sitemap-seeded crawling**: `sitemap.xml` is fetched and parsed; same-origin URLs are added to the crawl queue so pages not linked from the homepage are still audited. A `sitemapindex` is detected and reported (nested child sitemaps are not yet fetched — stated explicitly, not hidden).
- **Platform/CMS detection** (`apps/web/src/lib/platform-detect.ts`, new file): evidence-based signals for WordPress, WooCommerce, Shopify, Webflow, Wix, Squarespace, Magento, PrestaShop, OpenCart, Next.js, Nuxt, Angular and Laravel. Verified live against `wordpress.org/news/` (correctly identified WordPress, high confidence, 4 independent signals: generator meta, `/wp-content/`, `/wp-includes/`, the `api.w.org` REST discovery link) and against `example.com` as a true negative (correctly reported "no recognized platform signature," not a guessed match). A single generic asset-path match alone stays "low confidence"/uncertain; a platform's own self-declared generator tag or a framework's distinctive runtime marker is trusted at "medium" alone, "high" with 2+ independent signals.
- **Duplicate meta description detection** across crawled pages, alongside the pre-existing duplicate-title check.
- **Raised crawl limits**: 5 pages/32 requests/45s → 25 pages/80 requests/60s (`MAX_CRAWL_PAGES`/`MAX_CRAWL_REQUESTS` exported constants), with the page limit now configurable per request (1–25) instead of hard-capped at 5.
- UI (`SiteAuditTool`) now shows platform signals, sitemap discovery results, duplicate descriptions, and a page-limit input.

**Explicitly not built this phase** (tracked honestly in `docs/seo-audit-architecture.md` rather than silently dropped from the original much larger spec): JavaScript-rendered-DOM comparison (needs a new isolated Playwright worker, not a request-handler feature — the FFmpeg/ONNX worker pattern already in this codebase is the template), Google Search Console OAuth, authenticated WordPress/Shopify read access, and platform-*specific* deep rule sets beyond identification (Elementor DOM-size checks, WooCommerce product-schema validation, Shopify theme performance, etc.). PageSpeed and Semrush integration status is unchanged from the section below (PageSpeed live, Semrush blocked on the wrong credential type).

Verification: 103/103 unit tests (was 93; +10 for sitemap seeding, missing-sitemap handling, platform detection integration, and 7 dedicated `platform-detect` unit tests), clean `tsc --noEmit`, clean production build. Live-verified against two real websites (above), not just fixtures.

This replaces all earlier dated sections of this file as the single current
status. Older per-phase narratives are preserved in `docs/testing-results.md`
and `docs/tool-implementation-plan.md`; this file states only what is true
right now.

## Registry status (packages/core/registry.ts), exact count

**20 tools total.**

- **13 available** (zero-configuration, work on any deployment): general
  image converter, JPG→WebP, WebP→PNG, PNG→JPG, image compressor, image
  resizer, website SEO checker, meta tag analyzer, heading checker,
  robots.txt checker, sitemap validator, direct media downloader, social URL
  inspector.
- **6 requires-configuration** (code is implemented and independently
  verified with real output; each needs an operator to configure something
  before end users can use it):
  - `pagespeed-checker` — needs a Google API key/project. See **PageSpeed
    diagnosis** below.
  - `semrush-keyword-metrics` — needs a paid Semrush v4 API key.
  - `background-remover`, `ai-image-upscaler`, `video-compressor`,
    `video-converter` — need a deployed Postgres + Redis + worker
    installation (`MEDIA_JOBS_ENABLED=true`, `DATABASE_URL`, `REDIS_URL`,
    model weights, FFmpeg/Python). **Promoted from "planned" this session**
    after real, verified end-to-end output — see **Infrastructure and
    AI/video verification** below.
- **1 planned** (code not implemented yet): `social-media-inspector`
  (official provider metadata/likes/views — no provider integration exists).

The tool detail page and the `/tools` catalog card both render a
`requires-configuration` tool's real interactive component always (the same
pattern PageSpeed/Semrush already used); if the operator hasn't configured
the dependency, the real API returns a real, honest error instead of a
placeholder. Only `social-media-inspector` shows the "on the roadmap" panel.
`requires-configuration` and `planned` tools are both excluded from the
sitemap and category/tool indexing (`status === "available"` only).

## Infrastructure and AI/video verification — this session

**Docker/podman are not invokable in this sandboxed shell.** `docker`,
`podman`, `apt`/`apt-get`, and `sudo` are all absent (`command not found`);
the host's own `podman` binary is reachable at `/run/host/usr/bin/podman`
through the host mount but fails with a missing shared library
(`libsubid.so.5`) when invoked from inside this container, so `compose.yaml`
cannot be run or verified directly from here. This is a harder, more precise
statement of the earlier "Docker was unavailable in this shell" note.

**However, real Postgres and Redis containers were already running and
reachable** on this machine at `127.0.0.1:15432` (Postgres 17, database
`toolroom`, schema already migrated — `infra/migrations/20261025090000_initial`
applied) and `127.0.0.1:16379` (Redis 7), provisioned by an earlier part of
this same working session using the host's podman (visible in
`.runtime/infrastructure/postgres-pull.log`, `redis-pull.log`,
`migrate.log`). This session could not have started them itself, but could
reach, use, and verify them. **Operator note:** if these processes are ever
stopped, re-provisioning them requires a shell with real Docker/Podman
access (not this sandbox) and then `npm run db:push`; there is no
in-sandbox fallback (no `apt`, no static Postgres/Redis binary, no
`pglite`/embedded-Redis dependency currently vendored).

With that real infrastructure reachable, `apps/web/.env.local` was updated
with `DATABASE_URL`, `REDIS_URL`, `MEDIA_JOBS_ENABLED=true`,
`JOB_STORAGE_DIR`, `MODEL_STORAGE_DIR`, and `AI_PYTHON`, and the following
were verified **for real, through the actual HTTP API, not a bypass
script**, then independently through a real Chromium browser flow:

- **Video compressor** (`webm`, quality `smaller`) and **video converter**
  (`mp4`, quality `balanced`): real multipart upload → Postgres `MediaJob`
  row → BullMQ job on real Redis → the production worker
  (`scripts/backend/worker.ts`) → real FFmpeg under `prlimit` resource
  limits → `ffprobe`-verified decodable H.264/VP9 output → authenticated
  download. Confirmed with the exact commands `packages/jobs/process.ts`
  issues, run directly, and via the live API end to end.
- **Background remover** (MODNet) and **AI image upscaler** (Swin2SR
  lightweight x2): same real pipeline, ending in real ONNX inference
  (`workers/ai/infer.py`) via the isolated Python venv
  (`onnxruntime==1.31.0`, `Pillow==13.0.0`, `numpy==2.5.4`, newly installed
  from the pinned `workers/ai/requirements.lock`). Background removal
  produced a real alpha channel (values spanning 0–255, not a degenerate
  uniform mask) on a 480×360 test portrait. The upscaler produced a correct
  exact 2× output (160×120 → 320×240) in ~11s CPU time. Both verified again
  through a real Chromium browser session (new Playwright test, below).
- **Model weight integrity caught a real corrupted/stale file**: the
  on-disk `swin2SR-lightweight-x2-64/model.onnx` (9,127,464 bytes) did not
  match its pinned record in `workers/ai/model-sources.json`
  (8,078,888 bytes expected), so `infer.py`'s SHA-256 check correctly
  refused to run it ("Model integrity check failed" — this is the check
  working as designed, not a bug). Re-running `scripts/backend/fetch-models.py`
  re-downloaded the correct pinned revision from Hugging Face and the
  hash now matches exactly. Root cause: a prior session re-pinned
  `model-sources.json` to a newer revision without re-running the fetch
  script against the already-downloaded file.
- **Both models remain Apache-2.0** (`Xenova/modnet`, `Xenova/swin2SR-lightweight-x2-64`
  — see `third_party/modnet/LICENSE`, `third_party/swin2sr/LICENSE`),
  genuinely commercial-use compatible. RMBG-1.4 (noncommercial) was not
  substituted.
- **A real latent bug was found and fixed**: `packages/jobs/runtime.ts`
  `connection()` set `enableOfflineQueue: false` for request-path Redis
  connections. The very first command issued on a freshly started process
  (the per-minute upload quota check, or a cold BullMQ `Queue`) could race
  the connection handshake and throw `Stream isn't writeable and
  enableOfflineQueue options is false`, which the API surfaced as a
  generic 503 on a user's very first request after a deploy/restart.
  Reproduced directly, fixed by enabling the offline queue (bounded by the
  existing `connectTimeout`/`maxRetriesPerRequest`), and confirmed fixed
  against a truly fresh process restart. A regression test was added
  (`tests/jobs.test.ts`, skipped when `REDIS_URL` isn't set).
- **New real browser test**: `tests/e2e/workspace.spec.ts` now has
  "real background-removal job completes through the browser and downloads
  an alpha PNG" — uploads a real JPEG, drives the actual UI, waits for the
  real job, downloads, and decodes the result with Sharp. It
  self-skips (`test.skip`) when `MEDIA_JOBS_ENABLED` isn't set for the test
  run, so CI (which has no Postgres/Redis service) skips it cleanly rather
  than failing.
- **Full regression run after all of the above**: 93/93 unit tests, clean
  `tsc --noEmit`, a clean production build (`next build`, exit 0 — two
  pre-existing, non-blocking Turbopack tracing-size warnings on
  `packages/jobs/runtime.ts`'s dynamic `JOB_STORAGE_DIR` path, unrelated to
  this session's edits), and **26/26 Playwright browser tests** (25
  pre-existing + the 1 new test above) against the actual standalone
  server artifact the Docker image runs
  (`node apps/web/.next/standalone/apps/web/server.js`, with `public/` and
  `.next/static` copied in exactly as `Dockerfile` does) — not `next start`,
  which this project's own `npm start` script uses and which prints
  `"next start" does not work with "output: standalone"`. That script/Docker
  mismatch is noted under **Remaining gates** below; it is pre-existing and
  not introduced this session.

## PageSpeed diagnosis — resolved, now live

The quota error was real and expected: without `PAGESPEED_API_KEY`,
`queryPageSpeed` (`apps/web/src/lib/pagespeed.ts`) calls Google's
`pagespeedonline/v5/runPagespeed` with no `key` parameter, which shares a
very low, unauthenticated, per-IP quota that this sandbox's network egress
already exhausted.

**The operator supplied a real Google API key this session, and it was
verified live.** `PAGESPEED_API_KEY` is now set in `apps/web/.env.local`.
Both `strategy=mobile` and `strategy=desktop` against `https://example.com`
returned real Lighthouse lab scores (performance 100, accessibility 96,
best practices 100, SEO 80) **and real Chrome UX Report field data**
(`field.available: true`, real LCP/CLS/INP percentiles) through the actual
`/api/pagespeed` route — not a fixture. `pagespeed-checker` stays
`requires-configuration` in the registry (any other deployment still needs
its own key), but on this specific running instance it is now fully
functional with live data.

## Pexels and Semrush key activation — this session

The operator supplied real Pexels and Semrush credentials. Both were
written to `apps/web/.env.local` (never echoed in chat) and tested live
through the actual production routes:

- **Pexels: live and working.** `/api/photos?q=...` returned real search
  results with real photographer credit and Pexels permalinks; the
  token-gated `/api/photos/image` proxy was then used to download one of
  those results, which decoded as a genuine 436×350 JPEG. No code changes
  were needed.
- **Semrush: the supplied credential is the wrong type.** The key has the
  format `semrtkn-pat-...`. Semrush's own v4 docs
  (`developer.semrush.com/api/v4/get-started/authorization`) document only
  two credential types: a v4 **API key**, sent as
  `Authorization: Apikey <key>` (which is exactly what
  `apps/web/src/lib/semrush.ts` already sends — the code was not the
  problem), and a legacy **OAuth 2.0 access token**, sent as
  `Authorization: Bearer <token>` for deprecated endpoints only. A
  `semrtkn-pat-` token matches neither documented format; it is most likely
  a Personal Access Token from Semrush's **App Center / developer
  portal** (the `developer.semrush.com/intergalactic/` UI kit and
  `semrush.com/apps/docs` links the operator also sent both point at that
  same App Center developer program, not the standalone Keyword
  Analytics API). A single real test call
  (`keyword=seo tools, country=US`) returned **HTTP 403**, confirming the
  key is recognized as some kind of credential but not authorized for
  `apis/v4/keywords/v1/metrics`. Auth-layer rejections are not billed by
  virtually any API provider, so this did not spend the daily unit budget.
  **To fix:** generate an actual **API key** (not a Personal Access Token)
  from Semrush's account **API Keys** page (inside the main Semrush app,
  under API/API Keys in account settings — distinct from the App Center
  developer portal), and set `SEMRUSH_API_KEY` to that value instead.
  `semrush-keyword-metrics` stays `requires-configuration`; nothing here
  was guessed into working, and no further live attempts were made with
  the mismatched token.

## Verification totals (current)

- **93 unit/service tests passed** (`npm test`, 13 files — up from 92/81 in
  earlier phases; +1 is the new Redis cold-start regression test).
- **26 browser tests passed** against the real standalone production
  server (`npm run test:e2e` with `MEDIA_JOBS_ENABLED=true`; 25 pass
  unconditionally, the new AI test self-skips without that flag).
- Production build (`next build`) passed, TypeScript included.
- `npm audit` still reports 0 high-severity advisories (unchanged this
  session; dependency set did not change).

## Remaining gates

1. **Reproducible local infrastructure provisioning.** This sandbox can use
   the already-running Postgres/Redis but cannot start, stop, or
   re-provision them (no Docker/Podman/apt/sudo). A shell with real
   container tooling is required to validate `compose.yaml` end to end
   (`docker compose up --build`) and to recover if these ambient services
   ever disappear.
2. **`npm start` vs. the Docker entrypoint mismatch — fixed.** `apps/web/package.json`'s
   `start` script now runs the real standalone entrypoint
   (`node --env-file=.env.local .next/standalone/apps/web/server.js`,
   `HOSTNAME=0.0.0.0`) instead of `next start`, which Next.js itself warned
   was incompatible with `output: "standalone"`. A new `postbuild` script
   copies `.next/static` and `public/` into the standalone output, exactly
   as `Dockerfile` already did manually, so `npm run build && npm start`
   now serves real static assets and is the same artifact Docker ships, not
   an approximation of it. **A real bug surfaced while verifying this
   fix**: the standalone server does not reliably auto-load
   `apps/web/.env.local` (confirmed by probing `/api/pagespeed`,
   `/api/semrush`, and `/api/jobs` immediately after a fresh `npm start` —
   all three reported "not configured" even though the file was present),
   so `--env-file=.env.local` was added to make loading explicit and
   deterministic rather than relying on undocumented Next.js standalone
   behavior. Re-verified clean across three separate full suite runs after
   the fix: 26/26 browser tests, 93/93 unit tests, clean `tsc --noEmit`.
   One run in between (while repeatedly re-running the full suite back to
   back for verification) hit 4 unrelated transient failures while this
   sandboxed machine's swap was nearly exhausted (confirmed via `free -h`:
   6.9 GiB/7.5 GiB swap used, load average 3.1) — a resource-exhaustion
   artifact of this verification session itself running many Node/Chromium
   processes concurrently, not a code regression; it did not reproduce on
   either the run before or the two runs after. Separately, the pre-existing
   search-filter test (`tests/e2e/platform.spec.ts`) had its assertion
   timeout raised from the 5s default to 15s, since it is genuinely
   contending for CPU with the new real-inference browser test in the same
   2-worker pool and intermittently needed more than 5s under that load; it
   is a synchronous client-side filter with no actual latency of its own.
3. **SEO audit expansion** (JS-rendered pages, bounded whole-site crawling,
   broken-link checking, measured image-resource sizes, schema validation
   beyond JSON-LD syntax, richer prioritized recommendations) is not yet
   implemented. Current single-page static audit explicitly states these
   limits in its own report rather than silently omitting them.
4. **Official provider metadata/likes/views** (`social-media-inspector`) —
   still not implemented; no scraper/cookie workaround was added.
5. **PageSpeed and Semrush** still need the operator-provided
   credentials described above and in `.env.example`.
6. **Public launch gates unchanged**: real public origin, TLS-terminating
   reverse proxy with body/time caps, distributed (not process-local)
   quotas across replicas, operator/legal identity, monitoring, and a
   measured Lighthouse CI run. None of this session's work changes that.

## How to reproduce this session's infra verification

```sh
# In apps/web/.env.local, set (adjust host/port to your real Postgres/Redis):
DATABASE_URL=postgresql://toolroom:<password>@<host>:<port>/toolroom
REDIS_URL=redis://<host>:<port>
MEDIA_JOBS_ENABLED=true
JOB_STORAGE_DIR=<absolute path>/.runtime/jobs
MODEL_STORAGE_DIR=<absolute path>/.runtime/models
AI_PYTHON=<absolute path>/.runtime/ai-venv/bin/python3

npm run db:push                     # applies infra/schema.prisma
python3 scripts/backend/fetch-models.py   # verifies/re-downloads pinned ONNX weights
.runtime/ai-venv/bin/pip install -r workers/ai/requirements.lock
npm run worker &                    # the BullMQ consumer
npm run build && node apps/web/.next/standalone/apps/web/server.js
```

Then exercise `/api/jobs` with a real multipart upload (`kind` one of
`video-compressor`, `video-converter`, `background-remover`,
`ai-image-upscaler`), poll `/api/jobs/:id`, and download with
`?download=1` — or just use the real tool pages in a browser.

## Vercel agent onboarding

Followed the requested official onboarding playbook: existing Vercel CLI 65.2.0 authenticated, official Vercel plugin installed/enabled user-wide, shared global MCP registered and user OAuth completed. Preserved existing toolroom project linkage and unrelated Codex settings. Mutation confirmation configured. Reload Codex to expose new plugin commands/MCP tools; authenticated `list_teams` and documentation search are pending that refresh. No deployment was performed. See `docs/vercel-setup.md`.

Backend continuation is in progress: real rootless Podman PostgreSQL/Redis checks, queue job processing and restart durability passed; an actual VP9/WebM job completed. New AI/video/crawl/provider code remains under acceptance verification and is not promoted to available based on source changes alone. Docker is absent in the Flatpak shell; rootless host Podman is usable. Chromium sandbox startup failed for operator-rendered audits; public JavaScript rendering stays disabled. AI runtime installation encountered interrupted PyPI downloads. This work does not replace the earlier accepted tool verification or imply production readiness.

## Prisma migration access investigation — 25 October 2026

Confirmed through authenticated CLI/provider metadata that `prisma-postgres-carmine-island` is Available and linked to Toolroom. Production database credentials remain hidden; no SQL connection is verified. Reviewed schema (Prisma 6.19.3, DATABASE_URL only) and all three migrations: no explicit destructive SQL, but crawl migration's required maxPages/tokenHash fields without defaults can fail on existing AuditJob data. No migration was edited/applied. Prepared a hidden-input, identity-checking read-only status helper with four passing safety tests. Exact dashboard action, safe local command, references and all migration gates: `docs/prisma-production-connection.md`. Current MCP tools are unavailable in the session; authenticated CLI metadata is not misrepresented as MCP/SQL verification.

## Phase 3 — JavaScript-rendered SEO auditing — 26 October 2026

Added real Chromium-based rendered-vs-raw SEO comparison, fully documented in `docs/rendered-audit.md`. Correcting the 25 October entry above: Chromium's own OS-level sandbox was re-tested in this session and does work in this environment; it is kept enabled (no `--no-sandbox`) in the new engine. Summary:

- New `packages/jobs/rendered-audit.ts` engine reuses the existing `analyzeHtml()` for both raw and rendered HTML, so every static check already runs against rendered output; new `RenderedAuditJob` Prisma model/migration, BullMQ queue, worker consumer in `scripts/backend/worker.ts`, and `POST /api/rendered-audits` + `GET/DELETE /api/rendered-audits/[id]` routes mirroring the existing crawl-job pattern.
- Browser-level SSRF protection via Playwright request interception (`context.route`), resolving and validating every request the rendered page itself makes, not just the top-level navigation — verified live against a literal private IP.
- `RENDERED_AUDIT_ENABLED` is a dedicated flag with no local-dev fallback, plus a Vercel worker-heartbeat check, plus the engine only ever being imported from the worker script — confirmed via a build-output grep that `playwright`/`chromium` never reach the compiled `/api/rendered-audits` serverless chunk.
- New `RenderedAuditTool` UI wired into the website SEO checker page, reusing the existing findings search/severity-filter CSS and a JSON report download.
- Also added one new static check with no new infrastructure: `canonical-self-reference`, flagging a declared canonical that points at a different page than the one being audited.
- 138 unit tests (1 pre-existing skip, including new rendered-audit and canonical-self-reference tests), 42 e2e Playwright tests passed with 5 correctly skipped (the pre-existing media/crawl-worker tests plus this phase's own worker-gated test — verified passing separately with a real local worker running), `tsc --noEmit`, and `next build` all clean. Verified against the real standalone production server that with the flag off the UI renders normally and a submission returns a clean 503, not a fabricated result.
- Not applied to production: the migration was only tested against a disposable scratch database and this sandbox's own local Postgres. `RENDERED_AUDIT_ENABLED` is set only in local `.env.local`, never in Vercel. Exact activation steps (migration, worker deployment with Chromium, Dockerfile update, heartbeat, then the flag) are in `docs/rendered-audit.md`.
