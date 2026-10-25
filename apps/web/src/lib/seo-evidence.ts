import { load } from "cheerio";
import { createHash } from "node:crypto";
import { detectPlatform } from "./platform-detect.ts";
import type { Check } from "./audit.ts";
export function additionalSeoEvidence(
  html: string,
  url: string,
  headers: Record<string, string> = {},
) {
  const $ = load(html),
    platform = detectPlatform(html, headers),
    checks: Check[] = [];
  const add = (
    id: string,
    title: string,
    status: Check["status"],
    evidence: string,
    recommendation: string,
    category: Check["category"] = "technical",
  ) =>
    checks.push({
      id,
      title,
      status,
      evidence,
      recommendation,
      category,
      priority: "medium",
      effort: "small",
    });
  const main = $('main,[role="main"],article').first().clone();
  const content = main.length ? main : $("body").clone();
  content.find("script,style,noscript,nav,footer,header").remove();
  const text = content.text().replace(/\s+/g, " ").trim();
  const contentFingerprint =
    text.length >= 200
      ? createHash("sha256").update(text.toLocaleLowerCase("en")).digest("hex")
      : null;
  const alternates = $('link[rel~="alternate" i][hreflang]')
    .slice(0, 100)
    .map((_, e) => ({
      lang: ($(e).attr("hreflang") || "").trim(),
      raw: $(e).attr("href") || "",
    }))
    .get();
  const issues: string[] = [],
    seen = new Map<string, string>();
  for (const entry of alternates) {
    const code = entry.lang.toLowerCase();
    if (
      code !== "x-default" &&
      !/^[a-z]{2}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?$/i.test(code)
    )
      issues.push(
        `Unsupported language-tag shape: ${entry.lang || "(empty)"}.`,
      );
    if (/-(?:uk|eu|un)$/i.test(code))
      issues.push(
        `Unsupported region in ${entry.lang}; use an ISO region (GB for the United Kingdom).`,
      );
    let target = "";
    try {
      const parsed = new URL(entry.raw);
      if (
        !["https:", "http:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
      target = parsed.href;
      if (parsed.hash) issues.push(`Fragment in ${entry.lang} alternate URL.`);
    } catch {
      issues.push(
        `Alternate ${entry.lang || "(empty)"} needs an absolute HTTP(S) URL.`,
      );
    }
    if (seen.has(code) && seen.get(code) !== target)
      issues.push(`Conflicting targets for ${entry.lang}.`);
    seen.set(code, target);
  }
  if (alternates.length) {
    add(
      "hreflang-syntax",
      "HTML hreflang syntax",
      issues.length ? "warning" : "pass",
      issues.length
        ? issues.join(" ")
        : `${alternates.length} HTML alternates have supported tag shapes and absolute URLs. Language/region registry membership and HTTP/sitemap declarations are not fully validated.`,
      "Use supported language/region codes and fully qualified alternate URLs. Each language code should identify one intended target.",
    );
    const canonical = $('link[rel~="canonical" i]').first().attr("href");
    let self = url;
    try {
      if (canonical) self = new URL(canonical, url).href;
    } catch {}
    const hasSelf = alternates.some((a) => {
      try {
        return new URL(a.raw).href === self;
      } catch {
        return false;
      }
    });
    add(
      "hreflang-self",
      "HTML hreflang self-reference",
      hasSelf ? "pass" : "warning",
      hasSelf
        ? "The HTML alternate set includes this page or its declared canonical."
        : "No self-reference found in this page’s HTML alternate set. HTTP/sitemap declarations were not inspected.",
      "Include this page alongside its language alternates; verify the same complete set on alternate pages.",
    );
  }
  const strong = new Set(
    platform.platforms.filter((p) => p.confidence !== "low").map((p) => p.id),
  );
  if (strong.has("wordpress")) {
    const replies = $("a[href]")
      .map((_, e) => $(e).attr("href") || "")
      .get()
      .filter((h) => {
        try {
          return new URL(h, url).searchParams.has("replytocom");
        } catch {
          return false;
        }
      });
    if (replies.length)
      add(
        "wordpress-reply-links",
        "WordPress comment reply URL variants",
        "warning",
        `${replies.length} HTML links contain replytocom query parameters.`,
        "Review whether comment reply variants create crawl duplication; keep intended comment behavior and verify canonical handling.",
        "links",
      );
    const target = new URL(url);
    if (target.searchParams.has("p"))
      add(
        "wordpress-query-permalink",
        "WordPress query-style permalink",
        "warning",
        "The inspected URL includes a p query parameter.",
        "Review readable permalink settings and redirect/canonical behavior before changing existing URLs.",
      );
  }
  const productPage =
    (strong.has("woocommerce") &&
      ($("body.single-product,.woocommerce div.product").length > 0 ||
        /^\/product\//.test(new URL(url).pathname))) ||
    (strong.has("shopify") && /\/products\/[^/]+/.test(new URL(url).pathname));
  if (productPage) {
    const products: Record<string, unknown>[] = [];
    let invalid = 0;
    $('script[type="application/ld+json" i]')
      .slice(0, 20)
      .each((_, e) => {
        try {
          const pending: unknown[] = [JSON.parse($(e).text())];
          let visited = 0;
          while (pending.length && visited++ < 500) {
            const node = pending.shift();
            if (Array.isArray(node)) {
              pending.push(...node.slice(0, 100));
              continue;
            }
            if (!node || typeof node !== "object") continue;
            const record = node as Record<string, unknown>,
              types = Array.isArray(record["@type"])
                ? record["@type"]
                : [record["@type"]];
            if (types.includes("Product")) products.push(record);
            for (const value of Object.values(record))
              if (value && typeof value === "object") pending.push(value);
          }
        } catch {
          invalid++;
        }
      });
    add(
      "commerce-product-jsonld",
      "Product-page JSON-LD",
      products.length ? "pass" : "warning",
      `${products.length} Product node(s) in ${strong.has("shopify") ? "Shopify" : "WooCommerce"} product-page HTML; ${invalid} invalid JSON block(s). Microdata and JavaScript-injected schema are not inspected here.`,
      "Review accurate Product markup against the intended Google product feature; an HTML-only absence is not proof that rendered markup is missing.",
      "social",
    );
    const productIssues: string[] = [];
    for (const product of products) {
      if (typeof product.name !== "string" || !product.name.trim())
        productIssues.push("Product lacks a text name.");
      const offers = Array.isArray(product.offers)
        ? product.offers
        : product.offers
          ? [product.offers]
          : [];
      for (const raw of offers.slice(0, 20)) {
        if (!raw || typeof raw !== "object") continue;
        const offer = raw as Record<string, unknown>;
        if (
          offer.price !== undefined &&
          (!["string", "number"].includes(typeof offer.price) ||
            String(offer.price).trim() === "" ||
            !Number.isFinite(Number(offer.price)) ||
            Number(offer.price) < 0)
        )
          productIssues.push("Offer price is not a nonnegative number.");
        if (
          offer.priceCurrency !== undefined &&
          !/^[A-Z]{3}$/.test(String(offer.priceCurrency))
        )
          productIssues.push(
            "Offer currency is not a three-letter uppercase code.",
          );
      }
    }
    if (products.length)
      add(
        "commerce-product-fields",
        "Selected Product/Offer fields",
        productIssues.length ? "warning" : "pass",
        productIssues.length
          ? [...new Set(productIssues)].join(" ")
          : "Observed Product names and supplied price/currency fields passed selected shape checks. This does not establish rich-result eligibility.",
        "Match names, prices and currencies to visible product information and validate the intended schema with Google’s testing tools.",
        "social",
      );
    const ids = products
      .map((p) => p["@id"])
      .filter((id): id is string => typeof id === "string");
    if (new Set(ids).size < ids.length)
      add(
        "commerce-duplicate-schema",
        "Repeated Product identifiers",
        "warning",
        "Multiple Product JSON-LD nodes use the same @id.",
        "Review theme/app/plugin output for duplicate or conflicting product declarations; repeated nodes are not automatically invalid.",
        "social",
      );
  }
  if (
    strong.has("nextjs") ||
    $('script[src*="react"],#root[data-reactroot],#root:empty').length
  ) {
    add(
      "javascript-source-content",
      "JavaScript page source content",
      text.length < 40 ? "warning" : "pass",
      `${text.length} normalized main/body text characters in the server HTML. Rendered DOM, visibility, hydration and Google indexing were not tested.`,
      "Compare initial HTML with a sandboxed rendered audit. Provide crawlable links and meaningful content appropriate to the page.",
    );
  }
  return {
    checks,
    platform,
    contentFingerprint,
    contentCharacters: text.length,
    alternates: alternates.map((a) => ({ lang: a.lang, href: a.raw })),
  };
}
export function hreflangReciprocity(
  pages: { url: string; alternates: { lang: string; href: string }[] }[],
) {
  const lookup = new Map(pages.map((p) => [p.url, p]));
  return pages.flatMap((source) =>
    source.alternates
      .filter((a) => a.lang.toLowerCase() !== "x-default")
      .map((a) => {
        let target: typeof source | undefined;
        try {
          target = lookup.get(new URL(a.href).href);
        } catch {}
        if (!target)
          return {
            source: source.url,
            target: a.href,
            lang: a.lang,
            status: "not-tested" as const,
            evidence:
              "Target was not available in the crawled page set; no extra request was made.",
          };
        const back =
          target.url === source.url ||
          target.alternates.some((link) => {
            try {
              return new URL(link.href).href === source.url;
            } catch {
              return false;
            }
          });
        return {
          source: source.url,
          target: a.href,
          lang: a.lang,
          status: back ? ("pass" as const) : ("warning" as const),
          evidence: back
            ? "Return link found in the crawled HTML alternate sets."
            : "No return link found in the target’s HTML alternate set; HTTP/sitemap alternatives remain unverified.",
        };
      }),
  );
}
