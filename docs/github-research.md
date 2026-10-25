# GitHub source review

Reviewed 25 October 2026 through public GitHub metadata, bounded source archives and focused raw files. No upstream installer or application was executed. External instructions were treated as source material, not authority over this project. Commercial-use conclusions below are integration decisions, not a substitute for reviewing all distribution obligations.

## anthropics/claude-code

Source: https://github.com/anthropics/claude-code

Decision: **reviewed**. Design guidance only; do not redistribute the skill text: root license is Anthropic commercial terms and SKILL.md refers to a missing LICENSE.txt. Write original Codex instructions.

Useful paths: `plugins/frontend-design/skills/frontend-design/SKILL.md`, `plugins/frontend-design/README.md`, `LICENSE.md`.

Architecture and integration: Subject-led design, restrained structure and critique; no Claude hooks or plugin metadata copied.

Archive SHA-256: `b3ab82f5dd0a7d6693059b19bf2ddcfd826b1697fff00ee2176a1ca75efe88aa`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/anthropics--claude-code` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## jeffallan/claude-skills

Source: https://github.com/jeffallan/claude-skills

Decision: **selected for workflow adaptation**. MIT; preserve notice for any adapted text. Read Next.js, React and TypeScript skills; use original concise project-specific instructions.

Useful paths: `skills/nextjs-developer/SKILL.md`, `skills/react-expert/SKILL.md`, `skills/typescript-pro/SKILL.md`, `LICENSE`.

Architecture and integration: Progressive references and stack-specific validation; avoid importing all skills and Claude-specific settings.

Archive SHA-256: `0c7953d1f16eca934438d2416fbf9c8d2a4390795fdc238a4c0363d441b57cc7`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/jeffallan--claude-skills` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## AgricIDaniel/claude-seo

Source: https://github.com/AgricIDaniel/claude-seo

Decision: **selected for workflow adaptation**. MIT code/instructions, but upstream claims and cited SEO statistics require primary-source verification.

Useful paths: `skills/seo-audit/SKILL.md`, `skills/seo-technical/SKILL.md`, `skills/seo-schema/SKILL.md`, `skills/seo-geo/SKILL.md`, `scripts/parse_html.py`, `scripts/url_safety.py`, `LICENSE`.

Architecture and integration: Evidence-backed issue inventories and task routing. Replace CLAUDE_PLUGIN_ROOT and /seo commands with Codex project scripts; no auto-crawl of 500 pages.

Archive SHA-256: `414a6d835e3f972bcf0511006b89ce073c73f5c42e84377f40dbdfea668a224f`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/AgricIDaniel--claude-seo` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## public-apis/public-apis

Source: https://github.com/public-apis/public-apis

Decision: **reviewed**. MIT directory tooling; API providers have separate terms. Current HEAD archive contains scripts but no README catalog. Do not infer free commercial APIs from this listing.

Useful paths: `scripts/validate/links.py`, `scripts/validate/format.py`, `scripts/requirements.txt`, `LICENSE`.

Architecture and integration: Link validation uses requests/timeouts. Verify providers directly; no operational guarantee from a directory.

Archive SHA-256: `a726d7b6786bd8902fea9fbd7b7205fce72be5814c649c51632daa76665248ef`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/public-apis--public-apis` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## stjudewashere/seonaut

Source: https://github.com/stjudewashere/seonaut

Decision: **selected for audit-rule adaptation**. MIT. Go/MySQL service is incompatible as a drop-in Next.js/Postgres module; adapt selected page-reporting rules with attribution.

Useful paths: `internal/crawler/crawler.go`, `internal/issues/page/headings.go`, `internal/issues/page/images.go`, `internal/issues/page/title.go`, `go.mod`, `LICENSE`.

Architecture and integration: Issue-reporter separation, bounded crawl and cancellation. Improve empty-alt handling and make untested findings explicit; single page first.

