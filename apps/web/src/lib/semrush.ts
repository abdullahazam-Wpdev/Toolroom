import {z} from 'zod';
import {createHash} from 'node:crypto';
export const semrushInput=z.object({keyword:z.string().trim().min(1).max(255),country:z.enum(['US','UK','PK','IN','CA','AU','DE','FR']),confirmUnits:z.literal(true)});
const responseSchema=z.object({meta:z.object({success:z.boolean(),status_code:z.number().optional()}).passthrough(),data:z.record(z.string(),z.unknown())});
const cache=new Map<string,{day:string;value:SemrushReport}>();
const pending=new Map<string,Promise<SemrushReport>>();
let budgetDay='',reservedUnits=0;
export type SemrushReport={keyword:string;country:string;retrievedAt:string;cached:boolean;estimatedRequestUnits:number;actualBilledUnits:null;data:Record<string,unknown>};
export function semrushConfigured(){return process.env.SEMRUSH_ENABLED==='true' && Boolean(process.env.SEMRUSH_API_KEY);}
export async function keywordMetrics(raw:unknown):Promise<SemrushReport>{
 const input=semrushInput.parse(raw);
 if(!semrushConfigured())throw new Error('Semrush requires a configured v4 API key, API units and operator activation. No request was sent.');
 const day=new Date().toISOString().slice(0,10);
 const key=createHash('sha256').update(`${process.env.SEMRUSH_API_KEY}\0${input.keyword.toLowerCase()}\0${input.country}`).digest('hex');
 const hit=cache.get(key);if(hit?.day===day)return {...hit.value,cached:true,estimatedRequestUnits:0};
 const inflight=pending.get(key);if(inflight)return {...await inflight,cached:true,estimatedRequestUnits:0};
 if(day!==budgetDay){budgetDay=day;reservedUnits=0;cache.clear();}
 const configured=Number(process.env.SEMRUSH_DAILY_UNIT_BUDGET||200);
 const limit=Number.isFinite(configured)?Math.min(Math.max(0,configured),2000):0;
 if(reservedUnits+20>limit)throw new Error('The server’s Semrush daily unit budget is exhausted.');
 reservedUnits+=20; // Conservative reservation: failed requests are not assumed free.
 const promise=(async()=>{
  const url=new URL('https://api.semrush.com/apis/v4/keywords/v1/metrics');url.searchParams.set('keyword',input.keyword);url.searchParams.set('country',input.country);url.searchParams.set('format','json');
  let response:Response;
  try{response=await fetch(url,{headers:{Authorization:`Apikey ${process.env.SEMRUSH_API_KEY}`,Accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new Error('Semrush could not be reached. No automatic retry was made.');}
  if(!response.ok){await response.body?.cancel();throw new Error(`Semrush returned HTTP ${response.status}. Check API permissions, units and quota.`);}
  const reader=response.body?.getReader();if(!reader)throw new Error('Semrush returned an empty response.');const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const value=await reader.read();if(value.done)break;bytes+=value.value.length;if(bytes>1024*1024){await reader.cancel();throw new Error('Semrush response exceeds the size limit.');}chunks.push(value.value);}
  let decoded:unknown;try{decoded=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('Semrush returned malformed JSON.');}
  const parsed=responseSchema.safeParse(decoded);if(!parsed.success||!parsed.data.meta.success)throw new Error('Semrush did not return a successful keyword report. Missing measurements were not filled in.');
  const value:SemrushReport={keyword:input.keyword,country:input.country,retrievedAt:new Date().toISOString(),cached:false,estimatedRequestUnits:20,actualBilledUnits:null,data:parsed.data.data};
  if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(key,{day,value});return value;
 })();pending.set(key,promise);try{return await promise;}finally{pending.delete(key);}
}
