# Phase 3 — JavaScript-rendered SEO auditing (26 October 2026)

## What this is

A new, optional SEO audit mode that compares a page's raw server HTML
against what a real, sandboxed Chromium browser renders after running the
page's JavaScript. It surfaces: metadata/canonical/heading/structured-data
changes after rendering, content only visible post-render, blocked or
failed subresource requests, and rendering timeouts/crashes — using the
same `Check`/severity shape as the existing static audit, so results show
up in the same dashboard language ("pass" / "warning" / "critical" /
"not-tested").

It is a fully separate, independently-gated capability from the existing
background-crawl and media jobs. It is **disabled in production** and stays
that way until an operator deploys a real external worker (see "Activating
this in production" below).

## Architecture

- `packages/jobs/rendered-audit.ts` — the engine. `renderedAudit(url)`
  fetches the raw HTML with `safeFetch`, launches a sandboxed Chromium
  (`playwright-core`, no `--no-sandbox`), renders the page, and compares
  both HTML documents through the existing `analyzeHtml()` from
  `apps/web/src/lib/audit.ts` — the same function the static audit already
  uses. Reusing it means every existing static check (title, canonical,
  headings, structured data, content-character fingerprint...) already
  runs against the rendered output, with zero duplicated logic, and the two
  reports are structurally identical and directly comparable.
- A new `RenderedAuditJob` Prisma model and BullMQ queue
  (`toolroom-rendered-audit-v1`), mirroring the existing `AuditJob`/crawl
  job pattern: the web app only enqueues and polls; `scripts/backend/worker.ts`
  is the only process that ever launches Chromium.
- `POST /api/rendered-audits` and `GET/DELETE /api/rendered-audits/[id]`,
  mirroring the crawl-job routes' auth/rate-limit/expiry shape.
- `RenderedAuditTool` (`apps/web/src/components/rendered-audit-tool.tsx`),
  wired into the website SEO checker tool page. Reuses the exact
  `findings-controls`/`severity-chip`/`audit-check` CSS classes the static
  audit's findings tab already uses, so the search box, severity filters
  and check list look and behave identically, plus a JSON report download.

## Why this never runs inside a Vercel Function

A real Chromium process cannot run inside a short-lived serverless
function, and would be a meaningful attack surface if it could. So:

1. `rendered-audit.ts` is only ever imported by `scripts/backend/worker.ts`
   — no file under `apps/web/src` imports it, directly or transitively.
   Confirmed after `npm run build`: grepping the compiled
   `.next/server/app/api/rendered-audits` output and its chunk files for
   `playwright`/`chromium` finds nothing.
2. `RENDERED_AUDIT_ENABLED` is a dedicated flag, checked by the API route,
   with **no local-dev convenience fallback** (stricter than
   `MEDIA_JOBS_ENABLED`/`CRAWL_JOBS_ENABLED`, since this is the heaviest
   capability). It must be explicitly set even for local testing.
3. When `VERCEL === '1'`, the POST route additionally refuses to enqueue
   unless a real worker heartbeat key (`toolroom:rendered-audit-worker`,
   refreshed every 10s, expiring after 45s) is present in Redis — so even
   an accidental flag flip on Vercel does not accept jobs nothing will ever
   process.

## Security (SSRF, sandbox, resource limits)

- **Server-side fetch of the raw HTML** uses the existing `safeFetch`/
  `publicUrl` (DNS resolution + public/private address classification),
  identical to every other URL-accepting tool in this codebase.
- **Browser-side SSRF**: a real browser engine makes its own DNS/network
  decisions, so the server-side guard alone is not enough once Chromium is
  navigating. `context.route('**/*', ...)` intercepts *every* request the
  page itself makes — top-level navigation, redirects, `fetch()`, images,
  iframes, everything — resolves its hostname, and aborts anything that
  resolves to a private/reserved address or isn't `http(s)`. Verified live:
  a literal private IP (`169.254.169.254`) is blocked while legitimate
  public navigation proceeds normally.
- **Browser sandbox**: Chromium's own OS-level sandbox is verified working
  in this environment and is kept enabled (`chromium.launch({headless:true})`,
  deliberately no `--no-sandbox`) — disabling it would be a real regression
  against sandbox-escape bugs in the renderer, not a convenience worth
  taking.
- **Resource limits**: a 15s navigation timeout, a 10s raw-fetch timeout, a
  2 MiB raw-HTML cap, `concurrency: 1` on the BullMQ worker (so only one
  Chromium instance ever runs at a time), and the browser is always closed
  in a `finally` block — including on crash/error — so there is no leaked
  browser process path.
- A rendering failure, timeout or crash is reported as a `"not-tested"` (or
  an explicit `navigationTimedOut`/`renderError` field), never silently
  turned into a fabricated pass/fail.

## Verification performed (this session, locally)

- Direct execution of `renderedAudit()` against `https://example.com`
  produced 8 real findings. One ("rendered-content-visibility": warning,
  "+749 characters") was investigated rather than assumed accurate: the raw
  HTML has a genuine `<script src=/s.js>` tag, and directly inspecting
  `document.body.innerText` post-render in Playwright confirmed that script
  really does inject five additional language translations and a "Learn
  more" link invisible without JavaScript. The finding is real, not
  fabricated noise.
- SSRF rejection verified live end-to-end through the real API: a POST with
  a private-network target returns HTTP 400 before any job is queued.
- A new synchronous-validation unit test
  (`tests/rendered-audit.test.ts`) covers private-network and malformed-URL
  rejection without needing a browser or network access.
- A new Playwright e2e test (`tests/e2e/workspace.spec.ts`, gated by
  `test.skip(process.env.RENDERED_AUDIT_ENABLED !== 'true', ...)`, matching
  the existing `MEDIA_JOBS_ENABLED`-gated tests' pattern) drives the real UI
  against the real local worker: submits a comparison for
  `https://example.com`, waits for `completed`, confirms the download
  button and the findings search/filter actually narrow the results.
  Passed locally with the real worker running.
- Full suite passed together: 138 unit tests (1 pre-existing skip), 42 e2e
  tests passed with 5 correctly skipped (3 pre-existing media/crawl tests
  plus this phase's own test, gated the same way), `tsc --noEmit`, and
  `next build` all clean. Confirmed via the real standalone production
  server (`node .next/standalone/apps/web/server.js`) with
  `RENDERED_AUDIT_ENABLED=false` that the UI panel renders normally but a
  submission returns a clean 503 ("JavaScript-rendered auditing is not
  enabled on this installation") rather than fabricating a result — this is
  exactly the behavior production will show until a worker is deployed.
- Fixed a real bug found during this verification: the route's catch block
  only matched a hand-written regex against `error.message`, which does not
  match Zod's `ZodError.message` (a JSON array of issue objects), so a
  malformed URL returned a misleading "service unavailable" 503 instead of
  a validation error. Fixed by checking `error instanceof z.ZodError` first
  and returning a clean 400. The same latent pattern likely exists in the
  older `crawl-jobs/route.ts` this route was modeled on; that file was not
  touched, since it was out of scope for this change.

## Also improved: a new static check (no new infrastructure)

Added `canonical-self-reference` to the existing static audit
(`apps/web/src/lib/audit.ts`): when a canonical is declared, checks whether
it actually points back at the page being audited (ignoring trailing slash
and fragment). A canonical that quietly points somewhere else — a stale
template default, or everything canonicalized to the homepage — is a real,
common, self-inflicted deindexing cause that the existing checks (which
only compared the HTML canonical against the HTTP `Link` header canonical,
not against the page's own URL) did not catch. `"not-tested"` when no
canonical is declared at all, since that case is already its own check.
Covered by three new unit-test cases (self-referencing, mismatched, absent)
in `tests/audit.test.ts`.

## Database

`RenderedAuditJob` was added to `infra/schema.prisma` and a matching
migration generated (`infra/migrations/20261026040000_rendered_audit_jobs`).
Verified with `prisma migrate deploy` against a disposable scratch
database (all four migrations applied cleanly in order) and separately
applied to this sandbox's own local, non-production Postgres via `db push`
(reported "already in sync" against the generated migration). **Not
applied to the production database** — that requires explicit operator
approval and is a step that happens only when a real worker is actually
being deployed, not before.

## Activating this in production

Nothing above runs on Vercel today. To actually turn this on for real
users, an operator needs to, in order:

1. Apply the `20261026040000_rendered_audit_jobs` migration to the
   production database (`prisma migrate deploy`), after reviewing it —
   it is purely additive (one new table, no changes to existing tables).
2. Deploy `scripts/backend/worker.ts` to a **persistent host** (a small VM
   or long-running container — not a Vercel Function), with Chromium
   actually installed. `workers/Dockerfile` does not yet have a
   `playwright install --with-deps chromium` step; that needs adding
   before building an image for this.
3. Point that worker at the same production `DATABASE_URL`/`REDIS_URL`
   Vercel uses, so its heartbeat key and job rows are visible to the API.
4. Only then set `RENDERED_AUDIT_ENABLED=true` in the Vercel project's
   environment variables. Until that heartbeat key exists, the API refuses
   jobs even if this flag is mistakenly set, per the defense-in-depth
   check described above.

Until all four steps are done, the feature stays visible but honestly
reports itself unavailable in production — which is the intended behavior,
not a bug to "fix" by relaxing the gate.
