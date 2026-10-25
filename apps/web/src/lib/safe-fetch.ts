import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
export type NetworkResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  redirects: { url: string; status: number; location: string }[];
};
export function publicUrl(raw: string): URL {
  if (raw.length > 2048) throw new Error("URL is too long.");
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use a public HTTP or HTTPS URL without credentials.");
  if (url.port && !["80", "443"].includes(url.port))
    throw new Error("Only standard web ports are supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.includes("%")
  )
    throw new Error("Private-network destinations are blocked.");
  if (isIP(host) && !isPublicAddress(host))
    throw new Error("Private-network destinations are blocked.");
  url.hash = "";
  return url;
}
export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}
export async function resolvePublic(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("DNS resolved to a private or reserved network.");
  return addresses[0];
}
export async function safeFetch(
  raw: string,
  options: {
    maxBytes?: number;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {},
): Promise<NetworkResponse> {
  const maxBytes = options.maxBytes || 2 * 1024 * 1024,
    deadline = Date.now() + (options.timeoutMs || 12000),
    redirects: NetworkResponse["redirects"] = [];
  let url = publicUrl(raw);
  for (let hop = 0; hop <= (options.maxRedirects ?? 4); hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Network request timed out.");
    const pinned = await Promise.race([
      resolvePublic(url),
      new Promise<never>((_, reject) => {
        const t = setTimeout(
          () => reject(new Error("DNS lookup timed out.")),
          remaining,
        );
        t.unref();
      }),
    ]);
    const response = await new Promise<{
      status: number;
      headers: Record<string, string>;
      body: Buffer;
    }>((resolve, reject) => {
      const client = url.protocol === "https:" ? https : http;
      const request = client.request(
        url,
        {
          method: "GET",
          agent: false,
          family: pinned.family,
          headers: {
            "User-Agent": "ToolroomAudit/0.2 (+single-page-check)",
            Accept:
              "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5",
            "Accept-Encoding": "identity",
          },
          lookup: (_host, _opts, callback) => {
            callback(null, pinned.address, pinned.family);
          },
        },
        (res) => {
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers))
            headers[k] = Array.isArray(v) ? v.join(", ") : v || "";
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode)
          ) {
            res.destroy();
            resolve({ status: res.statusCode, headers, body: Buffer.alloc(0) });
            return;
          }
          if (
            headers["content-encoding"] &&
            !["identity", ""].includes(headers["content-encoding"])
          ) {
            res.destroy();
            reject(
              new Error("The server returned unsupported compressed content."),
            );
            return;
          }
          if (Number(headers["content-length"]) > maxBytes) {
            res.destroy();
            reject(new Error("Response exceeds the size limit."));
            return;
          }
          let bytes = 0;
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > maxBytes) {
              res.destroy(new Error("Response exceeds the size limit."));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () =>
            resolve({
              status: res.statusCode || 0,
              headers,
              body: Buffer.concat(chunks),
            }),
          );
          res.on("error", reject);
        },
      );
      const timer = setTimeout(
        () => request.destroy(new Error("Network request timed out.")),
        Math.max(1, deadline - Date.now()),
      );
      request.on("close", () => clearTimeout(timer));
      request.on("error", reject);
      request.end();
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.headers.location)
        throw new Error("Redirect did not provide a destination.");
      const next = publicUrl(new URL(response.headers.location, url).href);
      redirects.push({
        url: url.href,
        status: response.status,
        location: next.href,
      });
      url = next;
      continue;
    }
    return { ...response, url: url.href, redirects };
  }
  throw new Error("Too many redirects.");
}
