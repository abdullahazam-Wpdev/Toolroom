import { processPdfs, type PdfInput, type PdfOperation } from "./pdf-tools";
self.onmessage = async (
  event: MessageEvent<{
    operation: PdfOperation;
    files: PdfInput[];
    selection: string;
    angle: number;
  }>,
) => {
  try {
    const { operation, files, selection, angle } = event.data;
    const result = await processPdfs(
      operation,
      files,
      selection,
      angle,
      (value) => self.postMessage({ progress: value }),
    );
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "PDF processing failed.",
    });
  }
};
