# Production hardening — 25 October 2026

## Verified production findings and configuration

The live public origin is https://toolroom-woad.vercel.app . The branch and immutable deployment aliases supplied by the operator are not alternate canonical origins. `artifacts/production/live-before.json` records HTTP 200 pages whose canonical/OG/schema URLs used localhost, public pages were noindex, robots.txt disallowed `/`, and sitemap URLs used localhost.

Vercel production configuration now has `NEXT_PUBLIC_SITE_URL=https://toolroom-woad.vercel.app` (Config), and acknowledged updates of `MEDIA_JOBS_ENABLED=false` and `CRAWL_JOBS_ENABLED=false` (Secrets). The canonical Config was pulled back and its value verified. The flags remain redacted on export; the CLI acknowledged writing the explicit false values. Configuration changes do not change an existing deployment's built metadata: **redeployment is required**. Code changes in this phase have not been published.

The initial `vercel env pull .env.production.local --environment=production` completed, but the CLI explicitly replaced six sensitive values with `[SENSITIVE]`. The file is ignored and mode 0600. The requested read-only `prisma migrate status` failed locally with P1012 because the exported DATABASE_URL is a placeholder. This is **not evidence that the actual production database URL is invalid**. An initial interpretation suggesting invalid production URLs was corrected once the pull log was inspected. No production database write, `db push`, migration deployment or destructive command was run.

Vercel lists PostgreSQL/Prisma/Redis credentials, PageSpeed and Pexels keys. Values were not printed, copied into documentation or tested through paid calls. Actual PostgreSQL connectivity, migrations and Redis connectivity remain unverified. `artifacts/production/database-check.json` explicitly records the placeholder blocker.

## SEO and response behavior

- One normalized trusted origin drives metadataBase, explicit absolute canonical and OG URLs, sitemap, robots and schema. Production rejects a configured localhost/non-HTTPS origin. If the known Vercel production deployment lacks configuration, its explicit public origin is the fallback; self-hosted local development still defaults to localhost/noindex.
- Available public tools index on production; configuration-dependent tools and utility/unfinished information pages retain their intentional noindex behavior. API responses have `X-Robots-Tag: noindex, nofollow`.
- UI request origins allow the canonical origin, Vercel-provided deployment/branch hosts and exact operator-supplied `APP_ALLOWED_ORIGINS`. Canonicals never derive from user-controlled Host headers.
- Typed local quota errors return 429 with the remaining window in `Retry-After`, rather than each route converting them into 400/502. Explicit busy and queue-limit responses now also have retry hints. Existing process-local limiters remain process-local: this change does not claim a distributed quota system for every existing utility. New storage admission/byte budgets use Redis.

## Inline image limits

