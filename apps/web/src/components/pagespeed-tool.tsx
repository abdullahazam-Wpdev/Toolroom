"use client";
import { useState } from "react";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import type { PageSpeedReport } from "@/lib/pagespeed";
export function PageSpeedTool() {
  const [url, setUrl] = useState(""),
    [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [report, setReport] = useState<PageSpeedReport | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, strategy }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Measurement failed.");
      setReport(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Measurement failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="audit-workspace">
      <p className="configuration-note">
        The integration is installed, but the live keyless request reached
        Google’s quota limit. Configure project quota and a server-side API key
        for reliable measurements.
      </p>
      <form className="url-form" onSubmit={submit}>
        <label htmlFor="speed-url">Website URL</label>
        <div className="url-input-row">
          <input
            id="speed-url"
            required
            type="url"
            maxLength={2048}
            placeholder="https://example.com"
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle size={17} className="spin" /> Measuring…
              </>
            ) : (
              "Measure speed"
            )}
          </Button>
        </div>
        <fieldset className="strategy">
          <legend>Device strategy</legend>
          {(["mobile", "desktop"] as const).map((item) => (
            <label key={item}>
              <input
                type="radio"
                name="strategy"
                checked={strategy === item}
                disabled={busy}
                onChange={() => setStrategy(item)}
              />
              {item}
            </label>
          ))}
        </fieldset>
        <p className="setting-note">
          Measurements come from Google PageSpeed Insights and may take up to
          100 seconds. Quotas or missing field data can limit results. Your URL
          is sent to Google.
        </p>
      </form>
      {error && (
        <p role="alert" className="tool-error">
          <AlertCircle size={17} />
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="processing-status">
          Waiting for Google’s measurement. No estimated score or simulated
          percentage.
        </p>
      )}
      {report && (
        <section className="audit-report">
          <div className="report-heading">
            <div>
              <span className="eyebrow">
                {report.strategy.toUpperCase()} / GOOGLE PAGESPEED INSIGHTS
              </span>
              <h2>Measure, then improve.</h2>
              <p>{report.finalUrl || url}</p>
            </div>
          </div>
          <div className="category-scores">
            {Object.entries(report.scores).map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>{value ?? "Not tested"}</strong>
              </div>
            ))}
          </div>
          <h3>Lab measurements</h3>
          <p className="inventory-note">
            A simulated Lighthouse run, not real-user field data.
          </p>
          <div className="metric-grid">
            {Object.entries(report.lab).map(([name, metric]) => (
              <div key={name}>
                <span>
                  {name === "tbt"
                    ? "Total Blocking Time"
                    : name === "speedIndex"
                      ? "Speed Index"
                      : name.toUpperCase()}
                </span>
                <strong>{metric.display ?? "Not tested"}</strong>
              </div>
            ))}
          </div>
          <h3>Real-user field data</h3>
          <p className="inventory-note">
            {report.field.available
              ? "Page-level field percentiles returned by Google; CLS percentiles use Google’s hundredths-scaled value."
              : "Not available for this URL. No field metrics have been invented."}
          </p>
          <div className="metric-grid">
            {Object.entries(report.field)
              .filter(([name]) => name !== "available")
              .map(([name, value]) => {
                const item = value as {
                  percentile: number | null;
                  category: string | null;
                };
                return (
                  <div key={name}>
                    <span>{name.toUpperCase()}</span>
                    <strong>{item.percentile ?? "Not tested"}</strong>
                    <small>{item.category || "No field category"}</small>
                  </div>
                );
              })}
          </div>
          <h3>Opportunities</h3>
          {report.opportunities.length ? (
            report.opportunities.map((item) => (
              <details key={item.id}>
                <summary>
                  {item.title} · estimated {Math.round(item.savingsMs)} ms
                </summary>
                <p>{item.description}</p>
              </details>
            ))
          ) : (
            <p className="inventory-note">
              No time-saving opportunities were supplied. This does not mean the
              page has no issues.
            </p>
          )}
          {report.warnings.length > 0 && (
            <div className="tool-error">{report.warnings.join(" ")}</div>
          )}
          <p className="inventory-note">{report.note}</p>
        </section>
      )}
    </div>
  );
}
