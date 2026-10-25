const quotas = new Map<string, { start: number; count: number }>();
export function takeQuota(key: string, limit = 12, windowMs = 60000) {
  const now = Date.now();
  let value = quotas.get(key);
  if (!value || now - value.start >= windowMs) {
    value = { start: now, count: 0 };
    quotas.set(key, value);
  }
  if (++value.count > limit)
    throw new Error("Request limit reached. Please retry in a minute.");
}
export async function boundedJson(request: Request, max = 256 * 1024) {
  const expected = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== expected)
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
