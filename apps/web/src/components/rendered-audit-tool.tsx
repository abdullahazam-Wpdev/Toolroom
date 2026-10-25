"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Search } from "lucide-react";
import type { Check } from "@/lib/audit";
type ReportShape = { checks: Check[]; renderError: string | null; navigationTimedOut: boolean; blockedRequests: number; failedRequests: number };
type JobState = { status: string; error: string | null; report: ReportShape | null };
const severityOrder = ["critical", "warning", "not-tested", "pass"] as const;
export function RenderedAuditTool() {
  const [url, setUrl] = useState(""), [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<{ id: string; token: string } | null>(null), [state, setState] = useState<JobState | null>(null), [error, setError] = useState("");
  const [query, setQuery] = useState(""), [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const generation = useRef(0);
  useEffect(() => {
    if (!job) return;
    let active = true, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/rendered-audits/${job!.id}`, { headers: { Authorization: `Bearer ${job!.token}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!active) return;
        setState(data);
        if (!["completed", "failed", "cancelled"].includes(data.status)) timer = setTimeout(poll, 2000);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Status unavailable.");
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [job]);
  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState(null);
    setJob(null);
    setSubmitting(true);
    const myGeneration = ++generation.current;
    try {
      const response = await fetch("/api/rendered-audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await response.json();
      if (myGeneration !== generation.current) return;
      if (response.status !== 202) throw new Error(data.error);
      setJob(data);
      setState({ status: "queued", error: null, report: null });
    } catch (e) {
      if (myGeneration === generation.current) setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      if (myGeneration === generation.current) setSubmitting(false);
    }
  }
  function download() {
    if (!state?.report) return;
    const link = document.createElement("a"), object = URL.createObjectURL(new Blob([JSON.stringify(state.report, null, 2)], { type: "application/json" }));
    link.href = object;
    link.download = "toolroom-rendered-audit.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(object), 1000);
  }
  const busy = submitting || Boolean(job && state && !["completed", "failed", "cancelled"].includes(state.status));
  const checks = state?.report?.checks || [];
  const visible = checks
    .filter((c) => (severityFilter.size === 0 || severityFilter.has(c.status)) && (!query.trim() || `${c.title} ${c.evidence} ${c.recommendation}`.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => ({ critical: 0, warning: 1, "not-tested": 2, pass: 3 })[a.status] - ({ critical: 0, warning: 1, "not-tested": 2, pass: 3 })[b.status]);
  return (
    <details className="panel media-job-panel">
      <summary>JavaScript-rendered comparison · raw HTML vs. rendered DOM</summary>
      <p>
        Compares the server HTML against what a real, sandboxed Chromium renders after running the page&rsquo;s JavaScript. Needs an operator-deployed worker; this is <strong>not</strong> run inside Vercel Functions. If no worker is deployed, submitting will honestly report that rather than fabricate a result.
      </p>
      <form onSubmit={start}>
        <label>
          Page URL
          <input type="url" aria-label="Rendered comparison page URL" required disabled={busy} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <button className="button" disabled={!url || busy}>
          <Play size={17} />
          {submitting ? "Submitting…" : "Run rendered comparison"}
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {state && (
        <div aria-live="polite">
          <p>
            <strong>{state.status}</strong>
            {state.report?.renderError && ` · ${state.report.renderError}`}
            {state.report?.navigationTimedOut && " · rendering did not fully settle within the time budget"}
          </p>
          {state.error && <p role="alert">{state.error}</p>}
          {state.status === "completed" && state.report && (
            <>
              <button type="button" className="button outline" onClick={download}>
                Download JSON report
              </button>
              <div className="findings-controls">
                <label className="findings-search">
                  <Search size={16} />
                  <input type="search" aria-label="Search rendered-audit findings" placeholder="Search findings…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                <div className="severity-filters" role="group" aria-label="Filter by severity">
                  {severityOrder.map((status) => {
                    const count = checks.filter((c) => c.status === status).length;
                    return (
                      <button key={status} type="button" className={"severity-chip " + status} aria-pressed={severityFilter.has(status)} disabled={!count} onClick={() => setSeverityFilter((old) => { const next = new Set(old); next.has(status) ? next.delete(status) : next.add(status); return next; })}>
                        {status === "not-tested" ? "Not tested" : status} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="findings-count">
                Showing {visible.length} of {checks.length} checks
              </p>
              <div className="check-list">
                {visible.map((check) => (
                  <details key={check.id} className={"audit-check " + check.status}>
                    <summary>
                      <span>{check.title}</span>
                      <span className="check-state">{check.status === "not-tested" ? "Not tested" : check.status}</span>
                    </summary>
                    <p>
                      <strong>Evidence:</strong> {check.evidence}
                    </p>
                    <p>
                      <strong>Recommendation:</strong> {check.recommendation}
                    </p>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </details>
  );
}
