import { hostedOnVercel, VERCEL_IMAGE_MAX_BYTES } from "../../../../../../packages/core/upload-limits";
import { rateLimitResponse } from "@/lib/request-guard";
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
  if(hostedOnVercel() && result.data.length > VERCEL_IMAGE_MAX_BYTES)return Response.json({error:"This host supports direct downloads up to 4 MiB. Larger media requires the object-storage worker."},{status:413});
  return new Response(new Uint8Array(result.data),{headers:{'Content-Type':result.mime,'Content-Disposition':`attachment; filename="${result.filename}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Media-Filename':result.filename}});
 }catch(error){ const limited = rateLimitResponse(error); if (limited) return limited; return Response.json({error:error instanceof Error?error.message:'Download failed.'},{status:400});}
 finally{active--;}
}
