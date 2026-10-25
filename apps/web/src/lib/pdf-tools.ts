import { PDFDocument, PDFName, degrees } from "pdf-lib";
import { PDF_LIMIT_BYTES, PDF_MAX_PAGES } from "./pdf-limits";
export type PdfOperation =
  "pdf-merge" | "pdf-extract" | "pdf-split" | "pdf-rotate" | "pdf-metadata";
export type PdfInput = { name: string; data: ArrayBuffer };
export type PdfOutput = { name: string; data: Uint8Array };
export function pageSelection(value: string, count: number): number[] {
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  if (value.length > 2000) throw new Error("Page selection is too long.");
  const selected: number[] = [];
  for (const part of value.split(",")) {
    const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!m)
      throw new Error("Use page numbers or ascending ranges, such as 1,3-5.");
    const a = Number(m[1]),
      b = Number(m[2] || m[1]);
    if (a < 1 || b < a || b > count)
      throw new Error(`Select pages from 1 to ${count}, in ascending ranges.`);
    for (let n = a; n <= b; n++) {
      if (selected.includes(n - 1))
        throw new Error("A page can only be selected once.");
      selected.push(n - 1);
    }
  }
  return selected;
}
/** Rebuild selected pages into a fresh catalog; strip page annotations and actions. */
async function copyPages(source: PDFDocument, indices: number[], angle = 0) {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, indices);
  for (const page of pages) {
    for (const key of ["Annots", "AA", "PresSteps"])
      page.node.delete(PDFName.of(key));
    if (angle)
      page.setRotation(degrees((page.getRotation().angle + angle) % 360));
    out.addPage(page);
  }
  out.setProducer("Toolroom · pdf-lib");
  out.setCreator("Toolroom");
  return out;
}
export async function processPdfs(
  operation: PdfOperation,
  files: PdfInput[],
  selection = "",
  angle = 90,
  onProgress: (value: number) => void = () => {},
) {
  if (
    ![
      "pdf-merge",
      "pdf-extract",
      "pdf-split",
      "pdf-rotate",
      "pdf-metadata",
    ].includes(operation)
  )
    throw new Error("Unsupported PDF operation.");
  if (!files.length || files.length > 10)
    throw new Error("Choose between 1 and 10 PDFs.");
  if (operation !== "pdf-merge" && files.length !== 1)
    throw new Error("Choose one PDF for this operation.");
  if (files.reduce((n, f) => n + f.data.byteLength, 0) > PDF_LIMIT_BYTES)
    throw new Error("The combined file limit is 20 MiB.");
  if (![90, 180, 270].includes(angle))
    throw new Error("Rotation must be 90, 180 or 270 degrees.");
  const docs: PDFDocument[] = [];
  let total = 0;
  for (const file of files) {
    if (
      file.data.byteLength < 5 ||
      new TextDecoder().decode(file.data.slice(0, 5)) !== "%PDF-"
    )
      throw new Error("Choose valid PDF files.");
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(file.data, {
        updateMetadata: false,
        throwOnInvalidObject: true,
      });
    } catch {
      throw new Error(
        "This PDF is encrypted, damaged or unsupported. Use an unlocked valid PDF.",
      );
    }
    total += doc.getPageCount();
    if (!doc.getPageCount() || total > PDF_MAX_PAGES)
      throw new Error("Choose PDFs containing 1–200 pages in total.");
    docs.push(doc);
    onProgress(Math.round((docs.length / files.length) * 35));
  }
  const first = docs[0];
  if (operation === "pdf-metadata")
    return {
      files: [] as PdfOutput[],
      metadata: {
        pages: first.getPageCount(),
        title: first.getTitle() || "",
        author: first.getAuthor() || "",
        subject: first.getSubject() || "",
        creator: first.getCreator() || "",
        producer: first.getProducer() || "",
        keywords: first.getKeywords() || "",
        pageSizes: first
          .getPages()
          .map((p) => ({
            width: p.getWidth(),
            height: p.getHeight(),
            rotation: p.getRotation().angle,
          })),
      },
    };
  const outputs: PdfOutput[] = [];
  let bytes = 0;
  const save = async (doc: PDFDocument, name: string) => {
    const data = await doc.save({ useObjectStreams: true });
    bytes += data.byteLength;
    if (bytes > PDF_LIMIT_BYTES)
      throw new Error(
        "Generated PDFs exceed the 20 MiB output limit. Select fewer pages.",
      );
    outputs.push({ name, data });
  };
  if (operation === "pdf-merge") {
    const merged = await PDFDocument.create();
    for (let i = 0; i < docs.length; i++) {
      const sanitized = await copyPages(docs[i], docs[i].getPageIndices());
      const pages = await merged.copyPages(
        sanitized,
        sanitized.getPageIndices(),
      );
      pages.forEach((p) => merged.addPage(p));
      onProgress(35 + Math.round(((i + 1) / docs.length) * 55));
    }
    merged.setProducer("Toolroom · pdf-lib");
    await save(merged, "toolroom-merged.pdf");
  } else {
    const indices = pageSelection(selection, first.getPageCount());
    if (operation === "pdf-split") {
      for (let i = 0; i < indices.length; i++) {
        await save(
          await copyPages(first, [indices[i]]),
          `page-${indices[i] + 1}.pdf`,
        );
        onProgress(35 + Math.round(((i + 1) / indices.length) * 55));
      }
    } else if (operation === "pdf-extract")
      await save(await copyPages(first, indices), "toolroom-extracted.pdf");
    else {
      const out = await copyPages(first, first.getPageIndices());
      for (const index of indices) {
        const p = out.getPage(index);
        p.setRotation(degrees((p.getRotation().angle + angle) % 360));
      }
      await save(out, "toolroom-rotated.pdf");
    }
  }
  onProgress(100);
  return { files: outputs, metadata: null };
}
