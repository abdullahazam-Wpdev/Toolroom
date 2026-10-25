import { describe, it, expect } from "vitest";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { processPdfs, pageSelection } from "../apps/web/src/lib/pdf-tools";
async function fixture(widths = [100, 200, 300]) {
  const doc = await PDFDocument.create();
  widths.forEach((w) => {
    const p = doc.addPage([w, 400]);
    p.drawText("Page width " + w);
    p.node.set(
      PDFName.of("AA"),
      doc.context.obj({ O: { S: "JavaScript", JS: PDFString.of("bad") } }),
    );
    p.node.set(PDFName.of("Annots"), doc.context.obj([]));
  });
  doc.setTitle("Private document");
  doc.setAuthor("Test author");
  return { name: "fixture.pdf", data: new Uint8Array(await doc.save()).buffer };
}
describe("Actual PDF processing", () => {
  it("merges chosen order and strips page annotations/actions and source metadata", async () => {
    const result = await processPdfs("pdf-merge", [
      await fixture([200]),
      await fixture([100]),
    ]);
    const pdf = await PDFDocument.load(result.files[0].data);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([200, 100]);
    expect(pdf.getTitle()).toBeUndefined();
    expect(pdf.getPage(0).node.has(PDFName.of("AA"))).toBe(false);
    expect(pdf.getPage(0).node.has(PDFName.of("Annots"))).toBe(false);
  });
  it("extracts pages in requested order with actual page content", async () => {
    const result = await processPdfs("pdf-extract", [await fixture()], "3,1");
    const pdf = await PDFDocument.load(result.files[0].data);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([300, 100]);
    expect(pdf.getPage(0).node.Contents()).toBeDefined();
  });
  it("splits selected pages into valid one-page PDFs", async () => {
    const result = await processPdfs("pdf-split", [await fixture()], "1,3");
    expect(result.files.map((f) => f.name)).toEqual([
      "page-1.pdf",
      "page-3.pdf",
    ]);
    for (const f of result.files)
      expect((await PDFDocument.load(f.data)).getPageCount()).toBe(1);
  });
  it("rotates selected pages only and preserves dimensions", async () => {
    const result = await processPdfs("pdf-rotate", [await fixture()], "2", 270);
    const pdf = await PDFDocument.load(result.files[0].data);
    expect(pdf.getPages().map((p) => p.getRotation().angle)).toEqual([
      0, 270, 0,
    ]);
    expect(pdf.getPage(1).getWidth()).toBe(200);
  });
  it("inspects metadata without changing input bytes", async () => {
    const file = await fixture(),
      before = new Uint8Array(file.data).slice();
    const result = await processPdfs("pdf-metadata", [file]);
    expect(result.metadata?.title).toBe("Private document");
    expect(result.metadata?.pages).toBe(3);
    expect(new Uint8Array(file.data)).toEqual(before);
  });
  it("rejects malformed files, oversized batches, bad selection and page limits", async () => {
    await expect(
      processPdfs("pdf-merge", [
        { name: "fake.pdf", data: new ArrayBuffer(20) },
      ]),
    ).rejects.toThrow("valid PDF");
    await expect(
      processPdfs("pdf-merge", [
        { name: "huge.pdf", data: new ArrayBuffer(21 * 1024 * 1024) },
      ]),
    ).rejects.toThrow("20 MiB");
    await expect(
      processPdfs("pdf-extract", [await fixture()], "4"),
    ).rejects.toThrow("1 to 3");
    await expect(
      processPdfs("pdf-merge", [await fixture(Array(201).fill(100))]),
    ).rejects.toThrow("200");
    expect(() => pageSelection("2-1", 3)).toThrow();
    expect(() => pageSelection("1,1", 3)).toThrow();
    expect(() => pageSelection("1e2", 100)).toThrow();
  });
});
