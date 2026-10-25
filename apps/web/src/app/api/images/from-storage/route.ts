import { boundedJson, takeQuota, rateLimitResponse } from '@/lib/request-guard';
import { processImageForm } from '@/lib/image-service';
import { verifyClaim, validatedUpload, putResult, resultUrl, deleteObjects } from '../../../../../../../packages/storage/s3';
import { quotaRedis } from '../../../../../../../packages/jobs/runtime';
import { z } from 'zod';
export const runtime='nodejs';
let active=0;
export async function POST(request:Request) {
 let id='',format='png',claimed=false;
 try {
  takeQuota('storage-images',12);if(active>=2)return Response.json({error:'Image processor busy.'},{status:429,headers:{'Retry-After':'5'}});
  const body=z.object({ticket:z.string().max(4096),options:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()]))}).parse(await boundedJson(request,8192));
  const claim=verifyClaim(body.ticket);if(claim.purpose!=='image')throw new Error('Wrong upload purpose.');id=claim.id;
  const client=quotaRedis();if(await client.set('toolroom:upload-claim:'+id,'1','EX',3600,'NX')!=='OK')return Response.json({error:'Upload already submitted. Choose the file again to retry.'},{status:409});claimed=true;active++;
  try {const bytes=await validatedUpload(claim),form=new FormData();form.set('file',new File([new Uint8Array(bytes)],'upload',{type:claim.mime}));for(const [k,v]of Object.entries(body.options))if(k!=='file')form.set(k,String(v));
   const result=await processImageForm(form);format=result.extension;await putResult(id,format,result.mime,result.data);const downloadUrl=await resultUrl(id,format,300);
   return Response.json({downloadUrl,width:result.width,height:result.height,extension:format,bytes:result.data.length,expiresInSeconds:300},{headers:{'Cache-Control':'no-store'}});
  }finally{active--;await deleteObjects(id,format,false).catch(()=>{});}
 }catch(e){const limited=rateLimitResponse(e);if(limited)return limited;if(claimed)await deleteObjects(id,format).catch(()=>{});return Response.json({error:'Stored image could not be validated or processed. Upload a supported file again.'},{status:400});}
}