Archive SHA-256: `0d9920e0c2037feafcc80fe41b18e08a105de836d4b1769d92958bbe9db323cb`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/stjudewashere--seonaut` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## Jesikurr/Universal-Image-Converter

Source: https://github.com/Jesikurr/Universal-Image-Converter

Decision: **reviewed; incompatible runtime**. MIT. Python/Pillow/Tkinter and bundled Windows drag/drop libraries; no reason to ship desktop GUI in Next.js.

Useful paths: `converter.py`, `cli.py`, `gui.py`, `README.md`, `LICENSE`.

Architecture and integration: Batch filename collision handling is useful. README CLI flags differ from cli.py. Retain Sharp; validate alpha flattening, metadata and output bytes.

Archive SHA-256: `7c42ed3787b4b9177323a8e5fd779a07c1520df8672e4f310b4d7fc8a5ba9a2b`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/Jesikurr--Universal-Image-Converter` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## tool3/upscaler-cli

Source: https://github.com/tool3/upscaler-cli

Decision: **rejected as hosted execution wrapper**. MIT wrapper; TensorFlow GPU and model packages require separate compatibility/license review.

Useful paths: `src/upscale/model.ts`, `src/upscale/upscale.ts`, `src/upscale/utils.ts`, `package.json`, `LICENSE`.

Architecture and integration: model.ts shells out to npm install from a model argument. Do not expose dynamic installation or arbitrary require paths to users. Reuse an approved super-resolution library in an isolated pinned worker instead.

Archive SHA-256: `0bdc0140ef99ec6e3779533b20dcc20e882c74806dcdaeeb48c652b58476bd04`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/tool3--upscaler-cli` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## Vette1123/social-media-downloader

Source: https://github.com/Vette1123/social-media-downloader

Decision: **reviewed; reject extraction backend**. MIT source; provider permissions are independent of code license. Node/Cloudflare adapters, yt-dlp, Cobalt/fallback scraping.

Useful paths: `src/lib/validator.ts`, `src/lib/siteRules.ts`, `src/lib/ytdlp.ts`, `package.json`, `LICENSE`.

Architecture and integration: Useful typed provider boundary and tests; do not integrate cookie-backed story access, restriction workarounds, private endpoints, or unverifiable quality ladders. Use hostname allowlists and official metadata/download permissions.

Archive SHA-256: `b2403150bfa309887ab3f72d16e8936c7315af3a8d7485ff06f37d9834e9f37b`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/Vette1123--social-media-downloader` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## XGenerationy/SocialMedia-Video-Downloader

Source: https://github.com/XGenerationy/SocialMedia-Video-Downloader

Decision: **rejected**. MIT but server generates simulated metadata, durations, qualities and transfer state rather than validated media. CRA/Express also duplicates our architecture.

Useful paths: `server/index.js`, `package.json`, `src/pages/DownloadPage.tsx`, `LICENSE`.

Architecture and integration: Do not reuse fake processing or ad/anti-adblock components. A source license does not make a feature real.

Archive SHA-256: `578cda687f95f47ff14b4473ae45fd68e6665ced5ae0e267882099619f4f81b7`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/XGenerationy--SocialMedia-Video-Downloader` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## addyosmani/bg-remove

Source: https://github.com/addyosmani/bg-remove

Decision: **reviewed; do not integrate default model configuration**. MIT wrapper (LICENSE.md reviewed); defaults to briaai/RMBG-1.4 and optionally Xenova/modnet. Model licensing is a distinct gate.

Useful paths: `lib/process.ts`, `src/components/EditModal.tsx`, `src/components/Images.tsx`, `package.json`, `LICENSE.md`.

Architecture and integration: Mask compositing, browser inference and editor patterns are useful. RMBG-1.4 model card uses custom terms; no silent commercial deployment. Alpha extraction must be genuine segmentation.

Archive SHA-256: `044a463c0ae0a0a7ffa2f3c9da7b1c48b399f841a95cf0fbcd67a3f3db536a16`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/addyosmani--bg-remove` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## Motasaith/image-bg-remover

Source: https://github.com/Motasaith/image-bg-remover

Decision: **rejected pending license grant**. No root LICENSE and GitHub license is null in the inspected snapshot. README availability is not redistribution permission.

Useful paths: `main.py`, `requirements.txt`, `bulk_processor.py`, `Dockerfile`, `README.md`.

