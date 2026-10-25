/** Adapted category/opportunity extraction from avvio-agency/website-speed-test
 * app/api/audit/route.ts. Copyright (c) 2026 Avvio Agency, MIT.
 * Full terms: third_party/avvio-speed-test/LICENSE. See THIRD_PARTY_NOTICES.md.
 * Changes: typed normalization, null missing values, desktop support, bounded
 * responses, separate field metrics and fixed endpoint error handling.
 */
import { publicUrl, resolvePublic } from "./safe-fetch";
type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : {};
export function normalizePageSpeed(raw: unknown) {
  const root = obj(raw),
    lh = obj(root.lighthouseResult);
  if (!Object.keys(lh).length)
    throw new Error("PageSpeed returned no Lighthouse result.");
  const categories = obj(lh.categories),
    audits = obj(lh.audits);
  const score = (id: string) => {
    const n = obj(categories[id]).score;
    return typeof n === "number" && Number.isFinite(n)
      ? Math.round(n * 100)
      : null;
  };
  const metric = (id: string) => {
    const audit = obj(audits[id]);
    return {
      value: typeof audit.numericValue === "number" ? audit.numericValue : null,
      display:
        typeof audit.displayValue === "string" ? audit.displayValue : null,
      unit: typeof audit.numericUnit === "string" ? audit.numericUnit : null,
    };
  };
  const opportunities = Object.entries(audits)
    .map(([id, value]): Obj & { id: string } => ({ id, ...obj(value) }))
    .filter((value) => {
      const detail = obj(value.details);
      return (
        detail.type === "opportunity" &&
        typeof detail.overallSavingsMs === "number" &&
        detail.overallSavingsMs > 0
      );
    })
    .map((value) => ({
      id: value.id,
      title: String(value.title || value.id),
      description: String(value.description || ""),
      savingsMs: Number(obj(value.details).overallSavingsMs),
    }))
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 12);
  const field = obj(obj(root.loadingExperience).metrics);
  const fieldMetric = (id: string) => {
    const item = obj(field[id]);
    return {
      percentile: typeof item.percentile === "number" ? item.percentile : null,
      category: typeof item.category === "string" ? item.category : null,
    };
  };
  return {
    source: "Google PageSpeed Insights",
    fetchedAt: new Date().toISOString(),
    finalUrl: typeof lh.finalUrl === "string" ? lh.finalUrl : null,
    lighthouseVersion: lh.lighthouseVersion || null,
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    lab: {
      lcp: metric("largest-contentful-paint"),
      cls: metric("cumulative-layout-shift"),
      fcp: metric("first-contentful-paint"),
      speedIndex: metric("speed-index"),
      tbt: metric("total-blocking-time"),
    },
    field: {
      available: Object.keys(field).length > 0,
      lcp: fieldMetric("LARGEST_CONTENTFUL_PAINT_MS"),
      cls: fieldMetric("CUMULATIVE_LAYOUT_SHIFT_SCORE"),
      inp: fieldMetric("INTERACTION_TO_NEXT_PAINT"),
    },
    opportunities,
    warnings: Array.isArray(lh.runWarnings)
      ? lh.runWarnings.filter((x) => typeof x === "string")
      : [],
    note: "Lab data is a simulated run. Field percentiles are real-user observations where supplied by Google. TBT is not INP. Missing values are not zero scores.",
  };
}
export async function queryPageSpeed(
  url: string,
  strategy: "mobile" | "desktop",
  requestImpl: typeof fetch = fetch,
) {
  const target = publicUrl(url);
  await resolvePublic(target);
  const query = new URLSearchParams({ url: target.href, strategy });
  for (const category of [
    "PERFORMANCE",
    "ACCESSIBILITY",
    "BEST_PRACTICES",
    "SEO",
  ])
    query.append("category", category);
  if (process.env.PAGESPEED_API_KEY)
    query.set("key", process.env.PAGESPEED_API_KEY);
  const response = await requestImpl(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${query}`,
    { signal: AbortSignal.timeout(100000), redirect: "error" },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "PageSpeed quota is exhausted. Retry later or configure a project API key."
        : response.status === 403
          ? "PageSpeed access was denied. Check the server API key and project settings."
          : "PageSpeed could not complete this measurement.",
    );
  const reader = response.body?.getReader();
  if (!reader) throw new Error("PageSpeed returned an empty response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > 5 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("PageSpeed response exceeds the size limit.");
    }
    chunks.push(next.value);
  }
  return {
    ...normalizePageSpeed(JSON.parse(Buffer.concat(chunks).toString("utf8"))),
    strategy,
  };
}
export type PageSpeedReport = ReturnType<typeof normalizePageSpeed> & {
  strategy: "mobile" | "desktop";
};
