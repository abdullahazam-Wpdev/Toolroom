import {searchStockPhotos} from '@/lib/stock-photos';
import {takeQuota} from '@/lib/request-guard';
export const runtime='nodejs';
export async function GET(request:Request){if(!process.env.PEXELS_API_KEY)return Response.json({error:'Pexels photo search is not configured yet. Use your own image or the included Unsplash sample.'},{status:503});try{takeQuota('stock-photo-search',6);return Response.json({photos:await searchStockPhotos(new URL(request.url).searchParams.get('q')||'')},{headers:{'Cache-Control':'no-store'}})}catch(e){return Response.json({error:e instanceof Error?e.message:'Photo search failed.'},{status:400})}}