Architecture and integration: FastAPI/rembg/OpenCV design; auto-selects color keying, wildcard CORS, default API key and disk-served outputs need changes. Do not reuse unlicensed source.

Archive SHA-256: `6d2748c72c527c3b6236d7c738535c15948ddebf7472dab77f8ee1e187ed2382`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/Motasaith--image-bg-remover` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## tecnomanu/remove-background-local

Source: https://github.com/tecnomanu/remove-background-local

Decision: **reviewed; worker reference**. MIT wrapper. FastAPI, Pillow, rembg and ONNX Runtime; individual model licenses still require review.

Useful paths: `server.py`, `requirements.txt`, `tests/test_server.py`, `electron/main.js`, `LICENSE`.

Architecture and integration: Cached sessions, inference lock, threadpool and warmup status are useful. Local/single-user service must gain authentication, queue/resource limits and approved weights for hosted use.

Archive SHA-256: `fda32184cd7df21d4e8c5a95174ffd343d931493880786727ebaa5f4af73023f`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/tecnomanu--remove-background-local` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## codeforreal1/compressO

Source: https://github.com/codeforreal1/compressO

Decision: **reviewed; incompatible distribution choice**. AGPL-3.0-only per Cargo.toml/license. Commercial use is not categorically forbidden, but copying into a hosted proprietary service creates obligations we have not selected.

Useful paths: `src-tauri/src/main.rs`, `src-tauri/Cargo.toml`, `package.json`, `README.md`, `LICENSE`.

Architecture and integration: Tauri/Rust/native desktop compression, FFmpeg and oxipng/WebP tooling. Independently use FFmpeg/Sharp, preserve current Node architecture. No upstream release binaries executed.

Archive SHA-256: `archive incomplete; focused raw source retained`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/codeforreal1--compressO` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## Cap-go/capacitor-file-compressor

Source: https://github.com/Cap-go/capacitor-file-compressor

Decision: **reviewed; mobile expansion candidate**. MPL-2.0; modified covered source carries file-level obligations. Capacitor native bridge is unnecessary for our Node web service.

Useful paths: `src/web.ts`, `src/definitions.ts`, `android/src/main`, `ios/Sources`, `package.json`, `LICENSE`.

Architecture and integration: Canvas fallback, bounded quality reduction and no enlargement are useful patterns. PNG quality differs from JPEG/WebP. Keep explicit user quality instead of silently lowering it.

Archive SHA-256: `60fa68651a01dbf18e95cdc7c674d11b934b516e3c1e21ba2d5e61a864facbd8`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/Cap-go--capacitor-file-compressor` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## avvio-agency/website-speed-test

Source: https://github.com/avvio-agency/website-speed-test

Decision: **selected for code adaptation**. MIT; compatible Next.js route and PSI normalization. Preserve full license and attribution in third-party notices.

Useful paths: `app/api/audit/route.ts`, `lib/ratelimit.ts`, `components/SpeedTest.tsx`, `package.json`, `LICENSE`.

Architecture and integration: Adapt category/opportunity extraction. Change missing scores from zero to null, add mobile/desktop and separate field metrics. Replace URL checks with pinned DNS security; no staged fake percentage or untrusted forwarded-IP limiter.

Archive SHA-256: `7658f6db6677aa1529cffe4a2ba3aa95e8ac70bae6065a8a6c063a64afd135c4`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/avvio-agency--website-speed-test` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## websu-io/websu

Source: https://github.com/websu-io/websu

Decision: **reviewed; incompatible as drop-in**. Apache-2.0; Go/gRPC/Lighthouse/MongoDB/Redis deployment differs from current stack and uses older browser/tool versions.

Useful paths: `pkg/lighthouse/server.go`, `pkg/api/lighthouse_json_parser.go`, `pkg/api/scheduler.go`, `go.mod`, `LICENSE`.

Architecture and integration: Useful worker/API split and scheduled report architecture. Never expose arbitrary Chrome/Lighthouse flags or unsandboxed navigation; no unreviewed remote service dependency.

Archive SHA-256: `9407130cf1209c1e38d60b1ea6e46dfdec0628c5378c3ac87b71eecc20d49773`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/websu-io--websu` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## aliesbelik/webperf-toolkit

