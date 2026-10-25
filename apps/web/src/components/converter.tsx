"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  X,
  Download,
  Check,
  LoaderCircle,
  Image as ImageIcon,
  ShieldCheck,
  SlidersHorizontal,
  Plus,
  Maximize2,
} from "lucide-react";
import { StockPhotoPicker } from "./stock-photo-picker";
import { Button } from "./ui/button";
import {
  imageToolConfig,
  outputFilename,
  type ImageToolId,
} from "../../../../packages/core/image-tools";
import { uploadImage } from "@/lib/upload";
type Item = {
  id: string;
  file: File;
  preview: string;
  state: "preparing" | "ready" | "processing" | "done" | "error";
  error?: string;
  output?: string;
  download?: string;
  blob?: Blob;
  width?: string;
  height?: string;
  extension?: string;
  progress?: number;
};
const size = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(2)} MiB`
    : `${(n / 1024).toFixed(1)} KiB`;
export function Converter({ tool = "jpg-to-webp", maxBytes = 10 * 1024 * 1024, useStorage = false }: { tool?: ImageToolId; maxBytes?: number; useStorage?: boolean }) {
  const config = imageToolConfig[tool];
  const [format, setFormat] = useState("source"),
    [background, setBackground] = useState("#ffffff");
  const [selected, setSelected] = useState(0);
  const [canvasMode, setCanvasMode] = useState("compare");
  const [zoom, setZoom] = useState(100);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [items, setItems] = useState<Item[]>([]),
    [quality, setQuality] = useState(80),
    [width, setWidth] = useState(""),
    [height, setHeight] = useState(""),
    [lock, setLock] = useState(true),
    [lossless, setLossless] = useState(false),
    [stripMetadata, setStripMetadata] = useState(true),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false),
    [notice, setNotice] = useState("");
  const previewControllers = useRef(new Map<string, AbortController>());
  const picker = useRef<HTMLInputElement>(null),
    urls = useRef(new Set<string>()),
    controller = useRef<AbortController | null>(null);
  function url(blob: Blob) {
    const value = URL.createObjectURL(blob);
    urls.current.add(value);
    return value;
  }
  function revoke(value?: string) {
    if (value) {
      URL.revokeObjectURL(value);
      urls.current.delete(value);
    }
  }
  useEffect(() => {
    const all = urls.current;
    return () => {
      all.forEach(URL.revokeObjectURL);
      controller.current?.abort();
      previewControllers.current.forEach(c => c.abort());
    };
  }, []);
  useEffect(() => {
    try {
      if (localStorage.getItem("toolroom-consent") === "yes") {
        const previous = JSON.parse(
          localStorage.getItem("toolroom-recent") || "[]",
        );
        localStorage.setItem(
          "toolroom-recent",
          JSON.stringify(
            [tool, ...previous.filter((x: string) => x !== tool)].slice(0, 5),
          ),
        );
      }
    } catch {}
  }, []);
  async function add(files: FileList | File[]) {
    setNotice("");
    const list = Array.from(files);
    if (items.length + list.length > 10) {
      setNotice("A batch can contain up to 10 images.");
      return;
    }
    const accepted: Item[] = [];
    const errors: string[] = [];
    for (const file of list) {
      if (!config.accept.split(",").includes(file.type)) {
        errors.push(`${file.name}: choose a ${config.input} image.`);
        continue;
      }
      if (file.size > maxBytes) {
        errors.push(`${file.name}: the limit is ${maxBytes / 1024 / 1024} MiB.`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        preview: ["image/tiff", "image/x-tiff"].includes(file.type) ? "" : url(file),
        state: ["image/tiff", "image/x-tiff"].includes(file.type) ? "preparing" : "ready",
      });
    }
    setItems((old) => [...old, ...accepted]);
    setNotice(errors.join(" "));
    const queue = accepted.filter(item => item.state === "preparing").map(item => { const abort = new AbortController(); previewControllers.current.set(item.id, abort); return {item, abort}; });
    for (const {item, abort} of queue) {
      if (abort.signal.aborted) continue;
      try { const blob = await tiffPreview(item.file, abort.signal); if (!abort.signal.aborted) update(item.id, { preview: url(blob), state: "ready" }); }
      catch (error) { if (!abort.signal.aborted) update(item.id, { state: "error", error: error instanceof Error ? error.message : "Preview unavailable." }); }
      finally { previewControllers.current.delete(item.id); }
    }
  }
  async function tiffPreview(blob: Blob, signal: AbortSignal) {
    const form = new FormData(); form.set("file", new File([blob], "preview.tiff", {type:"image/tiff"})); form.set("tool", "image-converter"); form.set("format", "png"); form.set("width", "800");
    return (await uploadImage(form, signal, () => {}, useStorage)).blob;
  }
  function update(id: string, patch: Partial<Item>) {
    setItems((old) => old.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  async function process() {
    if (
      (width && (!Number.isInteger(+width) || +width < 1 || +width > 8000)) ||
      (height && (!Number.isInteger(+height) || +height < 1 || +height > 8000))
    ) {
      setNotice("Dimensions must be whole numbers from 1 to 8,000.");
      return;
    }
    setBusy(true);
    setNotice("");
    const abort = new AbortController();
    controller.current = abort;
    for (const item of items) {
      if (abort.signal.aborted) break;
      revoke(item.output);
      revoke(item.download);
      update(item.id, {
        state: "processing",
        error: undefined,
        output: undefined,
        download: undefined,
        blob: undefined,
      });
      try {
        const form = new FormData();
        form.set("file", item.file);
        form.set("tool", tool);
        form.set("format", format);
        form.set("background", background);
        form.set("quality", String(quality));
        form.set("width", width);
        form.set("height", height);
        form.set("lock", String(lock));
        form.set("lossless", String(lossless));
        form.set("stripMetadata", String(stripMetadata));
        const result = await uploadImage(form, abort.signal, (percent) =>
          update(item.id, { progress: percent }), useStorage,
        );
        const blob = result.blob;
        let preview: Blob | null = blob;
        if (result.extension === "tiff") {
          try { preview = await tiffPreview(blob, abort.signal); } catch { preview = null; }
        }
        if (abort.signal.aborted) throw new Error("Cancelled.");
        const download = url(blob);
        update(item.id, {
          state: "done",
          blob,
          output: preview ? preview === blob ? download : url(preview) : undefined,
          download,
          width: result.width,
          height: result.height,
          extension: result.extension,
          progress: 100,
        });
      } catch (error) {
        update(item.id, {
          state: "error",
          error: abort.signal.aborted
            ? "Cancelled. You can try again."
            : error instanceof Error
              ? error.message
              : "Conversion failed.",
        });
      }
    }
    setBusy(false);
    controller.current = null;
  }
  const completed = items.filter((i) => i.state === "done" && i.blob);
  async function zip() {
    try {
      setNotice("Preparing ZIP…");
      const JSZip = (await import("jszip")).default;
      const archive = new JSZip();
      completed.forEach((i, index) =>
        archive.file(
          `${index + 1}-${outputFilename(i.file.name, i.extension || "webp")}`,
          i.blob!,
        ),
      );
      const blob = await archive.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      const object = url(blob);
      link.href = object;
      link.download = `toolroom-${tool}.zip`;
      link.click();
      setTimeout(() => revoke(object), 10000);
      setNotice("ZIP ready.");
    } catch {
      setNotice("Could not create the ZIP. Try individual downloads.");
    }
  }
  const activeItem = items[Math.min(selected, items.length - 1)];
  async function sample() {
    try {
      setNotice("Loading the sample photo…");
      const response = await fetch("/samples/unsplash-lake.jpg");
      if (!response.ok) throw new Error("The sample photo is unavailable. Choose an image from your device.");
      const blob = await response.blob();
      add([new File([blob], "unsplash-lake.jpg", { type: "image/jpeg" })]);
      setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Sample unavailable."); }
  }
  return (
    <div className="converter compact-converter">
      <div className="converter-head"><span><span className="dot" /> {config.label}</span><span>Up to 10 images · {maxBytes / 1024 / 1024} MiB each</span></div>
      <input ref={picker} id="image-files" type="file" accept={config.accept} multiple className="sr-only" disabled={busy} onChange={e => { if(e.target.files) add(e.target.files); e.target.value = ""; }} />
      <div className="converter-toolbar">
        <div className="conversion-direction"><span>{config.input}</span><span aria-hidden="true">→</span>
        {(tool === "image-converter" || tool === "image-compressor" || tool === "image-resizer") ? <label>Output format<select aria-label="Output format" disabled={busy} value={format} onChange={e=>{setFormat(e.target.value);setLossless(false);}}><option value="source">Keep original format</option><option value="jpeg">JPEG / JPG</option><option value="png">PNG</option><option value="webp">WebP</option><option value="avif">AVIF</option><option value="gif">GIF (single frame)</option><option value="tiff">TIFF (single page)</option></select></label> : <strong>{config.output}</strong>}</div>
        <div className="conversion-actions">
          <Button
            type="button"
            disabled={!items.length || busy || items.some(item => item.state === "preparing")}
            onClick={process}
          >
            {busy ? (
              <>
                <LoaderCircle size={17} className="spin" /> Processing batch…
              </>
            ) : (
              <>
                {config.action} {items.length || ""}{" "}
                {items.length === 1 ? "image" : "images"}{" "}
                <ImageIcon size={16} />
              </>
            )}
          </Button>
          {busy && (
            <Button
              variant="outline"
              onClick={() => controller.current?.abort()}
            >
              Cancel batch
            </Button>
          )}
          {completed.length > 0 && (
            <Button variant="outline" onClick={zip}>
              <Download size={16} /> Download ZIP ({completed.length})
            </Button>
          )}

        </div>
      </div>
      <div className={"upload-column compact-upload " + (items.length ? "has-files" : "")}>
        <div className={"dropzone " + (drag ? "drag" : "")} onDragOver={e=>{e.preventDefault();if(!busy)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);if(!busy)add(e.dataTransfer.files);}}>
          <span className="upload-icon"><Upload size={25}/></span>
          <div><h2>{items.length ? "Add more images to your batch" : "Drop images. Pick a format. Done."}</h2><p>{items.length ? "Drop additional files here, or choose from your device." : "Choose your images to open the canvas and see your batch."}</p></div>
          <Button type="button" disabled={busy || !hydrated} onClick={()=>picker.current?.click()}><Plus size={17}/>Choose images</Button>
          <span className="upload-help">{config.input} · Single-frame images · Maximum 24 megapixels</span>
        </div>
        {!items.length && config.accept.includes("image/jpeg") && <div className="sample-strip"><span>No image handy?</span><button type="button" disabled={!hydrated || busy} onClick={sample}><img src="/samples/unsplash-lake.jpg" alt="Mountain lake sample by Brittany Martin" width="56" height="36"/>Try a real photo</button><a href="https://unsplash.com/photos/a-lake-surrounded-by-mountains-and-trees-cpXJYdJSNeM" target="_blank" rel="noreferrer">Brittany Martin / Unsplash ↗</a></div>}
      </div>
      {config.accept.includes("image/jpeg") && <StockPhotoPicker disabled={busy} onPick={file=>void add([file])}/>}
      {items.length > 0 && <section className="batch-results" aria-label="Batch results"><h2>Images <span>{items.length} {items.length === 1 ? "file" : "files"}</span></h2>
          <div className="file-list">
            {items.map((item) => (
              <article className="file-row" key={item.id}>
                <button type="button" className="preview-select" aria-label={`Preview ${item.file.name} on canvas`} onClick={() => setSelected(items.indexOf(item))}>{item.preview ? <img
                  src={item.preview}
                  alt={`Preview of ${item.file.name}`}
                  width="64"
                  height="64"
                /> : <span className="preview-pending">TIFF</span>}</button>
                <div className="file-info">
                  <strong>{item.file.name}</strong>
                  <span>
                    {size(item.file.size)}
                    {item.blob && (
                      <>
                        {" "}
                        → {size(item.blob.size)} ·{" "}
                        {((1 - item.blob.size / item.file.size) * 100).toFixed(
                          1,
                        )}
                        %{" "}
                        {item.blob.size <= item.file.size ? "saved" : "change"}
                      </>
                    )}
                  </span>
                  {item.state === "preparing" && <span className="processing">Preparing TIFF preview…</span>}
                  {item.state === "processing" && (
                    <span className="processing">
                      <LoaderCircle size={13} className="spin" />{" "}
                      {item.progress !== undefined && item.progress < 100
                        ? `Uploading ${item.progress}%`
                        : "Processing…"}
                    </span>
                  )}
                  {item.state === "error" && (
                    <span className="error">{item.error}</span>
                  )}
                  {item.state === "done" && (
                    <span className="success">
                      <Check size={13} /> {item.width} × {item.height} ·{" "}
                      {item.extension === "webp"
                        ? "WebP"
                        : item.extension?.toUpperCase()}
                    </span>
                  )}
                </div>
                {item.output && <div className="result-output"><img src={item.output} alt={`Output preview of ${item.file.name}`} width="55" height="45"/><span><strong>{outputFilename(item.file.name, item.extension || "webp")}</strong><small>{size(item.blob!.size)}</small></span><em className={item.blob!.size <= item.file.size ? "savings" : "increase"}>{Math.abs((1 - item.blob!.size / item.file.size) * 100).toFixed(0)}% {item.blob!.size <= item.file.size ? "smaller" : "larger"}</em></div>}
                {item.download && (
                  <a
                    className="icon-button"
                    href={item.download}
                    download={outputFilename(
                      item.file.name,
                      item.extension || "webp",
                    )}
                    aria-label={`Download ${item.file.name} as ${item.extension === "webp" ? "WebP" : item.extension?.toUpperCase()}`}
                  >
                    <Download size={18} /><span className="download-label">Download</span>
                  </a>
                )}
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => {
                    revoke(item.preview);
                    revoke(item.output);
                    revoke(item.download);
                    previewControllers.current.get(item.id)?.abort();
                    setItems((old) => old.filter((i) => i.id !== item.id));
                  }}
                >
                  <X size={17} />
                </button>
              </article>
            ))}
          </div>
          {items.length > 0 && (
            <button
              className="clear-button"
              disabled={busy}
              onClick={() => {
                items.forEach((i) => {
                  revoke(i.preview);
                  revoke(i.output);
                  revoke(i.download);
                });
                previewControllers.current.forEach(c => c.abort());
                previewControllers.current.clear();
                setItems([]);
                setNotice("");
              }}
            >
              Clear all files
            </button>
          )}
      </section>}

      {activeItem && <section className="image-canvas" aria-label="Image canvas"><div className="canvas-toolbar"><h2><Maximize2 size={16}/> Image canvas</h2><div role="group" aria-label="Canvas view">{["original","result","compare"].map(mode=><button type="button" key={mode} aria-pressed={canvasMode===mode} disabled={mode!=="original" && !activeItem.output} onClick={()=>setCanvasMode(mode)}>{mode}</button>)}</div><label>Zoom<select aria-label="Zoom" value={zoom} onChange={e=>setZoom(+e.target.value)}><option value="100">Fit</option><option value="150">150%</option><option value="200">200%</option></select></label></div><div className={"canvas-images " + ((canvasMode === "compare" && activeItem.output) ? "side-by-side" : "")}>
        {(canvasMode!=="result" || !activeItem.output) && <figure><div className="canvas-viewport">{activeItem.preview ? <img style={{transform:`scale(${zoom/100})`}} src={activeItem.preview} alt="Original image comparison"/> : <span>Preparing or unavailable preview</span>}</div><figcaption>Original · {activeItem.file.name}</figcaption></figure>}
        {canvasMode!=="original" && activeItem.output && <figure><div className="canvas-viewport"><img style={{transform:`scale(${zoom/100})`}} src={activeItem.output} alt="Processed image comparison"/></div><figcaption>Processed · {activeItem.width} × {activeItem.height} pixels</figcaption></figure>}
      </div><p>Select a thumbnail to inspect another image. TIFF previews are rendered as PNG at up to 800 px wide. Zoom changes the preview, not output dimensions.</p></section>}
      <details className="converter-settings" open><summary><SlidersHorizontal size={17}/><span>Resize, quality & advanced options<small>Optional · Changes apply when you process the batch</small></span></summary><aside className="settings"><h2 className="sr-only">Conversion settings</h2>
          <div className="quality-group"><label htmlFor="quality" className="range-label">
            Quality <output>{quality}%</output>
          </label>
          <input
            id="quality"
            type="range"
            min="1"
            max="100"
            value={quality}
            disabled={busy || tool === "webp-to-png" || ["png", "gif", "tiff"].includes(format) || lossless}
            onChange={(e) => setQuality(+e.target.value)}
          />
          <div className="range-hints">
            <span>Smaller file</span>
            <span>More detail</span>
          </div>
          <p className="setting-note">
            {tool === "webp-to-png" || format === "png" ? "PNG output is lossless; quality does not apply." : lossless ? "Lossless WebP preserves decoded pixels; quality does not apply." : "Higher quality retains more detail. Smaller output is not guaranteed."}
          </p>
          {(tool === "png-to-jpg" || format === "jpeg") && (
            <label className="select-label">
              Transparency background
              <input
                type="color"
                disabled={busy}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </label>
          )}

          </div><div className="resize-group"><label className="select-label">Resize (optional)<select disabled={busy} aria-label="Resize preset" onChange={(e) => { setWidth(e.target.value); setHeight(""); setLock(true); }} defaultValue=""><option value="">Keep original size / custom</option><option value="1920">Fit within 1,920 px wide</option><option value="1280">Fit within 1,280 px wide</option><option value="640">Fit within 640 px wide</option></select></label>
          <div className="dimension-fields">
            <label>
              Width{" "}
              <input
                type="number"
                min="1"
                max="8000"
                placeholder="Original"
                value={width}
                disabled={busy}
                onChange={(e) => setWidth(e.target.value)}
              />
            </label>
            <span>×</span>
            <label>
              Height{" "}
              <input
                type="number"
                min="1"
                max="8000"
                placeholder="Original"
                value={height}
                disabled={busy}
                onChange={(e) => setHeight(e.target.value)}
              />
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={lock}
              disabled={busy}
              onChange={(e) => setLock(e.target.checked)}
            />{" "}
            Preserve aspect ratio
          </label>
          <p className="setting-note">
            When locked, dimensions are a bounding box. Images are never
            enlarged.
          </p>
          </div><div className="privacy-group"><h3 className="advanced-heading">Advanced options</h3>
          <label className="check-label toggle-setting"><span>Remove metadata (EXIF)<small>Improve privacy and reduce file size</small></span><input type="checkbox" checked={stripMetadata} disabled={busy} onChange={e => setStripMetadata(e.target.checked)} /></label>
          {(tool === "jpg-to-webp" || format === "webp") && <label className="check-label toggle-setting"><span>Lossless WebP<small>Preserve decoded pixels; may create larger files</small></span><input type="checkbox" checked={lossless} disabled={busy} onChange={e => setLossless(e.target.checked)} /></label>}
          <div className="metadata-note">
            <ShieldCheck size={17} />
            <div>
              <strong>{stripMetadata ? "Metadata removed" : "Metadata retained"}</strong>
              <span>{stripMetadata ? "Location and camera details are stripped." : "Output may include location and camera details."}</span>
            </div>
          </div>
          </div>

      </aside></details>
      <div className="supported-formats"><strong>Supported formats</strong>{["JPEG / JPG", "PNG", "WebP", "AVIF", "GIF", "TIFF"].map(name=><span key={name}>{name}</span>)}<p>Use the <a href="/image-tools/image-converter">general image converter</a> for every supported format combination. Animated GIF/AVIF and multipage TIFF are not supported. HEIC, RAW, PSD, PDF and vector formats need separate processing and are not accepted here.</p></div>
      <div className="converter-message" role="status" aria-live="polite">{notice || "Files are processed on our server and are not saved to disk."}</div>
    </div>
  );
}
