import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { database, crawlQueue, newToken, tokenHash, crawlTtlMs, quotaRedis } from '../../../../../../packages/jobs/runtime';
import { publicUrl } from '@/lib/safe-fetch';
import { CRAWL_SIZE_TIERS } from '@/lib/site-audit';
export const runtime = 'nodejs';
const input = z.object({ url: z.string().url().max(2048), maxPages: z.coerce.number().refine((n) => (CRAWL_SIZE_TIERS as readonly number[]).includes(n), { message: `Page limit must be one of ${CRAWL_SIZE_TIERS.join(', ')}.` }) });
export async function POST(request: Request) {
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
    if (request.headers.get('origin') && request.headers.get('origin') !== expected) return Response.json({ error: 'Cross-origin request blocked.' }, { status: 403 });
    if (!process.env.MEDIA_JOBS_ENABLED || process.env.MEDIA_JOBS_ENABLED !== 'true') return Response.json({ error: 'Background crawl jobs are not enabled on this installation. Use the quick ≤25-page audit instead.' }, { status: 503 });
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Use a JSON request.');
    const body = input.parse(await request.json());
    const target = publicUrl(body.url); // rejects private/reserved destinations before anything is queued
    const client = quotaRedis();
    const count = await client.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],3600) end; return n", 1, 'toolroom:crawl-hour') as number;
    // Larger tiers cost real time/requests against a real third-party site; a stricter hourly cap than the per-minute media-upload one is intentional.
    const limit = body.maxPages >= 500 ? 2 : body.maxPages >= 100 ? 4 : 10;
    if (count > limit) return Response.json({ error: 'Crawl job limit reached for this tier this hour. Retry later or use a smaller page limit.' }, { status: 429 });
    const q = crawlQueue();
    if (await q.getWaitingCount() + await q.getActiveCount() >= 5) return Response.json({ error: 'The crawl queue is busy. Retry shortly.' }, { status: 429 });
    const id = randomBytes(16).toString('hex'), token = newToken();
    await database().auditJob.create({ data: { id, tokenHash: tokenHash(token), url: target.href, maxPages: body.maxPages, expiresAt: new Date(Date.now() + crawlTtlMs) } });
    try { await q.add('crawl', {}, { jobId: id }); } catch { await database().auditJob.update({ where: { id }, data: { status: 'failed', error: 'Queue delivery failed.' } }); throw new Error('Queue unavailable. Retry later.'); }
    return Response.json({ id, token, expiresInSeconds: crawlTtlMs / 1000 }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const configured = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
    const message = error instanceof Error ? error.message : 'Crawl submission failed.';
    const safe = /^(Use |Page limit|Private|Crawl job limit|The crawl queue|Queue unavailable|Cross-origin)/.test(message);
    return Response.json({ error: configured ? (safe ? message : 'Background crawl service unavailable. Check PostgreSQL, Redis and worker logs.') : 'PostgreSQL and Redis must be configured.' }, { status: configured && safe ? 400 : 503 });
  }
}
