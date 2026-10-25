import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { resolve, join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
// Fixed fallback avoids tracing an arbitrary current working directory into Vercel bundles.
export const jobRoot = process.env.JOB_STORAGE_DIR ? resolve(process.env.JOB_STORAGE_DIR) : '/tmp/toolroom-jobs';
export const queueName = 'toolroom-media-v1';
export const ttlMs = 60 * 60 * 1000;
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export const jobDirectory = (id: string) => {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid job identifier.');
  return join(jobRoot, id);
};
export const crawlQueueName = 'toolroom-crawl-v1';
export const crawlTtlMs = 6 * 60 * 60 * 1000; // crawl results/results-of-record are read-only JSON; keep longer than media binaries.
const state = globalThis as typeof globalThis & { mediaQueue?: Queue; crawlQueue?: Queue; mediaDb?: PrismaClient; mediaRedis?: IORedis };
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('PostgreSQL is not configured.');
  return state.mediaDb ||= new PrismaClient();
}
export function connection(worker = false) {
  if (!process.env.REDIS_URL) throw new Error('Redis is not configured.');
  // enableOfflineQueue stays true for both modes: with it false, any command
  // issued before the initial handshake finishes throws "Stream isn't
  // writeable" instead of waiting, which fails every request-path command
  // (quota check, queue add/getWaitingCount) hit right after a cold process
  // start. connectTimeout/maxRetriesPerRequest still bound how long a command
  // waits when Redis is genuinely unreachable.
  return new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: worker ? null : 1, connectTimeout: 3000, enableOfflineQueue: true });
}
export function quotaRedis() {
  if (!state.mediaRedis) { state.mediaRedis = connection(); state.mediaRedis.on("error", () => {}); }
  return state.mediaRedis;
}
export function queue() {
  if (!state.mediaQueue) {
    const redis = connection();
    redis.on('error', () => {});
    state.mediaQueue = new Queue(queueName, { connection: redis, defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600, count: 200 }, removeOnFail: { age: 3600, count: 200 } } });
  }
  return state.mediaQueue;
}
export const kinds = ['video-compressor', 'video-converter', 'background-remover', 'ai-image-upscaler'] as const;
export type JobKind = typeof kinds[number];
export function validateOptions(kind: string, format: string, quality: string) {
  if (!(kinds as readonly string[]).includes(kind)) throw new Error('Unsupported job type.');
  if (!['mp4', 'webm', 'png'].includes(format)) throw new Error('Unsupported output format.');
  if (kind.startsWith('video-') ? !['mp4', 'webm'].includes(format) : format !== 'png') throw new Error('Output format does not match this tool.');
  if (!['balanced', 'smaller', 'quality'].includes(quality)) throw new Error('Unsupported quality preset.');
  return { kind: kind as JobKind, format, quality };
}
export function crawlQueue() {
  if (!state.crawlQueue) {
    const redis = connection();
    redis.on('error', () => {});
    state.crawlQueue = new Queue(crawlQueueName, { connection: redis, defaultJobOptions: { attempts: 1, removeOnComplete: { age: 21600, count: 100 }, removeOnFail: { age: 21600, count: 100 } } });
  }
  return state.crawlQueue;
}
