"use client";
import { useState } from "react";
import {
  Download,
  LoaderCircle,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { findingsCsv } from "@/lib/report-csv";
import type { AuditReport } from "@/lib/audit";
import { Button } from "./ui/button";
export function AuditTool({
  view = "audit",
}: {
  view?: "audit" | "metadata" | "headings";
}) {
  const [url, setUrl] = useState(""),
    [htmlMode, setHtmlMode] = useState(false),
    [html, setHtml] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [report, setReport] = useState<AuditReport | null>(null),
    [tab, setTab] = useState(view === "audit" ? "findings" : view),
    [exporting, setExporting] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...(htmlMode ? { html } : {}) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not inspect this page.");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setBusy(false);
    }
  }
  function download(blob: Blob, name: string) {
    const object = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = object;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(object), 10000);
  }
  async function pdf() {
    if (!report) return;
    setExporting(true);
    try {
      const { auditPdf } = await import("@/lib/report-pdf");
      download(
        new Blob([new Uint8Array(await auditPdf(report))], {
          type: "application/pdf",
        }),
        "toolroom-seo-report.pdf",
      );
    } catch {
      setError("PDF export failed. The JSON report is still available.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="audit-workspace">
      <form className="url-form" onSubmit={submit}>
        <label htmlFor="audit-url">Page URL</label>
        <div className="url-input-row">
          <Search size={20} />
          <input
            id="audit-url"
            type="url"
            required
            maxLength={2048}
            placeholder="https://example.com/page"
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle size={16} className="spin" /> Inspecting…
              </>
            ) : (
              "Inspect page"
            )}
          </Button>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={htmlMode}
            disabled={busy}
            onChange={(e) => setHtmlMode(e.target.checked)}
          />{" "}
          Analyze pasted HTML instead of fetching this URL
        </label>
        {htmlMode && (
          <label className="html-label">
            HTML source
            <textarea
              required
              value={html}
              maxLength={200000}
              disabled={busy}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Paste the HTML source of your page"
            />
          </label>
        )}
        <p className="setting-note">
          One static page, up to 2 MiB. Private networks and nonstandard ports
          are blocked. Rendering, link verification and resource sizes are
          separate checks.
        </p>
      </form>
      {error && (
        <div className="tool-error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {busy && (
        <p className="processing-status" role="status">
          Fetching bounded HTML and checking available evidence. No invented
          progress percentage.
        </p>
      )}
      {report && (
        <section className="audit-report" aria-label="SEO report">
          <div className="report-heading">
            <div>
              <span className="eyebrow">SINGLE-PAGE DIAGNOSTIC</span>
              <h2>Your page, in focus.</h2>
              <p>{report.url}</p>
            </div>
            <div className="report-actions">
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(report, null, 2)], {
                      type: "application/json",
                    }),
                    "toolroom-seo-report.json",
                  )
                }
              >
                <Download size={15} /> JSON
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    new Blob([findingsCsv([report])], {
                      type: "text/csv;charset=utf-8",
                    }),
                    "toolroom-seo-report.csv",
                  )
                }
              >
                CSV report
              </Button>
              <Button variant="outline" onClick={pdf} disabled={exporting}>
                <Download size={15} />{" "}
                {exporting ? "Preparing PDF…" : "PDF report"}
              </Button>
            </div>
          </div>
          <div className="score-summary">
            <div className="main-score">
              <strong>{report.scores.overall ?? "—"}</strong>
              <span>
                / 100
                <br />
                Custom diagnostic
              </span>
            </div>
            <div>
              <strong>
                {report.scores.tested} / {report.scores.total} checks tested
              </strong>
              <p>{report.coverage}</p>
              <details>
                <summary>How this score works</summary>
                <p>
                  {report.scores.methodology} Weights: technical 30%, metadata
                  20%, structure 15%, links 15%, images 10%, social/schema 10%.
                </p>
              </details>
            </div>
          </div>
          <div className="category-scores">
            {Object.entries(report.scores.categoryScores).map(
              ([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{value ?? "Not tested"}</strong>
                </div>
              ),
            )}
          </div>
          <div className="report-tabs" aria-label="Report sections">
            {[
              "findings",
              "metadata",
              "headings",
              "links",
              "images",
              "coverage",
            ].map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={tab === name}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="report-panel">
            {tab === "findings" && (
              <div className="check-list">
                {[...report.checks]
                  .sort(
                    (a, b) =>
                      ({ critical: 0, warning: 1, "not-tested": 2, pass: 3 })[
                        a.status
                      ] -
                      { critical: 0, warning: 1, "not-tested": 2, pass: 3 }[
                        b.status
                      ],
                  )
                  .map((check) => (
                    <details
                      key={check.id}
                      className={"audit-check " + check.status}
                    >
                      <summary>
                        <span>
                          {check.status === "pass" ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <AlertCircle size={17} />
                          )}{" "}
                          {check.title}
                        </span>
                        <span className="check-state">
                          {check.status === "not-tested"
                            ? "Not tested"
                            : check.status}
                        </span>
                      </summary>
                      <p>
                        <strong>Evidence:</strong> {check.evidence}
                      </p>
                      <p>
                        <strong>Recommendation:</strong> {check.recommendation}
                      </p>
                      <p>
                        Priority: {check.priority} · Effort: {check.effort}
                      </p>
                    </details>
                  ))}
              </div>
            )}
            {tab === "metadata" && (
              <>
                <div className="snippet-preview">
                  <span>{report.url}</span>
                  <h3>{report.metadata.title || "No page title found"}</h3>
                  <p>
                    {report.metadata.description ||
                      "No meta description found."}
                  </p>
                  <small>
                    Illustrative metadata preview. Search engines may choose
                    different snippets.
                  </small>
                </div>
                <dl className="metadata-list">
                  {Object.entries(report.metadata).map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>
                        {value === null || value === ""
                          ? "Not declared"
                          : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {tab === "headings" && (
              <>
                <p className="inventory-note">
                  {Object.entries(report.headingCounts)
                    .map(([h, n]) => `${h.toUpperCase()}: ${n}`)
                    .join(" · ")}
                </p>
                {report.headings.length ? (
                  <ol className="heading-inventory">
                    {report.headings.map((h, i) => (
                      <li key={i} style={{ paddingLeft: (h.level - 1) * 16 }}>
                        <span>H{h.level}</span>
                        {h.text || "(empty heading)"}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No headings found.</p>
                )}
              </>
            )}
            {tab === "links" && (
              <>
                <p className="inventory-note">
                  {report.linkCounts.internal} internal ·{" "}
                  {report.linkCounts.external} external ·{" "}
                  {report.linkCounts.unique} unique destinations. Destinations
                  have not been fetched.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Destination</th>
                        <th>Text</th>
                        <th>Attributes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.links.map((link, i) => (
                        <tr key={i}>
                          <td>{link.href || "Invalid URL"}</td>
                          <td>{link.text || "(no visible text)"}</td>
                          <td>{link.rel.join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "images" && (
              <>
                <p className="inventory-note">
                  {report.images.length} images. Dimensions below are HTML
                  attributes; image bytes have not been measured.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Alt text</th>
                        <th>Dimensions</th>
                        <th>Loading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.images.map((image, i) => (
                        <tr key={i}>
                          <td>{image.src}</td>
                          <td>
                            {image.alt === null
                              ? "Missing"
                              : image.alt === ""
                                ? image.decorative
                                  ? "Decorative (declared)"
                                  : "Empty; review decorative intent"
                                : image.alt}
                          </td>
                          <td>
                            {image.width || "—"} × {image.height || "—"}
                          </td>
                          <td>{image.loading || "Not declared"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "coverage" && (
              <>
                <h3>What this report can establish</h3>
                <p>{report.coverage}</p>
                <ul>
                  {report.checks
                    .filter((c) => c.status === "not-tested")
                    .map((c) => (
                      <li key={c.id}>
                        <strong>{c.title}:</strong> {c.evidence}
                      </li>
                    ))}
                </ul>
                <p>
                  Robots.txt and sitemap availability do not establish that
                  directives/XML are valid, that URLs are indexed, or that a
                  sitemap was accepted by a search engine. Use the JSON export
                  for complete observed inventories, social tags and declared
                  hreflang.
                </p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
