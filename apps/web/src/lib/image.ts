import sharp from "sharp";
import { z } from "zod";
export const MAX_BYTES = 10 * 1024 * 1024;
export const imageToolIds = [
  "image-converter",
  "jpg-to-webp",
  "webp-to-png",
  "png-to-jpg",
  "image-resizer",
  "image-compressor",
] as const;
export type ImageToolId = (typeof imageToolIds)[number];
export const imageFormats = ["jpeg", "png", "webp", "avif", "gif", "tiff"] as const;
export const imageOptionsSchema = z.object({
  tool: z.enum(imageToolIds).default("jpg-to-webp"),
  quality: z.coerce.number().int().min(1).max(100).default(80),
  width: z.coerce.number().int().min(1).max(8000).optional(),
  height: z.coerce.number().int().min(1).max(8000).optional(),
  lock: z.boolean().default(true),
  lossless: z.boolean().default(false),
  stripMetadata: z.boolean().default(true),
  format: z.enum(["source", ...imageFormats]).default("source"),
  background: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#ffffff"),
});
export const optionsSchema = imageOptionsSchema;
export type ImageOptions = z.infer<typeof imageOptionsSchema>;
export function inputFormat(input: Buffer): (typeof imageFormats)[number] {
  if (input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff)
    return "jpeg";
  if (
    input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    input.toString("ascii", 0, 4) === "RIFF" &&
    input.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  if (["GIF87a", "GIF89a"].includes(input.toString("ascii", 0, 6))) return "gif";
  if (input.subarray(0,4).equals(Buffer.from([73,73,42,0])) || input.subarray(0,4).equals(Buffer.from([77,77,0,42]))) return "tiff";
  if (input.length >= 16 && input.toString("ascii",4,8) === "ftyp") {
    const length = Math.min(input.readUInt32BE(0), input.length, 128);
    const brands = [input.toString("ascii",8,12)];
    for (let offset=16;offset+4<=length;offset+=4) brands.push(input.toString("ascii",offset,offset+4));
    if (brands.some(brand => brand === "avif" || brand === "avis")) return "avif";
  }
  throw new Error("This file is not a valid JPEG, PNG, WebP, AVIF, GIF or TIFF image.");
}
export async function processImage(input: Buffer, raw: unknown) {
  const options = imageOptionsSchema.parse(raw);
  if (!input.length || input.length > MAX_BYTES)
    throw new Error("Choose an image no larger than 10 MiB.");
  const source = inputFormat(input);
  const required =
    options.tool === "jpg-to-webp"
      ? "jpeg"
      : options.tool === "webp-to-png"
        ? "webp"
        : options.tool === "png-to-jpg"
          ? "png"
          : null;
  if (required && source !== required)
    throw new Error(`This tool requires a ${required.toUpperCase()} image.`);
  const image = sharp(input, {
    limitInputPixels: 24_000_000,
    failOn: "warning",
    animated: false,
  });
  const metadata = await image.metadata();
  if (metadata.format !== (source === "avif" ? "heif" : source) || (source === "avif" && metadata.compression !== "av1"))
    throw new Error("The image signature and decoded format do not match.");
  if ((metadata.pages || 1) > 1)
    throw new Error("Animated and multipage images are not supported. Choose a single-frame image.");
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > 8000 ||
    metadata.height > 8000
  )
    throw new Error(
      "Image dimensions must be no more than 8,000 pixels per edge.",
    );
  if (options.tool === "image-resizer" && !options.width && !options.height)
    throw new Error("Enter a width or height to resize your image.");
  const format =
    options.tool === "jpg-to-webp"
      ? "webp"
      : options.tool === "webp-to-png"
        ? "png"
        : options.tool === "png-to-jpg"
          ? "jpeg"
          : options.format === "source"
            ? source
            : options.format;
  const pipeline = image.rotate();
  if (!options.stripMetadata) pipeline.keepMetadata();
  if (options.width || options.height)
    pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.lock ? "inside" : "fill",
      withoutEnlargement: true,
    });
  if (format === "jpeg")
    pipeline
      .flatten({ background: options.background })
      .jpeg({ quality: options.quality, mozjpeg: true });
  else if (format === "png")
    pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  else if (format === "gif") pipeline.gif({ effort: 4 });
  else if (format === "tiff") pipeline.tiff({ compression: "lzw" });
  else if (format === "avif") pipeline.avif({ quality: options.quality, effort: 4 });
  else pipeline.webp({ quality: options.quality, effort: 4, lossless: options.lossless });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    data,
    format,
    mime: `image/${format}`,
    extension: format === "jpeg" ? "jpg" : format,
    width: info.width,
    height: info.height,
    originalSize: input.length,
    outputSize: data.length,
  };
}
// Keep the original public contract for the first converter and its callers.
export async function convertJpeg(input: Buffer, raw: unknown) {
  if (input.length > MAX_BYTES)
    throw new Error("Choose a JPEG file no larger than 10 MiB.");
  if (input[0] !== 0xff || input[1] !== 0xd8 || input[2] !== 0xff)
    throw new Error("This file is not a valid JPEG image.");
  return processImage(input, {
    ...imageOptionsSchema.parse(raw),
    tool: "jpg-to-webp",
  });
}
