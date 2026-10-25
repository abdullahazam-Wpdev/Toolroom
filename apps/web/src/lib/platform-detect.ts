import { load } from "cheerio";
/**
 * Evidence-based CMS/platform detection from one already-fetched page's HTML
 * and response headers. This is a heuristic signal classifier, not an
 * authoritative fingerprint database: it reports what was actually observed
 * and how many independent signals corroborated it, and explicitly returns
 * "uncertain" rather than guessing when evidence is thin. A site having a
 * blog does not imply WordPress; a platform is only named when its own
 * markup, assets or headers say so.
 */
export type PlatformId =
  | "wordpress"
  | "woocommerce"
  | "shopify"
  | "webflow"
  | "wix"
  | "squarespace"
  | "magento"
  | "prestashop"
  | "opencart"
  | "nextjs"
  | "nuxt"
  | "angular"
  | "laravel";
export type PlatformSignal = { id: PlatformId; evidence: string };
export type PlatformDetection = {
  platforms: { id: PlatformId; confidence: "high" | "medium" | "low"; evidence: string[] }[];
  ecommerce: PlatformId[];
  framework: PlatformId[];
  uncertain: boolean;
  note: string;
};
export function detectPlatform(
  html: string,
  headers: Record<string, string> = {},
): PlatformDetection {
  const $ = load(html);
  const generator = ($('meta[name="generator" i]').first().attr("content") || "").toLowerCase();
  const htmlAttrs = $("html").get(0)?.attribs || {};
  const scripts = $("script[src]")
    .map((_, e) => $(e).attr("src") || "")
    .get();
  const links = $("link[href]")
    .map((_, e) => $(e).attr("href") || "")
    .get();
  const inlineScriptText = $("script:not([src])")
    .map((_, e) => $(e).text())
    .get()
    .join("\n")
    .slice(0, 50_000);
  const assetHrefs = [...scripts, ...links];
  const bodyClass = ($("body").attr("class") || "").toLowerCase();
  const setCookie = (headers["set-cookie"] || "").toLowerCase();
  const signals: PlatformSignal[] = [];
  const add = (id: PlatformId, evidence: string) => signals.push({ id, evidence });

  // WordPress / WooCommerce
  if (generator.includes("wordpress")) add("wordpress", `meta generator: "${generator}"`);
  if (assetHrefs.some((h) => /\/wp-content\//i.test(h)))
    add("wordpress", "asset path under /wp-content/");
  if (assetHrefs.some((h) => /\/wp-includes\//i.test(h)))
    add("wordpress", "asset path under /wp-includes/");
  if ($('link[rel="https://api.w.org/" i]').length)
    add("wordpress", 'link rel="https://api.w.org/" (WP REST API discovery link)');
  if (bodyClass.includes("woocommerce") || assetHrefs.some((h) => /\/plugins\/woocommerce\//i.test(h)))
    add("woocommerce", "woocommerce body class or plugin asset path");
  if (/\bwc_add_to_cart_params\b/.test(inlineScriptText))
    add("woocommerce", "wc_add_to_cart_params inline script variable");

  // Shopify
  if (assetHrefs.some((h) => /cdn\.shopify\.com/i.test(h))) add("shopify", "asset served from cdn.shopify.com");
  if (/\bShopify\.(shop|theme)\b/.test(inlineScriptText)) add("shopify", "Shopify.shop/theme inline script object");
  if (headers["x-shopid"] || headers["x-shopify-stage"]) add("shopify", "X-ShopId/X-Shopify-Stage response header");
  if ($('meta[name="shopify-digital-wallet" i]').length) add("shopify", 'meta name="shopify-digital-wallet"');

  // Webflow
  if ("data-wf-site" in htmlAttrs || "data-wf-page" in htmlAttrs)
    add("webflow", "data-wf-site/data-wf-page attribute on <html>");
  if (assetHrefs.some((h) => /assets-global\.website-files\.com|\.webflow\.io/i.test(h)))
    add("webflow", "asset served from website-files.com/webflow.io");

  // Wix
  if (assetHrefs.some((h) => /static\.wixstatic\.com|static\.parastorage\.com/i.test(h)))
    add("wix", "asset served from wixstatic.com/parastorage.com");
  if (generator.includes("wix.com")) add("wix", `meta generator: "${generator}"`);

  // Squarespace
  if (assetHrefs.some((h) => /squarespace\.com|sqsp\.net/i.test(h)))
    add("squarespace", "asset served from squarespace.com/sqsp.net");
  if (generator.includes("squarespace")) add("squarespace", `meta generator: "${generator}"`);

  // Magento
  if (assetHrefs.some((h) => /\/static\/version\d+\/frontend\//i.test(h)))
    add("magento", "asset path /static/version<N>/frontend/ (Magento 2 static asset signature)");
  if (/\bMage\.Cookies\b|\brequire\.config\(\{[^)]*mage/i.test(inlineScriptText))
    add("magento", "Mage.Cookies or RequireJS mage config inline script reference");

  // PrestaShop
  if (/\bprestashop\b/i.test(inlineScriptText)) add("prestashop", "prestashop inline script object");
  if (generator.includes("prestashop")) add("prestashop", `meta generator: "${generator}"`);

  // OpenCart
  if (generator.includes("opencart")) add("opencart", `meta generator: "${generator}"`);
  if (assetHrefs.some((h) => /catalog\/view\/(theme|javascript)\//i.test(h)))
    add("opencart", "asset path catalog/view/theme|javascript/ (OpenCart default theme layout)");

  // Next.js
  if ($("#__next_data__,#__NEXT_DATA__").length || /__NEXT_DATA__/.test(inlineScriptText))
    add("nextjs", "#__NEXT_DATA__ script tag");
  if (assetHrefs.some((h) => /\/_next\//i.test(h))) add("nextjs", "asset path under /_next/");

  // Nuxt
  if (/window\.__NUXT__/.test(inlineScriptText)) add("nuxt", "window.__NUXT__ inline script object");
  if (assetHrefs.some((h) => /\/_nuxt\//i.test(h))) add("nuxt", "asset path under /_nuxt/");

  // Angular
  const ngVersion = Object.entries(htmlAttrs).find(([k]) => k.toLowerCase() === "ng-version");
  if (ngVersion) add("angular", `ng-version="${ngVersion[1]}" attribute`);

  // Laravel (weak signal: only visible via response headers/cookies, no client markup)
  if (/laravel_session|xsrf-token/i.test(setCookie)) add("laravel", "laravel_session/XSRF-TOKEN cookie in Set-Cookie");

  const grouped = new Map<PlatformId, string[]>();
  for (const s of signals) grouped.set(s.id, [...(grouped.get(s.id) || []), s.evidence]);
  // A platform's own self-declared "generator" meta tag, or a framework's
  // distinctive runtime marker (a named global data script, a version
  // attribute), is specific enough to trust on its own; a single generic
  // asset-path substring match alone is weaker and stays "low"/uncertain
  // until corroborated by a second independent signal.
  const strongAlone = (evidence: string) =>
    /meta generator|__NEXT_DATA__|__NUXT__|ng-version=|X-ShopId|X-Shopify-Stage|shopify-digital-wallet|https:\/\/api\.w\.org/i.test(evidence);
  const platforms = [...grouped.entries()]
    .map(([id, evidence]) => ({
      id,
      evidence,
      confidence:
        evidence.length >= 2
          ? ("high" as const)
          : evidence.some(strongAlone)
            ? ("medium" as const)
            : ("low" as const),
    }))
    .sort((a, b) => b.evidence.length - a.evidence.length);
  const ecommerceIds: PlatformId[] = ["woocommerce", "shopify", "magento", "prestashop", "opencart"];
  const frameworkIds: PlatformId[] = ["nextjs", "nuxt", "angular"];
  return {
    platforms,
    ecommerce: platforms.filter((p) => ecommerceIds.includes(p.id)).map((p) => p.id),
    framework: platforms.filter((p) => frameworkIds.includes(p.id)).map((p) => p.id),
    uncertain: platforms.length === 0 || platforms[0].confidence === "low",
    note:
      platforms.length === 0
        ? "No recognized platform signature found in this page's HTML/headers. This may be a custom stack, a static site, or a platform this detector does not yet recognize — it is not evidence of any specific technology."
        : "Based on observable markup, asset paths and headers from one fetched page only. A low-confidence match (a single weak signal) is reported as uncertain rather than asserted.",
  };
}
