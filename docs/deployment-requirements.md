## Browser-local tools milestone — 26 October 2026

Five PDF and six developer utilities require no API key, production migration, Redis or worker. Next serves the worker chunk from the same origin under the existing CSP; JavaScript/Web Workers and enough local browser memory are required. Keep media/crawl jobs disabled. No Colab/GPU code is included in the web dependency tree. Preserve private object-storage and database acceptance gates for later server jobs.

## SEO milestone deployment

This milestone needs no database migration or new credential. Keep media/crawl background jobs disabled. The synchronous crawl route declares maxDuration=60 with a 45-second engine budget on Vercel; verify plan support and runtime behavior. Browser-rendered auditing still needs an isolated sandboxed worker. Database connectivity remains unverified until the operator runs the hidden-input helper against the confirmed Prisma resource.

# Deployment requirements — SEO audit engine, 25 October 2026

## Migration history was stale — found and fixed, 25 October 2026

Earlier this session the `AuditJob` model gained six new columns (`tokenHash`, `maxPages`, `pagesCrawled`, `pagesDiscovered`, `cancelRequested`, `error`) and a new index when the background crawl-job feature was built, applied to this sandbox's database with `prisma db push` — which syncs the schema directly and does **not** update tracked migration files. The one tracked migration (`20261025090000_initial`) still only created the original six-column shape. Anyone running `prisma migrate deploy` against a fresh database (exactly what a new Prisma Postgres/Vercel setup needs) would get a table missing those columns, and the crawl-job API would fail the first time it tried to write a row.

Found by diffing the tracked migrations against the current schema (`prisma migrate diff --from-migrations infra/migrations --to-schema-datamodel infra/schema.prisma`), which was not empty. Generated the missing migration (`infra/migrations/20261025115327_add_crawl_job_fields/`), then re-ran the same diff and confirmed it came back empty — the migration history now exactly reproduces the current schema. Verified end to end against a genuinely fresh database (not this session's already-migrated one): created a scratch Postgres database on the same server, ran `prisma migrate deploy` against it, introspected the result to confirm every column was present, created and deleted a real row through the actual Prisma client, then dropped the scratch database. `prisma migrate deploy` is safe to run on a brand-new database now.

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

Phase 1 production acceptance: 5853d35 reached Ready and all 15 live browser checks passed. No new environment keys/migrations required. Browser PDF engine loads on demand; processing has a 30-second deadline, and the acceptance wait allows 35 seconds to observe completion/error. Preserve the current worker-disabled configuration.
