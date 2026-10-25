# Research-led tool implementation phases

Preserve the existing Next.js/TypeScript/Sharp/Postgres/Redis architecture. Work is sequential by dependency and each feature's status changes only after tests.

1. Research ledger: every supplied link, source/license review, REA CLI evidence, Playwright workflows, local Codex skill and persistent AGENTS instructions.
2. Image engine: reuse Sharp for JPEG/WebP/PNG decoding, conversion, resizing and compression. Add tool-specific input MIME/signatures, JPEG alpha flattening, actual size/output formats, previews and batch ZIP; verify all five image tools.
3. Safe network service: public IP validation, pinned DNS, redirect revalidation, body/time/port limits and security fixtures. Audit one static page, exact inventories, custom weighted scoring, explicit Not tested coverage, JSON/PDF reports. Reuse Cheerio/pdf-lib rather than write parsers/encoders.
4. PageSpeed: adapt Avvio's MIT route/extraction with attribution, fix missing-score semantics, support both strategies, API failures and missing field data. Verify fixtures and attempt the official API; retain upstream quota errors as evidence.
5. Social utilities: strict platform identification and official per-provider capabilities. Direct public-media downloads need actual authorization, safe fetch, validated media, size caps and tests. No bulk integration of scraper/cookie/restriction workarounds.
6. AI: select and pin approved segmentation/super-resolution code AND weight licenses; isolate workers, bounded queues, authentic comparison UI, missing-worker 503 states. Never promote untested AI outputs or substitute interpolation.
7. Video: BullMQ queue + isolated FFmpeg worker; fixed presets and argument arrays, probing, progress, cancel, TTL cleanup, resource limits and valid downloaded output. Runtime and license acceptance required before enabling.
8. Deployment/SEO: real Postgres/Redis, shared quotas, legal/operator identity, actual Lighthouse measurements, full internal-link monitoring and reviewed release.

Do not install whole upstream apps merely to reuse small compatible functions. Record copied/adapted code in reusable-code.md and THIRD_PARTY_NOTICES.md with upstream source identity. No automatically generated fake reports or progress.

## Dashboard / direct-media phase

Implemented: general JPEG/PNG/WebP converter with AVIF output; lossless WebP; explicit metadata retention; resize presets; separate batch results; responsive workspace, mobile dock and global search. The authorized direct-file downloader now handles JPEG/PNG/WebP/MP4/WebM signatures through the existing DNS-pinned bounded fetcher. It does not parse social post pages, transcode, or obtain likes/views. Registry counts: 13 available, one quota-dependent PSI integration, five planned tools. Evidence and upstream comparisons: `docs/research-refresh.md`.

Next gates remain licensed isolated AI workers, isolated FFmpeg queue/persistence, approved official metadata access, richer SEO/site crawling, deployment/proxy limits and real public-origin SEO verification. Keep these separate from the completed, testable utilities. Reusing an upstream GUI/scraper is not a substitute for hosted worker security or provider permission.

## Compact converter / SEO API phase

Six single-frame formats are implemented via the native Sharp build: JPEG, PNG, WebP, AVIF, GIF and TIFF, including all 36 direction tests. Do not advertise HEIC/RAW/PSD/EPS/PDF/vector/animation/multipage operations. Compact toolbar/batch/canvas precede optional settings. Pexels API search is configured by server key; Unsplash sample is a real local licensed asset. Semrush v4 keyword metrics are implemented/fixture-tested but configuration-gated pending a live response. Canonical HTTP Link extraction from MIT OpenSEO is integrated into existing audits. House-ad slots are implemented; actual AdSense publisher/units/CMP/CSP/site approval remain release gates. Counts: 20 tools, 13 available, two configuration-dependent, five planned. Existing AI/video/provider metadata/whole-site crawl gates remain.

## Infrastructure, AI and video verification phase

Gates 6 and 7 above (AI and video) are now implemented and independently verified end to end, not just scaffolded: real Postgres/Redis/BullMQ, the production worker, real FFmpeg under `prlimit`, and real ONNX inference (MODNet background removal, Swin2SR lightweight 2x upscaling — both Apache-2.0, confirmed via `third_party/modnet/LICENSE` and `third_party/swin2sr/LICENSE`) all ran for real through the actual `/api/jobs` HTTP API and a live Chromium browser session. `background-remover`, `ai-image-upscaler`, `video-compressor` and `video-converter` moved from `planned` to `requires-configuration` in the registry. A stale model weight (wrong revision, wrong size/hash) was caught by the existing integrity check and corrected by re-running `scripts/backend/fetch-models.py`. A real cold-start Redis race in `packages/jobs/runtime.ts` was found and fixed, with a regression test added. Full detail, reproduction steps, and the remaining "gate 8" deployment items (real Docker/Podman provisioning from a non-sandboxed shell, distributed quotas, reverse proxy, legal/operator identity, Lighthouse) are in `docs/progress.md`, which is now the authoritative current-status document.

## Vercel storage preparation

Implemented the direct object-storage control/data split, private result downloads and storage-backed worker staging, plus truthful 4 MiB inline limits and production SEO/rate response fixes. See `docs/production-hardening.md`. Both production job flags remain false. Real bucket/worker/migration/connectivity acceptance is required before enabling; SDK/unit/browser fixtures alone do not satisfy that gate. No rebuilding of existing codecs or frontend architecture.
