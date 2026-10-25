import type { AuditJob } from '@prisma/client';
import { safeFetch, publicUrl, type NetworkResponse } from '../../apps/web/src/lib/safe-fetch.ts';
import { crawlPages, robotsCrawlDelayMs, CRAWL_SIZE_TIERS, type CrawlSizeTier } from '../../apps/web/src/lib/site-audit.ts';
// Background crawl tiers beyond the synchronous MAX_CRAWL_PAGES limit. Each
// tier gets a time/request budget scaled to its page count so a 1000-page
// crawl of a slow/distant site cannot run forever, and so the job's own
// BullMQ lock (renewed automatically by BullMQ while this function is still
// running) has a sane upper bound to actually finish within.
const TIER_BUDGET: Record<CrawlSizeTier, { deadlineMs: number; maxRequests: number }> = {
  25: { deadlineMs: 60_000, maxRequests: 80 },
  100: { deadlineMs: 10 * 60_000, maxRequests: 160 },
  500: { deadlineMs: 30 * 60_000, maxRequests: 800 },
  1000: { deadlineMs: 45 * 60_000, maxRequests: 1600 },
};
export function validateCrawlTier(maxPages: number): CrawlSizeTier {
  if (!(CRAWL_SIZE_TIERS as readonly number[]).includes(maxPages)) throw new Error(`Page limit must be one of ${CRAWL_SIZE_TIERS.join(', ')}.`);
  return maxPages as CrawlSizeTier;
}
/**
 * Runs one background website-crawl job (the 100/500/1000-page tiers).
 * Small (<=25-page) crawls never reach here; they use the synchronous
 * auditSite() path instead. Shares the exact same crawlPages() core as that
 * synchronous path, so both modes discover/score pages identically.
 */
export async function processCrawl(
  job: AuditJob,
  onProgress: (crawled: number, discovered: number) => Promise<void>,
  isCancelled: () => Promise<boolean>,
) {
  const tier = validateCrawlTier(job.maxPages);
  const budget = TIER_BUDGET[tier];
  const start = publicUrl(job.url);
  const deadline = Date.now() + budget.deadlineMs;
  let requests = 0;
  const fetchBounded = async (url: string, maxBytes = 768 * 1024): Promise<NetworkResponse> => {
    if (++requests > budget.maxRequests) throw new Error('Audit request budget reached.');
    if (Date.now() >= deadline) throw new Error('Audit time budget reached.');
    return safeFetch(url, { maxBytes, timeoutMs: Math.min(8000, Math.max(1000, deadline - Date.now())), maxRedirects: 2 });
  };
  const robots = await fetchBounded(start.origin + '/robots.txt', 128 * 1024).catch(() => null);
  if (!robots || (robots.status >= 400 && robots.status !== 404)) throw new Error('Cannot verify robots.txt for this site.');
  const robotText = robots.status === 404 ? '' : robots.body.toString('utf8');
  // Politeness: respect a stated Crawl-delay; otherwise use a small default
  // delay for these large background crawls only (the synchronous <=25-page
  // mode stays delay-free for responsiveness).
  const delayMs = robotsCrawlDelayMs(robotText) || 250;
  const result = await crawlPages({
    start,
    robotText,
    fetchBounded,
    maxPages: tier,
    deadline,
    delayMs,
    onProgress: (crawled, discovered) => onProgress(crawled, discovered),
    isCancelled,
  });
  const titles = new Map<string, string[]>(), descriptions = new Map<string, string[]>();
  for (const p of result.pages) {
    if (p.metadata.title) titles.set(p.metadata.title, [...(titles.get(p.metadata.title) || []), p.url]);
    if (p.metadata.description) descriptions.set(p.metadata.description, [...(descriptions.get(p.metadata.description) || []), p.url]);
  }
  const recommendations = result.pages
    .flatMap((page) => page.checks.filter((c) => c.status === 'critical' || c.status === 'warning').map((c) => ({ url: page.url, priority: c.priority, title: c.title, evidence: c.evidence, action: c.recommendation })))
    .sort((a, b) => Number(b.priority === 'high') - Number(a.priority === 'high'));
  return {
    source: `Background website crawl (${tier}-page tier)`,
    fetchedAt: new Date().toISOString(),
    origin: result.origin,
    platform: result.platform,
    sitemapDiscovery: result.sitemapDiscovery,
    pages: result.pages,
    outcomes: result.outcomes,
    discoveredCount: result.discoveredCount,
    canonicalConflicts: result.canonicalConflicts,
    duplicateTitles: [...titles].filter(([, urls]) => urls.length > 1).map(([title, urls]) => ({ title, urls })),
    duplicateDescriptions: [...descriptions].filter(([, urls]) => urls.length > 1).map(([description, urls]) => ({ description, urls })),
    recommendations,
    stoppedReason: result.stoppedReason,
    budget: { requests, maxRequests: budget.maxRequests, maxPages: tier, delayMs },
    coverage: `Background crawl, ${tier}-page tier. Static HTML only; no rendered-JavaScript comparison, broken-link byte sampling or image-resource measurement in this mode (use the quick ≤25-page audit for those). Robots directives honored conservatively, including a stated Crawl-delay or a ${delayMs}ms default politeness delay otherwise. Stopped because: ${result.stoppedReason}.`,
  };
}
export type CrawlJobResult = Awaited<ReturnType<typeof processCrawl>>;
