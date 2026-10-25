import { describe, it, expect } from "vitest";
import { renderedAudit } from "../packages/jobs/rendered-audit.ts";
describe("JS-rendered audit: input validation (no browser/network needed)", () => {
  it("rejects a private-network target before any fetch or browser launch", async () => {
    await expect(renderedAudit("http://169.254.169.254/")).rejects.toThrow();
    await expect(renderedAudit("http://127.0.0.1:9999/")).rejects.toThrow();
    await expect(renderedAudit("http://localhost/")).rejects.toThrow();
  });
  it("rejects a malformed or non-HTTP(S) URL", async () => {
    await expect(renderedAudit("not a url")).rejects.toThrow();
    await expect(renderedAudit("ftp://example.com/file")).rejects.toThrow();
  });
});
