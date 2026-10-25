import { spawn } from 'node:child_process';
import { stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { jobDirectory } from './runtime.ts';
import type { MediaJob } from '@prisma/client';
export async function runCommand(binary: string, args: string[], options: { timeout?: number; cancelled?: () => Promise<boolean>; line?: (text: string) => void } = {}) {
  return new Promise<string>((resolve, reject) => {
    // prlimit is an additional local resource boundary; production also uses container limits.
    const child = spawn('prlimit', ['--as=1610612736', '--cpu=180', '--fsize=67108864', '--nofile=128', '--', binary, ...args], { stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: '/tmp', OMP_NUM_THREADS: '1', OPENBLAS_NUM_THREADS: '1' } });
    let output = '', error = '', reason = '', checking = false;
    const stop = (message: string) => { reason = message; child.kill('SIGKILL'); };
    const deadline = setTimeout(() => stop('Processing deadline exceeded.'), options.timeout || 180000);
    const cancel = setInterval(async () => {
      if (checking || !options.cancelled) return;
      checking = true;
      try { if (await options.cancelled()) stop('Cancelled.'); } catch { stop('Job state is unavailable.'); } finally { checking = false; }
    }, 400);
    child.stdout.on('data', (bytes) => { output += bytes; if (output.length > 512000) stop('Process output exceeded limit.'); options.line?.(String(bytes)); });
    child.stderr.on('data', (bytes) => { error = (error + bytes).slice(-4000); });
    child.on('error', (e) => { clearTimeout(deadline); clearInterval(cancel); reject(e); });
    child.on('close', (code) => { clearTimeout(deadline); clearInterval(cancel); code === 0 && !reason ? resolve(output) : reject(new Error(reason || `Media processing failed (${code}): ${error.slice(-600)}`)); });
  });
}
export async function processMedia(job: MediaJob, progress: (n: number) => Promise<void>, cancelled: () => Promise<boolean>) {
  const directory = jobDirectory(job.id), input = join(directory, 'input'), output = join(directory, `output.${job.format}`);
  await rm(output, { force: true });
  if (job.kind.startsWith('video-')) {
    const probe = JSON.parse(await runCommand(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-show_format', '-show_streams', '-of', 'json', input], { timeout: 15000, cancelled }));
    const video = probe.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
    const duration = Number(probe.format?.duration);
    if (!video || !Number.isFinite(duration) || duration <= 0 || duration > 120 || video.width > 3840 || video.height > 2160) throw new Error('Use a video up to 2 minutes and 3840 × 2160 pixels.');
    const crf = job.quality === 'smaller' ? '36' : job.quality === 'quality' ? '24' : '30';
    const codec = job.format === 'webm' ? ['-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '6', '-crf', crf, '-b:v', '0', '-c:a', 'libopus'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-c:a', 'aac', '-movflags', '+faststart'];
    let last = 0;
    let pendingProgress = Promise.resolve();
    await runCommand(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-hide_banner', '-v', 'error', '-protocol_whitelist', 'file', '-threads', '1', '-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-sn', '-dn', '-vf', "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", ...codec, '-threads', '1', '-filter_threads', '1', '-pix_fmt', 'yuv420p', '-t', '120', '-fs', '62914560', '-progress', 'pipe:1', '-y', output], {
      cancelled,
      line(text) {
        const matches = [...text.matchAll(/out_time_us=(\d+)/g)];
        const n = matches.length ? Math.min(99, Math.floor(Number(matches.at(-1)![1]) / (duration * 10000))) : last;
        if (n > last) { last = n; pendingProgress = pendingProgress.then(() => progress(n)); }
      },
    });
    await pendingProgress;
    const check = JSON.parse(await runCommand(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', output], { timeout: 10000 }));
    if (!check.streams?.some((s: { codec_type: string }) => s.codec_type === 'video')) throw new Error('Output contains no video stream.');
  } else {
    await runCommand(process.env.AI_PYTHON || 'python3', [join(process.cwd(), 'workers/ai/infer.py'), job.kind, input, output], { cancelled });
  }
  if (await cancelled()) throw new Error('Cancelled.');
  const result = await stat(output);
  if (!result.size || result.size > 60 * 1024 * 1024) throw new Error('Output exceeds the size limit.');
  return result.size;
}
