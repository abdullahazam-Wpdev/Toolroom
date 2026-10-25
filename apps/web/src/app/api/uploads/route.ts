import { boundedJson, takeQuota, rateLimitResponse } from '@/lib/request-guard';
import { storageConfigured, issueUpload, uploadIntent } from '../../../../../../packages/storage/s3';
import { quotaRedis } from '../../../../../../packages/jobs/runtime';
export const runtime='nodejs';
export async function POST(request:Request) {
 if(!storageConfigured())return Response.json({error:'Private object storage is not configured.'},{status:503});
 try {takeQuota('upload-signing',12);const body=uploadIntent.parse(await boundedJson(request,4096));if(!process.env.REDIS_URL?.match(/^rediss?:\/\//))return Response.json({error:'Distributed upload quotas are not configured.'},{status:503});
 const client=quotaRedis();const n=await client.eval("local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n",1,'toolroom:storage-signing') as number;
 if(n>12)return Response.json({error:'Upload limit reached.'},{status:429,headers:{'Retry-After':'60'}});
 const reserved=await client.eval("local n=tonumber(redis.call('GET',KEYS[1]) or '0');if n+tonumber(ARGV[1])>268435456 then return 0 end;redis.call('INCRBY',KEYS[1],ARGV[1]);redis.call('EXPIRE',KEYS[1],3600);return 1",1,'toolroom:storage-hour-bytes',body.bytes);if(reserved!==1)return Response.json({error:'Hourly upload budget reached.'},{status:429,headers:{'Retry-After':'3600'}});
 if((body as {purpose?:string}).purpose==='media'&&process.env.MEDIA_JOBS_ENABLED!=='true')return Response.json({error:'Media workers are not deployed on this installation.'},{status:503});
 return Response.json(await issueUpload(body),{headers:{'Cache-Control':'no-store'}});
 }catch(e){const limited=rateLimitResponse(e);if(limited)return limited;return Response.json({error:'Unable to authorize this upload. Check type, size and storage configuration.'},{status:400});}
}
