"use client";
import { useEffect, useRef, useState } from 'react';
import { Upload, Download, XCircle } from 'lucide-react';
type Status = { status: string; progress: number; outputBytes?: number; error?: string; expiresAt?: string };
export function MediaJobTool({ kind }: { kind: string }) {
  const video = kind.startsWith('video-'), portrait = kind === 'background-remover';
  const [file, setFile] = useState<File | null>(null), [format, setFormat] = useState(video ? 'webm' : 'png'), [quality, setQuality] = useState('balanced');
  const [job, setJob] = useState<{ id: string; token: string } | null>(null), [state, setState] = useState<Status | null>(null), [error, setError] = useState(''), [upload, setUpload] = useState<number | null>(null), [result, setResult] = useState(''), [original, setOriginal] = useState('');
  const xhr = useRef<XMLHttpRequest | null>(null), generation = useRef(0);
  useEffect(() => { if (!file) { setOriginal(''); return; } const url = URL.createObjectURL(file); setOriginal(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => () => { xhr.current?.abort(); generation.current++; }, []);
  useEffect(() => { return () => { if (result) URL.revokeObjectURL(result); }; }, [result]);
  useEffect(() => {
    if (!job) return;
    let active = true, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/jobs/${job!.id}`, { headers: { Authorization: `Bearer ${job!.token}` }, cache: 'no-store' });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        if (!active) return; setState(data);
        if (!['completed', 'failed', 'cancelled'].includes(data.status)) timer = setTimeout(poll, 1000);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Status unavailable.'); }
    }
    void poll(); return () => { active = false; clearTimeout(timer); };
  }, [job]);
  const busy = upload !== null || Boolean(job && !['completed', 'failed', 'cancelled'].includes(state?.status || ''));
  async function start() {
    if (!file) return;
    setError(''); setResult(''); setState(null); setJob(null); setUpload(0);
    const form = new FormData(); form.set('file', file); form.set('kind', kind); form.set('format', format); form.set('quality', quality);
    const request = new XMLHttpRequest(); xhr.current = request; request.open('POST', '/api/jobs'); request.timeout = 30000;
    request.upload.onprogress = (e) => { if (e.lengthComputable) setUpload(Math.round(e.loaded / e.total * 100)); };
    request.onload = () => { setUpload(null); try { const data = JSON.parse(request.responseText); if (request.status !== 202) throw new Error(data.error); setState({ status: 'queued', progress: 0 }); setJob(data); } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); } };
    request.onerror = request.ontimeout = () => { setUpload(null); setError('Upload failed or timed out.'); };
    request.onabort = () => { setUpload(null); setError('Upload cancelled.'); };
    request.send(form);
  }
  async function cancel() {
    if (upload !== null) { xhr.current?.abort(); return; }
    if (!job) return;
    try { const response = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${job.token}` } }); if (!response.ok) throw new Error('Cancellation failed.'); setState(s => s ? { ...s, status: 'cancelling' } : s); } catch (e) { setError(String(e)); }
  }
  async function download() {
    if (!job) return;
    try { const response = await fetch(`/api/jobs/${job.id}?download=1`, { headers: { Authorization: `Bearer ${job.token}` } }); if (!response.ok) throw new Error('Download unavailable or expired.'); const blob = await response.blob(), url = URL.createObjectURL(blob); setResult(url); const a = document.createElement('a'); a.href = url; a.download = `toolroom-result.${format}`; a.click(); } catch (e) { setError(String(e)); }
  }
  return <div className="panel media-job-panel">
    <div className="media-job-toolbar">
      <label>Output format<select aria-label="Output format" value={format} disabled={busy} onChange={e => setFormat(e.target.value)}>{video ? <><option value="webm">WebM · VP9 / Opus</option><option value="mp4">MP4 · H.264 / AAC</option></> : <option value="png">PNG {portrait ? '· transparent' : '· 2× resolution'}</option>}</select></label>
      {video && <label>Quality preset<select value={quality} disabled={busy} onChange={e => setQuality(e.target.value)}><option value="balanced">Balanced</option><option value="smaller">Smaller file</option><option value="quality">Higher quality</option></select></label>}
      <button className="button" disabled={!file || busy} onClick={start}><Upload size={17} />Start processing</button>
      {busy && <button className="button outline" onClick={cancel}><XCircle size={17} />Cancel</button>}
    </div>
    <label className="media-job-drop">Choose {video ? 'a video' : portrait ? 'a portrait' : 'an image'}<input aria-label="Choose media file" type="file" disabled={busy} accept={video ? '.mp4,.mov,.webm,.mkv,.avi' : 'image/jpeg,image/png,image/webp'} onChange={e => { setFile(e.target.files?.[0] || null); setJob(null); setState(null); setResult(''); setError(''); }} /><span>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MiB` : 'Select a file to get started'}</span></label>
    <p className="muted">{video ? 'Up to 32 MiB, 2 minutes and 4K input. Output fits 1080p. Compression savings depend on the source.' : portrait ? 'Portrait background removal with MODNet. Designed for people; product and animal cutouts may be poor. Up to 10 MiB and 4 megapixels.' : 'Genuine Swin2SR 2× inference for small images up to 256 × 256 pixels. Output is PNG; new detail is an estimate.'} Files and results expire after one hour. Keep this page open to retain your private download access.</p>
    {upload !== null && <div role="status">Uploading {upload}%<progress max={100} value={upload} /></div>}
    {state && <div aria-live="polite"><strong>{state.status === 'processing' ? 'Processing' : state.status}</strong>{state.status === 'processing' && <progress max={100} value={video ? state.progress : undefined} />}{video && state.status === 'processing' && <span>{state.progress}% of timeline encoded</span>}{state.error && <p>{state.error}</p>}{state.status === 'completed' && <p><button className="button" onClick={download}><Download size={17} />Download result</button> {((state.outputBytes || 0) / 1024).toFixed(1)} KiB · ready until {new Date(state.expiresAt!).toLocaleTimeString()}</p>}</div>}
    {error && <p role="alert" className="error">{error}</p>}
    {!video && original && <div className="media-job-previews"><figure><img src={original} alt="Original upload" /><figcaption>Original</figcaption></figure>{result && <figure><img src={result} alt="Processed result" /><figcaption>{portrait ? 'Transparent result' : 'AI 2× result'}</figcaption></figure>}</div>}
    {video && result && <video controls src={result} className="media-result-video" />}
  </div>;
}
