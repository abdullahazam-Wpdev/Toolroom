import { describe, it, expect } from "vitest";
import { detectPlatform } from "../apps/web/src/lib/platform-detect";
describe("Platform detection (evidence-based, no fabricated identifications)", () => {
  it("identifies WordPress from generator meta and wp-content assets with high confidence", () => {
    const html = `<html><head><meta name="generator" content="WordPress 6.4"><link rel="stylesheet" href="/wp-content/themes/x/style.css"></head><body></body></html>`;
    const result = detectPlatform(html);
    const wp = result.platforms.find((p) => p.id === "wordpress");
    expect(wp?.confidence).toBe("high");
    expect(result.uncertain).toBe(false);
  });
  it("identifies WooCommerce alongside WordPress from plugin asset paths", () => {
    const html = `<html><head><link href="/wp-content/plugins/woocommerce/assets/css/x.css"></head><body class="woocommerce"></body></html>`;
    const result = detectPlatform(html);
    expect(result.ecommerce).toContain("woocommerce");
  });
  it("identifies Shopify from CDN asset host and response header", () => {
    const html = `<html><head><script src="https://cdn.shopify.com/s/files/x.js"></script></head></html>`;
    const result = detectPlatform(html, { "x-shopid": "12345" });
    const shopify = result.platforms.find((p) => p.id === "shopify");
    expect(shopify?.confidence).toBe("high");
    expect(result.ecommerce).toContain("shopify");
  });
  it("identifies Next.js from __NEXT_DATA__ with medium confidence on a single signal", () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">{}</script></body></html>`;
    const result = detectPlatform(html);
    const next = result.platforms.find((p) => p.id === "nextjs");
    expect(next?.confidence).toBe("medium");
    expect(result.framework).toContain("nextjs");
  });
  it("identifies Angular from ng-version attribute", () => {
    const html = `<html ng-version="17.0.0"><body></body></html>`;
    const result = detectPlatform(html);
    expect(result.platforms.find((p) => p.id === "angular")).toBeTruthy();
  });
  it("reports uncertain rather than guessing when no signals are present", () => {
    const result = detectPlatform("<html><body><p>Plain static page.</p></body></html>");
    expect(result.platforms).toHaveLength(0);
    expect(result.uncertain).toBe(true);
    expect(result.note).toContain("No recognized platform signature");
  });
  it("having a blog does not imply WordPress without supporting evidence", () => {
    const result = detectPlatform(
      `<html><body><article><h1>My blog post</h1><p>Some content about blogging.</p></article></body></html>`,
    );
    expect(result.platforms.map((p) => p.id)).not.toContain("wordpress");
  });
});
