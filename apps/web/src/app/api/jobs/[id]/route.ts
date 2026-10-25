import { resultUrl, deleteObjects } from "../../../../../../../packages/storage/s3";
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { database, queue, jobDirectory, tokenHash } from '../../../../../../../packages/jobs/runtime';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const job = await database().mediaJob.findUnique({ where: { id } });
  return job && job.tokenHash === tokenHash(token) && job.expiresAt.getTime() > Date.now() ? job : null;
}
export async function GET(request: Request, context: Context) {
  try {
    const job = await authorize(request, context);
    if (!job) return Response.json({ error: 'Job not found or expired.' }, { status: 404 });
    if (new URL(request.url).searchParams.get('download') === '1') {
      if (job.status !== 'completed') return Response.json({ error: 'Result is not ready.' }, { status: 409 });
      if(job.storageBackend==='s3')return Response.json({downloadUrl:await resultUrl(job.id,job.format,Math.max(1,Math.min(60,Math.floor((job.expiresAt.getTime()-Date.now())/1000))))},{headers:{'Cache-Control':'no-store'}});
      const bytes = await readFile(join(jobDirectory(job.id), `output.${job.format}`));
      return new Response(bytes, { headers: { 'Content-Type': job.format === 'png' ? 'image/png' : `video/${job.format}`, 'Content-Disposition': `attachment; filename="toolroom-result.${job.format}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    return Response.json({ id: job.id, status: job.status, progress: job.progress, inputBytes: job.inputBytes, outputBytes: job.outputBytes, error: job.status === 'failed' ? 'Processing failed. Try a smaller supported file or check worker logs.' : job.error, expiresAt: job.expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Job service unavailable.' }, { status: 503 }); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const job = await authorize(request, context);
    if (!job) return Response.json({ error: 'Job not found or expired.' }, { status: 404 });
    await database().mediaJob.update({ where: { id: job.id }, data: { cancelRequested: true } });
    if (job.status !== 'processing') {
      try { await (await queue().getJob(job.id))?.remove(); } catch { /* Worker may have claimed it; the cancellation flag remains durable. */ }
      await database().mediaJob.update({ where: { id: job.id }, data: { status: 'cancelled' } });
      await rm(jobDirectory(job.id), { recursive: true, force: true });
      if(job.storageBackend==='s3')await deleteObjects(job.id,job.format);
    }
    return Response.json({ status: 'cancellation-requested' });
  } catch { return Response.json({ error: 'Cancellation service unavailable.' }, { status: 503 }); }
}
