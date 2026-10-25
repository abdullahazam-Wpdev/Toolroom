# Deployment requirements — SEO audit engine, 25 October 2026

## Vercel deployment — verified findings, 25 October 2026

Full environment variable table and reasoning given directly to the operator; summary here for future sessions.

- **Prisma Client generation was never automatic anywhere in this repo** — verified empirically: `npx prisma generate` with no `--schema` argument fails outright because `infra/schema.prisma` isn't at a default-discoverable location. Fixed with a `postinstall` script in `apps/web/package.json` (`prisma generate --schema ../../infra/schema.prisma`), verified against a real clean `npm ci`. This was a real latent gap affecting any fresh install, not just Vercel.
- **Media jobs (AI background removal/upscaling, video compress/convert) cannot run in a split Vercel(web)+externally-hosted(worker) topology.** Verified by reading the actual code: `/api/jobs` writes the uploaded file to `JOB_STORAGE_DIR/<id>/input` on local disk; the worker (`packages/jobs/process.ts`) reads/writes that same local path; `/api/jobs/[id]?download=1` reads the output from the same local path. Vercel serverless functions have no shared, persistent filesystem with an external process. This is an architectural limit, not an env-var misconfiguration — fixing it for real would mean switching job input/output to object storage (S3/R2) instead of local disk, which was not done this session.
- **Background crawl jobs (100/500/1000-page tiers) have no such limit** — verified by reading `packages/jobs/crawl-process.ts`: job state and the final report live entirely in Postgres (`AuditJob.report Json?`), no local file I/O. A split Vercel(web)+externally-hosted(worker) topology works for this feature, provided both can reach the same Postgres/Redis over the network.
- **Root Directory should be `apps/web`**, not the repo root, for Vercel's Next.js framework detection to find `apps/web/.next` automatically. Vercel's documented monorepo behavior still runs install from the workspace root when it detects the `workspaces` field, so sibling `packages/`/`infra/` stay reachable for the relative imports those files use — confirm "Include files outside of the Root Directory" is enabled if the build can't resolve `packages/jobs` or `packages/core`.
- **The synchronous quick/full-website SEO audit route budgets up to 60 seconds** (`apps/web/src/lib/site-audit.ts`), which exceeds Vercel's default serverless function timeout on most plans. Either lower that budget for a Vercel deployment specifically, or set `export const maxDuration = 60` in `apps/web/src/app/api/site-audits/route.ts` (capped by the Vercel plan's actual ceiling) — not changed this session, flagged for the operator's decision.

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
