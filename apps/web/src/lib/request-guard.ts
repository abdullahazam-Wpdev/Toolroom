import { origin as siteOrigin } from "./seo";
const quotas = new Map<string, { start: number; count: number }>();
export function takeQuota(key: string, limit = 12, windowMs = 60000) {
  const now = Date.now();
  let value = quotas.get(key);
  if (!value || now - value.start >= windowMs) {
    value = { start: now, count: 0 };
    quotas.set(key, value);
  }
  if (++value.count > limit)
    throw new RateLimitError(Math.max(1, Math.ceil((value.start + windowMs - now) / 1000)));
}
export async function boundedJson(request: Request, max = 256 * 1024) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigin(origin))
    throw new Error("Cross-origin requests are not permitted.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("Use a JSON request.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0,
    expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel();
  }, 10000);
  try {
    while (true) {
      const value = await reader.read();
      if (value.done) break;
      size += value.value.length;
      if (size > max) {
        await reader.cancel();
        throw new Error("Request body exceeds the size limit.");
      }
      chunks.push(value.value);
    }
    if (expired) throw new Error("Request upload timed out.");
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) { super("Request limit reached. Please retry later."); }
}
export function rateLimitResponse(error: unknown) {
  return error instanceof RateLimitError ? Response.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } }) : null;
}

export function allowedOrigin(value: string) {
 const origins = [siteOrigin, ...(process.env.APP_ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean), ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter(Boolean).map(host=>`https://${host}`)];
 return origins.includes(value);
}
