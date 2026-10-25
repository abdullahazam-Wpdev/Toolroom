import { describe, it, expect, vi, afterEach } from "vitest";
import {
  publicUrl,
  isPublicAddress,
  resolvePublic,
  safeFetch,
} from "../apps/web/src/lib/safe-fetch";
import { inspectSocialUrl } from "../packages/core/social";
import * as dns from "node:dns/promises";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
afterEach(() => vi.resetAllMocks());
describe("SSRF boundary", () => {
  it.each([
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://169.254.169.254",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://localhost",
    "http://internal.local",
    "file:///etc/passwd",
    "https://user:pass@example.com",
    "https://example.com:8080",
  ])("rejects %s", (url) => expect(() => publicUrl(url)).toThrow());
  it.each([
    "0.0.0.0",
    "100.64.0.1",
    "172.16.0.1",
    "192.0.2.1",
    "198.51.100.1",
    "224.0.0.1",
    "255.255.255.255",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("blocks reserved address %s", (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );
  it("accepts public addresses and checks every DNS answer", async () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    vi.mocked(dns.lookup).mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ] as never);
    await expect(resolvePublic(new URL("https://example.com"))).rejects.toThrow(
      "private",
    );
  });
  it("blocks private redirects before a connection", async () => {
    await expect(safeFetch("http://127.0.0.1")).rejects.toThrow(
      "Private-network",
    );
  });
});
describe("social domain inspection", () => {
  it("does not accept lookalike domains or execute schemes", () => {
    expect(
      inspectSocialUrl("https://www.youtube.com/watch?v=abc").platform,
    ).toBe("YouTube");
    expect(() =>
      inspectSocialUrl("https://youtube.com.evil.example/video"),
    ).toThrow("domain");
    expect(() => inspectSocialUrl("javascript:alert(1)")).toThrow("HTTP");
    expect(
      inspectSocialUrl("https://vimeo.com/123").capabilities.download,
    ).toBe(false);
  });
});
describe("redirect revalidation and connection pinning", () => {
  it("pins the resolved public address and blocks a redirect to metadata services", async () => {
    const http = (await import("node:http")).default;
    const { EventEmitter } = await import("node:events");
    const { PassThrough } = await import("node:stream");
    vi.mocked(dns.lookup).mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
    ] as never);
    let pinned = "";
    const spy = vi.spyOn(http, "request").mockImplementation(((
      url: unknown,
      options: Record<string, unknown>,
      callback: (res: unknown) => void,
    ) => {
      (options.lookup as Function)(
        "example.com",
        {},
        (_err: unknown, address: string) => {
          pinned = address;
        },
      );
      const req = Object.assign(new EventEmitter(), {
        end() {
          queueMicrotask(() => {
            const res = Object.assign(new PassThrough(), {
              statusCode: 302,
              headers: { location: "http://169.254.169.254/latest/meta-data" },
            });
            callback(res);
            req.emit("close");
          });
          return req;
        },
        destroy(error: Error) {
          req.emit("error", error);
          req.emit("close");
          return req;
        },
      });
      return req;
    }) as never);
    try {
      await expect(safeFetch("http://example.com")).rejects.toThrow(
        "Private-network",
      );
      expect(pinned).toBe("93.184.216.34");
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
