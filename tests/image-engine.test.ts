import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processImage } from "../apps/web/src/lib/image";
import { outputFilename } from "../packages/core/image-tools";
describe("shared image engine", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "compresses real %s files without promising savings",
    async (format) => {
      const source = await sharp({
        create: { width: 500, height: 300, channels: 3, background: "#38704f" },
      })
        .toFormat(format)
        .toBuffer();
      const result = await processImage(source, {
        tool: "image-compressor",
        quality: 65,
      });
      expect((await sharp(result.data).metadata()).format).toBe(format);
      expect(result.outputSize).toBe(result.data.length);
      expect(result.originalSize).toBe(source.length);
    },
  );
  it("preserves WebP transparency in PNG output", async () => {
    const source = await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .webp({ lossless: true })
      .toBuffer();
    const result = await processImage(source, { tool: "webp-to-png" });
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
    expect((await sharp(result.data).raw().toBuffer())[3]).toBe(0);
  });
  it("flattens PNG transparency to the chosen JPEG background", async () => {
    const source = await sharp({
      create: {
        width: 30,
        height: 30,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const result = await processImage(source, {
      tool: "png-to-jpg",
      background: "#ff0000",
      quality: 100,
    });
    const pixel = await sharp(result.data).raw().toBuffer();
    expect((await sharp(result.data).metadata()).format).toBe("jpeg");
    expect(pixel[0]).toBeGreaterThan(245);
    expect(pixel[1]).toBeLessThan(10);
  });
  it("resizes real PNG with ratio preservation and output selection", async () => {
    const source = await sharp({
      create: { width: 600, height: 400, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const result = await processImage(source, {
      tool: "image-resizer",
      width: 150,
      format: "webp",
    });
    expect(result.width).toBe(150);
    expect(result.height).toBe(100);
    expect(result.format).toBe("webp");
  });
  it("rejects incompatible inputs, missing resize dimensions and unsafe background strings", async () => {
    const source = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    await expect(processImage(source, { tool: "webp-to-png" })).rejects.toThrow(
      "requires a WEBP",
    );
    await expect(
      processImage(source, { tool: "image-resizer" }),
    ).rejects.toThrow("Enter a width");
    await expect(
      processImage(source, {
        tool: "png-to-jpg",
        background: "url(https://evil.test)",
      }),
    ).rejects.toThrow();
  });
  it("keeps ZIP/download names free of path separators", () => {
    expect(outputFilename("../../private\\evil.jpg", "webp")).not.toMatch(
      /[\\/]/,
    );
    expect(outputFilename("sample.jpg", "webp")).toBe("sample.webp");
  });
});

describe("expanded converter options", () => {
  it.each(["jpeg", "png", "webp"] as const)("converts %s to all four advertised output formats", async sourceFormat => {
    const input = await sharp({ create: { width: 48, height: 32, channels: 3, background: "#7842ad" } }).toFormat(sourceFormat).toBuffer();
    for (const format of ["jpeg", "png", "webp", "avif"] as const) {
      const output = await processImage(input, { tool: "image-converter", format });
      const decoded = await sharp(output.data).metadata();
      expect(decoded.format).toBe(format === "avif" ? "heif" : format);
      expect(decoded.width).toBe(48); expect(decoded.height).toBe(32);
      expect(output.mime).toBe(`image/${format}`);
      expect((await sharp(output.data).raw().toBuffer()).length).toBeGreaterThan(0);
    }
  });
  it("lossless WebP retains the decoded pixels", async () => {
    const input = await sharp({create:{width:64,height:40,channels:3,background:"#b95237"}}).jpeg().toBuffer();
    const output = await processImage(input, { tool:"jpg-to-webp", lossless:true });
    expect(await sharp(output.data).raw().toBuffer()).toEqual(await sharp(input).raw().toBuffer());
  });
  it("removes metadata by default and preserves it only on explicit opt-in", async () => {
    const input = await sharp({create:{width:40,height:20,channels:3,background:"#48a"}}).withExif({IFD0:{Artist:"Toolroom test fixture"}}).jpeg().toBuffer();
    const stripped = await processImage(input,{tool:"jpg-to-webp"});
    const kept = await processImage(input,{tool:"jpg-to-webp",stripMetadata:false});
    expect((await sharp(stripped.data).metadata()).exif).toBeUndefined();
    expect((await sharp(kept.data).metadata()).exif?.toString()).toContain("Toolroom test fixture");
  });
});
