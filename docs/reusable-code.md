# Reuse and integration ledger

See THIRD_PARTY_NOTICES.md for copied/adapted code licenses. Archive digests and exact upstream paths are in github-research.md and research/repositories.json.

| Source                                         | Reused or adapted                                                                           | Project location                                        | Status / validation                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Sharp/libvips                                  | Existing maintained decode/encode/resize/compression implementation; no new low-level codec | src/lib/image.ts, API images                            | Implemented; real output tests for JPEG/WebP/PNG, transparency and dimensions                                      |
| Avvio website-speed-test (MIT)                 | Category selection and opportunity extraction                                               | apps/web/src/lib/pagespeed.ts                           | Adapted with notice; unit fixtures and live quota response tested; live successful Google metrics not yet obtained |
| SEONaut (MIT)                                  | Skipped-heading-level rule                                                                  | apps/web/src/lib/audit.ts                               | Adapted with notice; known static HTML fixtures                                                                    |
| Cheerio (MIT)                                  | Static HTML parser                                                                          | apps/web/src/lib/audit.ts                               | Library integration; no JavaScript execution or unbounded external subresources                                    |
| ipaddr.js (MIT)                                | IPv4/IPv6 parsing and reserved-range classification                                         | apps/web/src/lib/safe-fetch.ts                          | Library integration; private/reserved/encoded-IP and DNS/redirect tests                                            |
| pdf-lib (MIT)                                  | Actual PDF generation                                                                       | apps/web/src/lib/report-pdf.ts                          | Lazy client import; output parsed back in unit/browser tests                                                       |
| fast-xml-parser (MIT)                          | XML syntax validation/parsing                                                               | apps/web/src/lib/technical.ts                           | DTD/entity rejection before parsing, bounded input; XML/root/URL validation, not full XSD                          |
| JSZip (MIT/GPL dual declaration; MIT selected) | Batch archive generation                                                                    | apps/web/src/components/converter.tsx                   | Existing library reused; downloaded ZIP contents tested; filenames sanitized                                       |
| Reviewed Claude skills                         | Workflow concepts adapted into original Codex instructions                                  | .agents/skills/toolroom-development/SKILL.md, AGENTS.md | Original narrow instructions; no bulk plugin installation                                                          |

## Explicitly not integrated

- Motasaith source: no license grant observed.
- RMBG-1.4 weights: primary model card restricts free use to noncommercial contexts; no commercial agreement configured.
- tool3 dynamic model package installation: incompatible with an untrusted hosted input boundary.
- XGenerationy server: simulated data/progress, unsuitable for real tools.
- Vette extractor/cookie/private endpoint fallback modules: provider restrictions and permissions not met.
- compressO source: AGPL distribution obligations not selected; retain independent FFmpeg integration plan.
- Capacitor native plugins: unnecessary mobile bridge and MPL-covered-file obligations for this web runtime.
- websu: alternative Go/Mongo/gRPC deployment, not a Next.js drop-in.
- sitespeed.io: isolated optional performance worker/CI candidate; not loaded in web request paths.

These choices preserve useful implementations without importing an entire unreviewed dependency tree. No selected model, video worker or social download backend is declared complete.

Immutable upstream archive and selected-source digests for the adapted code are retained in `third_party/provenance.json`, independently of future research refreshes. The inventory script preserves prior link decisions and writes timestamped metadata snapshots on future runs.

## Workspace refresh

General conversion/AVIF and lossless/metadata settings reuse the existing Sharp engine; direct downloads reuse our existing bounded public-network fetcher. No additional competitor application code was copied. The screenshot informs layout, not fake results or provider capabilities. REA MIT operator tooling and the MIT token-efficiency skill remain outside the website's runtime dependency tree. New source/skill pins and all 40 user reference links are in `docs/research-refresh.md` and the JSON ledger.

## Compact converter / SEO expansion

Adapted MIT OpenSEO HTTP `Link` canonical extraction into `apps/web/src/lib/http-canonical.ts` and integrated it into actual static audit evidence. Added relation-list/comma handling and tests. Full copyright/license in `third_party/open-seo/LICENSE`, immutable source identity/digest in `third_party/provenance.json`. No upstream Cloudflare app, auth/billing code, worker retry loop or DataForSEO account was imported.

Native Sharp supplies six single-frame input/output formats; no extra executable codecs or unreviewed binaries installed. Semrush v4 and Pexels adapters are independently implemented from official documentation with bounded requests. Claude skill cost/cache ideas were adapted to Codex/Next rather than installing a blanket policy. Rejected Semrush scraper CAPTCHA/proxy modules and cgpu as a commercial worker. See `docs/seo-expansion-research.md` for all licenses, reviewed paths and source-access failures.

## S3-compatible storage adapter

AWS SDK v3 client and presigner (Apache-2.0) reused for maintained SigV4 signing and object requests; original application code implements the upload ticket, validation, Redis admission/replay controls, private result access and worker staging. Package versions are locked in `package-lock.json`. No provider SDK source was copied. See `docs/production-hardening.md` and `THIRD_PARTY_NOTICES.md`; real bucket acceptance is pending.
