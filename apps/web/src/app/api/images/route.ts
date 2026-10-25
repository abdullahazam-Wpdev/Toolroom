import { allowedOrigin } from "@/lib/request-guard";
import { processImageForm } from "@/lib/image-service";
import { inlineImageLimit, hostedOnVercel } from "../../../../../../packages/core/upload-limits";
import { origin as expectedOrigin } from "@/lib/seo";
import { NextRequest } from "next/server";
export const runtime = "nodejs";
let active = 0;
let windowStart = Date.now(),
  requests = 0;
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = expectedOrigin;
  const maxBytes = inlineImageLimit();
  const limitMessage = `Upload exceeds the ${maxBytes / 1024 / 1024} MiB direct-upload limit.`;
  if (origin && !allowedOrigin(origin))
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
  if (!Number.isFinite(length) || length > maxBytes + 64 * 1024)
    return Response.json(
      { error: limitMessage },
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
        if (total > maxBytes + 64 * 1024) {
          await reader.cancel();
          return Response.json(
            { error: limitMessage },
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
    const result = await processImageForm(form);
    if (hostedOnVercel() && result.data.length > 4 * 1024 * 1024) return Response.json({ error: "Encoded output exceeds this host’s inline limit. Resize the image or use a smaller format/quality setting." }, { status: 413 });
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
