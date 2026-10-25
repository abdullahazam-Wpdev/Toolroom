"use client";
import { useState } from "react";
import { Button } from "./ui/button";
export function TechnicalTool({ mode }: { mode: "robots" | "sitemap" }) {
  const [url, setUrl] = useState(""),
    [text, setText] = useState(""),
    [pasted, setPasted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Record<string, unknown> | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/technical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode, ...(pasted ? { text } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Check failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="audit-workspace">
      <form className="url-form" onSubmit={submit}>
        <label htmlFor="technical-url">
          {mode === "robots" ? "Website URL" : "Website or sitemap URL"}
        </label>
        <div className="url-input-row">
          <input
            id="technical-url"
            type="url"
            required
            maxLength={2048}
            disabled={busy}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <Button disabled={busy}>
            {busy ? "Checking…" : "Check document"}
          </Button>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={pasted}
            disabled={busy}
            onChange={(e) => setPasted(e.target.checked)}
          />{" "}
          Check pasted content without a network request
        </label>
        {pasted && (
          <label className="html-label">
            Document content
            <textarea
              value={text}
              required
              maxLength={200000}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        )}
        <p className="setting-note">
          {mode === "robots"
            ? "Checks /robots.txt at the site root. Reports directives and basic syntax; it does not predict indexing."
            : "Checks the supplied document, or /sitemap.xml for a root website URL. Up to 1 MiB and 10,000 entries. Nested sitemaps and URLs are not fetched."}
        </p>
      </form>
      {error && (
        <p role="alert" className="tool-error">
          {error}
        </p>
      )}
      {result && (
        <section className="audit-report">
          <h2>Document inspection</h2>
          <p>{String(result.url)}</p>
          <p className="inventory-note">
            {result.status === null
              ? "Pasted source; HTTP status not tested."
              : `HTTP ${result.status}`}
          </p>
          <pre className="technical-output">
            {JSON.stringify(result.result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
