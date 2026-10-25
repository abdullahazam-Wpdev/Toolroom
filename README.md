# Toolroom

A Next.js App Router tools platform. The current phase includes image utilities, static SEO diagnostics and a research-backed integration plan. Registry availability is explicit.

## Run locally

Node.js 24 LTS and npm are required.

```sh
npm ci
cp .env.example apps/web/.env.local
npm run dev
```

Open http://localhost:3000. If Node is installed through nvm but not on this terminal’s PATH, `./dev.sh` loads it and starts the development server. To run a production build:

```sh
npm run typecheck
npm test
npm run build
npm start
```

## Browser verification

```sh
npx playwright install chromium
npm run test:e2e
```

Tests create their own JPEG fixtures, decode actual WebP downloads and inspect batch ZIP contents. No competitor data is used in production reports.

## Database and containers

Set `POSTGRES_PASSWORD` in the shell before `docker compose up --build`. Set the public HTTPS origin through `NEXT_PUBLIC_SITE_URL` at build and runtime for deployment, then configure a trusted reverse proxy with a 11 MiB body cap, upload/read/processing timeouts, TLS and shared rate limits. The current process-local quota is development protection, not a distributed production limiter.

Prisma schema: `infra/schema.prisma`. With `DATABASE_URL` set, run `npm run db:generate` then `npm run db:push` for development; use reviewed migrations in production. The converter does not require a database or Redis and does not retain uploaded files. Redis/BullMQ packages and Compose services reserve the queue boundary; no video worker is claimed to be running.

Before public launch: operator/legal contact, policy review, real origin, verified database/Redis, reverse proxy, distributed quotas, monitoring, dependency/security review and measured SEO/performance checks. No API, GPU, ad or analytics credentials are configured.

## Documentation

- [Requirements analysis](docs/requirements-analysis.md)
- [Architecture](docs/architecture.md)
- [Implementation checklist](docs/implementation-plan.md)
- [Progress and verification](docs/progress.md)
- [Competitor evidence](docs/competitor-analysis.md)
- [API and library research](docs/api-research.md)
- [SEO architecture](docs/seo-architecture.md)

No private competitor endpoints or proprietary assets are used.

## Research-led second milestone

This phase implements 11 available tools plus a PageSpeed integration labeled API quota required: five Sharp image tools (JPG→WebP, WebP→PNG, PNG→JPG, compression and resizing), static SEO auditing, metadata and heading analysis, PageSpeed integration, robots.txt inventory, sitemap syntax/URL validation, and local social URL inspection.

The audit supports a public URL or pasted HTML, exact inventories, transparent custom scoring and PDF/JSON exports. URL requests use bounded, DNS-pinned public-network fetching. Robots and sitemap checks state their basic-validation coverage explicitly. PageSpeed uses Google's official service; a live keyless request reached a quota error, while successful/missing/error responses were verified with test fixtures. Configure project quota/key for reliable live results; no fixture scores are served in production.

The six remaining entries are explicitly unavailable: segmentation, super-resolution, two video tools, provider metadata inspection and direct media downloads. No new fake tools or simulated results are introduced. AI weights, worker infrastructure and authorized download methods must pass their gates before enabling them.

Research covers all 36 supplied references: 18 named repositories, 11 topic pages, six competitors and the skill website (which links to a separately reviewed repository). See [repository inventory](docs/repository-inventory.md), [source review](docs/github-research.md), [topic screening](docs/github-topics.md), [reuse decisions](docs/reusable-code.md), and [test results](docs/testing-results.md). Full upstream source caches are ignored; provenance/decisions stay in tracked documentation. Two large archives were size-limited and reviewed through focused raw files instead.

The original project skill is in `.agents/skills/toolroom-development/`; a discoverable copy was installed into the user's Codex skills directory. It references AGENTS.md and the retained research rather than installing Claude hooks or entire skill repositories.
