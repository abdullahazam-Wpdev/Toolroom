import { describe, it, expect } from "vitest";
import { runDeveloperTool as run } from "../apps/web/src/lib/developer-tools";
describe("Browser-local developer utilities", () => {
  it("formats/minifies actual JSON including null and rejects invalid syntax", async () => {
    expect(await run("json-formatter", '{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(await run("json-formatter", ' { "a": 1 } ', "minify")).toBe(
      '{"a":1}',
    );
    expect(await run("json-formatter", "null")).toBe("null");
    await expect(run("json-formatter", "{bad}")).rejects.toThrow(
      "Invalid JSON",
    );
  });
  it("round-trips Unicode Base64 and rejects binary invalid UTF-8", async () => {
    const text = "Hello 世界 👋";
    expect(
      await run(
        "base64-converter",
        await run("base64-converter", text),
        "decode",
      ),
    ).toBe(text);
    await expect(run("base64-converter", "/w==", "decode")).rejects.toThrow(
      "UTF-8",
    );
    await expect(run("base64-converter", "%%%", "decode")).rejects.toThrow();
    expect(await run("base64-converter", "", "decode")).toBe("");
  });
  it("encodes components and handles malformed percent sequences", async () => {
    expect(await run("url-encoder", "a&b =é")).toBe("a%26b%20%3D%C3%A9");
    expect(await run("url-encoder", "%C3%A9", "decode")).toBe("é");
    await expect(run("url-encoder", "%ZZ", "decode")).rejects.toThrow();
  });
  it("uses cryptographic UUID v4 and standard SHA vectors", async () => {
    const ids = (await run("uuid-generator", "100")).split("\n");
    expect(new Set(ids).size).toBe(100);
    expect(
      ids.every((id) =>
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          id,
        ),
      ),
    ).toBe(true);
    await expect(run("uuid-generator", "101")).rejects.toThrow();
    expect(await run("hash-generator", "hello", "SHA-256")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    await expect(run("hash-generator", "hello", "MD5")).rejects.toThrow();
  });
  it("converts sRGB colors and enforces channel/input limits", async () => {
    expect(await run("color-converter", "#f00")).toContain(
      "hsl(0.0, 100.0%, 50.0%)",
    );
    expect(await run("color-converter", "rgb(0, 128, 255)")).toContain(
      "#0080FF",
    );
    await expect(run("color-converter", "rgb(256, 0, 0)")).rejects.toThrow();
    await expect(
      run("json-formatter", "a".repeat(1024 * 1024 + 1)),
    ).rejects.toThrow("1 MiB");
  });
});
