import { load } from 'cheerio';
import sharp from 'sharp';
import { safeFetch, publicUrl, type NetworkResponse } from './safe-fetch.ts';
import { analyzeHtml, scoreAudit } from './audit.ts';
import { parseSitemap } from './technical.ts';
import { detectPlatform, type PlatformDetection } from './platform-detect.ts';
type Fetcher = (url: string, options?: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number }) => Promise<NetworkResponse>;
export function robotsAllowed(text: string, pathname: string) {
  let agents: string[] = [], rules: { pattern: string; allow: boolean }[] = [], seenRule = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim(), colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).toLowerCase(), value = line.slice(colon + 1).trim();
    if (key === 'user-agent') { if (seenRule) { agents = []; seenRule = false; } agents.push(value.toLowerCase()); }
    else if (['allow', 'disallow'].includes(key)) {
      seenRule = true;
      if (agents.some(a => a === '*' || a === 'toolroomaudit') && value) rules.push({ pattern: value, allow: key === 'allow' });
    }
  }
  const matching = rules.filter(r => {
    const pattern = r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    return new RegExp('^' + pattern).test(pathname);
  }).sort((a,b) => b.pattern.length - a.pattern.length || Number(b.allow) - Number(a.allow));
  return matching[0]?.allow ?? true;
}
// A site's own stated Crawl-delay (seconds, per the de-facto extension most
// crawlers honor) applicable to '*' or our own user-agent. Capped so a
// hostile/misconfigured robots.txt cannot stall an entire job budget.
// Group-detection mirrors robotsAllowed: consecutive User-agent lines share
// a group; seeing any directive for that group means the next User-agent
// line starts a new one.
export function robotsCrawlDelayMs(text: string): number {
  let agents: string[] = [], seenDirective = false, best = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim(), colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).toLowerCase(), value = line.slice(colon + 1).trim();
    if (key === 'user-agent') { if (seenDirective) { agents = []; seenDirective = false; } agents.push(value.toLowerCase()); }
    else if (key === 'allow' || key === 'disallow') seenDirective = true;
    else if (key === 'crawl-delay') {
      seenDirective = true;
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0 && agents.some(a => a === '*' || a === 'toolroomaudit')) best = Math.max(best, seconds);
    }
  }
  return Math.min(best * 1000, 3000);
}
export function structuredDataEvidence(html: string) {
  const $ = load(html), findings: { type: string | null; issues: string[] }[] = [];
  $('script[type="application/ld+json"]').slice(0,20).each((_, el) => {
    try {
      const parsed: unknown = JSON.parse($(el).text());
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        if (!root || typeof root !== 'object') { findings.push({ type: null, issues: ['JSON-LD must contain an object.'] }); continue; }
        const nodes = Array.isArray(root['@graph']) ? root['@graph'] : [root];
        for (const node of nodes.slice(0,50)) {
          const type = typeof node?.['@type'] === 'string' ? node['@type'] : null, issues: string[] = [];
          if (!node || typeof node !== 'object') { findings.push({ type: null, issues: ['Graph entry must be an object.'] }); continue; }
          if (!type && !Array.isArray(node['@type'])) issues.push('Missing @type.');
          if (!root['@context'] && !node['@context']) issues.push('Missing @context on the containing document.');
          const required: Record<string, string[]> = { Article: ['headline'], NewsArticle: ['headline'], Organization: ['name'], Product: ['name'], BreadcrumbList: ['itemListElement'], FAQPage: ['mainEntity'] };
          for (const key of required[type || ''] || []) if (!node[key]) issues.push(`Missing ${key} for ${type}.`);
          if (type === 'BreadcrumbList' && !Array.isArray(node.itemListElement)) issues.push('itemListElement should be an array.');
          findings.push({ type, issues });
        }
      }
    } catch { findings.push({ type: null, issues: ['Invalid JSON-LD syntax.'] }); }
  });
  return findings;
}
export const MAX_CRAWL_PAGES = 25;
export const MAX_CRAWL_REQUESTS = 80;
// Larger tiers run only as a background job (packages/jobs/crawl-process.ts),
// never synchronously inside a Next.js request handler.
export const CRAWL_SIZE_TIERS = [25, 100, 500, 1000] as const;
export type CrawlSizeTier = (typeof CRAWL_SIZE_TIERS)[number];
export type SitemapDiscovery = { found: boolean; url: string | null; totalUrls: number; seeded: number; childSitemapsFetched: number; error: string | null };
export type UrlOutcome = { url: string; category: 'crawled' | 'skipped-robots' | 'skipped-not-html' | 'skipped-off-origin' | 'blocked' | 'failed'; reason: string };
export type CrawlResult = {
  origin: string;
  platform: PlatformDetection;
  sitemapDiscovery: SitemapDiscovery;
  pages: {
    url: string; status: number; bytes: number;
    metadata: ReturnType<typeof analyzeHtml>['metadata'];
    scores: ReturnType<typeof scoreAudit>;
    checks: ReturnType<typeof analyzeHtml>['checks'];
    structuredData: ReturnType<typeof structuredDataEvidence>;
    images: { url: string | null; missingAlt: boolean; missingDimensions: boolean; lazy: boolean }[];
    redirects: NetworkResponse['redirects'];
  }[];
  links: Map<string, { internal: boolean; from: string }>;
  images: Map<string, { from: string; width: number; height: number }>;
  outcomes: UrlOutcome[];
  discoveredCount: number;
  canonicalConflicts: { url: string; htmlCanonical: string | null; httpCanonical: string | null }[];
  stoppedReason: 'queue-empty' | 'page-limit' | 'deadline' | 'request-limit';
};
/**
 * Fetch and parse a site's sitemap, following one level of sitemapindex
 * nesting (bounded). Shared by the synchronous quick crawl and the
 * background large-crawl job so both discover the same URL set.
 */
