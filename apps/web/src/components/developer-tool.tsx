"use client";
import { useState } from "react";
import { Code2, Copy, Download, RotateCcw } from "lucide-react";
import { runDeveloperTool, type DeveloperId } from "@/lib/developer-tools";
const choices: Record<DeveloperId, { value: string; label: string }[]> = {
  "json-formatter": [
    { value: "format", label: "Format & validate" },
    { value: "minify", label: "Minify" },
  ],
  "base64-converter": [
    { value: "encode", label: "Encode UTF-8 text" },
    { value: "decode", label: "Decode Base64" },
  ],
  "url-encoder": [
    { value: "encode", label: "Encode component" },
    { value: "decode", label: "Decode component" },
  ],
  "uuid-generator": [{ value: "default", label: "UUID v4" }],
  "hash-generator": ["SHA-256", "SHA-384", "SHA-512"].map((value) => ({
    value,
    label: value,
  })),
  "color-converter": [
    { value: "default", label: "HEX / RGB → HEX, RGB & HSL" },
  ],
};
const examples: Record<DeveloperId, string> = {
  "json-formatter":
    '{"name":"Toolroom","tools":["PDF","Images"],"private":true}',
  "base64-converter": "Hello, 世界 👋",
  "url-encoder": "hello world & café",
  "uuid-generator": "5",
  "hash-generator": "hello",
  "color-converter": "#635BFF",
};
export function DeveloperTool({ tool }: { tool: DeveloperId }) {
  const [input, setInput] = useState(tool === "uuid-generator" ? "1" : ""),
    [mode, setMode] = useState(choices[tool][0].value),
    [output, setOutput] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  function reset() {
    setOutput(null);
    setError("");
    setNotice("");
  }
  async function run() {
    reset();
    setBusy(true);
    try {
      setOutput(await runDeveloperTool(tool, input, mode));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(output ?? "");
      setNotice("Result copied.");
    } catch {
      setNotice("Clipboard unavailable. Select the output and copy manually.");
    }
  }
  function download() {
    const a = document.createElement("a"),
      u = URL.createObjectURL(
        new Blob([output ?? ""], {
          type:
            tool === "json-formatter"
              ? "application/json"
              : "text/plain;charset=utf-8",
        }),
      );
    a.href = u;
    a.download =
      tool === "json-formatter" ? "toolroom.json" : "toolroom-result.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  return (
    <div className="local-tool panel">
      <div className="local-tool-top">
        <span className="eyebrow">PROCESSED LOCALLY · NO UPLOAD</span>
        <span className="local-badge">
          <Code2 size={15} /> Developer workspace
        </span>
      </div>
      <div className="local-actions" role="group" aria-label="Operation">
        {choices[tool].map((c) => (
          <button
            key={c.value}
            className={"local-tab " + (mode === c.value ? "active" : "")}
            aria-pressed={mode === c.value}
            disabled={busy}
            onClick={() => {
              reset();
              setMode(c.value);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <label className="local-label">
        {tool === "uuid-generator" ? "Number of UUIDs" : "Input"}
        <textarea
          aria-label={tool === "uuid-generator" ? "Number of UUIDs" : "Input"}
          rows={tool === "uuid-generator" ? 2 : 8}
          value={input}
          disabled={busy}
          spellCheck={false}
          onChange={(e) => {
            reset();
            setInput(e.target.value);
          }}
          placeholder={examples[tool]}
        />
      </label>
      <div className="local-actions">
        <button className="button primary" disabled={busy} onClick={run}>
          {busy
            ? "Processing…"
            : tool === "uuid-generator"
              ? "Generate UUIDs"
              : "Run tool"}
        </button>
        <button
          className="button outline"
          disabled={busy}
          onClick={() => {
            reset();
            setInput(examples[tool]);
          }}
        >
          Load example
        </button>
        <button
          className="button outline"
          disabled={busy}
          onClick={() => {
            reset();
            setInput("");
          }}
        >
          <RotateCcw size={15} /> Clear
        </button>
      </div>
      {error && (
        <p role="alert" className="tool-error">
          {error}
        </p>
      )}
      {output !== null && (
        <section className="local-results">
          <div className="local-tool-top">
            <h2>Result</h2>
            <div className="local-actions">
              <button className="button outline" onClick={copy}>
                <Copy size={15} /> Copy result
              </button>
              <button className="button outline" onClick={download}>
                <Download size={15} /> Download result
              </button>
            </div>
          </div>
          <label className="local-label">
            Output
            <textarea
              aria-label="Output"
              rows={8}
              readOnly
              value={output}
              spellCheck={false}
            />
          </label>
        </section>
      )}
      {notice && <p role="status">{notice}</p>}
      <details className="local-limit">
        <summary>Limits and behavior</summary>
        <p>
          Text input is limited to 1 MiB and stays in this tab. Base64 handles
          UTF-8 text, not arbitrary binary downloads. URL operations
          encode/decode one component, not an entire URL. JSON uses JavaScript
          numeric precision and duplicate-key semantics; very large integers may
          lose precision. Hashes are unkeyed UTF-8 digests, not encryption or
          password storage. Color conversion supports opaque sRGB HEX/RGB
          values. UUIDs use the browser’s cryptographic random generator.
        </p>
      </details>
    </div>
  );
}
