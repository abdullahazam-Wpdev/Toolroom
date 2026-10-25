export const imageToolConfig = {
  "image-converter": {
    accept: "image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,image/tiff,image/x-tiff",
    input: "JPEG, PNG, WebP, AVIF, GIF or TIFF",
    output: "image",
    label: "IMAGE CONVERTER",
    action: "Convert",
  },
  "jpg-to-webp": {
    accept: "image/jpeg,image/jpg",
    input: "JPEG",
    output: "WebP",
    label: "JPEG → WEBP",
    action: "Convert",
  },
  "webp-to-png": {
    accept: "image/webp",
    input: "WebP",
    output: "PNG",
    label: "WEBP → PNG",
    action: "Convert",
  },
  "png-to-jpg": {
    accept: "image/png",
    input: "PNG",
    output: "JPG",
    label: "PNG → JPG",
    action: "Convert",
  },
  "image-compressor": {
    accept: "image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,image/tiff,image/x-tiff",
    input: "JPEG, PNG, WebP, AVIF, GIF or TIFF",
    output: "image",
    label: "IMAGE COMPRESSION",
    action: "Compress",
  },
  "image-resizer": {
    accept: "image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,image/tiff,image/x-tiff",
    input: "JPEG, PNG, WebP, AVIF, GIF or TIFF",
    output: "image",
    label: "IMAGE RESIZE",
    action: "Resize",
  },
} as const;
export type ImageToolId = keyof typeof imageToolConfig;
export function outputFilename(name: string, extension: string) {
  return `${
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^\.+/, "_")
      .slice(0, 100) || "image"
  }.${extension}`;
}