[Vercel documents a 4.5 MB function request/response limit](https://vercel.com/docs/functions/limitations). An application body parser setting cannot raise the ingress limit. This app now uses **4 MiB per image** for inline Vercel uploads, leaving room for bounded multipart metadata. The actual stream and declared Content-Length are checked. Encoded inline outputs exceeding 4 MiB return 413 with a useful alternative rather than failing at Vercel's response boundary. Self-hosted inline conversion retains the 10 MiB engine limit. The UI, tool descriptions and guides reflect the host's actual capability. Direct media response downloads on Vercel are likewise capped/labeled 4 MiB.

With private storage and Redis configured, the converter uses the direct-storage path and advertises 10 MiB. No bucket is configured yet; this larger production path is prepared and fixture-tested, not live-verified.

## Private S3/R2 flow

1. Browser computes SHA-256 and posts a small JSON intent to `/api/uploads` (purpose, exact bytes, allowlisted MIME, digest). Images: 10 MiB; video: 32 MiB. Origin/body validation, 12 signing requests/minute, shared Redis admission, and a conservative 256 MiB/hour global reservation budget apply. Failed/unused reservations are not refunded.
2. Server issues a random scoped object key, 5-minute SigV4 PUT and HMAC authorization ticket. Content-Type and exact Content-Length are signed. The browser supplies Content-Length from the File; it must not try to set the forbidden header manually. The bucket remains private. Credentials never reach the browser.
3. Browser PUTs directly to storage with real XHR byte progress, then submits only the ticket/options. The 15-minute ticket binds purpose, MIME, bytes, SHA-256, ID and expiry. Redis NX consumes the processing capability once; a replay cannot enqueue/process the same intent again.
4. The image function verifies object HEAD size/type, fetches with If-Match on the inspected ETag, bounds actual bytes and verifies SHA-256. Shared Sharp validation checks real signatures, selected tool/MIME, decode limits and single-frame restrictions. No arbitrary object URL/key is accepted from the user. R2's unsupported full-object SHA-256 checksum mode is not assumed: validation uses the actual downloaded bytes.
5. Encoded output goes to a private result object. The response contains only a 5-minute signed download URL and dimensions/size. Browser downloads bytes directly from storage into its existing preview/download experience. Downloads specify attachment, never executable inline HTML.
6. Validated inputs are deleted after image processing. Worker cancellation/failure/expiry deletes input/output objects. The sweeper targets objects older than one hour with bounded listing/deletion and deadlines. `/api/storage/cleanup` requires a ≥32-character `CRON_SECRET` bearer value. The worker also runs cleanup. A separately configured frequent scheduler is required when the worker is absent; **this phase did not create a scheduler**. `infra/storage/lifecycle.json` is a one-day orphan backstop, not an exact one-hour guarantee.

Presigned PUTs are reusable until their five-minute expiry, as documented by [Cloudflare](https://developers.cloudflare.com/r2/api/s3/presigned-urls/). A client can recreate its own deleted upload during that window; it still cannot process it again and the sweeper/lifecycle removes it later. Signed result URLs also remain usable until expiry after issuance; they are bearer capabilities, not instantaneous-revocation links. Never log/share signed URLs or tickets. CORS is not authorization. The sample CORS document allows only the production origin; add explicit verified aliases when needed, never a wildcard. Include GET/HEAD as well as PUT because result bytes are fetched by the browser. Endpoint CSP is generated at build time: configure storage before redeploying.

## Worker/storage preparation

MediaJob has an additive migration adding storageBackend/inputSha256/inputMime, defaulting existing jobs to `local`. No production migration was applied. `/api/jobs` accepts a ticket-only JSON submission for storage-backed jobs; Vercel rejects the local multipart/filesystem path. Queue submission additionally requires a fresh storage-worker Redis heartbeat. The worker downloads/verifies a private input into its isolated scratch directory, performs the existing genuine ONNX/FFmpeg job, uploads the output, deletes scratch/input data and preserves existing progress/cancellation limits. Job download authorization returns a short-lived storage URL; job status does not expose raw object keys or credentials.

`MEDIA_JOBS_ENABLED=false` remains mandatory until the real worker, migration, shared bucket, limits and output/download tests pass together. Worker startup must use a writable absolute scratch JOB_STORAGE_DIR. Vercel's `/tmp` is scratch, never shared durable storage. Worker Dockerfile now includes shared storage/core/crawl imports and performs Prisma generation before pruning build dependencies. This image has not been rebuilt/deployed in this phase.

Background crawls are separately gated by `CRAWL_JOBS_ENABLED`. They need actual Postgres/Redis, current AuditJob migrations and a long-lived crawl worker heartbeat on Vercel. 100/500/1000-page crawls cannot run inside a short HTTP request. Small synchronous crawls retain their existing bounded deadline; this phase does not add JavaScript-rendered crawling or assert all hosting-plan duration limits are accepted. Large persisted report downloads still need response-size acceptance before enabling background crawling on Vercel.

## Operator configuration and release

Set these privately in the relevant environments (do not paste values into chat):

- `NEXT_PUBLIC_SITE_URL=https://toolroom-woad.vercel.app` at build and runtime (already set in production).
- Real PostgreSQL `DATABASE_URL`, Redis `REDIS_URL` (TLS where supported); Vercel exports their sensitive values as placeholders.
- `S3_ENDPOINT` (HTTPS S3 API endpoint), `S3_REGION` (`auto` for R2), `S3_BUCKET`, bucket-scoped `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`; this adapter uses path-style addressing. Start with a dedicated private bucket and least-privilege object read/write/delete/list permissions restricted to `toolroom/` where supported.
- Independent random ≥32-character `UPLOAD_SIGNING_SECRET`, `CRON_SECRET`, and `OPERATOR_HEALTH_SECRET`. No `NEXT_PUBLIC_` prefix on secrets.
- Explicit CORS and bucket lifecycle (`infra/storage/` samples); a frequent authenticated cleanup scheduler and monitoring. Convert sample wrappers as required by the provider's dashboard/CLI schema.
- Job flags remain false until acceptance. No paid storage account or resources were provisioned here.

Run read-only checks inside a trusted environment holding real credentials:

```sh
node --env-file=/private/path/real-production.env scripts/backend/check-production.ts
npx prisma migrate status --schema infra/schema.prisma
```

The script issues SELECTs/PING only, compares migration names and suppresses connection/error details. Alternatively deploy `/api/internal/health` with `OPERATOR_HEALTH_SECRET` and call it from a trusted operator client; it returns only sanitized database/Redis/migration state and rejects unauthenticated requests. Remove/rotate the operator secret when no longer needed.

Review the additive migration and apply through the normal release process **only after** authenticated status/connectivity review. Do not run `db push` on production. Deploy the frontend with both job flags false; verify live public canonicals, robots/sitemap, image conversion, storage-disabled states and rate responses. A separate worker/storage acceptance release follows later. Existing immutable Vercel deployment URLs retain their old built metadata even after a newer deployment is promoted.

## Verification and limits

- 116 unit/service tests passed; one real Redis regression test skipped because this verification run has no actual Redis URL. Includes real codec, SSRF/security/export regressions and new signature/header/expiry/tamper/hash/size/cleanup/429/origin checks.
- Production-like build and TypeScript passed. Both previous dynamic-filesystem tracing warnings disappeared after the job scratch fallback stopped resolving an arbitrary working directory. Vitest's native-config warning was fixed by using `.mts`; parallel test workers capped at two. npm's existing unknown global `tmp` configuration warning and Playwright's color-environment warning are environment warnings, not hidden build failures.
- 28 production-like browser tests passed; three infrastructure-dependent tests intentionally skipped. Real local Sharp conversion/ZIP/export paths and new production metadata, 4 MiB rejection, disabled jobs, private-route authentication and 429 behaviors passed.
- One additional browser test passed: a **5 MiB** PNG uploaded through mocked object-storage endpoints, then downloaded/decoded a real WebP fixture. This verifies the browser's large-file orchestration and bytes; it does not verify a real bucket's signature enforcement, CORS, lifecycle, credentials or worker.
- Actual Vercel live endpoints and aliases were checked separately (`artifacts/production/`). They remain the previously deployed code until redeployed. No claim that these local changes are already live, that R2/S3 ran, or that production database/worker/Lighthouse/security acceptance passed.

## Requested command rerun

Re-fetched the Vercel onboarding guide and verified existing CLI/plugin/MCP configuration. Explicit `vercel link --project toolroom --team <existing-team> --yes` succeeded against the existing project; CLI warned that `--team` is deprecated in favor of `--scope`. Linking refreshed the ignored root `.env.local` OIDC token; its contents were not displayed and permissions were restricted to 0600. Both explicitly requested `npx prisma migrate status --schema infra/schema.prisma` invocations ran after sourcing `.env.production.local` in Bash. Both exited 1 with P1012. The supplied Python check returned “Missing, incomplete, or placeholder”; an additional boolean confirmed the export is `[SENSITIVE]`. No database write occurred. The fresh `vercel login` device flow completed successfully and reported “You are now signed in.” MCP tools still need client reload; the current tool catalog contains no Vercel tools.
