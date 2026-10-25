/** Operator-only bounded rendered audit. Public exposure waits for browser network isolation. */
import { chromium } from '@playwright/test';
import { safeFetch, publicUrl } from '../../apps/web/src/lib/safe-fetch.ts';
import { load } from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';
const target = publicUrl(process.argv[2] || 'https://example.com');
const browser = await chromium.launch({ chromiumSandbox: true });
let requests = 0, totalBytes = 0;
const blocked: string[] = [];
try {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false, permissions: [], viewport: { width: 1280, height: 800 } });
  await context.routeWebSocket('**/*', route => route.close());
  await context.route('**/*', async route => {
    try {
      if (++requests > 30 || !['document','script','stylesheet','xhr','fetch'].includes(route.request().resourceType()) || route.request().method() !== 'GET') throw new Error('Resource or request budget blocked.');
      const response = await safeFetch(route.request().url(), { maxBytes: 512 * 1024, timeoutMs: 6000, maxRedirects: 2 });
      totalBytes += response.body.length;
      if (totalBytes > 5 * 1024 * 1024) throw new Error('Response budget exceeded.');
      await route.fulfill({ status: response.status, body: response.body, headers: { 'content-type': response.headers['content-type'] || 'text/plain', 'x-content-type-options': 'nosniff' } });
    } catch { blocked.push(route.request().url()); await route.abort(); }
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(15000);
  await page.goto(target.href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const html = await page.content(), $ = load(html);
  const evidence = { url: target.href, source: 'JavaScript-rendered DOM; operator-only', title: $('title').text(), headings: $('h1,h2,h3').map((_,e)=>({level:e.tagName,text:$(e).text().trim()})).get(), links: $('a[href]').map((_,e)=>$(e).attr('href')).get().slice(0,100), html, requests, totalBytes, blocked, limitations: 'Selected GET resources only; images/fonts/WebSockets/workers blocked. Not a Lighthouse result. Not enabled for anonymous public requests until container/proxy isolation passes.' };
  await mkdir('artifacts/backend', { recursive: true });
  await writeFile('artifacts/backend/rendered-audit.json', JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({ title: evidence.title, requests, totalBytes, blocked: blocked.length }));
} finally { await browser.close(); }
