// Byte-based upload progress. Encoding remains an indeterminate server stage.
export function uploadImage(
  form: FormData,
  signal: AbortSignal,
  progress: (percent: number) => void,
  useStorage = false,
): Promise<{ blob: Blob; width: string; height: string; extension: string }> {
  if (useStorage) return uploadThroughStorage(form, signal, progress);
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

async function uploadThroughStorage(form: FormData, signal: AbortSignal, progress: (percent: number) => void) {
 const file = form.get("file"); if (!(file instanceof File)) throw new Error("Choose an image.");
 const signed = await uploadObject(file, "image", signal, progress);
 const options:Record<string,string>={};form.forEach((v,k)=>{if(typeof v==="string")options[k]=v;});
 const response=await fetch("/api/images/from-storage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticket:signed.ticket,options}),signal});const result=await response.json();if(!response.ok)throw new Error(result.error);
 const download=await fetch(result.downloadUrl,{signal,credentials:"omit",referrerPolicy:"no-referrer"});if(!download.ok)throw new Error("Result download expired. Please process the image again.");
 return {blob:await download.blob(),width:String(result.width),height:String(result.height),extension:result.extension as string};
}

export async function uploadObject(file: File, purpose: "image" | "media", signal: AbortSignal, progress: (percent: number) => void) {
 const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
 const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
 const authorization = await fetch("/api/uploads", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purpose,mime:({"image/jpg":"image/jpeg","image/x-tiff":"image/tiff"}[file.type]||file.type),bytes:file.size,sha256}),signal});
 const signed = await authorization.json(); if(!authorization.ok)throw new Error(signed.error);
 await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("PUT",signed.uploadUrl);xhr.timeout=120000;for(const[k,v]of Object.entries(signed.headers))xhr.setRequestHeader(k,String(v));const abort=()=>xhr.abort();signal.addEventListener("abort",abort,{once:true});const clean=()=>signal.removeEventListener("abort",abort);xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100));};xhr.onload=()=>{clean();xhr.status>=200&&xhr.status<300?resolve():reject(new Error("Storage upload failed. Check bucket CORS and retry."));};xhr.onerror=xhr.ontimeout=()=>{clean();reject(new Error("Storage upload failed or timed out."));};xhr.onabort=()=>{clean();reject(new Error("Cancelled."));};if(signal.aborted){clean();reject(new Error("Cancelled."));return;}xhr.send(file);});
 return {ticket: signed.ticket};
}
