"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Upload, X } from "lucide-react";
import type { PdfOperation, PdfOutput } from "@/lib/pdf-tools";
import { PDF_LIMIT_BYTES } from "@/lib/pdf-limits";
export function PdfTool({ operation }: { operation: PdfOperation }) {
  const [files, setFiles] = useState<File[]>([]),
    [selection, setSelection] = useState(""),
    [angle, setAngle] = useState(90),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [outputs, setOutputs] = useState<PdfOutput[]>([]),
    [metadata, setMetadata] = useState<object | null>(null);
  const generation = useRef(0),
    worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    input = useRef<HTMLInputElement>(null);
  const stop = () => {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function reset() {
    setOutputs([]);
    setMetadata(null);
    setProgress(0);
    setError("");
  }
  function choose(chosen: File[]) {
    reset();
    const next = operation === "pdf-merge" ? [...files, ...chosen] : chosen;
    if (next.length > (operation === "pdf-merge" ? 10 : 1)) {
      setError(
        operation === "pdf-merge" ? "Choose up to 10 PDFs." : "Choose one PDF.",
      );
      return;
    }
    if (
      next.some(
        (f) =>
          !f.name.toLowerCase().endsWith(".pdf") ||
          (f.type && f.type !== "application/pdf"),
      )
    ) {
      setError("Choose PDF files.");
      return;
    }
    if (next.reduce((n, f) => n + f.size, 0) > PDF_LIMIT_BYTES) {
      setError("The combined file limit is 20 MiB.");
      return;
    }
    setFiles(next);
  }
  async function run() {
    reset();
    setBusy(true);
    const current = ++generation.current;
    try {
      const data = await Promise.all(
        files.map(async (f) => ({ name: f.name, data: await f.arrayBuffer() })),
      );
      if (current !== generation.current) return;
      const w = new Worker(new URL("../lib/pdf-worker.ts", import.meta.url));
      worker.current = w;
      timer.current = setTimeout(() => {
        stop();
        setBusy(false);
        setError("Processing exceeded 30 seconds. Try a smaller PDF.");
      }, 30000);
      w.onerror = () => {
        stop();
        setBusy(false);
        setError("PDF worker failed. Try a smaller, valid PDF.");
      };
      w.onmessage = (e) => {
        if (current !== generation.current) return;
        if (e.data.progress !== undefined) setProgress(e.data.progress);
        else {
          stop();
          setBusy(false);
          if (e.data.error) setError(e.data.error);
          else {
            setOutputs(e.data.result.files);
            setMetadata(e.data.result.metadata);
            setProgress(100);
          }
        }
      };
      w.postMessage(
        { operation, files: data, selection, angle },
        data.map((f) => f.data),
      );
    } catch {
      stop();
      setBusy(false);
      setError("Could not read the selected files.");
    }
  }
  function download(blob: Blob, name: string) {
    const a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function zip() {
    try {
      const JSZip = (await import("jszip")).default,
        z = new JSZip();
      outputs.forEach((o) => z.file(o.name, o.data));
      download(await z.generateAsync({ type: "blob" }), "toolroom-pages.zip");
    } catch {
      setError("Archive creation failed. Download pages individually.");
    }
  }
  return (
    <div className="local-tool panel">
      <div className="local-tool-top">
        <span className="eyebrow">PRIVATE BY DESIGN · IN YOUR BROWSER</span>
        <span className="local-badge">
          <FileText size={15} /> PDF workspace
        </span>
      </div>
      <p>
        Up to 20 MiB combined, 10 files for merging, and 200 pages total.
        Encrypted PDFs are rejected. Files stay in this browser tab.
      </p>
      <input
        ref={input}
        className="local-file-input"
        type="file"
        accept="application/pdf,.pdf"
        multiple={operation === "pdf-merge"}
        aria-label="Choose PDF files"
        disabled={busy}
        onChange={(e) => {
          choose(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <div
        className="local-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) choose(Array.from(e.dataTransfer.files));
        }}
      >
        <Upload size={24} />
        <button
          className="button primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Choose PDF files
        </button>
        <p>Drop PDFs here or choose files from your device.</p>
      </div>
      <ul className="local-file-list">
        {files.map((f, i) => (
          <li key={i}>
            <FileText size={18} />
            <span>
              {f.name}
              <small>{(f.size / 1024).toFixed(1)} KiB</small>
            </span>
            {operation === "pdf-merge" && (
              <>
                <button
                  className="icon-button"
                  aria-label={`Move file ${i + 1} up`}
                  disabled={busy || i === 0}
                  onClick={() => {
                    reset();
                    setFiles((v) => {
                      const n = [...v];
                      [n[i - 1], n[i]] = [n[i], n[i - 1]];
                      return n;
                    });
                  }}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move file ${i + 1} down`}
                  disabled={busy || i === files.length - 1}
                  onClick={() => {
                    reset();
                    setFiles((v) => {
                      const n = [...v];
                      [n[i + 1], n[i]] = [n[i], n[i + 1]];
                      return n;
                    });
                  }}
                >
                  <ArrowDown size={16} />
                </button>
              </>
            )}
            <button
              className="icon-button"
              aria-label={`Remove file ${i + 1}`}
              disabled={busy}
              onClick={() => {
                reset();
                setFiles((v) => v.filter((_, j) => i !== j));
              }}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      {["pdf-extract", "pdf-split", "pdf-rotate"].includes(operation) && (
        <label className="local-label">
          Pages
          <input
            aria-label="Pages"
            value={selection}
            disabled={busy}
            onChange={(e) => {
              reset();
              setSelection(e.target.value);
            }}
            placeholder="All pages, or 1,3-5"
          />
          <small>
            Leave blank for all pages. Ranges must ascend; duplicates are
            rejected.
          </small>
        </label>
      )}
      {operation === "pdf-rotate" && (
        <label className="local-label">
          Clockwise rotation
          <select
            disabled={busy}
            value={angle}
            onChange={(e) => {
              reset();
              setAngle(Number(e.target.value));
            }}
          >
            {[90, 180, 270].map((n) => (
              <option key={n} value={n}>
                {n}°
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="local-actions">
        <button
          className="button primary"
          disabled={busy || !files.length}
          onClick={run}
        >
          {busy
            ? "Processing…"
            : operation === "pdf-metadata"
              ? "Inspect metadata"
              : "Process PDFs"}
        </button>
        {busy && (
          <button
            className="button outline"
            onClick={() => {
              stop();
              setBusy(false);
              setProgress(0);
              setError("Processing cancelled.");
            }}
          >
            Cancel processing
          </button>
        )}
        <button
          className="button outline"
          disabled={busy || !files.length}
          onClick={() => {
            setFiles([]);
            reset();
          }}
        >
          Clear files
        </button>
      </div>
      {busy && (
        <div role="status">
          <progress value={progress} max={100} />
          <span>{progress}% · completed processing stages</span>
        </div>
      )}
      {error && (
        <p role="alert" className="tool-error">
          {error}
        </p>
      )}
      {(outputs.length > 0 || metadata) && (
        <section aria-label="PDF results" className="local-results">
          <h2>{metadata ? "Document details" : "Your PDFs are ready"}</h2>
          {metadata && (
            <>
              <pre>{JSON.stringify(metadata, null, 2)}</pre>
              <button
                className="button outline"
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(metadata, null, 2)], {
                      type: "application/json",
                    }),
                    "toolroom-pdf-metadata.json",
                  )
                }
              >
                Download metadata JSON
              </button>
            </>
          )}
          {outputs.map((o) => (
            <div className="local-result-row" key={o.name}>
              <span>
                {o.name} · {(o.data.byteLength / 1024).toFixed(1)} KiB
              </span>
              <button
                className="button outline"
                onClick={() =>
                  download(
                    new Blob([new Uint8Array(o.data)], {
                      type: "application/pdf",
                    }),
                    o.name,
                  )
                }
              >
                Download {o.name}
              </button>
            </div>
          ))}
          {outputs.length > 1 && (
            <button className="button primary" onClick={zip}>
              Download all pages as ZIP
            </button>
          )}
        </section>
      )}
      <details className="local-limit">
        <summary>Document preservation and limits</summary>
        <p>
          Use static, unsigned PDFs. Rebuilding pages removes source metadata,
          interactive forms, annotations and page actions; links and comments
          are not retained. Signatures, bookmarks, portfolios, accessibility
          tags and PDF/A conformance are not preserved. This is not secure
          redaction or a malware scanner. Metadata inspection reads
          document-level fields without modifying the PDF. Complex documents may
          exceed browser memory or the 30-second processing deadline.
        </p>
      </details>
    </div>
  );
}
