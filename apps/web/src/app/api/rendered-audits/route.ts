import { allowedOrigin, boundedJson } from "@/lib/request-guard";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { database, renderedAuditQueue, newToken, tokenHash, renderedAuditTtlMs, quotaRedis } from "../../../../../../packages/jobs/runtime";
import { publicUrl } from "@/lib/safe-fetch";
export const runtime = "nodejs";
const input = z.object({ url: z.string().url().max(2048) });
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !allowedOrigin(origin)) return Response.json({ error: "Cross-origin request blocked." }, { status: 403 });
    // A dedicated flag, independent of MEDIA_JOBS_ENABLED/CRAWL_JOBS_ENABLED:
    // this launches a real sandboxed Chromium per job, a meaningfully
    // heavier and higher-risk capability than either of those, and gets its
    // own explicit opt-in rather than riding along with a flag meant for
    // something else.
    if (process.env.RENDERED_AUDIT_ENABLED !== "true") return Response.json({ error: "JavaScript-rendered auditing is not enabled on this installation. Use the static page audit instead." }, { status: 503 });
    const body = input.parse(await boundedJson(request, 2048));
    const target = publicUrl(body.url); // rejects private/reserved destinations before anything is queued
    const client = quotaRedis();
    if (process.env.VERCEL === "1" && !(await client.get("toolroom:rendered-audit-worker"))) return Response.json({ error: "No deployed rendered-audit worker is available." }, { status: 503 });
    const count = (await client.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],3600) end; return n", 1, "toolroom:rendered-audit-hour")) as number;
    if (count > 20) return Response.json({ error: "Rendered-audit limit reached for this hour. Retry later." }, { status: 429, headers: { "Retry-After": "3600" } });
    const q = renderedAuditQueue();
    if ((await q.getWaitingCount()) + (await q.getActiveCount()) >= 3) return Response.json({ error: "The rendered-audit queue is busy. Retry shortly." }, { status: 429, headers: { "Retry-After": "30" } });
    const id = randomBytes(16).toString("hex"), token = newToken();
    await database().renderedAuditJob.create({ data: { id, tokenHash: tokenHash(token), url: target.href, expiresAt: new Date(Date.now() + renderedAuditTtlMs) } });
    try {
      await q.add("rendered-audit", {}, { jobId: id });
    } catch {
      await database().renderedAuditJob.update({ where: { id }, data: { status: "failed", error: "Queue delivery failed." } });
      throw new Error("Queue unavailable. Retry later.");
    }
    return Response.json({ id, token, expiresInSeconds: renderedAuditTtlMs / 1000 }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Enter a valid, complete URL." }, { status: 400 });
    const configured = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
    const message = error instanceof Error ? error.message : "Submission failed.";
    const safe = /^(Use |Private|Rendered-audit limit|The rendered-audit queue|Queue unavailable|Cross-origin|JavaScript-rendered|No deployed)/.test(message);
    return Response.json({ error: configured ? (safe ? message : "Rendered-audit service unavailable. Check PostgreSQL, Redis and worker logs.") : "PostgreSQL and Redis must be configured." }, { status: configured && safe ? 400 : 503 });
  }
}
