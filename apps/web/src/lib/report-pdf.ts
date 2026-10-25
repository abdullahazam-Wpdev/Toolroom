import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AuditReport } from "./audit";
export async function auditPdf(report: AuditReport) {
  const doc = await PDFDocument.create();
  doc.setTitle("Toolroom SEO diagnostic report");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([595, 842]),
    y = 790;
  const line = (raw: string, size = 10) => {
    const text = raw.replace(/[^\x20-\x7E]/g, " ");
    const words = text.split(/\s+/);
    let buffer = "";
    for (const word of words) {
      const candidate = (buffer ? buffer + " " : "") + word;
      if (font.widthOfTextAtSize(candidate, size) > 490 && buffer) {
        draw(buffer, size);
        buffer = word;
      } else buffer = candidate;
    }
    if (buffer) draw(buffer, size);
  };
  const draw = (text: string, size: number) => {
    if (y < 55) {
      page = doc.addPage([595, 842]);
      y = 790;
    }
    page.drawText(text, {
      x: 50,
      y,
      size,
      font,
      color: rgb(0.12, 0.18, 0.14),
      maxWidth: 495,
    });
    y -= size + 7;
  };
  line("Toolroom / SEO diagnostic", 20);
  line(report.url, 11);
  line(`Generated: ${report.generatedAt}`);
  line(
    `Custom score: ${report.scores.overall ?? "Not tested"} / 100; tested ${report.scores.tested} of ${report.scores.total} checks.`,
  );
  line(report.scores.methodology);
  line(report.coverage);
  y -= 12;
  for (const check of report.checks) {
    line(`${check.status.toUpperCase()} / ${check.title}`, 12);
    line(`Evidence: ${check.evidence}`);
    line(`Recommendation: ${check.recommendation}`);
    line(`Priority: ${check.priority}; effort: ${check.effort}`);
    y -= 8;
  }
  line(
    `Inventory: ${report.headings.length} headings, ${report.links.length} links, ${report.images.length} images. Full inventory is included in the JSON export.`,
  );
  return doc.save();
}
