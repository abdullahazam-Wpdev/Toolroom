import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import {
  analyzeHtml,
  scoreAudit,
  type AuditReport,
} from "../apps/web/src/lib/audit";
import { auditPdf } from "../apps/web/src/lib/report-pdf";
import { parseRobots, parseSitemap } from "../apps/web/src/lib/technical";
const html = readFileSync("tests/fixtures/seo-page.html", "utf8");
describe("evidence-based static audit", () => {
  it("reports exact fixture inventories and distinct decorative alt states", () => {
    const r = analyzeHtml(html, "https://example.com/fixture");
    expect(r.headingCounts).toEqual({
      h1: 1,
      h2: 1,
      h3: 1,
      h4: 0,
      h5: 0,
      h6: 0,
    });
    expect(r.linkCounts).toMatchObject({
      internal: 2,
      external: 1,
      unique: 2,
      nofollow: 1,
      sponsored: 1,
      ugc: 1,
    });
    expect(r.images).toHaveLength(3);
    expect(r.images[0].alt).toBeNull();
    expect(r.images[1].decorative).toBe(true);
    expect(r.checks.find((c) => c.id === "heading-order")?.status).toBe(
      "warning",
    );
    expect(r.metadata.canonical).toBe("https://example.com/fixture");
  });
  it("does not pass unavailable measurements or label multiple H1s a penalty", () => {
    const r = analyzeHtml(
      '<h1>One</h1><h1>Two</h1><script type="application/ld+json">invalid</script>',
      "https://example.com",
    );
    expect(r.checks.find((c) => c.id === "status")?.status).toBe("not-tested");
    expect(r.checks.find((c) => c.id === "broken-links")?.status).toBe(
      "not-tested",
    );
    expect(r.checks.find((c) => c.id === "h1")?.evidence).toContain(
      "not automatically",
    );
    expect(r.checks.find((c) => c.id === "schema")?.status).toBe("warning");
  });
  it("calculates score from tested categories and reports coverage", () => {
    const r = analyzeHtml(html, "https://example.com");
    const scores = scoreAudit(r.checks);
    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(scores.tested).toBeLessThan(scores.total);
    expect(scoreAudit([]).overall).toBeNull();
  });
  it("generates a real readable multi-page PDF", async () => {
    const base = analyzeHtml(html, "https://example.com");
    const report = {
      ...base,
      scores: scoreAudit(base.checks),
      auxiliary: [],
      httpStatus: null,
      coverage: "Pasted source; network checks not tested.",
    } as AuditReport;
    const bytes = await auditPdf(report);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
describe("technical documents", () => {
  it("parses robots inventory with group/syntax warnings and sitemap URL checks", () => {
    const r = parseRobots(
      "Disallow: /private\nUser-agent: *\nAllow: /public\nSitemap: https://example.com/sitemap.xml\nBad line",
    );
    expect(r.directives).toHaveLength(4);
    expect(r.warnings).toHaveLength(2);
    expect(r.sitemaps[0].valid).toBe(true);
  });
  it("validates sitemap XML and counts duplicate/invalid locations", () => {
    const r = parseSitemap(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/a</loc></url><url><loc>http://127.0.0.1/</loc></url></urlset>',
    );
    expect(r.total).toBe(3);
    expect(r.duplicates).toBe(1);
    expect(r.invalid).toBe(1);
  });
  it("rejects DTD/entities and malformed or wrong-root documents", () => {
    expect(() =>
      parseSitemap(
        '<!DOCTYPE a [<!ENTITY secret SYSTEM "file:///etc/passwd">]><urlset/>',
      ),
    ).toThrow("DTD");
    expect(() => parseSitemap("<urlset>")).toThrow("Invalid XML");
    expect(() => parseSitemap("<html/>")).toThrow("root");
  });
});
