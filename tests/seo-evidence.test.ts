import { describe, it, expect } from "vitest";
import {
  additionalSeoEvidence,
  hreflangReciprocity,
} from "../apps/web/src/lib/seo-evidence";
import { findingsCsv } from "../apps/web/src/lib/report-csv";
describe("Additional source SEO evidence", () => {
  it("checks WordPress reply variants from an explicit generator", () => {
    const r = additionalSeoEvidence(
      '<meta name="generator" content="WordPress 6"><a href="/?replytocom=12">Reply</a>',
      "https://example.com",
    );
    expect(r.checks.find((c) => c.id === "wordpress-reply-links")?.status).toBe(
      "warning",
    );
  });
  it("reports alternate syntax and missing self references", () => {
    const r = additionalSeoEvidence(
      '<link rel="alternate" hreflang="en-UK" href="/relative">',
      "https://example.com/",
    );
    expect(r.checks.find((c) => c.id === "hreflang-syntax")?.status).toBe(
      "warning",
    );
    expect(r.checks.find((c) => c.id === "hreflang-self")?.status).toBe(
      "warning",
    );
  });
  it("does not infer return links for pages outside the crawl", () => {
    const a = {
      url: "https://example.com/en",
      alternates: [{ lang: "fr", href: "https://example.com/fr" }],
    };
    expect(hreflangReciprocity([a])[0].status).toBe("not-tested");
    expect(
      hreflangReciprocity([
        a,
        { url: "https://example.com/fr", alternates: [] },
      ])[0].status,
    ).toBe("warning");
    expect(
      hreflangReciprocity([
        a,
        {
          url: "https://example.com/fr",
          alternates: [{ lang: "en", href: a.url }],
        },
      ])[0].status,
    ).toBe("pass");
  });
  it("fingerprints normalized main text excluding navigation and short boilerplate", () => {
    const content = "Useful original article content. ".repeat(12);
    const a = additionalSeoEvidence(
      `<nav>one</nav><main>${content}</main>`,
      "https://example.com",
    );
    const b = additionalSeoEvidence(
      `<nav>two</nav><main>${content.toUpperCase()}</main>`,
      "https://example.com/other",
    );
    expect(a.contentFingerprint).toBe(b.contentFingerprint);
    expect(a.contentFingerprint).toHaveLength(64);
    expect(
      additionalSeoEvidence("<main>short</main>", "https://example.com")
        .contentFingerprint,
    ).toBeNull();
  });
  it("exports quoted CSV with formula neutralization and Unicode preserved", () => {
    const r = additionalSeoEvidence(
      '<link rel="alternate" hreflang="en" href="https://example.com/">',
      "https://example.com/",
    );
    r.checks[0].evidence = ' \t=HYPERLINK("bad")\n日本語';
    const csv = findingsCsv([
      { url: "https://example.com/", checks: r.checks },
    ]);
    expect(csv).toContain('"\' \t=HYPERLINK(""bad"")\n日本語"');
    expect(csv).toContain("\r\n");
  });
  it('validates selected Shopify product fields without claiming eligibility',()=>{
    const html='<script src="https://cdn.shopify.com/theme.js"></script><script>Shopify.shop="store"</script><script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Product',name:'Camera',offers:{price:false,priceCurrency:'usd'}}]})+'</script>';
    const r=additionalSeoEvidence(html,'https://example.com/products/camera');
    expect(r.checks.find(c=>c.id==='commerce-product-jsonld')?.status).toBe('pass');
    expect(r.checks.find(c=>c.id==='commerce-product-fields')?.status).toBe('warning');
    expect(r.checks.find(c=>c.id==='commerce-product-fields')?.evidence).toContain('price');
  });
  it('leaves platform product checks absent when platform evidence is uncorroborated',()=>{
    const r=additionalSeoEvidence('<body class="woocommerce single-product"></body>','https://example.com/product/camera');
    expect(r.checks.some(c=>c.id==='commerce-product-jsonld')).toBe(false);
  });
  it("flags WordPress pages with heavy Elementor DOM nesting but not plain WordPress pages", () => {
    const heavy = `<meta name="generator" content="WordPress 6"><div>${'<div class="elementor-element elementor-element-abc123">x</div>'.repeat(450)}</div>`;
    const r = additionalSeoEvidence(heavy, "https://example.com/");
    expect(
      r.checks.find((c) => c.id === "wordpress-elementor-dom-complexity")
        ?.status,
    ).toBe("warning");
    const light = `<meta name="generator" content="WordPress 6"><div class="elementor-element">x</div>`;
    expect(
      additionalSeoEvidence(light, "https://example.com/").checks.find(
        (c) => c.id === "wordpress-elementor-dom-complexity",
      )?.status,
    ).toBe("pass");
    const plain = `<meta name="generator" content="WordPress 6"><p>No builder here.</p>`;
    expect(
      additionalSeoEvidence(plain, "https://example.com/").checks.some(
        (c) => c.id === "wordpress-elementor-dom-complexity",
      ),
    ).toBe(false);
  });
  it("flags an unrecognized Shopify offer availability value and passes a valid one", () => {
    const bad = `<script src="https://cdn.shopify.com/theme.js"></script><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Mug", offers: { price: 10, priceCurrency: "USD", availability: "Maybe" } })}</script>`;
    const r = additionalSeoEvidence(bad, "https://example.com/products/mug", { "x-shopid": "1" });
    expect(r.checks.find((c) => c.id === "commerce-product-fields")?.status).toBe(
      "warning",
    );
    expect(
      r.checks.find((c) => c.id === "commerce-product-fields")?.evidence,
    ).toContain("availability");
    const good = `<script src="https://cdn.shopify.com/theme.js"></script><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Mug", offers: { price: 10, priceCurrency: "USD", availability: "https://schema.org/InStock" } })}</script>`;
    expect(
      additionalSeoEvidence(good, "https://example.com/products/mug", { "x-shopid": "1" }).checks.find(
        (c) => c.id === "commerce-product-fields",
      )?.status,
    ).toBe("pass");
  });
  it("flags a missing product BreadcrumbList and passes when one is present", () => {
    const withoutCrumbs = `<script src="https://cdn.shopify.com/theme.js"></script><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Mug" })}</script>`;
    expect(
      additionalSeoEvidence(withoutCrumbs, "https://example.com/products/mug", { "x-shopid": "1" }).checks.find(
        (c) => c.id === "commerce-breadcrumbs",
      )?.status,
    ).toBe("warning");
    const withCrumbs = `<script src="https://cdn.shopify.com/theme.js"></script><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Mug" })}</script><script type="application/ld+json">${JSON.stringify({ "@type": "BreadcrumbList", itemListElement: [] })}</script>`;
    expect(
      additionalSeoEvidence(withCrumbs, "https://example.com/products/mug", { "x-shopid": "1" }).checks.find(
        (c) => c.id === "commerce-breadcrumbs",
      )?.status,
    ).toBe("pass");
  });
  it("flags a Shopify collection-prefixed product URL whose canonical does not point to the bare product URL", () => {
    const mismatched = `<script src="https://cdn.shopify.com/theme.js"></script><link rel="canonical" href="https://example.com/collections/mugs/products/camp-mug">`;
    const r = additionalSeoEvidence(
      mismatched,
      "https://example.com/collections/mugs/products/camp-mug",
      { "x-shopid": "1" },
    );
    expect(
      r.checks.find((c) => c.id === "shopify-collection-product-canonical")
        ?.status,
    ).toBe("warning");
    const correct = `<script src="https://cdn.shopify.com/theme.js"></script><link rel="canonical" href="https://example.com/products/camp-mug">`;
    expect(
      additionalSeoEvidence(
        correct,
        "https://example.com/collections/mugs/products/camp-mug",
        { "x-shopid": "1" },
      ).checks.find((c) => c.id === "shopify-collection-product-canonical")
        ?.status,
    ).toBe("pass");
  });
  it("flags a paginated Shopify collection page with no rel=prev link", () => {
    const html = `<script src="https://cdn.shopify.com/theme.js"></script>`;
    const r = additionalSeoEvidence(
      html,
      "https://example.com/collections/mugs?page=2",
      { "x-shopid": "1" },
    );
    expect(
      r.checks.find((c) => c.id === "shopify-pagination-signals")?.status,
    ).toBe("warning");
    const withPrev = `<script src="https://cdn.shopify.com/theme.js"></script><link rel="prev" href="https://example.com/collections/mugs?page=1">`;
    expect(
      additionalSeoEvidence(
        withPrev,
        "https://example.com/collections/mugs?page=2",
        { "x-shopid": "1" },
      ).checks.find((c) => c.id === "shopify-pagination-signals")?.status,
    ).toBe("pass");
    expect(
      additionalSeoEvidence(html, "https://example.com/collections/mugs", { "x-shopid": "1" }).checks.some(
        (c) => c.id === "shopify-pagination-signals",
      ),
    ).toBe(false);
  });
});
