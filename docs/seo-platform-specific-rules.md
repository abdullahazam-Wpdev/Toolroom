## Source-evidence expansion — 25 October 2026

Selected platform checks, normalized main-text duplicates, HTML hreflang checks and CSV findings are now implemented; see `docs/development-plan.md` and `apps/web/src/lib/seo-evidence.ts`. These supersede prior statements that only platform identification exists. No rendered DOM, authenticated owner data, full schema eligibility validation or semantic duplicate detection is claimed. Return-link evidence covers crawled HTML only; out-of-budget alternates stay Not tested.

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

## Not built (as of 25 October): platform-specific deep rules

These remained specified requirements, not code, as of 25 October — see the
26 October entry below for what was built against this list.

- **WordPress/Elementor**: DOM size thresholds, duplicate-H1-from-hero-slider detection, lazy-loading attribute audit, render-blocking asset detection, Yoast/Rank Math output parsing.
- **WooCommerce**: Product `schema.org/Product` field completeness beyond the generic required-field table already in `audit.ts`'s structured-data check, variant URL/canonical conflict detection, category/breadcrumb schema checks.
- **Shopify**: Collection pagination and faceted-navigation canonical conflict detection, theme-specific render-blocking checks, product variant URL analysis.
- **Magento/PrestaShop/OpenCart**: any check beyond platform identification.

Building these for real (not just listing them) requires either extending `analyzeHtml` with platform-conditional rule branches, or a dedicated per-platform rule module invoked once `detectPlatform` has identified the stack with sufficient confidence — the identification layer built this phase is the prerequisite for that, which is why it came first.

# Platform-specific deep rules, increment 1 — 26 October 2026

First real increment against the "not built" list above, added to
`apps/web/src/lib/seo-evidence.ts` (not a new module — the identification
layer already lived there, so the rule branches extend it directly). Every
new check is only added when `detectPlatform` already identified the
relevant platform at medium/high confidence; it is just another `Check`
merged into the existing `checks` array (`audit.ts`'s
`checks.push(...additional.checks)`), so it appears in the existing
dashboard's findings tab, search, severity filters and CSV/PDF export with
no new UI code.

## Built this increment

- **`wordpress-elementor-dom-complexity`** — closes the "DOM size
  thresholds" gap above. Counts real `.elementor-element` DOM nodes via
  cheerio (not a text-substring count), only when Elementor markers are
  actually present. `warning` above 400 wrapper nodes.
- **Offer `availability` validation** — closes part of the "WooCommerce
  product schema.org/Product field completeness" gap. Extends the existing
  `commerce-product-fields` check (price/currency) to also validate
  `offers.availability` against the schema.org `Availability` enum, shared
  by both WooCommerce and Shopify product pages.
- **`commerce-breadcrumbs`** — closes the "category/breadcrumb schema
  checks" gap. Checks for a `BreadcrumbList` JSON-LD node alongside a
  detected product's `Product` node, reusing the same JSON-LD traversal
  already walking the page (no second parse pass).
- **`shopify-collection-product-canonical`** — closes the "faceted-navigation
  /variant URL canonical conflict" gap for Shopify's single most common
  real case: a product reachable at `/collections/<x>/products/<handle>`
  should canonicalize to the bare `/products/<handle>` URL.
- **`shopify-pagination-signals`** — closes the "collection pagination" gap.
  On a collection listing page with `?page=N` (N > 1), checks for a
  `rel=prev` link.

## Verified against real, live sites (not only fixtures)

- `https://elementor.com/` — real WordPress + Elementor homepage.
  `detectPlatform` correctly identified WordPress at high confidence (4
  independent signals, same as the 25 October verification pattern). The
  Elementor check counted **251** real `.elementor-element` DOM nodes via
  cheerio and correctly reported `pass` (below the 400 threshold) — a
  precise, non-fabricated count; a naive text-substring count over the same
  page is ~9x higher because it matches every repeated class token per
  element, confirming the DOM-based count is the correct one to use.
- `https://shop.spacex.com/` — a real production Shopify store.
  `detectPlatform` correctly identified Shopify at high confidence. On its
  homepage (not a product page), no commerce-specific checks fired —
  correctly avoiding a false positive on a non-product page.
- A real product page on that same store
  (`/collections/trending/products/unisex-starship-milestone-first-orbital-flight-t-shirt`)
  produced four genuine findings: `commerce-product-jsonld` pass,
  `commerce-product-fields` pass (SpaceX's own store sets a valid
  `availability` value — confirming the new check doesn't false-flag
  correct real data), `commerce-breadcrumbs` **warning** (independently
  confirmed by grepping the raw fetched HTML: zero occurrences of
  `BreadcrumbList` and exactly one JSON-LD block on the page — a real
  finding, not a bug), and `shopify-collection-product-canonical` **pass**
  (SpaceX's store does canonicalize correctly to the bare `/products/...`
  URL — confirming the check also correctly passes a site that does this
  right, not just flags ones that don't).

## Tests

6 new unit tests in `tests/seo-evidence.test.ts` cover: heavy vs. light vs.
absent Elementor markup, a bad vs. valid `availability` value, missing vs.
present `BreadcrumbList`, mismatched vs. correct Shopify collection-product
canonical, and a paginated collection page with/without `rel=prev` (plus
confirming the check is absent entirely on an unpaginated collection page).
143 unit tests total (1 pre-existing skip), `tsc --noEmit` and `next build`
both clean.

## Still not built — open for a further increment

- WordPress archive/category/tag page SEO (pagination, archive-specific
  indexability, duplicate archive titles) — not in the original "not
  built" list above, but asked for in the broader milestone request.
- WordPress sitemap *coverage* validation (cross-checking the sitemap
  against pages actually found during a crawl — `technical.ts` already
  parses sitemaps, but nothing yet compares sitemap entries against crawl
  results for this purpose).
- WooCommerce category-page SEO specifically (as distinct from product
  pages).
- Hero-slider duplicate-H1 detection, lazy-loading attribute audit,
  render-blocking asset detection, and Yoast/Rank Math output parsing — the
  remaining items from the original WordPress/Elementor gap list above.
- Magento/PrestaShop/OpenCart deep rules beyond identification — unchanged
  from 25 October.
- An aggregated, crawl-wide "platform findings" dashboard view (today each
  platform-specific check surfaces per-page, exactly like every other
  check; a dedicated rollup of "N pages have this Shopify/WooCommerce issue"
  across a full background crawl was not built).
