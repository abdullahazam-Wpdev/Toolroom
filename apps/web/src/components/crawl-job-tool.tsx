"use client";
import { useEffect, useRef, useState } from 'react';
import { Play, XCircle } from 'lucide-react';
type JobState = { status: string; pagesCrawled: number; pagesDiscovered: number; error: string | null; report: Record<string, unknown> | null };
const TIERS = [100, 500, 1000] as const;
export function CrawlJobTool() {
  const [url, setUrl] = useState(''), [maxPages, setMaxPages] = useState<typeof TIERS[number]>(100);
  const [job, setJob] = useState<{ id: string; token: string } | null>(null), [state, setState] = useState<JobState | null>(null), [error, setError] = useState(''), [submitting, setSubmitting] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!job) return;
    let active = true, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/crawl-jobs/${job!.id}`, { headers: { Authorization: `Bearer ${job!.token}` }, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!active) return;
        setState(data);
        if (!['completed', 'failed', 'cancelled'].includes(data.status)) timer = setTimeout(poll, 3000);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Status unavailable.'); }
    }
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [job]);
  const busy = submitting || Boolean(job && state && !['completed', 'failed', 'cancelled'].includes(state.status));
  async function start() {
    setError(''); setState(null); setJob(null); setSubmitting(true);
    const myGeneration = ++generation.current;
    try {
      const response = await fetch('/api/crawl-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, maxPages }) });
      const data = await response.json();
      if (myGeneration !== generation.current) return;
      if (response.status !== 202) throw new Error(data.error);
      setJob(data); setState({ status: 'queued', pagesCrawled: 0, pagesDiscovered: 0, error: null, report: null });
    } catch (e) { if (myGeneration === generation.current) setError(e instanceof Error ? e.message : 'Submission failed.'); }
    finally { if (myGeneration === generation.current) setSubmitting(false); }
  }
  async function cancel() {
    if (!job) return;
    try { await fetch(`/api/crawl-jobs/${job.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${job.token}` } }); setState(s => s ? { ...s, status: 'cancelling' } : s); }
    catch (e) { setError(e instanceof Error ? e.message : 'Cancellation failed.'); }
  }
  function download() {
    if (!state?.report) return;
    const link = document.createElement('a'), object = URL.createObjectURL(new Blob([JSON.stringify(state.report, null, 2)], { type: 'application/json' }));
    link.href = object; link.download = 'toolroom-background-crawl.json'; link.click(); setTimeout(() => URL.revokeObjectURL(object), 1000);
  }
  return <details className="panel media-job-panel">
    <summary>Background website crawl · 100 / 500 / 1,000 pages</summary>
    <p>Larger crawls run as a background job with real progress, cancellation and persistence, instead of a single blocking request. Requires an operator-configured Postgres/Redis/worker installation (<code>MEDIA_JOBS_ENABLED=true</code>). This mode skips the broken-link byte sampling and image measurement the quick ≤25-page audit does; use that one for those checks.</p>
    <form onSubmit={e => { e.preventDefault(); void start(); }}>
      <label>Website URL<input type="url" aria-label="Background crawl website URL" required disabled={busy} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" /></label>
      <label>Page limit<select aria-label="Background crawl page limit" disabled={busy} value={maxPages} onChange={e => setMaxPages(Number(e.target.value) as typeof TIERS[number])}>{TIERS.map(t => <option key={t} value={t}>{t.toLocaleString()} pages</option>)}</select></label>
      <button className="button" disabled={!url || busy}><Play size={17} />{submitting ? 'Submitting…' : 'Start background crawl'}</button>
      {busy && job && <button type="button" className="button outline" onClick={cancel}><XCircle size={17} />Cancel</button>}
    </form>
    {error && <p role="alert" className="error">{error}</p>}
    {state && <div aria-live="polite">
      <p><strong>{state.status === 'cancelling' ? 'Cancelling…' : state.status}</strong> · {state.pagesCrawled} page(s) crawled{state.pagesDiscovered ? ` of ${state.pagesDiscovered} discovered so far` : ''}</p>
      {state.error && <p role="alert">{state.error}</p>}
      {(state.status === 'completed' || state.status === 'cancelled') && state.report && <button type="button" className="button outline" onClick={download}>Download {state.status === 'cancelled' ? 'partial ' : ''}JSON report ({state.pagesCrawled} page(s))</button>}
    </div>}
  </details>;
}
