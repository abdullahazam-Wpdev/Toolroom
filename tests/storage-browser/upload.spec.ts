import{test,expect}from'@playwright/test';
import sharp from'sharp';
import{readFile}from'node:fs/promises';
import{createHash}from'node:crypto';
test('direct storage browser pipeline uploads a 5 MiB file outside the image function and decodes the downloaded result',async({page})=>{
 const png=await sharp({create:{width:40,height:30,channels:3,background:'#5a6b7c'}}).png().toBuffer(),input=Buffer.concat([png,Buffer.alloc(5*1024*1024-png.length)]),output=await sharp(png).webp().toBuffer();let put=false,processed=false;
 await page.route('**/api/uploads',async route=>{const body=route.request().postDataJSON();expect(body.bytes).toBe(input.length);expect(body.sha256).toBe(createHash('sha256').update(input).digest('hex'));expect(body.purpose).toBe('image');await route.fulfill({json:{ticket:'fixture-ticket',headers:{'Content-Type':'image/png'},uploadUrl:'http://127.0.0.1:32178/mock-storage/put'}});});
 await page.route('**/mock-storage/put',async route=>{expect(route.request().method()).toBe('PUT');expect(route.request().postDataBuffer()).toEqual(input);put=true;await route.fulfill({status:200});});
 await page.route('**/api/images/from-storage',async route=>{expect(put).toBe(true);const body=route.request().postDataJSON();expect(body.ticket).toBe('fixture-ticket');expect(body.options.format).toBe('webp');processed=true;await route.fulfill({json:{downloadUrl:'http://127.0.0.1:32178/mock-storage/result',width:40,height:30,extension:'webp'}});});
 await page.route('**/mock-storage/result',route=>route.fulfill({status:200,contentType:'image/webp',body:output}));
 await page.goto('/image-tools/image-converter');await expect(page.locator('.converter-head')).toContainText('10 MiB each');await page.locator('input[type=file]').setInputFiles({name:'large.png',mimeType:'image/png',buffer:input});await page.getByLabel('Output format').selectOption('webp');await page.getByRole('button',{name:'Convert 1 image',exact:true}).click();const link=page.getByRole('link',{name:'Download large.png as WebP'});await expect(link).toBeVisible();expect(processed).toBe(true);const wait=page.waitForEvent('download');await link.click();const download=await wait;const meta=await sharp(await readFile((await download.path())!)).metadata();expect(meta.width).toBe(40);expect(meta.format).toBe('webp');
});
