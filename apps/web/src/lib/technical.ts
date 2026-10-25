import { XMLParser, XMLValidator } from "fast-xml-parser";
import { safeFetch, publicUrl } from "./safe-fetch.ts";
export function parseRobots(text: string) {
  const directives: { line: number; name: string; value: string }[] = [],
    warnings: string[] = [];
  let hasAgent = false;
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 1) {
      warnings.push(`Line ${index + 1} has no valid directive separator.`);
      continue;
    }
    const name = line.slice(0, colon).trim().toLowerCase(),
      value = line.slice(colon + 1).trim();
    if (name === "user-agent") hasAgent = true;
    if (["allow", "disallow"].includes(name) && !hasAgent)
      warnings.push(`Line ${index + 1} has no preceding User-agent.`);
    directives.push({ line: index + 1, name, value });
  }
  if (!directives.some((d) => d.name === "user-agent"))
    warnings.push("No User-agent directive found.");
  const sitemaps = directives
    .filter((d) => d.name === "sitemap")
    .map((d) => {
      try {
        return { url: publicUrl(d.value).href, valid: true };
      } catch {
        return { url: d.value, valid: false };
      }
    });
  return {
    directives,
    sitemaps,
    warnings,
    note: "Directive inventory and basic syntax only. This does not evaluate all crawler matching rules or establish page indexability.",
  };
}
export function parseSitemap(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("DTD and entity declarations are not supported.");
  const validation = XMLValidator.validate(text);
  if (validation !== true)
    throw new Error(`Invalid XML: ${validation.err.msg}`);
  const parsed = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
    parseTagValue: false,
    removeNSPrefix: true,
  }).parse(text) as Record<string, Record<string, unknown>>;
  const type = parsed.urlset
    ? "urlset"
    : parsed.sitemapindex
      ? "sitemapindex"
      : null;
  if (!type) throw new Error("XML root must be urlset or sitemapindex.");
  const root = parsed[type],
    raw = root[type === "urlset" ? "url" : "sitemap"];
  const entries = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  if (entries.length > 10000)
    throw new Error("This checker supports up to 10,000 entries per document.");
  const urls = entries.map((entry: unknown, index: number) => {
    const e =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : {};
    const raw = typeof e.loc === "string" ? e.loc.trim() : "";
    try {
      return {
        index: index + 1,
        url: publicUrl(raw).href,
        valid: true,
        lastmod: typeof e.lastmod === "string" ? e.lastmod : null,
      };
    } catch {
      return { index: index + 1, url: raw, valid: false, lastmod: null };
    }
  });
  return {
    type,
    total: urls.length,
    valid: urls.filter((u) => u.valid).length,
    invalid: urls.filter((u) => !u.valid).length,
    duplicates: urls.length - new Set(urls.map((u) => u.url)).size,
    namespace: root["@_xmlns"] || null,
    urls,
    note: "XML well-formedness, root type and URL syntax checked. This is not full XSD validation or proof of indexing. Entries and nested sitemap documents are not fetched.",
  };
}
export async function runTechnical(raw: string, mode: "robots" | "sitemap") {
  const submitted = publicUrl(raw);
  const target =
    mode === "robots"
      ? new URL("/robots.txt", submitted)
      : submitted.pathname === "/"
        ? new URL("/sitemap.xml", submitted)
        : submitted;
  const result = await safeFetch(target.href, { maxBytes: 1024 * 1024 });
  if (result.status !== 200)
    throw new Error(`Document returned HTTP ${result.status}.`);
  if (/text\/html/i.test(result.headers["content-type"] || ""))
    throw new Error(
      "The destination returned HTML rather than the requested technical document.",
    );
  const text = result.body.toString("utf8");
  return {
    url: result.url,
    status: result.status,
    mode,
    result: mode === "robots" ? parseRobots(text) : parseSitemap(text),
  };
}
