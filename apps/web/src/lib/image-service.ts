import { convertJpeg, processImage, inputFormat } from "./image";
export async function processImageForm(form: FormData) {
    const file = form.get("file");
    if (!(file instanceof File))
      throw new Error("Choose a JPEG image to continue.");
    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/gif", "image/tiff", "image/x-tiff"].includes(
        file.type,
      )
    )
      throw new Error("Only JPEG, PNG, WebP, AVIF, GIF and TIFF uploads are supported.");
    const input = Buffer.from(await file.arrayBuffer());
    const tool = String(form.get("tool") || "jpg-to-webp");
    if (
      tool === "jpg-to-webp" &&
      !["image/jpeg", "image/jpg"].includes(file.type)
    )
      throw new Error("This tool requires a JPEG image.");
    const process = tool === "jpg-to-webp" ? convertJpeg : processImage;
    if (tool !== "jpg-to-webp" && `image/${inputFormat(input)}` !== ({ "image/jpg": "image/jpeg", "image/x-tiff": "image/tiff" }[file.type] || file.type))
      throw new Error(
        "The declared MIME type does not match the image signature.",
      );
    return process(input, {
      tool,
      format: form.get("format") || "source",
      background: form.get("background") || "#ffffff",
      quality: form.get("quality") || 80,
      width: form.get("width") || undefined,
      height: form.get("height") || undefined,
      lock: form.get("lock") !== "false",
      lossless: form.get("lossless") === "true",
      stripMetadata: form.get("stripMetadata") !== "false",
    });

}
