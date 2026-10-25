import { verifyClaim, storageConfigured } from '../../../../packages/storage/s3';
import { database,queue,quotaRedis,validateOptions,newToken,tokenHash,ttlMs } from '../../../../packages/jobs/runtime';
import { boundedJson } from './request-guard';
import { z } from 'zod';
export async function submitStoredMedia(request:Request) {
 if(process.env.MEDIA_JOBS_ENABLED!=='true'||!storageConfigured())return Response.json({error:'Object-storage media worker is not enabled.'},{status:503});
 const body=z.object({ticket:z.string().max(4096),kind:z.string(),format:z.string(),quality:z.string().default('balanced')}).parse(await boundedJson(request,8192));
 const claim=verifyClaim(body.ticket),options=validateOptions(body.kind,body.format,body.quality);
 if(claim.purpose!=='media'||options.kind.startsWith('video-')!==claim.mime.startsWith('video/'))throw new Error('Upload does not match this tool.');
 const redis=quotaRedis();if(!await redis.get('toolroom:media-worker:s3'))return Response.json({error:'No deployed object-storage worker is available.'},{status:503});
 const q=queue();if(await q.getWaitingCount()>=20)return Response.json({error:'Queue busy.'},{status:429,headers:{'Retry-After':'60'}});
 if(await redis.set('toolroom:upload-claim:'+claim.id,'1','EX',3600,'NX')!=='OK')return Response.json({error:'Upload already submitted.'},{status:409});
 const token=newToken();await database().mediaJob.create({data:{id:claim.id,tokenHash:tokenHash(token),...options,inputBytes:claim.bytes,inputSha256:claim.sha256,inputMime:claim.mime,storageBackend:'s3',expiresAt:new Date(Date.now()+ttlMs)}});
 try{await q.add(options.kind,{}, {jobId:claim.id});}catch{await database().mediaJob.update({where:{id:claim.id},data:{status:'failed',error:'Queue delivery failed.'}});return Response.json({error:'Queue unavailable.'},{status:503});}
 return Response.json({id:claim.id,token,expiresInSeconds:ttlMs/1000},{status:202,headers:{'Cache-Control':'no-store'}});
}
