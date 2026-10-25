# Toolroom development plan — 25 October 2026

Continue the existing Next.js/TypeScript monorepo and approved sidebar/mobile layout. This plan follows the requested phased delivery; it does not mark the full SaaS complete.

1. Production reliability: retain correct public-origin metadata, 429 responses, 4 MiB inline transfer limits and disabled worker flags. Confirm production database identity through the hidden-input helper before migration status or any schema change. The existing Prisma resource linkage is not authenticated SQL verification.
2. SEO milestone: ship evidence-based WordPress comment/query URL checks, Shopify/WooCommerce product JSON-LD checks, JavaScript source-content observations, HTML hreflang syntax/self/return links, normalized main-text duplicates and CSV findings. Preserve existing PDF/JSON exports and static coverage limits. Fix external-image consent, unknown link statuses and synchronous request/time limits.
3. Image expansion: add real crop and metadata inspection, preserving six supported single-frame formats and output-decode tests. Do not advertise animation/multipage conversion.
4. PDF/developer tools: introduce verified page operations and browser-side utilities incrementally; each registry promotion requires actual output, invalid-input and browser acceptance.
5. Infrastructure: operator configures a private R2/S3 bucket with CORS/lifecycle, Redis and a verified production database. Deploy isolated workers and verify persistence, cancellation, heartbeat, cleanup and resource limits before enabling jobs.
6. AI/video: repeat real model/FFmpeg output acceptance on the deployed workers; local acceptance does not establish production availability.
7. SaaS polish: measured performance/Lighthouse, ownership/support/legal configuration, consent-aware ads, quotas/account workflows and monitoring. No ranking or AdSense approval guarantees.

Rendered auditing remains blocked on a securely sandboxed browser worker. Provider capabilities remain restricted to official supported operations; credentials and paid quotas are operator prerequisites, not reasons to stall independent tools.

## Phase 1 requested milestone status — 26 October 2026
Five real PDF operations and six browser developer utilities now implemented and tested; release verification is in progress.md. Further PDF/image/developer operations remain subsequent milestones. GPU/video candidates are explicitly reviewed, not all installed or working: see phase1-gpu-research.md.
