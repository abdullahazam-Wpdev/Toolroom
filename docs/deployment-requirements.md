# Deployment requirements — SEO audit engine, 25 October 2026

This covers what the multi-platform SEO audit upgrade specifically needs. For the platform's overall deployment requirements (Postgres, Redis, worker, model weights, reverse proxy), see `docs/progress.md` and `docs/architecture.md` — nothing below replaces those.

## What the current audit modes need (both already deployable with zero extra infrastructure)

- **Quick URL Audit** and **Full Website Audit**: run entirely inside the existing Next.js Node runtime, in-request. No queue, no worker, no database. The same `safeFetch` SSRF boundary, request/time budgets and process-local concurrency guard already used elsewhere in the platform apply. A full-website crawl is bounded to 25 pages / 80 requests / 60 seconds server-side regardless of what a caller asks for.
- **Resource profile**: bounded by network I/O (sequential fetches, not parallel-fanned) and by Sharp image decoding for the image-measurement step (already memory-bounded elsewhere in the codebase). No GPU, no browser, no extra RAM budget beyond what the existing Next.js process already needs.

## What a future Advanced Rendered Audit (Playwright/Chromium) would need

Not implemented yet (see `docs/seo-audit-architecture.md`). When built, it should follow the same isolated-worker pattern already proven for FFmpeg and ONNX jobs in this codebase (`packages/jobs/`, `workers/Dockerfile`), not run inside the request handler:

- A real Postgres + Redis + BullMQ worker deployment (already required for the AI/video tools; this would be one more job kind on the same infrastructure, not new infrastructure).
- Chromium, installed and sandboxed in the worker container only (`workers/Dockerfile` already installs system packages for FFmpeg/Python; a browser binary would be added there, not to the web container).
- Per-job resource limits matching the existing `prlimit`-wrapped pattern in `packages/jobs/process.ts`: memory cap, CPU time cap, wall-clock timeout, and a hard page-count/concurrency limit so one rendered audit can't exhaust the worker.
- Output is a comparison report (server HTML vs. rendered DOM), not a video/image file, so no new storage format — the existing `MediaJob`-style job/polling/TTL pattern applies directly.

## What Google Search Console / WordPress / Shopify authenticated integrations would need

Covered in `docs/seo-api-integrations.md`: OAuth client registration (Search Console) or a scoped application credential (WordPress/Shopify), operator-side storage of refresh tokens separate from any per-visitor state, and explicit property-ownership verification before ever returning authenticated data for a URL. No server infrastructure beyond what already exists; this is a credentials/consent gate, not a capacity one.

## Current real test evidence for the audit engine itself

See `docs/testing-results.md` for the dated entry: unit tests cover sitemap seeding (including orphaned pages not linked from the homepage), missing/unparsable sitemap handling, and platform detection (WordPress positive, blank-page negative) against injected fixtures; a live run against `wordpress.org/news/` and against `example.com` (as a true negative) is recorded in `docs/progress.md` with the actual evidence captured.
