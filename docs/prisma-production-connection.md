# Prisma production connection and migration review — 25 October 2026

## Actual inspection

- Linked Vercel project: `norax1/toolroom`, project ID `prj_dHOmmEs90MfyTrGwvCZ4JoJEHDp3`.
- `vercel integration list toolroom` confirms `prisma-postgres-carmine-island` (Prisma Postgres) is Available and linked to Toolroom. Read-only provider inspection confirms resource ID `store_rAHCK4J8qBotXLCc` and status `available`. Neither is an authenticated SQL/connectivity check.
- `DATABASE_URL`, `POSTGRES_URL`, `PRISMA_DATABASE_URL` exist as hidden Secrets for Preview and Production. This establishes names/environment assignments, not their values or connection target. Never print or dump provider inspection objects: only whitelisted resource ID/name/status were emitted.
- Installed Prisma CLI/client: 6.19.3. `infra/schema.prisma` uses PostgreSQL with `url = env("DATABASE_URL")`; there is **no directUrl field**. Merely setting DIRECT_URL currently does not redirect this schema's CLI connection. No schema/version upgrade is needed for a process-local DATABASE_URL override.
- No connection URL, credential or authenticated SQL result was obtained. No migration was applied. Which local migrations are pending remains unknown until status is authenticated.

## Supported credential path

