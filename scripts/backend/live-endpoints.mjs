import sharp from 'sharp';
import {writeFile}from'node:fs/promises';
const base='https://toolroom-woad.vercel.app',results=[];
const bytes=await sharp({create:{width:16,height:12,channels:3,background:'#336699'}}).jpeg().toBuffer();
const form=new FormData();form.set('file',new File([bytes],'live-check.jpg',{type:'image/jpeg'}));form.set('format','webp');form.set('tool','jpg-to-webp');
const image=await fetch(base+'/api/images',{method:'POST',body:form,signal:AbortSignal.timeout(20000)});const body=Buffer.from(await image.arrayBuffer());results.push({route:'/api/images',status:image.status,...(image.ok?{decoded:await sharp(body).metadata().then(m=>({format:m.format,width:m.width,height:m.height}))}:{error:'Conversion failed; body omitted'})});
for(const path of ['/api/jobs','/api/crawl-jobs']){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});results.push({route:path,status:r.status});}
await writeFile('artifacts/production/live-endpoints.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
