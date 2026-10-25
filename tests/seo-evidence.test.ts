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

});
