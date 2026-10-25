# Requirements analysis — 25 October 2026

## Agreed scope

The three source documents are cumulative. Immediate delivery is Phase A/B plus the first real, end-to-end tested JPG-to-WebP tool, followed by the remaining tools in phases. The platform must never imply that the eventual 150+ tools already exist.

## Decisions and ambiguities

- There are 15 explicitly named launch tools, despite an 18-tool target. Proposed additions: robots.txt checker, sitemap validator and social URL inspector. All 18 are listed in the registry; incomplete tools have explicit planned status and are excluded from indexing.
- Use the required Next.js App Router / Node runtime. Worker hosting cannot run the requested native processing stack unchanged; retain a container-oriented deployment.
- Working name: Toolroom. Branding can change through the shared layout.
- No accounts, payments, ads, analytics, marketplace sales or AI claims in this milestone.
- Source inspection and browser observations are distinct evidence. Competitor features are not accepted as verified until observed. Never bypass a challenge.
- Infrastructure configuration is not evidence that a database, queue, model, or API has run.

## Acceptance gates

Foundation: responsive navigation, registry, searchable directory, per-page metadata, canonical URL, sitemap/robots, useful content, honest tool status and accessible forms.
First converter: real JPEG decode and WebP encode, file signatures/limits, dimensions, quality, preview, batch, ZIP, downloads, errors, automated unit/integration and browser verification.
Production: shared rate limiting, proxy upload limits, bounded memory/concurrency, security review, legal review, deployment credentials, monitoring, real database/queue verification, Lighthouse and complete 18-tool acceptance.
