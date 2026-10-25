# Research and implementation refresh — 25 October 2026

## Scope and evidence

All **40 distinct user-supplied links** are retained in [the reference ledger](research/reference-links.json): the original 36 plus REA, token-efficiency and the two new topics. This phase rechecks entrypoints and observable behavior; it is not a security audit of every upstream line or dependency, and topic membership does not certify working software.

The metadata refresh attempted 20 named repositories. Eleven GitHub API requests returned access/rate-limit errors; exact results are in [refresh-2026-10-25.json](research/refresh-2026-10-25.json). A separate bounded raw-source refresh fetched **96 files across all 18 previously supplied repositories**, including README/license/manifests and selected source paths. None of the successfully fetched files that had a prior cached counterpart changed. Newly accessible files are not covered by that comparison. Five path requests failed, including directory paths and repositories without a root `LICENSE`; previous license records remain authoritative until specifically changed. See [source-refresh-2026-10-25.json](research/source-refresh-2026-10-25.json). No upstream tool applications or install scripts were run.

The raw Public APIs README is now readable; this corrects the earlier archive limitation. Its catalog lists PSI, image transformation services and an UpRes candidate. PSI remains the selected official performance integration. UpRes documentation/pricing URLs returned no readable body to the web extractor, so API terms, effective quotas, pricing and commercial processing permission are **unverified**; no paid account or integration was silently created. Local image conversion and direct media retrieval need no third-party processing API. Social likes/views still require approved official provider metadata access.

All 11 original GitHub topic URLs and both new topic URLs were reopened through web research. Existing candidate screening and rejection reasons remain in [github-topics.md](github-topics.md); this does not mean every repository on those unbounded topics was opened or tested. The skill website was revisited and still links to Alex Labat's separate skill; its promotional ranking/citation claims are not platform guarantees.

## REA installation and execution

Reviewed [morluto/rea](https://github.com/morluto/rea), observed commit `113679c9a6a1af4c77c1b546e466f4d490dc1095`; package **rea-agents 6.7.0**, MIT. Read package dependencies, `src/cli/setupCommands.ts`, `src/application/BrowserScenarioCaptureService.ts`, the browser scenario contract and client configuration documentation. The 18,984,138-byte source archive exceeded the expanded-text bound; selected extracted files were inspected, not the entire tree. Browser scenarios validate typed observations and retain limitations/incomplete evidence. Its MCP 2.3.1 client/server and Playwright dependencies are operator tooling, not public application dependencies. No native decompiler engines were installed.

Applied the user-requested Codex repair only at `/home/abdullah/.codex/config.toml`. REA created `/home/abdullah/.codex/config.toml.rea.backup.1ad46ccd9240658ccd54d938f8e117b8f47137a7f7456a865b780b4f1b20ade5.recovery`. A subsequent launcher PATH fix has backup `/home/abdullah/.codex/config.toml.rea.path.backup`: npx uses the installed Node 24 absolute path and an explicit Node-containing PATH. Other clients were not modified. The existing version-42 REA skill remains aligned.

A standalone stdio MCP client successfully started the registered package and listed **207 tools**, including `capture_browser_scenario`. [Verification](research/rea-mcp-verification.json). This proves a real MCP server connection from that client, **not native tool injection into this already-running Codex session**. Restart/reconnect Codex to expose its configured server here. All six competitor scenarios were then run through MCP; evidence is in `artifacts/research/rea-mcp/`. CLI refresh evidence also exists in `artifacts/research/rea/`. Browsers owned by the scenarios were cleaned up. No authentication, CAPTCHA, DRM or access restrictions were bypassed.

Reproduce using the reviewed installation root:

```sh
REA_PACKAGE_ROOT=/path/to/node_modules/rea-agents node scripts/research/rea-mcp-competitors.mjs
```

Use the actual installed package location and Node PATH. REA is never exposed through the public web API.

## Skills

Installed [undefdev/token-efficiency](https://github.com/undefdev/token-efficiency) from commit `8dc98e1c70ebe395c31b2a16c9376ca7e4071ba7`, path `skills/token-efficiency`, into `/home/abdullah/.codex/skills/token-efficiency`. Read README, MIT license, full SKILL.md and CORE.md; retained the full license in the installed folder. No Claude/Cursor hooks or Gemini/OpenCode extensions were installed. Native discovery is available on the next Codex turn/session. Its selective reads, bounded output and evidence retention apply where relevant; its optional delegation advice does not override session restrictions.

The original Toolroom skill was updated using the skill-creator guidance, retaining a narrow scope, evidence pointers and mobile interaction checks. Both workspace and installed copies are kept aligned. Skills are selected by task; loading every skill for every action would add conflicts and waste. The new topic pages are discovery catalogs, not installable skill folders. Broad orchestration/indexing stacks were screened and not installed without a concrete project need.

## Implemented from the comparison

- Screenshot-inspired desktop sidebar, global search, compact blue/violet workspace, mobile dock, real share/copy control and a focused dashboard home. Existing Toolroom branding and Next.js server rendering remain intact; no fake login/pricing controls were added.
- General image converter: JPEG/PNG/WebP input; JPEG/PNG/WebP/**AVIF output**. Batch ZIP, previews, actual file savings and separate results panel. AVIF input is not advertised or accepted.
- Resize presets, real lossless WebP, optional metadata retention (stripped by default). JPEG orientation handling and resource bounds remain. Lossless describes preservation of decoded pixels, not restoration of detail lost in an input JPEG.
- Authorized **direct file** downloads: JPEG/PNG/WebP/MP4/WebM signatures, 10 MiB cap, 20-second fetch deadline, three redirects, public DNS pinning, permission acknowledgement, two concurrent requests and six requests/minute per process. Original bytes; no scraping, transcoding, quality selector, cookies or provider bypass. A signature is not full media validation or malware scanning. Distributed quotas/proxy limits remain release gates.

Current registry: **13 available, 1 API-quota configuration gate, 5 planned**. Planned: background removal, AI super-resolution, video compression, video conversion and provider metadata/likes/views. No “best of all repositories” claim is made: our verified image controls/security fit the hosted app; upstream specialist AI/video/crawl capabilities still exceed our implemented scope.

Research capture scripts now choose timestamped folders by default to preserve future runs. `RESEARCH_OUTPUT_DIR` can select a specific folder; choose a new one for each investigation.

## Subsequent phase

The compact converter/SEO expansion supersedes the counts in this historical refresh: see `docs/seo-expansion-research.md` and current `docs/progress.md`. The reference ledger now contains 59 user/screenshot records. Native six-format codecs, canonical-header adaptation, optional Semrush/Pexels adapters and labeled house advertising are documented there; live credential-dependent services remain unverified.

## PDF/developer and GPU refresh — 25 October 2026

See [phase1-gpu-research.md](phase1-gpu-research.md) for all new GPU/video/topic decisions and focused source digests; repeated references retain their same-day decisions in the master ledger. cgpu is now operator-locally installed (help verified, OAuth-blocked status), superseding earlier not-installed notes. No upstream GPU/model source was copied into the website. This milestone extends the already licensed MIT pdf-lib and JSZip integrations with original browser-worker orchestration and real output tests; see [phase1-pdf-developer.md](phase1-pdf-developer.md).
