import {boundedJson,takeQuota} from '@/lib/request-guard';
import {downloadDirectMedia} from '@/lib/direct-media';
export const runtime='nodejs';
let active=0;
export async function POST(request:Request){
 if(active>=2)return Response.json({error:'The downloader is busy. Please retry shortly.'},{status:429,headers:{'Retry-After':'5'}});
 active++;
 try {
  takeQuota('direct-media',6);
  const result=await downloadDirectMedia(await boundedJson(request,4096));
  return new Response(new Uint8Array(result.data),{headers:{'Content-Type':result.mime,'Content-Disposition':`attachment; filename="${result.filename}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Media-Filename':result.filename}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Download failed.'},{status:400});}
 finally{active--;}
}
