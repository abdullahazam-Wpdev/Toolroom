import { database, crawlQueue, tokenHash } from '../../../../../../../packages/jobs/runtime';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const job = await database().auditJob.findUnique({ where: { id } });
  return job && job.tokenHash === tokenHash(token) && job.expiresAt.getTime() > Date.now() ? job : null;
}
export async function GET(request: Request, context: Context) {
  try {
    const job = await authorize(request, context);
    if (!job) return Response.json({ error: 'Job not found or expired.' }, { status: 404 });
    return Response.json({
      id: job.id,
      status: job.status,
      url: job.url,
      maxPages: job.maxPages,
      pagesCrawled: job.pagesCrawled,
      pagesDiscovered: job.pagesDiscovered,
      error: job.status === 'failed' ? (job.error || 'Crawl failed. Check worker logs.') : job.error,
      expiresAt: job.expiresAt,
      // A cancelled job still keeps whatever it crawled before the
      // cancellation took effect; failed/queued/processing jobs have none.
      report: job.status === 'completed' || job.status === 'cancelled' ? job.report : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Job service unavailable.' }, { status: 503 }); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const job = await authorize(request, context);
    if (!job) return Response.json({ error: 'Job not found or expired.' }, { status: 404 });
    await database().auditJob.update({ where: { id: job.id }, data: { cancelRequested: true } });
    if (job.status !== 'processing') {
      try { await (await crawlQueue().getJob(job.id))?.remove(); } catch { /* Worker may have claimed it; the cancellation flag remains durable. */ }
      await database().auditJob.update({ where: { id: job.id }, data: { status: 'cancelled' } });
    }
    return Response.json({ status: 'cancellation-requested' });
  } catch { return Response.json({ error: 'Cancellation service unavailable.' }, { status: 503 }); }
}
