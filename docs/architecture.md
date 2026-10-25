# Architecture

npm workspaces: `apps/web` (Next.js App Router, TypeScript, Tailwind, customized shadcn-style Radix primitives), `packages/core` (pure registry), `infra` (Prisma/Postgres/Redis deployment). Server-rendered tool descriptions and metadata surround narrowly scoped interactive components. The registry is the source for navigation, routing and discovery.

## Execution boundaries

Image conversion uses Sharp in the Node runtime, with sequential batches in the browser and in-memory, nonpersistent results. JPEG/WebP/PNG only, 10 MiB input, 24 million decoded pixels, 8,000-pixel edge, bounded active conversion count, timeout at the reverse proxy. No SVG or arbitrary URLs in this milestone. Metadata stripped; EXIF orientation applied.
URL tools use a shared egress service (implemented in the second phase) with DNS pinning, public IP allowlisting, redirect revalidation, response limits and timeouts. Never use unrestricted fetch on user URLs. Future video jobs use BullMQ and isolated FFmpeg workers, job-owned random paths, argument-array spawning, cancellation and TTL cleanup. Future AI workers are separate optional services; unavailable means unavailable.

## Persistence

Prisma schema defines audit jobs and consent-aware aggregate tool events. No upload retention. Favorites and recent tools use local storage only after opt-in; no analytics calls. Postgres/Redis are not required for the first converter, so local tools stay available during infrastructure outages. Shared Redis quotas must replace process-local development protection before multiple replicas.

## Expansion

Provider adapters expose explicit metadata/thumbnail/download capabilities. Marketplace, WordPress connectors, agents, subscriptions and API access are later modules, not initial empty product promises.

## Implemented second-phase boundaries

The image engine now accepts signature-verified JPEG/PNG/WebP according to each tool's input contract, still capped at 10 MiB, 24 million decoded pixels and 8,000 pixels per edge. Explicit output formats, JPEG alpha flattening, sequential 10-file batches, measured upload bytes and local ZIP generation share the tested engine. There is no disk retention for these outputs.

`src/lib/safe-fetch.ts` is now the implemented public-network boundary. It rejects private/reserved ranges (including normalized/mapped addresses), checks every DNS answer, pins the selected address into the connection, restricts protocols/ports, revalidates every redirect and bounds time/body bytes. It requests identity encoding and rejects unexpected compressed responses. Reports do not render target JavaScript or download subresources. HTML audits cap responses at 2 MiB; auxiliary files are smaller and have separate short deadlines.

POST audit/technical APIs use bounded JSON and a same-origin check with process-local quotas. Image processing and SEO audits have explicit active-work caps. Those controls need shared quotas/worker isolation before scaling. PageSpeed has a fixed official endpoint and a separately bounded response; no arbitrary target is passed to unrestricted fetch.

Heavy parsing/codecs remain server-side. PDF and ZIP libraries load only for export in the browser. Tool clients are keyed by registry ID so files/settings do not persist into a different converter. Registry readiness includes requires-configuration as well as available/planned; live quota failures are product state, not invented scores.