export async function discoverSitemapUrls(
  origin: string,
  fetchBounded: (url: string, maxBytes?: number) => Promise<NetworkResponse>,
  maxPages: number,
  maxChildSitemaps = 10,
): Promise<{ discovery: SitemapDiscovery; urls: string[] }> {
  try {
    const root = await fetchBounded(origin + '/sitemap.xml', 512 * 1024);
    if (root.status !== 200) return { discovery: { found: false, url: root.url, totalUrls: 0, seeded: 0, childSitemapsFetched: 0, error: `HTTP ${root.status}` }, urls: [] };
    const parsed = parseSitemap(root.body.toString('utf8'));
    if (parsed.type === 'urlset') {
      const same = parsed.urls.filter(u => u.valid && new URL(u.url).origin === origin).map(u => u.url);
      return { discovery: { found: true, url: root.url, totalUrls: parsed.total, seeded: Math.min(same.length, maxPages), childSitemapsFetched: 0, error: null }, urls: same.slice(0, maxPages) };
    }
    // sitemapindex: fetch a bounded number of child <sitemap> documents and
    // aggregate their urlset entries. A child that is itself an index, is
    // off-origin, unreachable or unparsable is skipped and does not fail
    // the whole discovery — partial sitemap coverage is reported honestly
    // via childSitemapsFetched/totalUrls rather than silently assumed complete.
    const childUrls = parsed.urls.filter(u => u.valid && new URL(u.url).origin === origin).map(u => u.url).slice(0, maxChildSitemaps);
    const aggregated: string[] = [];
    let totalListed = 0, fetched = 0;
    for (const childUrl of childUrls) {
      if (aggregated.length >= maxPages) break;
      try {
        const child = await fetchBounded(childUrl, 512 * 1024);
        if (child.status !== 200) continue;
        const childParsed = parseSitemap(child.body.toString('utf8'));
        if (childParsed.type !== 'urlset') continue;
        fetched++;
        totalListed += childParsed.total;
        for (const u of childParsed.urls) if (u.valid && new URL(u.url).origin === origin) aggregated.push(u.url);
      } catch { /* one unreachable child sitemap does not fail discovery */ }
    }
    return {
      discovery: { found: true, url: root.url, totalUrls: totalListed, seeded: Math.min(aggregated.length, maxPages), childSitemapsFetched: fetched, error: childUrls.length > maxChildSitemaps - 1 ? null : parsed.total > childUrls.length ? `Sitemap index lists ${parsed.total} child sitemaps; only the first ${maxChildSitemaps} were fetched.` : null },
      urls: [...new Set(aggregated)].slice(0, maxPages),
    };
  } catch (error) {
    return { discovery: { found: false, url: null, totalUrls: 0, seeded: 0, childSitemapsFetched: 0, error: error instanceof Error ? error.message : 'Sitemap request failed.' }, urls: [] };
  }
}
/**
 * The shared breadth-first crawl core. Used directly by `auditSite` (small,
 * synchronous, ≤ MAX_CRAWL_PAGES) and by the background crawl-job worker
 * (large tiers: 100/500/1000 pages) via the same function, so both modes
 * discover and score pages identically. `delayMs` (politeness delay between
 * requests) and progress/cancellation hooks are no-ops for the small
 * synchronous path and real for the background job.
 */
