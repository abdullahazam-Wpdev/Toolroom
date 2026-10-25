import { chromium, type Browser } from "playwright-core";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { safeFetch, publicUrl, isPublicAddress } from "../../apps/web/src/lib/safe-fetch.ts";
import { analyzeHtml, type Check } from "../../apps/web/src/lib/audit.ts";
/**
 * Compares a page's raw server HTML against its Chromium-rendered DOM.
 * Runs only inside the isolated background worker (scripts/backend/worker.ts
 * via rendered-audit-process.ts) -- never inside a Vercel Function, per the
 * same constraint the AI/video jobs already follow. Reuses analyzeHtml() for
 * BOTH the raw fetch and the rendered HTML, so the two reports are
 * structurally identical and trivially comparable, and so every existing
 * static check (title, canonical, headings, structured data, content
 * fingerprint...) already runs against the rendered output for free.
 */
export type RenderedAuditResult = {
  url: string;
  renderedAt: string;
  renderError: string | null;
  navigationTimedOut: boolean;
  blockedRequests: number;
  failedRequests: number;
  raw: ReturnType<typeof analyzeHtml> | null;
  rendered: ReturnType<typeof analyzeHtml> | null;
  checks: Check[];
};
const NAV_TIMEOUT_MS = 15000;
const RAW_FETCH_TIMEOUT_MS = 10000;
// Resolve a browser-requested hostname the same way safe-fetch.ts resolves
// one for a direct server-side request: every DNS answer must be public, and
// a literal IP must itself be public. This is checked per-request inside
// page.route(), not just for the top-level navigation, so JavaScript on the
// page cannot use a redirect, fetch(), image, iframe or any other subresource
// to reach a private/reserved address the browser process can see.
async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error("Private address.");
    return;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("Resolves to a private or reserved network.");
}
function push(
  checks: Check[],
  id: string,
  title: string,
  status: Check["status"],
  evidence: string,
  recommendation: string,
  priority: Check["priority"] = "medium",
) {
  checks.push({ id, category: "technical", title, status, evidence, recommendation, priority, effort: "medium" });
}
function compareField(
  checks: Check[],
  id: string,
  title: string,
  rawValue: string | null,
  renderedValue: string | null,
  recommendation: string,
) {
  const changed = rawValue !== renderedValue;
  push(
    checks,
    id,
    title,
    changed ? "warning" : "pass",
    changed
      ? `Raw: ${rawValue ?? "(none)"} → Rendered: ${renderedValue ?? "(none)"}`
      : `Unchanged after rendering: ${rawValue ?? "(none)"}`,
    recommendation,
  );
}
export async function renderedAudit(rawUrl: string): Promise<RenderedAuditResult> {
  const target = publicUrl(rawUrl); // throws on private/reserved/malformed before anything else runs
  const checks: Check[] = [];
  const renderedAt = new Date().toISOString();
  let rawReport: ReturnType<typeof analyzeHtml>;
  try {
    const response = await safeFetch(target.href, { maxBytes: 2 * 1024 * 1024, timeoutMs: RAW_FETCH_TIMEOUT_MS });
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers["content-type"] || ""))
      throw new Error("The destination did not return an HTML page.");
    rawReport = analyzeHtml(response.body.toString("utf8"), response.url, response);
  } catch (error) {
    push(checks, "rendered-raw-fetch", "Raw HTML fetch", "critical", error instanceof Error ? error.message : "Fetch failed.", "Confirm the page is reachable before a rendered comparison can run.", "high");
    return { url: target.href, renderedAt, renderError: null, navigationTimedOut: false, blockedRequests: 0, failedRequests: 0, raw: null, rendered: null, checks };
  }
  let browser: Browser | null = null;
  let renderedReport: ReturnType<typeof analyzeHtml> | null = null;
  let renderError: string | null = null;
  let navigationTimedOut = false;
  let blockedRequests = 0;
  let failedRequests = 0;
  try {
    // Chromium's own OS-level sandbox stays enabled (no --no-sandbox): this
    // environment supports it, and disabling it is a real security
    // regression against a sandbox-escaping renderer bug, not a default to
    // reach for out of convenience. A deployment whose container runtime
    // genuinely cannot support it should document that tradeoff explicitly
    // rather than silently flip this flag.
    browser = await chromium.launch({ headless: true, timeout: 15000 });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: "ToolroomRenderedAudit/0.1 (+bounded single-page rendering check)",
      javaScriptEnabled: true,
      bypassCSP: false,
      acceptDownloads: false,
    });
    context.setDefaultTimeout(NAV_TIMEOUT_MS);
    context.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    await context.route("**/*", async (route) => {
      const request = route.request();
      let parsed: URL;
      try {
        parsed = new URL(request.url());
      } catch {
        blockedRequests++;
        return route.abort();
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        blockedRequests++;
        return route.abort();
      }
      try {
        await assertPublicHost(parsed.hostname);
      } catch {
        blockedRequests++;
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("requestfailed", () => {
      failedRequests++;
    });
    page.on("crash", () => {
      renderError = "The rendering process crashed.";
    });
    try {
      await page.goto(target.href, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout/i.test(message)) navigationTimedOut = true;
      else throw error;
    }
    const html = await page.content();
    renderedReport = analyzeHtml(html, target.href);
  } catch (error) {
    renderError = (error instanceof Error ? error.message : "Rendering failed.").slice(0, 500);
  } finally {
    // Always close, success or failure -- no leaked browser processes.
    await browser?.close().catch(() => {});
  }
  if (renderError) {
    push(checks, "rendered-error", "Rendered page load", "not-tested", renderError, "Retry later; if this persists the page may block automation, require a login, or exceed the time budget. This is not reported as a failing check.", "high");
  } else if (!renderedReport) {
    push(checks, "rendered-error", "Rendered page load", "not-tested", "Rendering did not complete.", "Retry later.", "high");
  } else {
    if (navigationTimedOut)
      push(checks, "rendered-timeout", "Full render completion", "warning", "The page did not reach network-idle within the time budget; slow or continuously-polling resources may mean some late content is missing from this comparison.", "Review slow third-party resources if this recurs.");
    push(checks, "rendered-blocked-requests", "Blocked private-network requests", blockedRequests ? "warning" : "pass", blockedRequests ? `${blockedRequests} request(s) to a private/reserved address or a non-HTTP(S) destination were blocked during rendering.` : "No private-network requests were attempted during rendering.", "A blocked request to your own infrastructure during rendering is expected and not a problem by itself; confirm nothing public was unintentionally blocked.");
    push(checks, "rendered-failed-requests", "Failed resource requests", failedRequests ? "warning" : "pass", failedRequests ? `${failedRequests} request(s) failed to load during rendering.` : "No resource requests failed during rendering.", "Investigate broken, blocked or timed-out third-party resources.");
    compareField(checks, "rendered-title", "Title after rendering", rawReport.metadata.title || null, renderedReport.metadata.title || null, "If JavaScript sets or changes the title, confirm the rendered value is what you intend search engines to see.");
    compareField(checks, "rendered-description", "Meta description after rendering", rawReport.metadata.description || null, renderedReport.metadata.description || null, "A description injected only by JavaScript may not be used for every search result snippet.");
    compareField(checks, "rendered-canonical", "Canonical URL after rendering", rawReport.metadata.canonical, renderedReport.metadata.canonical, "A canonical that changes after rendering is a real indexing-signal conflict; keep it consistent.");
    const rawH1 = rawReport.headingCounts.h1, renderedH1 = renderedReport.headingCounts.h1;
    push(checks, "rendered-h1-count", "H1 count after rendering", rawH1 === renderedH1 ? "pass" : "warning", `Raw: ${rawH1} · Rendered: ${renderedH1}`, "A heading count that changes after rendering means crawlers that do not execute JavaScript see a different outline.");
    const rawTypes = [...new Set(rawReport.structured.flatMap((s) => s.types))].sort();
    const renderedTypes = [...new Set(renderedReport.structured.flatMap((s) => s.types))].sort();
    const typesChanged = rawTypes.join(",") !== renderedTypes.join(",");
    push(checks, "rendered-structured-data", "Structured data after rendering", typesChanged ? "warning" : "pass", typesChanged ? `Raw types: ${rawTypes.join(", ") || "(none)"} → Rendered types: ${renderedTypes.join(", ") || "(none)"}` : `Unchanged: ${rawTypes.join(", ") || "(none)"}`, "Structured data injected only after rendering may not be read by every consumer of your markup.");
    const grew = renderedReport.contentCharacters - rawReport.contentCharacters;
    push(checks, "rendered-content-visibility", "Content added by JavaScript", grew > 200 ? "warning" : "pass", `Raw page text: ${rawReport.contentCharacters} characters · Rendered page text: ${renderedReport.contentCharacters} characters (${grew >= 0 ? "+" : ""}${grew}).`, grew > 200 ? "A meaningful amount of visible content only appears after JavaScript runs; confirm it is still reachable to crawlers that matter to you." : "Rendering does not add a large amount of new text content.");
  }
  return { url: target.href, renderedAt, renderError, navigationTimedOut, blockedRequests, failedRequests, raw: rawReport, rendered: renderedReport, checks };
}
