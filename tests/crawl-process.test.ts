import { describe, it, expect } from "vitest";
import { validateCrawlTier } from "../packages/jobs/crawl-process.ts";
describe("Background crawl job tier validation", () => {
  it("accepts the documented tiers only", () => {
    expect(validateCrawlTier(100)).toBe(100);
    expect(validateCrawlTier(500)).toBe(500);
    expect(validateCrawlTier(1000)).toBe(1000);
  });
  it("rejects an arbitrary page count, including one between tiers", () => {
    expect(() => validateCrawlTier(50)).toThrow();
    expect(() => validateCrawlTier(250)).toThrow();
    expect(() => validateCrawlTier(0)).toThrow();
    expect(() => validateCrawlTier(-100)).toThrow();
  });
});