export async function crawlPages(options: {
  start: URL;
  robotText: string;
  fetchBounded: (url: string, maxBytes?: number) => Promise<NetworkResponse>;
  maxPages: number;
  deadline: number;
  delayMs?: number;
  onProgress?: (crawled: number, discovered: number) => void | Promise<void>;
  isCancelled?: () => boolean | Promise<boolean>;
}): Promise<CrawlResult> {
  const { start, robotText, fetchBounded, maxPages, deadline } = options;
  const origin = start.origin;
  const delayMs = Math.max(0, options.delayMs ?? 0);
  const urlFor = (value: string | undefined, base: string) => { try { const u = publicUrl(new URL(value || '', base).href); u.hash = ''; return u; } catch { return null; } };
  const { discovery: sitemapDiscovery, urls: seededFromSitemap } = await discoverSitemapUrls(origin, fetchBounded, maxPages);
  const pending = [start.href, ...seededFromSitemap], seen = new Set<string>();
  const pages: CrawlResult['pages'] = [];
  const outcomes: UrlOutcome[] = [];
  const links = new Map<string, { internal: boolean; from: string }>();
  const images = new Map<string, { from: string; width: number; height: number }>();
  const canonicalConflicts: CrawlResult['canonicalConflicts'] = [];
  let platform: PlatformDetection | null = null;
  let stoppedReason: CrawlResult['stoppedReason'] = 'queue-empty';
  while (pending.length) {
    if (pages.length >= maxPages) { stoppedReason = 'page-limit'; break; }
    if (Date.now() >= deadline) { stoppedReason = 'deadline'; break; }
    if (await options.isCancelled?.()) { stoppedReason = 'deadline'; break; }
    const url = pending.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const parsed = new URL(url);
    if (!robotsAllowed(robotText, parsed.pathname + parsed.search)) { outcomes.push({ url, category: 'skipped-robots', reason: 'Disallowed by robots.txt.' }); continue; }
    try {
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));
      const response = await fetchBounded(url);
      if (response.status === 401 || response.status === 403) { outcomes.push({ url, category: 'blocked', reason: `HTTP ${response.status}.` }); continue; }
      if (new URL(response.url).origin !== origin) { outcomes.push({ url, category: 'skipped-off-origin', reason: 'Redirect left the crawl origin.' }); continue; }
      if (!response.headers['content-type']?.includes('text/html')) { outcomes.push({ url, category: 'skipped-not-html', reason: 'Not HTML.' }); continue; }
      const html = response.body.toString('utf8'), report = analyzeHtml(html, response.url, response), $ = load(html);
      if (!platform) platform = detectPlatform(html, response.headers);
      if (report.metadata.canonicalSource === 'html' && report.metadata.httpCanonical && report.metadata.canonical !== report.metadata.httpCanonical)
        canonicalConflicts.push({ url: response.url, htmlCanonical: report.metadata.canonical, httpCanonical: report.metadata.httpCanonical });
      const pageImages: { url: string | null; missingAlt: boolean; missingDimensions: boolean; lazy: boolean }[] = [];
      $('a[href]').slice(0,200).each((_,el) => { const target = urlFor($(el).attr('href'), response.url); if (!target) return; const internal = target.origin === origin; if (links.size < 500) links.set(target.href, { internal, from: url }); if (internal && !target.search && pending.length < maxPages * 3 && !seen.has(target.href) && !/\.(pdf|zip|jpg|png|webp|mp4)$/i.test(target.pathname)) pending.push(target.href); });
      $('img').slice(0,100).each((_,el) => {
        const target = urlFor($(el).attr('src'), response.url), width = Number($(el).attr('width') || 0), height = Number($(el).attr('height') || 0);
        pageImages.push({ url: target?.href || null, missingAlt: $(el).attr('alt') === undefined, missingDimensions: !width || !height, lazy: $(el).attr('loading') === 'lazy' });
        if (target && images.size < 30) images.set(target.href, { from: url, width, height });
      });
      pages.push({ url: response.url, status: response.status, bytes: response.body.length, metadata: report.metadata, scores: scoreAudit(report.checks), checks: report.checks, structuredData: structuredDataEvidence(html), images: pageImages, redirects: response.redirects });
      outcomes.push({ url: response.url, category: 'crawled', reason: `HTTP ${response.status}${response.redirects.length ? ` after ${response.redirects.length} redirect(s)` : ''}.` });
      await options.onProgress?.(pages.length, seen.size + pending.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fetch failed.';
      if (/budget reached/i.test(message)) { stoppedReason = /time/i.test(message) ? 'deadline' : 'request-limit'; break; }
      outcomes.push({ url, category: 'failed', reason: message });
    }
  }
  return { origin, platform: platform ?? { platforms: [], ecommerce: [], framework: [], uncertain: true, note: 'No page was successfully fetched; platform signals were not inspected.' }, sitemapDiscovery, pages, links, images, outcomes, discoveredCount: seen.size + pending.length, canonicalConflicts, stoppedReason };
}
export async function auditSite(raw: string, options: { external?: boolean; maxPages?: number } = {}, fetcher: Fetcher = safeFetch) {
  const start = publicUrl(raw), origin = start.origin, deadline = Date.now() + 60000;
  let requests = 0;
  const fetchBounded = async (url: string, maxBytes = 768 * 1024) => {
    if (++requests > MAX_CRAWL_REQUESTS || Date.now() >= deadline) throw new Error('Audit request/time budget reached.');
    return fetcher(url, { maxBytes, timeoutMs: Math.min(6000, deadline - Date.now()), maxRedirects: 2 });
  };
  const robots = await fetchBounded(origin + '/robots.txt', 128 * 1024).catch(() => null);
  // Conservative: unavailable/error robots does not authorize a crawl; single-page audit remains available.
  if (!robots || robots.status >= 400 && robots.status !== 404) throw new Error('Cannot verify robots.txt. Use the single-page audit or retry.');
  const robotText = robots.status === 404 ? '' : robots.body.toString('utf8');
  const maxPages = Math.min(options.maxPages || 10, MAX_CRAWL_PAGES);
  const crawl = await crawlPages({ start, robotText, fetchBounded, maxPages, deadline });
  const { pages, links, images, sitemapDiscovery, platform, canonicalConflicts, outcomes } = crawl;
  const checkedLinks: { url: string; internal: boolean; from: string; status: number | null; broken: boolean | null; error?: string }[] = [];
  for (const [url, link] of [...links].filter(([,link]) => link.internal || options.external).slice(0,10)) {
    if (Date.now() >= deadline || requests >= 32) break;
    if (link.internal && !robotsAllowed(robotText, new URL(url).pathname)) continue;
    try { const response = await fetchBounded(url, 128 * 1024); checkedLinks.push({ url, ...link, status: response.status, broken: response.status === 404 || response.status === 410 }); }
    catch (error) { checkedLinks.push({ url, ...link, status: null, broken: null, error: String(error) }); }
  }
  const checkedImages: { url: string; bytes: number | null; width: number | null; height: number | null; issues: string[] }[] = [];
  for (const [url, image] of images) {
    if (Date.now() >= deadline || requests >= 32) break;
    try {
      const response = await fetchBounded(url, 512 * 1024);
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const info = await sharp(response.body, { limitInputPixels: 24000000 }).metadata(), issues: string[] = [];
      if (response.body.length > 200 * 1024) issues.push('Resource is over 200 KiB. Review encoding and responsive variants.');
      if (image.width && info.width && info.width > image.width * 2) issues.push('Source width exceeds twice the declared width. Review srcset and sizes.');
      if (['jpeg','png'].includes(info.format || '')) issues.push('Compare WebP/AVIF size and quality before changing format.');
      checkedImages.push({ url, bytes: response.body.length, width: info.width || null, height: info.height || null, issues });
    } catch (error) { checkedImages.push({ url, bytes: null, width: null, height: null, issues: [`Not measured: ${String(error)}`] }); }
  }
  const recommendations = pages.flatMap(page => page.checks.filter(c => c.status === 'critical' || c.status === 'warning').map(c => ({ url: page.url, priority: c.priority, title: c.title, evidence: c.evidence, action: c.recommendation }))).sort((a,b) => Number(b.priority === 'high') - Number(a.priority === 'high'));
  const titles = new Map<string,string[]>(), descriptions = new Map<string,string[]>();
  for (const p of pages) {
    if (p.metadata.title) titles.set(p.metadata.title, [...(titles.get(p.metadata.title) || []), p.url]);
    if (p.metadata.description) descriptions.set(p.metadata.description, [...(descriptions.get(p.metadata.description) || []), p.url]);
  }
  const skipped = outcomes.filter(o => o.category !== 'crawled').map(o => ({ url: o.url, reason: o.reason }));
  return {
    source: 'Bounded static website crawl',
    fetchedAt: new Date().toISOString(),
    origin,
    platform,
    sitemapDiscovery,
    pages,
    links: checkedLinks,
    images: checkedImages,
    duplicateTitles: [...titles].filter(([,urls]) => urls.length > 1).map(([title,urls]) => ({ title, urls })),
    duplicateDescriptions: [...descriptions].filter(([,urls]) => urls.length > 1).map(([description,urls]) => ({ description, urls })),
    canonicalConflicts,
    outcomes,
    skipped,
    recommendations,
    budget: { requests, maxRequests: MAX_CRAWL_REQUESTS, maxPages, discoveredLinks: links.size, checkedLinks: checkedLinks.length },
    coverage: `Static HTML, up to ${maxPages} same-origin pages seeded from on-page links and the sitemap (including one level of sitemap-index nesting), ten selected link checks and six image resources. Query URLs are not crawled. Robots directives honored conservatively, including a stated Crawl-delay where present. 404/410 are broken; denied (401/403), oversized and failed requests remain unverified/categorized separately rather than called broken. JSON-LD checks cover syntax and selected fields, not full Schema.org or rich-result eligibility. Platform detection reads one fetched page's static HTML/headers only, not authenticated admin data. For crawls larger than ${MAX_CRAWL_PAGES} pages, use the background website crawl job. No rendered-JavaScript comparison, Google Search Console data, or ranking/Core Web Vitals prediction.`,
  };
}
export type SiteAuditReport = Awaited<ReturnType<typeof auditSite>>;
