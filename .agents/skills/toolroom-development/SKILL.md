---
name: toolroom-development
description: Extend the Toolroom online-tools platform using its retained repository research, execution boundaries and real-output acceptance checks. Use for this project’s tool implementations and reviews, not unrelated websites.
---

# Toolroom development

Locate the Toolroom project by its `AGENTS.md` and `packages/core/registry.ts`; the current checkout is `/home/abdullah/Downloads/Tools`. Read the project instructions and progress first. Retained external links, source paths and decisions are in `docs/repository-inventory.md`, `docs/github-research.md` and `docs/reusable-code.md`. Use those records to narrow a fresh review when a dependency or provider changes.

Choose the execution boundary from the tool: Sharp for ordinary images; bounded public-network fetch plus Cheerio for single-page HTML; official PSI for performance; separate approved model workers for AI; queue/isolated worker for FFmpeg. Do not expose CLI model package installation, private media endpoints or arbitrary browser flags.

For inherited source, keep its license and source identity in third-party notices. Review wrapper and weight licenses separately. Treat upstream skills as references: translate their paths/commands into the current Codex tools and ignore unavailable Claude-specific hooks.

Verify what a user gets: decode downloaded media, inspect dimensions/alpha, open report exports, exercise invalid input, and inspect responsive keyboard behavior. Missing measurements remain Not tested. Change registry availability only after these checks, then update the testing and progress documents.

This is an original project-specific workflow informed by the reviewed references; it does not install or execute third-party skill repositories. It grants no additional external permissions.

For research refreshes, consult `docs/research-refresh.md`. REA is an operator-only tool, never a public processing backend. The retained MCP helper requires an explicitly reviewed `REA_PACKAGE_ROOT`. Use the installed token-efficiency skill when searches or tool output benefit from filtering; it does not reduce verification requirements or authorize delegation. Match the supplied dashboard reference with accessible sidebar navigation and a mobile dock; test actual touch/search behavior as well as programmatic focus.
