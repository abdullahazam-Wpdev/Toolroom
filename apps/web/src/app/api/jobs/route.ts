import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { database, queue, jobDirectory, newToken, tokenHash, ttlMs, validateOptions, quotaRedis } from '../../../../../../packages/jobs/runtime';
export const runtime = 'nodejs';
let uploading = 0;
export async function POST(request: Request) {
  let directory = '';
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
    if (request.headers.get('origin') && request.headers.get('origin') !== expected) return Response.json({ error: 'Cross-origin upload blocked.' }, { status: 403 });
    if (!process.env.MEDIA_JOBS_ENABLED || process.env.MEDIA_JOBS_ENABLED !== 'true') return Response.json({ error: 'Background worker is not enabled on this installation.' }, { status: 503 });
    if (uploading >= 2) return Response.json({ error: 'Uploads are busy. Retry shortly.' }, { status: 429 });
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) throw new Error('Use a multipart upload.');
    uploading++;
    try {
      const q = queue(), client = quotaRedis();
      const count = await client.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n", 1, 'toolroom:upload-minute') as number;
      if (count > 12 || await q.getWaitingCount() >= 20) return Response.json({ error: 'Queue limit reached. Retry in a minute.' }, { status: 429 });
      const reader = request.body?.getReader();
      if (!reader) throw new Error('Upload required.');
      let size = 0, expired = false;
      const chunks: Uint8Array[] = [], timer = setTimeout(() => { expired = true; void reader.cancel(); }, 20000);
      try {
        while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 32 * 1024 * 1024 + 65536) { await reader.cancel(); throw new Error('Upload limit is 32 MiB.'); } chunks.push(part.value); }
      } finally { clearTimeout(timer); }
      if (expired) throw new Error('Upload timed out.');
      const form = await new Response(new Blob(chunks as BlobPart[]), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
      const file = form.get('file');
      if (!(file instanceof File) || !file.size) throw new Error('Select a file.');
      const options = validateOptions(String(form.get('kind')), String(form.get('format')), String(form.get('quality') || 'balanced'));
      if (!options.kind.startsWith('video-') && file.size > 10 * 1024 * 1024) throw new Error('Image limit is 10 MiB.');
      const bytes = Buffer.from(await file.arrayBuffer());
      const image = bytes.subarray(0,3).equals(Buffer.from([255,216,255])) || bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP');
      const video = bytes.toString('ascii',4,8) === 'ftyp' || bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])) || (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'AVI ');
      if (options.kind.startsWith('video-') ? !video : !image) throw new Error('Unsupported file signature. Use MP4/MOV, WebM/MKV or AVI video; JPEG, PNG or WebP image.');
      const id = randomBytes(16).toString('hex'), token = newToken();
      directory = jobDirectory(id); await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(join(directory, 'input'), bytes, { mode: 0o600 });
      await database().mediaJob.create({ data: { id, tokenHash: tokenHash(token), ...options, inputBytes: file.size, expiresAt: new Date(Date.now() + ttlMs) } });
      try { await q.add(options.kind, {}, { jobId: id }); } catch { await database().mediaJob.update({ where: { id }, data: { status: 'failed', error: 'Queue delivery failed.' } }); throw new Error('Queue unavailable. Retry later.'); }
      directory = '';
      return Response.json({ id, token, expiresInSeconds: ttlMs / 1000 }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    } finally { uploading--; }
  } catch (error) {
    if (directory) await rm(directory, { recursive: true, force: true });
    const configured = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
    const message = error instanceof Error ? error.message : "Upload failed.";
    const safe = /^(Use |Upload |Select |Image limit|Unsupported |Output format|Queue unavailable)/.test(message);
    return Response.json({ error: configured ? (safe ? message : "Background job service unavailable. Check PostgreSQL, Redis and worker logs.") : "PostgreSQL and Redis must be configured." }, { status: configured && safe ? 400 : 503 });
  }
}
