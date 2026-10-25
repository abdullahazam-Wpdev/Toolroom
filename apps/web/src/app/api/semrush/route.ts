import { rateLimitResponse } from "@/lib/request-guard";
import {boundedJson,takeQuota} from '@/lib/request-guard';
import {keywordMetrics,semrushConfigured} from '@/lib/semrush';
export const runtime='nodejs';
let active=0;
export async function POST(request:Request){
 if(!semrushConfigured())return Response.json({error:'Semrush requires a configured v4 API key, API units and operator activation. No request was sent.'},{status:503});
 if(active>=2)return Response.json({error:'Semrush reports are busy. Retry shortly.'},{status:429,headers:{"Retry-After":"60"}});
 active++;
 try{takeQuota('semrush',6);const result=await keywordMetrics(await boundedJson(request,4096));return Response.json(result,{headers:{'Cache-Control':'no-store'}});}
 catch(e){ const limited = rateLimitResponse(e); if (limited) return limited; return Response.json({error:e instanceof Error?e.message:'Keyword report failed.'},{status:400});}finally{active--;}
}
