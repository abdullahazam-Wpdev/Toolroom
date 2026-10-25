import { describe, it, expect } from "vitest";
import {
  auditSite,
  robotsAllowed,
  robotsCrawlDelayMs,
  structuredDataEvidence,
  discoverSitemapUrls,
} from "../apps/web/src/lib/site-audit";
import type { NetworkResponse } from "../apps/web/src/lib/safe-fetch";
const response = (
  url: string,
  body: string,
  status = 200,
): NetworkResponse => ({
  url,
  status,
  headers: { "content-type": "text/html" },
  body: Buffer.from(body),
  redirects: [],
});
describe("Bounded website audit", () => {
  it("honors disallow/allow precedence and wildcard paths", () => {
    expect(
      robotsAllowed(
        "User-agent: *\nDisallow: /private\nAllow: /private/public",
        "/private/a",
      ),
    ).toBe(false);
    expect(
      robotsAllowed(
        "User-agent: *\nDisallow: /private\nAllow: /private/public",
        "/private/public",
      ),
    ).toBe(true);
    expect(robotsAllowed("User-agent: *\nDisallow: /draft*", "/draft-2")).toBe(
      false,
    );
  });
  it("distinguishes malformed JSON and selected missing fields", () => {
    const evidence = structuredDataEvidence(
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script><script type="application/ld+json">broken</script>',
    );
    expect(evidence[0].issues).toContain("Missing headline for Article.");
    expect(evidence[1].issues).toContain("Invalid JSON-LD syntax.");
  });
  it("crawls actual linked HTML fixtures, respects robots, and distinguishes inaccessible links from broken", async () => {
    const visited: string[] = [];
    const fetcher = async (url: string) => {
      visited.push(url);
      if (url.endsWith("/robots.txt"))
        return response(url, "User-agent: *\nDisallow: /private");
      if (url.endsWith("/missing")) return response(url, "missing", 404);
      if (url.endsWith("/denied")) return response(url, "denied", 403);
      if (url.endsWith("/timeout")) throw new Error("timed out");
      return response(
        url,
        '<html lang="en"><title>Shared title</title><h1>Heading</h1><a href="/second">Second</a><a href="/private">Private</a><a href="/missing">Missing</a><a href="/denied">Denied</a><a href="/timeout">Timeout</a><a href="https://external.example/">External</a></html>',
      );
    };
    const result = await auditSite("https://example.com/", {}, fetcher);
    expect(result.pages.length).toBeLessThanOrEqual(10);
    expect(visited).not.toContain("https://example.com/private");
    expect(visited.some((s) => s.includes("external.example"))).toBe(false);
    expect(result.links.find((l) => l.url.endsWith("/missing"))?.broken).toBe(
      true,
    );
    expect(
      result.links.find((l) => l.url.endsWith("/denied"))?.broken,
    ).toBeNull();
    expect(
      result.links.find((l) => l.url.endsWith("/timeout"))?.broken,
    ).toBeNull();
    expect(result.duplicateTitles.length).toBeGreaterThan(0);
    expect(result.budget.requests).toBeLessThanOrEqual(80);
  });
  it("fails conservatively when robots permissions cannot be checked", async () => {
    await expect(
      auditSite("https://example.com", {}, async (url) =>
        response(url, "denied", 403),
      ),
    ).rejects.toThrow("robots");
  });
  it("rejects private targets before any network request", async () => {
    await expect(auditSite("http://127.0.0.1")).rejects.toThrow("Private");
  });
  it("seeds the crawl queue from a real sitemap, including pages not linked from the homepage", async () => {
    const visited: string[] = [];
    const fetcher = async (url: string) => {
      visited.push(url);
      if (url.endsWith("/robots.txt")) return response(url, "User-agent: *");
      if (url.endsWith("/sitemap.xml"))
        return response(
          url,
          '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url><url><loc>https://example.com/orphan</loc></url></urlset>',
        );
      return response(url, "<html><title>Page</title></html>");
    };
    // The generic response() helper always sets content-type text/html; give
    // the sitemap response an XML content-type explicitly so parseSitemap runs.
    const xmlFetcher = async (url: string) => {
      const r = await fetcher(url);
      if (url.endsWith("/sitemap.xml"))
        return { ...r, headers: { "content-type": "application/xml" } };
      return r;
    };
    const result = await auditSite("https://example.com/", {}, xmlFetcher);
    expect(result.sitemapDiscovery.found).toBe(true);
    expect(result.sitemapDiscovery.totalUrls).toBe(2);
    expect(visited).toContain("https://example.com/orphan");
    expect(result.pages.some((p) => p.url.endsWith("/orphan"))).toBe(true);
  });
  it("records a missing/unparsable sitemap as evidence without failing the audit", async () => {
    const result = await auditSite("https://example.com/", {}, async (url) =>
      url.endsWith("/robots.txt")
        ? response(url, "User-agent: *")
        : url.endsWith("/sitemap.xml")
          ? response(url, "not xml", 404)
          : response(url, "<html><title>Page</title></html>"),
    );
    expect(result.sitemapDiscovery.found).toBe(false);
    expect(result.pages.length).toBeGreaterThan(0);
  });
  it("reports platform signals from the first fetched page", async () => {
    const result = await auditSite("https://example.com/", {}, async (url) =>
      url.endsWith("/robots.txt")
        ? response(url, "User-agent: *")
        : url.endsWith("/sitemap.xml")
          ? response(url, "missing", 404)
          : response(
              url,
              '<html><head><meta name="generator" content="WordPress 6.4"></head><body></body></html>',
            ),
    );
    expect(result.platform.platforms.map((p) => p.id)).toContain("wordpress");
    expect(result.platform.uncertain).toBe(false);
  });
  it("reads a stated Crawl-delay for our user-agent, ignores unrelated agents, and caps a hostile value", () => {
    expect(robotsCrawlDelayMs("User-agent: *\nCrawl-delay: 1")).toBe(1000);
    expect(
      robotsCrawlDelayMs(
        "User-agent: GPTBot\nCrawl-delay: 10\nUser-agent: *\nCrawl-delay: 2",
      ),
    ).toBe(2000);
    expect(robotsCrawlDelayMs("User-agent: *\nCrawl-delay: 999")).toBe(3000);
    expect(robotsCrawlDelayMs("User-agent: *\nDisallow: /")).toBe(0);
  });
  it("follows one level of sitemap-index nesting and aggregates child urlsets", async () => {
    const fetches: string[] = [];
    const fetcher = async (url: string, maxBytes?: number) => {
      fetches.push(url);
      if (url.endsWith("/sitemap.xml"))
        return response(
          url,
          '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.com/sitemap-a.xml</loc></sitemap><sitemap><loc>https://example.com/sitemap-b.xml</loc></sitemap></sitemapindex>',
        );
      if (url.endsWith("/sitemap-a.xml"))
        return response(
          url,
          '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/a1</loc></url></urlset>',
        );
      if (url.endsWith("/sitemap-b.xml"))
        return response(
          url,
          '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/b1</loc></url></urlset>',
        );
      throw new Error("unexpected fetch: " + url);
    };
    const { discovery, urls } = await discoverSitemapUrls(
      "https://example.com",
      fetcher,
      25,
    );
    expect(discovery.found).toBe(true);
    expect(discovery.childSitemapsFetched).toBe(2);
    expect(urls.sort()).toEqual([
      "https://example.com/a1",
      "https://example.com/b1",
    ]);
    expect(fetches).toContain("https://example.com/sitemap-a.xml");
    expect(fetches).toContain("https://example.com/sitemap-b.xml");
  });
  it("one unreachable child sitemap does not fail discovery of the others", async () => {
    const { discovery, urls } = await discoverSitemapUrls(
      "https://example.com",
      async (url) => {
        if (url.endsWith("/sitemap.xml"))
          return response(
            url,
            '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.com/dead.xml</loc></sitemap><sitemap><loc>https://example.com/ok.xml</loc></sitemap></sitemapindex>',
          );
        if (url.endsWith("/dead.xml")) throw new Error("timed out");
        if (url.endsWith("/ok.xml"))
          return response(
            url,
            '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/ok1</loc></url></urlset>',
          );
        throw new Error("unexpected");
      },
      25,
    );
    expect(discovery.childSitemapsFetched).toBe(1);
    expect(urls).toEqual(["https://example.com/ok1"]);
  });
  it("detects an HTML canonical that disagrees with the HTTP Link header canonical during a crawl", async () => {
    const fetcher = async (url: string) => {
      if (url.endsWith("/robots.txt")) return response(url, "User-agent: *");
      if (url.endsWith("/sitemap.xml")) return response(url, "missing", 404);
      return {
        url,
        status: 200,
        headers: {
          "content-type": "text/html",
          link: '<https://example.com/canonical-target>; rel="canonical"',
        },
        body: Buffer.from(
          '<html><head><link rel="canonical" href="https://example.com/different"></head></html>',
        ),
        redirects: [],
      };
    };
    const result = await auditSite("https://example.com/", {}, fetcher);
    expect(result.canonicalConflicts.length).toBeGreaterThan(0);
    expect(result.canonicalConflicts[0].htmlCanonical).toBe(
      "https://example.com/different",
    );
    expect(result.canonicalConflicts[0].httpCanonical).toBe(
      "https://example.com/canonical-target",
    );
  });
  it("categorizes denied (401/403) pages as blocked, distinct from broken links", async () => {
    const fetcher = async (url: string) => {
      if (url.endsWith("/robots.txt")) return response(url, "User-agent: *");
      if (url.endsWith("/sitemap.xml")) return response(url, "missing", 404);
      if (url.endsWith("/admin")) return response(url, "forbidden", 403);
      return response(
        url,
        '<html><title>Home</title><a href="/admin">Admin</a></html>',
      );
    };
    const result = await auditSite("https://example.com/", {}, fetcher);
    const admin = result.outcomes.find((o) => o.url.endsWith("/admin"));
    expect(admin?.category).toBe("blocked");
  });
  it("does not fetch external images without explicit opt-in and groups matching main text", async () => {
    const visited: string[] = [];
    const fetcher = async (url: string) => {
      visited.push(url);
      if (url.endsWith("/robots.txt")) return response(url, "User-agent: *");
      if (url.endsWith("/sitemap.xml")) return response(url, "missing", 404);
      return response(
        url,
        "<main>" +
          "Original useful content. ".repeat(15) +
          '</main><a href="/second">Second</a><img src="https://cdn.external.example/photo.png">',
      );
    };
    const result = await auditSite(
      "https://example.com/",
      { maxPages: 2 },
      fetcher,
    );
    expect(visited.some((u) => u.includes("cdn.external.example"))).toBe(false);
    expect(result.duplicateContent).toHaveLength(1);
    expect(result.duplicateContent[0].urls).toHaveLength(2);
  });
});
