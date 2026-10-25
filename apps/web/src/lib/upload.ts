// Byte-based upload progress. Encoding remains an indeterminate server stage.
export function uploadImage(
  form: FormData,
  signal: AbortSignal,
  progress: (percent: number) => void,
): Promise<{ blob: Blob; width: string; height: string; extension: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/images");
    xhr.responseType = "blob";
    xhr.timeout = 60000;
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = async () => {
      cleanup();
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = "Image processing failed.";
        try {
          message =
            JSON.parse(await (xhr.response as Blob).text()).error || message;
        } catch {}
        reject(new Error(message));
        return;
      }
      resolve({
        blob: xhr.response,
        width: xhr.getResponseHeader("X-Image-Width") || "",
        height: xhr.getResponseHeader("X-Image-Height") || "",
        extension: xhr.getResponseHeader("X-Image-Format") || "webp",
      });
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Upload failed. Check your connection and retry."));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error("Cancelled. You can try again."));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error("Conversion timed out. Try a smaller image."));
    };
    if (signal.aborted) {
      cleanup();
      reject(new Error("Cancelled."));
      return;
    }
    xhr.send(form);
  });
}