[Vercel Secrets are write-only after saving](https://vercel.com/docs/environment-variables/sensitive-environment-variables); exporting `[SENSITIVE]` does not retrieve a migration password. Do not downgrade production secrets, echo them in builds, or try another secret alias to work around this.

Prisma's [Vercel integration guide](https://www.prisma.io/docs/guides/postgres/vercel) says the current integration populates DATABASE_URL/POSTGRES_URL/PRISMA_DATABASE_URL with direct URLs, but older PRISMA_DATABASE_URL values may be Accelerate URLs. This documentation describes defaults; our hidden values have not been verified. Do not assume that any of these keys proves a direct connection or a particular target.

Prisma's [connection documentation](https://www.prisma.io/docs/postgres/database/connecting-to-your-database) provides the supported path: select the intended database in Prisma Console → **Connect to your database** → **Generate new connection string** → copy the **direct** value. It creates an additional credential, not a new database, and does not invalidate existing credentials. Use a separate operator credential rather than rotating/deleting the integration's credential. Prisma currently documents that these generated credentials have full database access; the read-only restriction is imposed by the helper's operations, not by a falsely claimed read-only credential scope.

Direct is for migrations/admin tooling; pooled is recommended for application traffic. This project is on Prisma 6, so do not paste Prisma 7 adapter/config examples into it. A future permanent separation can use the version-appropriate directUrl setup after reviewing deployment environment requirements; this task leaves the existing schema unchanged.

## Precise dashboard action

1. Open **Vercel → team norax1 → project Toolroom → Storage**.
2. Select **prisma-postgres-carmine-island**; confirm its connected project/environment includes **Toolroom / Production**. Verify the resource ID above if exposed. Availability alone does not confirm the environment/database mapping.
3. Use **Open in Prisma / Manage** to enter that database's Prisma Console through Vercel SSO. The exact link label can vary. The documented CLI alternative is `vercel integration open prisma` (opens SSO; do not print an SSO URL into logs).
4. On that same database, choose **Connect to your database → Generate new connection string** and copy the **direct PostgreSQL** value to your local clipboard. Also obtain its database user and database name from that same connection details view; keep them private. Do not create another database or replace the application's existing secret. Do not paste the URL into chat, shell command text, a tracked file, or screenshots.
5. In your own trusted local terminal, run the helper below. After checking, clear the clipboard and retain/revoke the extra credential according to your secret-management process. Revoking this new operator credential is separate from rotating the application's integration credential.

## Exact secure local commands

```bash
cd /home/abdullah/Downloads/Tools
set +x
export PATH="/home/abdullah/.nvm/versions/node/v24.16.0/bin:$PATH"
python3 scripts/backend/secure-migration-status.py
```

The script asks you to confirm the resource's Production mapping, then accepts hidden database-user/database-name/direct-URL input. It rejects noninteractive or echo-fallback input, placeholders, pooled/other hosts, mismatched dashboard identity and missing TLS. It never writes a credential file, modifies `.env.production.local` or prints raw provider errors. The exact URL is passed unchanged to child processes through their environment, not command arguments/history. Environment access remains sensitive to your local user/system administrator: run only on your trusted machine, with terminal/session recording disabled for secret entry.

It first performs only:

```sql
SELECT current_user AS identity, current_database() AS name;
```

The values are compared in memory to your independently copied dashboard identity and not printed. A mismatch or connection failure stops before status. A proxy-specific identity mismatch must be investigated; do not remove the guard merely to get a passing message.

Only after that check succeeds, it invokes the **installed** Prisma CLI equivalent of:

```bash
npx --no-install prisma migrate status --schema infra/schema.prisma
```

Because this schema reads DATABASE_URL, the helper sets that variable **only for its child processes** to the supplied real direct string; it does not overwrite the application's runtime pooled connection or source a redacted export. It prints sanitized exit/status and local migration names, withholding raw output and connection details. There is no apply/deploy/reset/db-push code path.

Prisma's [v6 CLI reference](https://docs.prisma.io/docs/orm/v6/reference/prisma-cli-reference) explains that migration status compares local migration files to `_prisma_migrations`. Exit 1 can indicate unapplied/missing/divergent/failed history, not just bad credentials. Status success does not establish absence of all schema drift, backups, lock contention or migration safety.

## Review of every local migration

Database-applied checksums/history and table contents are not known, so all three local files were reviewed. None contains DROP, DELETE, TRUNCATE, column renaming, type narrowing or a data UPDATE.

| Migration | SQL behavior | Acceptance gate |
| --- | --- | --- |
| `20261025090000_initial` | Creates public schema, AuditJob/ToolEvent/MediaJob tables, PKs and indexes | Table creation can conflict with pre-existing schema if migration history was not baselined. Check actual tables/history first; do not force-mark applied based only on matching names. |
| `20261025115327_add_crawl_job_fields` | Adds crawl fields and status index to AuditJob | **Blocking risk:** maxPages and tokenHash are NOT NULL without defaults. Existing AuditJob rows make this fail. Check table existence/row count, provenance and job retention requirements. Review a staged nullable/backfill/constraint approach if needed. Do not invent access tokens or delete production rows to satisfy the migration. |
| `20261025180000_media_object_storage` | Adds storageBackend NOT NULL DEFAULT 'local', nullable inputSha256/inputMime to MediaJob | No explicit data removal. Still requires checking applied history/current columns, lock duration and database backup/recovery procedure before release. |

These migrations were **not edited or applied**. Do not rewrite an already-applied migration's SQL/checksum. Whether a correction can amend an unapplied file or needs a separate forward/staged migration depends on authenticated history in every environment. Keep media/crawl flags false while this is unresolved. Do not run migrate dev/reset/db push or baseline/resolve automatically against production.

## MCP/plugin capability

Vercel plugin is installed/enabled, and `codex mcp list` reports `https://mcp.vercel.com` enabled with OAuth. However the current session exposes **no Vercel tool namespace**, so MCP project/integration/variable-name calls were not possible or verified. Reload Codex to make them available; do not describe CLI evidence as MCP evidence. The installed Vercel storage guidance was used with the CLI fallback; no new integration/resource was provisioned.

The authenticated CLI proved that project resources and variable **names/types/environments** can be inspected without retrieving database values. `vercel integration resource inspect ... --json` was captured in memory and restricted to whitelisted ID/name/status; no raw provider object was logged. MCP mutation confirmation remains enabled. Neither plugin installation nor MCP OAuth permits recovering a write-only Vercel Secret.

## Verification

- Schema and all three SQL files read; migration risks recorded, files unchanged.
- CLI project/resource inventory and provider status checked; variable names/types/environment assignments inspected without database values.
- Secure helper compiled; four isolated Python tests passed for host/TLS/identity validation, early stop on mismatch, status-only execution after mocked authentication, and withholding raw credential/error output. Noninteractive execution correctly fails before accepting secrets or connecting.
- **No real credential entered, no authenticated production query/status succeeded, no migration applied.** Next action belongs in the dashboard as described above.

## Read-only workflow confirmation

The operator selected continuing Toolroom with read-only production checks, not creating/seeding/deploying a template application. A subsequent local presence/format check confirmed `.env.production.local` still contains the `[SENSITIVE]` DATABASE_URL placeholder. No connection or duplicate failing Prisma command was attempted with that value. The credential previously pasted into chat is not copied into project files or used; revoke it and use a newly generated private operator credential through the secure interactive helper. Production SQL connectivity remains unverified.
