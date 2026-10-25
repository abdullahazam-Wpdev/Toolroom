import {chromium} from 'playwright-core';import sharp from 'sharp';import {writeFile,mkdir} from 'node:fs/promises';
const output=process.env.RESEARCH_OUTPUT_DIR || `artifacts/research/workflows-${new Date().toISOString().replace(/[:.]/g,'-')}`;
await mkdir(output,{recursive:true});
const svg='<svg width="480" height="360" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="360" fill="#dae7e1"/><circle cx="240" cy="115" r="55" fill="#bf8b64"/><path d="M120 360 Q120 180 240 180 Q360 180 360 360" fill="#24694d"/><circle cx="220" cy="110" r="5"/><circle cx="260" cy="110" r="5"/></svg>';
const jpeg=await sharp(Buffer.from(svg)).jpeg().toBuffer();await writeFile('.research/synthetic-portrait.jpg',jpeg);
const browser=await chromium.launch({args:['--no-sandbox']});const results=[];
for(const [id,url] of [['cloudconvert','https://cloudconvert.com/jpg-to-webp'],['freeconvert','https://www.freeconvert.com/jpg-to-webp'],['removebg','https://www.remove.bg/'],['imgupscaler','https://imgupscaler.com/'],['pagespeed','https://pagespeed.web.dev/'],['seobility','https://www.seobility.net/en/seocheck/']]){
 const page=await browser.newPage({viewport:{width:1366,height:900}});const r={id,url,testedAt:new Date().toISOString(),actions:[],downloadVerified:false};
 page.setDefaultTimeout(6000);page.on('download',async d=>{try{const path=await d.path();if(path){const metadata=await sharp(path).metadata();r.downloadVerified=true;r.output={format:metadata.format,width:metadata.width,height:metadata.height};}}catch(e){r.downloadError=e.message;}});
 try{r.status=(await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000}))?.status();await page.waitForTimeout(1500);
 r.before=(await page.locator('body').innerText()).slice(0,2200);
 if(['cloudconvert','freeconvert','removebg','imgupscaler'].includes(id)){
  if(!(await page.locator('input[type=file]').count())){const choose=page.getByRole('button',{name:/upload image|choose images|select file/i}).first();if(await choose.count()){await choose.click();r.actions.push('Clicked upload control');await page.waitForTimeout(1000);}}
  const inputs=page.locator('input[type=file]');r.fileInputs=await inputs.count();
  if(r.fileInputs){await inputs.first().setInputFiles({name:'synthetic-portrait.jpg',mimeType:'image/jpeg',buffer:jpeg});r.actions.push('Selected self-created JPEG');await page.waitForTimeout(2500);
   r.controls=await page.locator('button,input,select,a[download]').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,type:n.getAttribute('type'),text:(n.innerText||n.getAttribute('aria-label')||'').trim().slice(0,100),disabled:n.disabled,accept:n.getAttribute('accept')})).slice(0,120));
   if(id==='cloudconvert'){const convert=page.locator('button').filter({hasText:/^Convert$/});for(let n=(await convert.count())-1;n>=0;n--){if(await convert.nth(n).isVisible()&&await convert.nth(n).isEnabled()){await convert.nth(n).click();r.actions.push('Clicked exact Convert control');break;}}}
   if(id==='freeconvert'){const convert=page.getByRole('button',{name:/convert to webp/i});if(await convert.count()){await convert.last().click();r.actions.push('Clicked Convert to WebP');}}
   await page.waitForTimeout(8000);
   const downloads=page.getByRole('link',{name:/^download(?: webp| image| png)?$/i}).or(page.getByRole('button',{name:/^download(?: webp| image| png)?$/i}));
   if(await downloads.count()){const first=downloads.first();if(await first.isVisible()){await first.click();r.actions.push('Clicked visible download control');await page.waitForTimeout(2500);}}
  }else r.limitation='No upload input exposed after normal interaction. No restrictions bypassed.';
 }else{
  const input=page.locator('input[type=text],input[type=url]').first();await input.fill('not-a-url');r.actions.push('Entered invalid URL');
  const button=page.getByRole('button',{name:id==='pagespeed'?/analyze/i:/check|analy/i}).last();if(await button.count()){await button.click();r.actions.push('Submitted invalid URL');}r.invalidText=(await page.locator('body').innerText()).slice(-3000);
  await input.fill('https://example.com');r.actions.push('Entered public example.com URL');if(await button.count()){await button.click();r.actions.push('Submitted public URL');await page.waitForTimeout(14000);}
 }
 r.after=(await page.locator('body').innerText()).slice(0,9000);await page.screenshot({path:`${output}/${id}-desktop.png`});await page.setViewportSize({width:390,height:844});r.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await page.screenshot({path:`${output}/${id}-mobile.png`});
 }catch(e){r.error=e.message;}results.push(r);await writeFile(`${output}/workflows.json`,JSON.stringify(results,null,2));console.log(id,r.actions,r.error||'',r.downloadVerified);await page.close();
}
await browser.close();
