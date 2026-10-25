import { rateLimitResponse } from "@/lib/request-guard";
import {stockPhotoBytes} from '@/lib/stock-photos';
import {takeQuota} from '@/lib/request-guard';
export const runtime='nodejs';
let active=0;
export async function GET(request:Request){if(active>=6)return Response.json({error:'Photo service busy. Retry shortly.'},{status:429,headers:{"Retry-After":"60"}});active++;try{takeQuota('stock-photo-image',30);const result=await stockPhotoBytes(new URL(request.url).searchParams.get('token')||'');return new Response(new Uint8Array(result.body),{headers:{'Content-Type':result.mime,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}})}catch(e){ const limited = rateLimitResponse(e); if (limited) return limited; return Response.json({error:e instanceof Error?e.message:'Photo unavailable.'},{status:400})}finally{active--}}
