# Competitor analysis — 25 October 2026

## Evidence and limits

All six reference pages were opened in real Playwright Chromium sessions at 1366×900 and 390×844. HTTP responses, rendered text, input types, button labels and screenshots are recorded in `artifacts/research/browser-observations.json`. The re-runnable script is `artifacts/research/inspect.mjs`. Mobile overflow checks are narrow geometry observations, not complete accessibility audits.

Synthetic JPEG upload attempts for the two converters are recorded separately in `conversion-workflows.json`. Do not equate selecting a file with successful remote processing or a verified download. No private endpoints, credentials or proprietary source were inspected.

| Reference                                              | Observed workflow/settings                                                                                                            | Limits and testing status                                                                                                                                                          | Independent approach                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [CloudConvert](https://cloudconvert.com/jpg-to-webp)   | File input and drop prompt, JPG→WebP choice; synthetic JPEG appears in queue; resolution/quality/file size controls advertised        | Desktop/mobile rendered without horizontal overflow. Upload selection observed; conversion/download not yet verified. Pricing not verified.                                        | Sharp encode, explicit quality/dimensions, clear queue and byte comparison      |
| [FreeConvert](https://www.freeconvert.com/jpg-to-webp) | File/cloud/URL choices, output resizing, lossless option, quality, compression speed, EXIF auto-orient and metadata stripping visible | Page advertises 1GB maximum; account/time quotas not verified. Both viewports rendered without overflow. File input exercised; successful remote conversion/download not verified. | Smaller explicit resource cap, metadata stripped by default, ZIP batch          |
| [remove.bg](https://www.remove.bg/)                    | Upload Image, drop/paste prompts and comparison range control visible                                                                 | No file input on initial page; upload flow not completed. Pricing/credits and output quality unverified. No overflow observed.                                                     | Separate segmentation worker, explicit unavailable state until model accepted   |
| [ImgUpscaler](https://imgupscaler.com/)                | Input accepts JPEG/PNG/WebP/AVIF; 2×/4× advertised, paid batch described in page copy                                                 | No model job or download tested. No overflow observed. Actual credit enforcement unverified.                                                                                       | Model worker with bounded jobs, no interpolation marketed as AI                 |
| [PageSpeed](https://pagespeed.web.dev/)                | URL input, Analyze action and visible validation message; invalid URL entered and Analyze clicked                                     | No performance run or field measurements tested. Horizontal overflow detected at 390px in this capture; not a comprehensive mobile judgment.                                       | Official PSI adapter with errors and missing-data states; optional CrUX adapter |
| [Seobility](https://www.seobility.net/en/seocheck/)    | Public URL form and links to related checkers                                                                                         | No audit submission/report/download tested. Horizontal overflow detected at 390px. Actual quotas unverified.                                                                       | Safe single-page fetch, exact inventories and transparent custom scoring        |

## Feature comparison

“Observed” means visible UI/copy, not verified output. “Implemented” refers to our code; verification results are in progress.md.

| Capability             | CloudConvert               | FreeConvert      | Toolroom milestone            |
| ---------------------- | -------------------------- | ---------------- | ----------------------------- |
| JPEG file selection    | Exercised                  | Exercised        | Implemented                   |
| Quality control        | Advertised                 | Observed         | Implemented                   |
| Dimension control      | Advertised                 | Observed         | Implemented                   |
| EXIF handling          | Not tested                 | Observed setting | Auto-orient, metadata removed |
| Batch conversion       | Add-files control observed | Advertised       | Sequential, max 10            |
| ZIP download           | Not tested                 | Not tested       | Implemented                   |
| Output validity        | Not tested                 | Not tested       | Real Sharp decode tests       |
| Mobile upload/download | Not tested                 | Not tested       | Browser acceptance suite      |

## Features to adopt and improve

Adopt clear quality controls, contextual format guidance, explicit file queues and separate processing/download states. Improve consistency, transparent limits, accessible labels, actual file-size comparisons and honest availability. Screenshots are internal evidence, not design assets.

## Remaining research

Test drag/drop, changed settings, valid processing, invalid input, downloads and keyboard workflows where access permits for every major tool before its implementation phase. Additional candidates: Squoosh for compression (https://squoosh.app/), HandBrake for video (https://handbrake.fr/), Cobalt for rights-aware media workflows (https://github.com/imputnet/cobalt), Stirling PDF (https://github.com/Stirling-Tools/Stirling-PDF), CyberChef for developer utilities (https://github.com/gchq/CyberChef). These additional candidates have not been hands-on tested; do not infer their current capabilities or licenses.

## Research refresh: REA and real workflows

REA MCP was not exposed in this active session. `rea-agents@6.7.0 doctor --client codex --json` reported stale registration, with Node available. No global registration, analysis engine or other client configuration was changed. The version-pinned **REA CLI** successfully ran `capture-browser-scenario` against all six references using the existing Chromium executable. Evidence is in `artifacts/research/rea/*-evidence.json`; every scenario reports `terminated-owned-process` cleanup. This is real REA Evidence, but not an MCP session. Default captures omit bodies/credentials; artifact identity, event ordering and bounded coverage limitations remain in the records.

| Competitor   | New verified actions/results                                                                                                                                | Still partial or unverified                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CloudConvert | Synthetic 480×360 JPEG selected, exact Convert clicked, FINISHED observed, Download clicked, downloaded bytes decoded as real 480×360 WebP                  | Alternative quality/resizing settings, drag/drop, invalid files and full accessibility review not completed                                                             |
| FreeConvert  | Synthetic JPEG selected through an exposed file input; quality, resizing, metadata and speed options inventoried; both viewports captured                   | Selection did not advance into a completed conversion in this run; no output/download claimed. No CAPTCHA bypass or private endpoint use                                |
| remove.bg    | Normal upload control clicked, synthetic JPEG selected, cutout/editor controls and free 480×360 preview state observed; Download opened preview/max choices | Final downloaded PNG bytes/alpha were not verified. Full-resolution/credit behavior and model quality remain untested                                                   |
| ImgUpscaler  | Accepted-format file input exercised with synthetic JPEG; visible controls and desktop/mobile captures retained                                             | No verified enhanced output or download; authentication/credit/submit steps not forced or bypassed                                                                      |
| PageSpeed    | REA filled an invalid URL and clicked Analyze. Playwright entered a public URL after invalid-input interaction                                              | This browser run did not submit and finish a valid measurement. The official API was separately attempted and returned a quota failure; no performance metrics invented |
| Seobility    | REA filled invalid text. Playwright submitted invalid input, then a public example.com URL; post-interaction copy/screenshots retained                      | No verified completed report, score or export. Validation/challenge/permissions not bypassed                                                                            |

Re-run scripts: `scripts/research/rea-competitors.mjs` and `scripts/research/competitor-workflows.mjs`. Raw Playwright observations: `artifacts/research/round2/workflows.json`. Screenshots are internal evidence, not reusable brand assets. The exact observed outcome overrides earlier documentation-only assumptions.

## Implications for Toolroom

Adopt real queues, explicit settings and download states while preserving an independent design. The current image work uses Sharp and verified bytes; the SEO engine reports observed static HTML plus Not tested coverage; the PSI adapter uses only the official endpoint. AI/video/provider downloads remain gated by their actual runtime/license acceptance rather than copied marketing claims.

## Latest REA MCP and workflow refresh

All six sites were captured again through an actual standalone **REA 6.7.0 MCP** connection (`artifacts/research/rea-mcp/{cloudconvert,freeconvert,removebg,imgupscaler,pagespeed,seobility}.json`), with mobile viewport, DOM, accessibility and URL evidence. MCP tools/list advertised 207 tools. This corrects the earlier stale-registration limitation; native tools still require reconnecting this Codex client. Observation is not access to a competitor's private server implementation.

The fresh Playwright workflow run (`artifacts/research/round2/workflows.json`) selected a self-created JPEG on CloudConvert, FreeConvert, remove.bg and ImgUpscaler; clicked CloudConvert Convert and remove.bg's visible download control; submitted invalid/public URL forms where controls were reachable on PSI/Seobility. **No downloadable competitor result was verified in this latest run.** CloudConvert's earlier successful download was reported in the previous milestone but was not reproduced; the current workflow artifact was overwritten by the refresh and is not evidence of that older success. Other competitor screenshots were refreshed too. Research scripts now use timestamped run folders by default to preserve future evidence.

Our implemented comparisons: clear input types, quality/dimensions, lossless choice, metadata default removal, batch results, original/output previews, actual savings and ZIP downloads. Screenshot-inspired sidebar and mobile dock are independently built. Remaining specialist gaps: AI matting/super-resolution, isolated video workers, richer rendered/site crawling, official provider metadata and transcoding. Upstream repositories are not categorically better or tested simply because they appear on a topic page.
