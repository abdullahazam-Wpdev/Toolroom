import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  convertJpeg,
  MAX_BYTES,
  optionsSchema,
} from "../apps/web/src/lib/image";
import { tools, toolHref } from "../packages/core/registry";
describe("real JPEG to WebP processing", () => {
  const fixture = () =>
    sharp({
      create: { width: 640, height: 480, channels: 3, background: "#24694d" },
    })
      .jpeg()
      .toBuffer();
  it("encodes valid WebP and fits dimensions without distortion", async () => {
    const source = await fixture();
    const result = await convertJpeg(source, {
      quality: 80,
      width: 320,
      height: 320,
      lock: true,
    });
    const decoded = await sharp(result.data).metadata();
    expect(decoded.format).toBe("webp");
    expect(decoded.width).toBe(320);
    expect(decoded.height).toBe(240);
    expect(result.originalSize).toBe(source.length);
    expect(result.outputSize).toBe(result.data.length);
    expect(decoded.exif).toBeUndefined();
  });
  it("supports unlocked dimensions", async () => {
    const result = await convertJpeg(await fixture(), {
      quality: 70,
      width: 300,
      height: 100,
      lock: false,
    });
    expect(result.width).toBe(300);
    expect(result.height).toBe(100);
  });
  it("does not enlarge", async () => {
    const result = await convertJpeg(await fixture(), {
      width: 1200,
      quality: 80,
    });
    expect(result.width).toBe(640);
  });
  it("rejects non-JPEG signatures and corrupted images", async () => {
    await expect(convertJpeg(Buffer.from("not an image"), {})).rejects.toThrow(
      "valid JPEG",
    );
    await expect(
      convertJpeg(Buffer.from([255, 216, 255, 0]), {}),
    ).rejects.toThrow();
  });
  it("rejects oversized files and invalid options", async () => {
    await expect(convertJpeg(Buffer.alloc(MAX_BYTES + 1), {})).rejects.toThrow(
      "10 MiB",
    );
    expect(() => optionsSchema.parse({ quality: 101 })).toThrow();
    expect(() => optionsSchema.parse({ width: 0 })).toThrow();
    expect(() => optionsSchema.parse({ height: 8001 })).toThrow();
  });
  it("rejects excessive decoded pixels", async () => {
    const input = await sharp({
      create: { width: 6000, height: 5000, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    await expect(convertJpeg(input, {})).rejects.toThrow();
  });
  it("applies EXIF rotation then removes metadata", async () => {
    const source = await sharp(await fixture())
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const result = await convertJpeg(source, {});
    const meta = await sharp(result.data).metadata();
    expect(meta.width).toBe(480);
    expect(meta.height).toBe(640);
    expect(meta.exif).toBeUndefined();
  });
});
describe("registry", () => {
  it("has 20 unique canonical routes with explicit availability", () => {
    expect(tools).toHaveLength(20);
    expect(new Set(tools.map(toolHref)).size).toBe(20);
    expect(tools.find((t) => t.id === "jpg-to-webp")?.status).toBe("available");
  });
});
