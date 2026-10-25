import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('real pasted-source analysis exports new evidence as safe CSV on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/seo-tools/website-seo-checker');
 await page.getByLabel('Page URL',{exact:true}).fill('https://example.com/');
 await page.getByLabel('Analyze pasted HTML instead of fetching this URL').check();
 await page.getByLabel('HTML source',{exact:true}).fill('<html lang="en"><head><title>Original product documentation</title><meta name="generator" content="WordPress 6"><link rel="alternate" hreflang="en-UK" href="/relative"></head><body><main><h1>Product guide</h1><a href="/?replytocom=2">Reply</a></main></body></html>');
 await page.getByRole('button',{name:'Inspect page',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your page, in focus.'})).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'CSV report',exact:true}).click();const file=await pending;
 const csv=await readFile((await file.path())!,'utf8');expect(csv).toContain('HTML hreflang syntax');expect(csv).toContain('WordPress comment reply URL variants');expect(csv).toContain('en-UK');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
