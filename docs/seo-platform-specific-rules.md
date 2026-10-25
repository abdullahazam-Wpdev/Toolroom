# Platform-specific SEO rules — specified vs. built, 25 October 2026

The original request (section 5/6) asked for deep WordPress/WooCommerce/Shopify-specific auditing: Elementor DOM-size analysis, hero-slider duplicate-H1 detection, lazy-loading/render-blocking checks, WooCommerce product schema validation, Shopify theme performance, faceted-navigation canonical conflicts, and more. **Only platform identification is built this phase** (`apps/web/src/lib/platform-detect.ts`); the deeper rule sets below are specified, not implemented, so this file tracks the gap honestly rather than silently narrowing scope.

## Built: platform identification (`detectPlatform`)

Real evidence, no fabricated identifications. Confidence is "high" with 2+ independent signals, "medium" for one sufficiently specific signal (a self-declared `generator` meta tag, a framework's named runtime marker), "low"/"uncertain" otherwise — a low-confidence result is reported as uncertain, never asserted as fact.

| Platform | Signals checked |
|---|---|
| WordPress | `generator` meta, `/wp-content/`/`/wp-includes/` asset paths, `rel="https://api.w.org/"` REST discovery link |
| WooCommerce | `woocommerce` body class, `/plugins/woocommerce/` asset path, `wc_add_to_cart_params` inline script variable |
| Shopify | `cdn.shopify.com` asset host, `Shopify.shop`/`Shopify.theme` inline script object, `X-ShopId`/`X-Shopify-Stage` response headers, `shopify-digital-wallet` meta |
| Webflow | `data-wf-site`/`data-wf-page` attribute, `website-files.com`/`webflow.io` asset host |
| Wix | `wixstatic.com`/`parastorage.com` asset host, `generator` meta |
| Squarespace | `squarespace.com`/`sqsp.net` asset host, `generator` meta |
| Magento | `/static/version<N>/frontend/` asset path (Magento 2 signature), `Mage.Cookies`/RequireJS `mage` config reference |
| PrestaShop | `prestashop` inline script object, `generator` meta |
| OpenCart | `generator` meta, `catalog/view/theme\|javascript/` asset path |
| Next.js | `#__NEXT_DATA__` script, `/_next/` asset path |
| Nuxt | `window.__NUXT__` inline object, `/_nuxt/` asset path |
| Angular | `ng-version` attribute |
| Laravel | `laravel_session`/`XSRF-TOKEN` cookie (the only signal visible without authenticated access — weak alone, reported at low confidence) |
| React (bare, no meta-framework), Vue (bare), Magento/PrestaShop/OpenCart beyond the signals above | **Not implemented.** Bare React/Vue without a detectable meta-framework have no reliable unauthenticated signature distinct from "generic JavaScript site"; claiming to detect them without real evidence would violate the project's own "report uncertain as uncertain" rule, so they are left out rather than guessed. |

Verified against real sites this phase: `wordpress.org/news/` → WordPress, high confidence, 4 corroborating signals (see `docs/progress.md` for the exact evidence captured). `example.com` → correctly reported as no recognized signature (not a false WordPress/other guess).

## Not built: platform-specific deep rules

These remain specified requirements, not code, until a following phase:

- **WordPress/Elementor**: DOM size thresholds, duplicate-H1-from-hero-slider detection, lazy-loading attribute audit, render-blocking asset detection, Yoast/Rank Math output parsing.
- **WooCommerce**: Product `schema.org/Product` field completeness beyond the generic required-field table already in `audit.ts`'s structured-data check, variant URL/canonical conflict detection, category/breadcrumb schema checks.
- **Shopify**: Collection pagination and faceted-navigation canonical conflict detection, theme-specific render-blocking checks, product variant URL analysis.
- **Magento/PrestaShop/OpenCart**: any check beyond platform identification.

Building these for real (not just listing them) requires either extending `analyzeHtml` with platform-conditional rule branches, or a dedicated per-platform rule module invoked once `detectPlatform` has identified the stack with sufficient confidence — the identification layer built this phase is the prerequisite for that, which is why it came first.
