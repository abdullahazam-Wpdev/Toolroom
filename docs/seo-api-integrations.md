# SEO audit API integrations — status, 25 October 2026

Full technical detail and reproduction steps for each item below are in `docs/api-research.md` and `docs/progress.md`; this file is the SEO-audit-specific summary the implementation plan asked for.

## Google PageSpeed Insights — live and working

Integrated via `apps/web/src/lib/pagespeed.ts` (unchanged this phase). The operator's API key is configured in `apps/web/.env.local` and was verified live this session: real Lighthouse lab scores and real Chrome UX Report (CrUX) field percentiles returned for both mobile and desktop strategies against a real URL, through the actual `/api/pagespeed` route — not a fixture. Caching: none server-side yet beyond the client's own request cadence; the route has a process-local concurrency cap (see `apps/web/src/app/api/pagespeed/route.ts`). Lab vs. field data are kept as clearly separate fields in the response and labeled as such; TBT is never presented as INP. `pagespeed-checker` stays `requires-configuration` in the tool registry because every *other* deployment still needs its own key — this specific running instance has one.

## Semrush v4 — configured but not working (wrong credential type)

The operator's Semrush adapter (`apps/web/src/lib/semrush.ts`) already enforces unit-cost confirmation, same-day caching, and a conservative daily unit budget before any request is sent — this was true before this phase and is unchanged. The operator-supplied token (`semrtkn-pat-...`) does not match either documented Semrush v4 credential format (`Authorization: Apikey <key>` or OAuth2 `Authorization: Bearer <token>`); a single real test call returned HTTP 403 and was not billed. Full diagnosis and the fix (generate an actual API key from the account's API Keys page, not a Personal Access Token) are in `docs/progress.md`. Not used in the audit engine itself — Semrush is keyword/competitor research, not part of `auditSite`/`analyzeHtml`.

## Google Search Console — not implemented

No OAuth client is registered, no consent flow exists, and none was built this phase, consistent with the instruction to continue only with functionality that needs no additional credentials. Implementing this for real means: registering an OAuth 2.0 client in Google Cloud Console, implementing the authorization-code flow (or a device flow) with property-ownership verification, storing refresh tokens per operator (not per visitor), and calling the Search Console API (`searchanalytics.query`, `sitemaps.list`, `urlInspection.index.inspect`) only for properties that specific OAuth grant actually covers — never surfacing one site's Search Console data for a different public URL someone types in. This is a credentials/consent decision for the operator, not something to scaffold speculatively ahead of that decision.

## WordPress / Shopify authenticated read-only integrations — not implemented

Same reasoning as Search Console: these need the operator to issue scoped, revocable credentials (a WordPress Application Password or a Shopify custom-app access token) before any authenticated call can be made. Unauthenticated platform *identification* (not authenticated data) is implemented — see `docs/seo-platform-specific-rules.md`.
