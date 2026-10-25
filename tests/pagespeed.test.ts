import { describe, it, expect, vi } from "vitest";
import {
  normalizePageSpeed,
  queryPageSpeed,
} from "../apps/web/src/lib/pagespeed";
vi.mock("../apps/web/src/lib/safe-fetch", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../apps/web/src/lib/safe-fetch")>();
  return {
    ...actual,
    resolvePublic: vi.fn(async () => ({ address: "93.184.216.34", family: 4 })),
  };
});
const fixture = {
  lighthouseResult: {
    finalUrl: "https://example.com/",
    categories: { performance: { score: 0.92 }, seo: { score: 0.88 } },
    audits: {
      "largest-contentful-paint": {
        numericValue: 1500,
        numericUnit: "millisecond",
        displayValue: "1.5 s",
      },
      "sample-opportunity": {
        title: "Reduce images",
        description: "Optimize image bytes.",
        details: { type: "opportunity", overallSavingsMs: 250 },
      },
    },
  },
};
describe("PageSpeed adapter", () => {
  it("keeps missing scores and field metrics null and extracts actual opportunities", () => {
    const report = normalizePageSpeed(fixture);
    expect(report.scores.performance).toBe(92);
    expect(report.scores.accessibility).toBeNull();
    expect(report.field.available).toBe(false);
    expect(report.field.inp.percentile).toBeNull();
    expect(report.lab.lcp.display).toBe("1.5 s");
    expect(report.opportunities[0].savingsMs).toBe(250);
  });
  it("supports desktop with the official endpoint and four categories", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(fixture)));
    const report = await queryPageSpeed(
      "https://example.com",
      "desktop",
      request,
    );
    expect(report.strategy).toBe("desktop");
    const url = new URL(request.mock.calls[0][0]);
    expect(url.hostname).toBe("www.googleapis.com");
    expect(url.searchParams.get("strategy")).toBe("desktop");
    expect(url.searchParams.getAll("category")).toHaveLength(4);
  });
  it("handles quota failures and invalid result payloads honestly", async () => {
    await expect(
      queryPageSpeed(
        "https://example.com",
        "mobile",
        vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
      ),
    ).rejects.toThrow("quota");
    expect(() => normalizePageSpeed({})).toThrow("no Lighthouse");
  });
});
