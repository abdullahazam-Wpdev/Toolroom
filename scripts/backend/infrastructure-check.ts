import { writeFile, mkdir } from 'node:fs/promises';
import { Queue, Worker } from 'bullmq';
import { database, connection } from '../../packages/jobs/runtime.ts';
const db = database(), redis = connection(), workerRedis = connection(true);
redis.on('error', console.error); workerRedis.on('error', console.error);
const name = `toolroom-infra-check-${Date.now()}`;
const q = new Queue(name, { connection: redis });
const result: Record<string, unknown> = {};
try {
  result.postgres = await db.$queryRaw`SELECT version(), current_database()`;
  result.redisPing = await redis.ping();
  result.redisPersistence = await redis.config('GET', 'appendonly', 'appendfsync', 'maxmemory-policy');
  const job = await q.add('durability', { evidence: 'real BullMQ record' });
  const replacement = new Queue(name, { connection: connection() });
  result.reopenedProducerFoundJob = Boolean(await replacement.getJob(job.id!));
  await replacement.close();
  const worker = new Worker(name, async (entry) => { await entry.updateProgress(50); return { doubled: 42 }; }, { connection: workerRedis, concurrency: 1 });
  worker.on('error', console.error);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && await job.getState() !== 'completed') await new Promise(r => setTimeout(r, 100));
  const refreshed = await q.getJob(job.id!);
  result.queueState = await refreshed?.getState(); result.returnvalue = refreshed?.returnvalue;
  await worker.close();
  if (result.queueState !== 'completed') throw new Error('Queue did not complete.');
  await mkdir('artifacts/backend', { recursive: true });
  await writeFile('artifacts/backend/infrastructure.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await q.obliterate({ force: true }); await q.close(); await redis.quit(); await workerRedis.quit(); await db.$disconnect(); }
process.exit(0);
