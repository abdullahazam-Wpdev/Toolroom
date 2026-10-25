import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
test('mobile batch and Convert stay above advanced controls; canvas supports selection and zoom',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/image-tools/image-converter');
 const data=await sharp({create:{width:200,height:120,channels:3,background:'#5a78b8'}}).jpeg().toBuffer();
 await page.locator('input[type=file]').setInputFiles([{name:'one.jpg',mimeType:'image/jpeg',buffer:data},{name:'two.jpg',mimeType:'image/jpeg',buffer:data}]);
 const button=page.getByRole('button',{name:'Convert 2 images',exact:true});const position=await button.boundingBox();expect(position!.y+position!.height).toBeLessThan(770);
 const batch=await page.getByRole('region',{name:'Batch results'}).boundingBox();const settings=await page.locator('.converter-settings').boundingBox();expect(batch!.y).toBeLessThan(settings!.y);
 await page.getByRole('button',{name:'Preview two.jpg on canvas'}).click();await expect(page.locator('.canvas-images')).toContainText('two.jpg');await page.getByLabel('Zoom',{exact:true}).selectOption('200');await expect(page.getByAltText('Original image comparison')).toHaveAttribute('style',/scale\(2\)/);
 await page.getByLabel('Output format').selectOption('png');await button.click();await expect(page.getByRole('link',{name:'Download two.jpg as PNG'})).toBeVisible();await page.getByRole('button',{name:'result',exact:true}).click();await expect(page.getByAltText('Processed image comparison')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('AVIF, GIF and TIFF inputs create real downloadable output and usable previews',async({page})=>{
 for(const format of ['avif','gif','tiff'] as const){
  await page.goto('/image-tools/image-converter');const source=await sharp({create:{width:80,height:48,channels:3,background:'#4a80a7'}}).toFormat(format).toBuffer();
  await page.locator('input[type=file]').setInputFiles({name:`source.${format}`,mimeType:`image/${format}`,buffer:source});
  await page.getByLabel('Output format').selectOption(format==='tiff'?'tiff':'png');await page.getByRole('button',{name:'Convert 1 image',exact:true}).click();
  const output=format==='tiff'?'TIFF':'PNG';const link=page.getByRole('link',{name:`Download source.${format} as ${output}`});await expect(link).toBeVisible();
  const downloading=page.waitForEvent('download');await link.click();const download=await downloading;expect((await sharp(await readFile((await download.path())!)).metadata()).width).toBe(80);
  await expect(page.getByAltText('Original image comparison')).toBeVisible();expect(await page.getByAltText('Original image comparison').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByAltText('Processed image comparison')).toBeVisible();expect(await page.getByAltText('Processed image comparison').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 }
});
test('attributed stock photo actually converts; house ad is labeled and separated',async({page})=>{
 await page.goto('/image-tools/image-converter');await page.getByRole('button',{name:'Try a real photo'}).click();await expect(page.locator('.file-row')).toContainText('unsplash-lake.jpg');await page.getByLabel('Output format').selectOption('webp');await page.getByRole('button',{name:'Convert 1 image',exact:true}).click();await expect(page.getByRole('link',{name:'Download unsplash-lake.jpg as WebP'})).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Advertisement'})).toBeVisible();await expect(page.getByRole('complementary',{name:'Advertisement'})).toContainText('Read the guides');expect(await page.locator('script[src*="googlesyndication"]').count()).toBe(0);
});
test('Semrush configuration gate and a labeled fixture report preserve missing values',async({page,request})=>{
 const response=await request.post('/api/semrush',{data:{keyword:'image converter',country:'US',confirmUnits:false}});expect([400,503]).toContain(response.status());
 await page.goto('/seo-tools/semrush-keyword-metrics');await expect(page.getByText('Semrush API access required',{exact:true})).toBeVisible();
 await page.getByLabel('Keyword',{exact:true}).fill('image converter');await page.getByLabel('I confirm up to 20 API units',{exact:false}).check();
 await page.route('**/api/semrush',r=>r.fulfill({json:{keyword:'image converter',country:'US',cached:false,estimatedRequestUnits:20,actualBilledUnits:null,data:{search_volume:'60500',keyword_difficulty:74}}}));
 await page.getByRole('button',{name:'Get keyword metrics'}).click();await expect(page.getByRole('heading',{name:'Keyword metrics: image converter'})).toBeVisible();await expect(page.locator('.keyword-metrics')).toContainText('Not available');await expect(page.locator('.keyword-metrics')).toContainText('60500');
});
test('Pexels picker uses attributed fixture photos through the conversion flow',async({page})=>{
 const data=await sharp({create:{width:90,height:60,channels:3,background:'#345a89'}}).jpeg().toBuffer();
 await page.route('**/api/photos?q=*',r=>r.fulfill({json:{photos:[{id:42,credit:'Fixture Photographer',photographer:'https://www.pexels.com/@fixture',source:'https://www.pexels.com/photo/42/',thumbnail:'/api/photos/image?token=fixture-thumb',download:'/api/photos/image?token=fixture-full'}]}}));
 await page.route('**/api/photos/image?token=fixture-*',r=>r.fulfill({contentType:'image/jpeg',body:data}));
 await page.goto('/image-tools/image-converter');await page.getByText('Find a photo on Pexels',{exact:true}).click();await page.getByRole('button',{name:'Search Pexels',exact:true}).click();await expect(page.getByText('Fixture Photographer',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use photo by Fixture Photographer'}).click();await expect(page.locator('.file-row')).toContainText('pexels-42.jpg');await page.getByLabel('Output format').selectOption('png');await page.getByRole('button',{name:'Convert 1 image',exact:true}).click();await expect(page.getByRole('link',{name:'Download pexels-42.jpg as PNG'})).toBeVisible();
});