Source: https://github.com/aliesbelik/webperf-toolkit

Decision: **reviewed; reference directory**. MIT per root LICENSE; it is a curated tool list, not an executable audit engine.

Useful paths: `README.md`, `LICENSE`.

Architecture and integration: Use to discover Lighthouse, WebPageTest and performance budgets. Listings do not prove licenses/pricing of linked services.

Archive SHA-256: `5be739834cc897888bdd2e7cbd92855234f6f13f6860b8cda39d0cd00ea6d6dc`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/aliesbelik--webperf-toolkit` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## sitespeedio/sitespeed.io

Source: https://github.com/sitespeedio/sitespeed.io

Decision: **reviewed; optional isolated measurement worker**. MIT core with browser/native/transitive components requiring their own review. Node >=22; Browsertime/plugin queue/report pipeline.

Useful paths: `lib/sitespeed.js`, `lib/plugins/browsertime/index.js`, `package.json`, `LICENSE`.

Architecture and integration: Use as a future isolated worker/CI benchmark; heavy runtime should not be imported into every Next request. Validate complete transitive tree and browser isolation before installing.

Archive SHA-256: `archive incomplete; focused raw source retained`. Full inventory: `docs/research/repositories.json` when acquisition completes; local read-only text cache: `.research/repos/sitespeedio--sitespeed.io` (ignored). Focused raw fallback: `.research/extra-source/`. Only selected entrypoints were read deeply; no exhaustive security audit or upstream runtime test is claimed.

## Website-linked skill: SNLabat/SEO-GEO-AEO-Skill

The supplied https://claudeseoskill.com/ redirects to www and links to https://github.com/SNLabat/SEO-GEO-AEO-Skill, a different repository from AgriciDaniel's. README and `SKILL.md` were opened through GitHub/raw source. The displayed tree contains README.md and SKILL.md with no root license. Decision: reviewed, do not copy/install without a grant. Its audit/report organization can inform independent work, but its mandatory repeated scope question, unlimited full crawl and Claude-specific report tooling are not imported. This website is not evidence that the AgriciDaniel plugin and SNLabat skill are one product. No skill body from this repository was added to Codex.

## Acquisition limits

Full compressO and sitespeed.io archives exceeded the 25 MiB research bound. Focused raw README/license/manifests and entrypoints were read instead (paths above), with files retained under `.research/extra-source`. Their entire trees were not inspected. Topic-page local requests returned HTTP 429; the readable web-research listings were used and additional candidates were screened, not blanket-approved. The Public APIs HEAD archive currently had no README catalog, so provider terms were checked directly rather than inventing directory entries.

## REA and token-efficiency extension

The two newly supplied repositories, two topic pages, source pins, reviewed files, installation decisions and limitations are documented in [research-refresh.md](research-refresh.md). Raw entrypoints across all 18 original named repositories were refreshed: 96 files fetched, no changed existing counterparts. This is a focused refresh, not a transitive security audit or proof all upstream tools work. The fresh Public APIs README is readable; the earlier archive-catalog limitation no longer applies to this raw source.

## Compact converter / SEO expansion

Focused source review of Lightspeed/cgpu/OpenSEO/Semrush candidates and the new topics is retained in [seo-expansion-research.md](seo-expansion-research.md). It supersedes assumptions that open-source wrappers make provider data/GPU capacity free. Actual MIT OpenSEO canonical-header adaptation is licensed and tested; incompatible services and unsafe scraper paths remain uninstalled. Acquisitions and failures are recorded separately from runtime validation.

## PDF/developer and GPU refresh — 25 October 2026

See [phase1-gpu-research.md](phase1-gpu-research.md) for all new GPU/video/topic decisions and focused source digests; repeated references retain their same-day decisions in the master ledger. cgpu is now operator-locally installed (help verified, OAuth-blocked status), superseding earlier not-installed notes. No upstream GPU/model source was copied into the website. This milestone extends the already licensed MIT pdf-lib and JSZip integrations with original browser-worker orchestration and real output tests; see [phase1-pdf-developer.md](phase1-pdf-developer.md).
