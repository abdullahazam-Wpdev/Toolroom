# Phase 1 — PDF and developer tools — 25 October 2026

## Implementation

Six existing image formats, the SEO engine and all prior tools remain intact. Added five real PDF operations: merge in configurable file order, split selected/all pages into individual PDFs and ZIP, extract page ranges, rotate selected/all pages, and read metadata/page inventories as JSON. Added six browser-local developer utilities: JSON format/validate/minify, UTF-8 Base64 encode/decode, URI-component encode/decode, cryptographic UUID v4 batches, SHA-256/384/512 text digests and opaque sRGB HEX/RGB/HSL conversion.

Execution is a new truthful `browser` registry type. No new API, key, schema or database migration is required. Server-rendered tool descriptions and original workflow instructions use the existing canonical/schema/sitemap pipeline. New PDF category, sidebar icon, related links, directory search and existing mobile dock remain consistent with the design system. Operation tabs reduce developer workspace clutter; page lists, result sections and expandable limitations keep PDF controls together.

PDF source: existing MIT pdf-lib 1.17.1, not a copied directory/tool marketing implementation. JSZip is reused for actual split-page archives (MIT selected). New orchestration/UI is original Toolroom code. A separate worker loads the PDF parser, keeping it out of the main client execution path. Worker termination implements cancellation and a 30-second deadline; progress counts completed load/copy/save stages, not an invented time estimate. Input limits: ten merge files, one file for other operations, 20 MiB aggregate, 200 total pages. Output PDFs total at most 20 MiB before ZIP. Browser memory can still constrain complex PDFs; the worker is not a hard browser-memory sandbox.

Encrypted/damaged/unsupported files fail with a clear error; no encryption bypass is used. Rebuilt PDFs have a fresh catalog/source metadata removed and page annotations/actions stripped. Forms, comments, links, signatures, bookmarks, tags, PDF/A conformance and portfolios are not preserved. This is not secure redaction, full PDF sanitization or malware scanning. Metadata inspection does not modify input. No arbitrary PDF is embedded in an iframe or executed as HTML. Downloads are generated locally; no file/post request is sent by these tools.

Developer inputs are capped at 1 MiB. UUID batches are capped at 100. JSON explicitly uses JavaScript number precision and duplicate-key semantics; Base64 decoding accepts UTF-8 text only. SHA digests are not encryption/password storage. Results/errors are React text, not executable markup. Copy failure has a manual-copy fallback; clear/mode/input changes invalidate old results.

## Existing image/SEO boundaries

Regression tests retain codec/download, preview/ZIP, source-audit/PDF/CSV, quota, SSRF, metadata and mobile checks. This milestone does not add image crop, rendered audits or image metadata processing. Those are subsequent independently testable work, rather than advertised unimplemented options. The new tools get original server-rendered instructions and truthful supported formats/limits; no ranking guarantee or fabricated performance score.

## Verification and release

See the latest `docs/testing-results.md` / `docs/progress.md` entries for final acceptance and deployment. The first browser run caught an ambiguous Pages label and route-announcer locator collision; the accessible field name and scoped error assertions were fixed. All new PDF outputs are loaded back with pdf-lib; extracted/merged order, rotation, metadata and ZIP contents are checked. Browser tests operate through the actual compiled worker and downloads. New tools do not require or enable production workers.

Remaining PDF work: images-to-PDF, PDF rendering, genuine compression with measured output, more preservation options. Remaining developer work: QR codes, safe bounded regex/diff and formatters. No placeholder registry entries for these.

## Live acceptance follow-up

Feature commit 3606b4d reached Ready at toolroom-m9zxhaz0h-norax1.vercel.app. Initial production browser run passed 13/15 checks; two PDF ready assertions expired at five seconds while the UI was still busy. Both passed focused real-download reruns (3.1/3.4 seconds) with waits aligned to the existing 30-second worker contract. Follow-up exposes engine-loading state and moves document-preservation limits above the chooser; tests allow 35 seconds for worker completion without changing the worker deadline. Final full live results are recorded in progress.md.
