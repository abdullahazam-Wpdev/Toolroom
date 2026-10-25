# SEO architecture

Server-render descriptive content with exactly one primary H1 per route. Tool URLs are `/{category}/{slug}`. Metadata uses the deployment's `NEXT_PUBLIC_SITE_URL`; localhost is development-only. Directory and available tools enter the sitemap. Planned tool detail pages have noindex, follow. Unknown routes return 404. Canonicals and OG metadata derive from one helper. BreadcrumbList and SoftwareApplication JSON-LD describe genuine available functionality; no invented reviews or ratings.

Before public release configure the real origin, remove development indexing restrictions, run Lighthouse CI and Search Console ownership verification. Lab targets are goals, never measured claims. No trackers or ad scripts are loaded.


Second phase: the sitemap includes only working tools and categories containing working tools. Quota-blocked PageSpeed remains noindex/excluded until live configuration is verified. Unavailable categories remain noindex to avoid thin landing pages.
