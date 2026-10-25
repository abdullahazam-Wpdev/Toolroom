import { NextRequest } from "next/server";
import { convertJpeg, processImage, inputFormat, MAX_BYTES } from "@/lib/image";
export const runtime = "nodejs";
let active = 0;
let windowStart = Date.now(),
  requests = 0;
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ).origin;
  if (origin && origin !== expected)
    return Response.json(
      { error: "Cross-origin uploads are not permitted." },
      { status: 403 },
    );
  if (Date.now() - windowStart > 60000) {
    windowStart = Date.now();
    requests = 0;
  }
  if (++requests > 60)
    return Response.json(
      { error: "Conversion limit reached. Please retry in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  if (active >= 2)
    return Response.json(
      { error: "The converter is busy. Please retry shortly." },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length > MAX_BYTES + 64 * 1024)
    return Response.json(
      { error: "Upload exceeds the 10 MiB limit." },
      { status: 413 },
    );
  active++;
  try {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
      throw new Error("Use a multipart image upload.");
    // Bound the actual stream as well as Content-Length before parsing multipart.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("No upload received.");
    let total = 0,
      expired = false;
    const chunks: Uint8Array[] = [];
    const deadline = setTimeout(() => {
      expired = true;
      void reader.cancel();
    }, 15000);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_BYTES + 64 * 1024) {
          await reader.cancel();
          return Response.json(
            { error: "Upload exceeds the 10 MiB limit." },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
    } finally {
      clearTimeout(deadline);
    }
    if (expired)
      throw new Error("Upload timed out. Please try a smaller file.");
    const body = new Blob(chunks as BlobPart[]);
    const form = await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
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
    const result = await process(input, {
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
    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Type": result.mime,
        "Content-Disposition": `attachment; filename="converted.${result.extension}"`,
        "Cache-Control": "no-store",
        "X-Image-Width": String(result.width),
        "X-Image-Format": result.extension,
        "X-Image-Height": String(result.height),
        "X-Original-Size": String(result.originalSize),
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Image processing failed.",
      },
      { status: 400 },
    );
  } finally {
    active--;
  }
}
