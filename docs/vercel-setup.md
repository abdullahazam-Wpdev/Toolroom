# Vercel agent setup — 25 October 2026

Followed the explicitly requested [official onboarding playbook](https://vercel.com/get-started.md). Web extraction rejected its Markdown MIME type; curl fetched the actual 7,704-byte document successfully, retained in ignored `.runtime/vercel-get-started.md`.

## Verified

- Vercel CLI **65.2.0**, Node **24.16.0**, authenticated as **abdullahchampions75-1199** (`vercel whoami`). Existing installation was reused; no available-update warning was reported.
- Official **Vercel plugin 0.21.4**, user scope, installed with `npx --yes plugins add vercel/vercel-plugin --target codex --scope user --yes`. Installer selected `vercel@openai-curated`; the Codex configuration marks it enabled. Cached command `commands/status.md`, 54 packaged skill directories (the upstream installer preview reported 37) and plugin manifest are present. No duplicate standalone skill pack was installed. The plugin installer explicitly requires restarting the agent to load its commands.
- Shared global MCP endpoint: **https://mcp.vercel.com**, registered using `codex mcp add vercel --url https://mcp.vercel.com`. User completed browser consent; CLI reported **Successfully logged in**. `codex mcp list` reports enabled / OAuth.
- Configuration: `/home/abdullah/.codex/config.toml`. Unrelated REA/settings preserved; a private timestamped backup was created before setting `default_tools_approval_mode = "writes"`. This requests confirmation for tools not marked read-only, per [official Codex documentation](https://learn.chatgpt.com/docs/extend/mcp). Applied to the shared server and plugin server policy.
- An existing `.vercel/project.json` already links **toolroom**. Its linkage was preserved. `.vercel/` is now ignored so later environment downloads are not tracked.

## Remaining verification after reload

The running agent session has no Vercel tool namespace or newly installed plugin commands injected. Re-listing server configuration confirms OAuth, but cannot refresh this live session's tool catalog. Restart/reload Codex, then use the Vercel MCP tools `search_vercel_documentation` and authenticated read-only `list_teams`. Those two MCP calls have **not** been executed here. No claim of a verified MCP team response or loaded `/vercel-plugin:status` command is made.

No project was created, relinked or deployed by this global setup. No credentials were printed, copied into project files or requested in chat.

## Hosting boundary for this platform

This setup does not deploy PostgreSQL, Redis, AI models or the FFmpeg worker. The new media queue currently expects persistent shared filesystem storage and a long-lived worker. Do not enable that local-filesystem path in Vercel Functions: it needs a separately hosted worker plus an appropriate private object-storage/upload integration or a separately hosted media API. Keep `MEDIA_JOBS_ENABLED=false` on Vercel until that boundary is implemented and tested. Existing image upload limits also need review against the selected Vercel function/request limits before any deployment. Agent onboarding is not production acceptance.
