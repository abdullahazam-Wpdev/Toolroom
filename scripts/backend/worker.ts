import { storageConfigured, validatedUpload, putResult, deleteObjects, cleanupObjects } from "../../packages/storage/s3.ts";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { Worker, UnrecoverableError } from 'bullmq';
import { rm } from 'node:fs/promises';
import { database, connection, queueName, jobDirectory, crawlQueueName } from '../../packages/jobs/runtime.ts';
import { processMedia } from '../../packages/jobs/process.ts';
import { processCrawl } from '../../packages/jobs/crawl-process.ts';
const db = database(), redis = connection(true), crawlRedis = connection(true);
redis.on('error', (error) => console.error('Worker Redis:', error.message));
crawlRedis.on('error', (error) => console.error('Crawl worker Redis:', error.message));
const worker = new Worker(queueName, async (entry) => {
  const id = String(entry.id);
  const record = await db.mediaJob.findUnique({ where: { id } });
  if (!record || !["queued", "processing"].includes(record.status) || record.expiresAt.getTime() < Date.now()) throw new UnrecoverableError('Job expired.');
  const cancelled = async () => {
    const state = await db.mediaJob.findUnique({ where: { id } });
    return !state || state.cancelRequested || state.expiresAt.getTime() < Date.now();
  };
  try {
    if (await cancelled()) throw new Error('Cancelled.');
    await db.mediaJob.update({ where: { id }, data: { status: 'processing', progress: 0, error: null } });
    if (record.storageBackend === 's3') {
      const bytes = await validatedUpload({id:record.id,purpose:'media',bytes:record.inputBytes,mime:record.inputMime as 'image/png',sha256:record.inputSha256!,expires:record.expiresAt.getTime()});
      await mkdir(jobDirectory(id), {recursive:true,mode:0o700}); await writeFile(jobDirectory(id)+'/input',bytes,{mode:0o600});
    }
    const outputBytes = await processMedia(record, async (progress) => { await entry.updateProgress(progress); await db.mediaJob.update({ where: { id }, data: { progress } }); }, cancelled);
    if (record.storageBackend === 's3') { await putResult(id,record.format,record.format==='png'?'image/png':`video/${record.format}`,await readFile(jobDirectory(id)+`/output.${record.format}`)); await deleteObjects(id,record.format,false); await rm(jobDirectory(id),{recursive:true,force:true}); }
    await db.mediaJob.update({ where: { id }, data: { status: 'completed', progress: 100, outputBytes } });
    await rm(jobDirectory(id) + '/input', { force: true });
    return { outputBytes };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed.';
    await db.mediaJob.update({ where: { id }, data: { status: await cancelled() ? 'cancelled' : 'failed', error: message.slice(0, 800) } });
    await rm(jobDirectory(id), { recursive: true, force: true });
    if(record.storageBackend==='s3')await deleteObjects(id,record.format).catch(()=>{});
    throw new UnrecoverableError(message);
  }
}, { connection: redis, concurrency: 1, maxStalledCount: 1, lockDuration: 30000 });
worker.on('error', (error) => console.error('Worker:', error.message));
worker.on('failed', (job, error) => console.error('Job failed:', job?.id, error.message));
// Crawl jobs can legitimately run for tens of minutes (the 500/1000-page
// tiers); lockDuration is generous and BullMQ renews the lock automatically
// while this processor is still running, so a long real crawl does not get
// mistaken for a stalled job and reassigned mid-run.
const crawlWorker = new Worker(crawlQueueName, async (entry) => {
  const id = String(entry.id);
  const record = await db.auditJob.findUnique({ where: { id } });
  if (!record || !['queued', 'processing'].includes(record.status) || record.expiresAt.getTime() < Date.now()) throw new UnrecoverableError('Job expired.');
  const cancelled = async () => {
    const state = await db.auditJob.findUnique({ where: { id } });
    return !state || state.cancelRequested || state.expiresAt.getTime() < Date.now();
  };
  try {
    if (await cancelled()) throw new Error('Cancelled.');
    await db.auditJob.update({ where: { id }, data: { status: 'processing', error: null } });
    const report = await processCrawl(
      record,
      async (crawled, discovered) => { await entry.updateProgress(crawled); await db.auditJob.update({ where: { id }, data: { pagesCrawled: crawled, pagesDiscovered: discovered } }); },
      cancelled,
    );
    // crawlPages() returns a normal (not thrown) partial result when
    // cancelled mid-run, so a cancellation must be detected here rather
    // than inferred from success/failure — otherwise a job the user
    // explicitly cancelled would misleadingly report as "completed".
    const wasCancelled = await cancelled();
    await db.auditJob.update({ where: { id }, data: { status: wasCancelled ? 'cancelled' : 'completed', pagesCrawled: report.pages.length, report: report as object } });
    return { pages: report.pages.length, cancelled: wasCancelled };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Crawl failed.';
    await db.auditJob.update({ where: { id }, data: { status: await cancelled() ? 'cancelled' : 'failed', error: message.slice(0, 800) } });
    throw new UnrecoverableError(message);
  }
}, { connection: crawlRedis, concurrency: 1, maxStalledCount: 1, lockDuration: 120000 });
crawlWorker.on('error', (error) => console.error('Crawl worker:', error.message));
crawlWorker.on('failed', (job, error) => console.error('Crawl job failed:', job?.id, error.message));
async function cleanup() {
  if(storageConfigured())await cleanupObjects();
  const expired = await db.mediaJob.findMany({ where: { expiresAt: { lt: new Date() } }, take: 100 });
  for (const record of expired) {
    if (record.status === 'processing') { await db.mediaJob.update({ where: { id: record.id }, data: { cancelRequested: true } }); continue; }
    await rm(jobDirectory(record.id), { recursive: true, force: true });
    if(record.storageBackend==='s3')await deleteObjects(record.id,record.format);
    await db.mediaJob.delete({ where: { id: record.id } });
  }
  const expiredCrawls = await db.auditJob.findMany({ where: { expiresAt: { lt: new Date() } }, take: 100 });
  for (const record of expiredCrawls) {
    if (record.status === 'processing') { await db.auditJob.update({ where: { id: record.id }, data: { cancelRequested: true } }); continue; }
    await db.auditJob.delete({ where: { id: record.id } });
  }
}
const heartbeat = setInterval(()=>{void crawlRedis.set('toolroom:crawl-worker','ready','EX',45).catch(console.error);if(storageConfigured())void redis.set('toolroom:media-worker:s3','ready','EX',45).catch(console.error);},10000);
const timer = setInterval(() => { void cleanup().catch(console.error); }, 30000);
void cleanup().catch(console.error);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { clearInterval(timer); clearInterval(heartbeat); await worker.close(); await crawlWorker.close(); await redis.quit(); await crawlRedis.quit(); await db.$disconnect(); process.exit(0); });
console.log('Toolroom media + crawl worker started; media concurrency=1 (retention 1 hour), crawl concurrency=1 (retention 6 hours).');
