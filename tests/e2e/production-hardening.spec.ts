import {test,expect} from '@playwright/test';
test('rate-limited validation errors return 429 and a retry window without provider calls',async({request})=>{
 let response;
 for(let i=0;i<8;i++){response=await request.post('/api/provider-metadata',{data:{url:'invalid'}});if(response.status()===429)break;expect(response.status()).toBe(400);}
 expect(response!.status()).toBe(429);expect(Number(response!.headers()['retry-after'])).toBeGreaterThan(0);
});
test('private operational routes fail closed and disabled jobs stay unavailable',async({request,page})=>{
 for(const path of ['/api/storage/cleanup','/api/internal/health']){const r=await request.get(path);expect(r.status()).toBe(401);}
 const job=await request.post('/api/jobs',{data:{ticket:'invalid',kind:'background-remover',format:'png'}});expect(job.status()).toBe(503);
 const upload=await request.post('/api/uploads',{data:{purpose:'image',mime:'image/png',bytes:10,sha256:'0'.repeat(64)}});expect(upload.status()).toBe(503);
 await page.goto('/image-tools/background-remover');await expect(page.getByText("Worker not deployed on this installation. AI/video processing is unavailable.")).toBeVisible();
});
test('production metadata uses the public origin, keeps setup pages noindex and rejects oversized inline uploads',async({request,page})=>{
 test.skip(!process.env.TEST_CANONICAL_ORIGIN,'Requires the production-like canonical configuration.');
 const origin=process.env.TEST_CANONICAL_ORIGIN!;
 for(const path of ['/','/image-tools/image-converter','/seo-tools/website-seo-checker']){await page.goto(path);await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',origin+path.replace(/^\/$/,''));await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/index, follow/);await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',origin+path.replace(/^\/$/,''));for(const text of await page.locator('script[type="application/ld+json"]').allTextContents())expect(text).not.toContain('localhost');}
 await expect(page.locator('.converter-head')).toHaveCount(0);
 await page.goto('/image-tools/image-converter');await expect(page.locator('.converter-head')).toContainText('4 MiB each');
 const robots=await (await request.get('/robots.txt')).text();expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);expect(robots).not.toMatch(/Disallow: \/\s*\n/);
 const sitemap=await (await request.get('/sitemap.xml')).text();expect(sitemap).not.toContain('localhost');expect(sitemap).not.toContain('background-remover');
 await page.goto('/image-tools/background-remover');await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
 const oversized=await request.post('/api/images',{data:Buffer.alloc(4*1024*1024+65537),headers:{'Content-Type':'multipart/form-data; boundary=test'}});expect(oversized.status()).toBe(413);
});
