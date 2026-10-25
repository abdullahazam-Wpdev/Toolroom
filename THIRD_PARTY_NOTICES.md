# Third-party notices and provenance

## Avvio Agency website-speed-test

Adapted category and opportunity extraction from `app/api/audit/route.ts` in https://github.com/avvio-agency/website-speed-test. Upstream archive identity is recorded in `docs/research/repositories.json`; reviewed 25 October 2026. Copyright (c) 2026 Avvio Agency. MIT license reproduced in [third_party/avvio-speed-test/LICENSE](third_party/avvio-speed-test/LICENSE).

Adapted implementation: `apps/web/src/lib/pagespeed.ts`. Changes include typed normalization, null missing metrics/scores, desktop support, explicit lab/field separation, bounded responses, official fixed endpoint and friendly quota errors. Upstream UI, staged loader and forwarded-IP rate limiter were not copied.

## SEONaut

Heading-hierarchy rule adapted from `internal/issues/page/headings.go` in https://github.com/stjudewashere/seonaut. Copyright holder and full MIT terms retained in [third_party/seonaut/LICENSE](third_party/seonaut/LICENSE). Source identity is recorded in the repository ledger.

Adapted implementation: `apps/web/src/lib/audit.ts`. TypeScript/Cheerio inventory and rule evaluation use independently written report/scoring logic. Differences include coverage statuses, explicit multiple-H1 caveat and distinguishing missing alt from intentional decorative alternatives. The Go application, MySQL layer and crawl UI were not copied.

## Dependencies

Sharp/libvips, Cheerio, ipaddr.js, pdf-lib, fast-xml-parser, Next.js, React, Radix and other packages are consumed through npm rather than vendored copies. Their license declarations are tracked in docs/dependencies.md and their full distributed licenses remain in the installed packages. Native and transitive distribution obligations still require release review.

## Workflow instructions

The original Toolroom Codex skill and AGENTS.md were informed by the reviewed MIT Jeffallan and AgriciDaniel workflow references, but do not copy their skill bodies, hooks or command wrappers. Anthropic's frontend-design skill and SNLabat's site-linked skill were reviewed but not copied/installed because their distribution permission was not established for this use. No proprietary competitor assets, source code or private APIs are included. No model weights are included.

## Operator tooling added in the research refresh

[REA](https://github.com/morluto/rea), `rea-agents@6.7.0`, MIT (Copyright 2026 morluto), is installed/run as research tooling and is not shipped in the public application bundle. Its license remains in the npm package. [token-efficiency](https://github.com/undefdev/token-efficiency), commit `8dc98e1c70ebe395c31b2a16c9376ca7e4071ba7`, MIT (Copyright 2026 Tarek Sabet), is installed as a native Codex skill with its full license in that installed folder. No upstream session hooks are included in this application. Source pins/review boundaries: `docs/research-refresh.md`.

Live direct-download smoke fixtures came from [mathiasbynens/small](https://github.com/mathiasbynens/small), whose README waives copyright and related rights to the extent possible under law. Fixture files are test evidence, not website sample assets or implementation code. The minimal MP4 has no frame stream; it verifies original-byte delivery and container recognition, not playback.

## OpenSEO HTTP canonical extraction

Adapted `parseLinkHeaderCanonical` from [every-app/open-seo](https://github.com/every-app/open-seo), `src/server/workflows/site-audit-workflow-helpers.ts`, reviewed commit `0ca244b0dffef46820faa3fdcac21d7f9f76c088`. Copyright (c) 2026 Ben Senescu, MIT. Full license: `third_party/open-seo/LICENSE`; source SHA-256 and adaptation path: `third_party/provenance.json`. The adaptation preserves commas in URLs, supports relation lists and restricts extracted targets to HTTP(S) without credentials. The upstream application is not bundled.

## Unsplash sample photograph

Mountain lake by [Brittany Martin / Unsplash](https://unsplash.com/photos/a-lake-surrounded-by-mountains-and-trees-cpXJYdJSNeM), used under the [Unsplash License](https://unsplash.com/license), locally served as `apps/web/public/samples/unsplash-lake.jpg` for an actual conversion example. Attribution/source/download digest retained in `docs/research/photo-provenance.json`. No endorsement implied. Pexels API results display provider and photographer links and retain their own [license](https://www.pexels.com/license/).
