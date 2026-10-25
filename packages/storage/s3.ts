import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes, createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
export const uploadIntent = z.object({ purpose: z.enum(['image','media']), mime: z.enum(['image/jpeg','image/png','image/webp','image/avif','image/gif','image/tiff','video/mp4','video/webm','video/quicktime','video/x-msvideo','video/x-matroska']), bytes: z.number().int().positive().max(32*1024*1024), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).superRefine((x,ctx)=>{if ((x.purpose==='image' || x.mime.startsWith('image/')) && x.bytes>10*1024*1024) ctx.addIssue({code:'custom',message:'Image limit is 10 MiB.'});if(x.purpose==='image'&&!x.mime.startsWith('image/'))ctx.addIssue({code:'custom',message:'Choose an image.'});});
export type UploadClaim = z.infer<typeof uploadIntent> & { id: string; expires: number };
export function storageConfigured() { return ['S3_ENDPOINT','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','UPLOAD_SIGNING_SECRET'].every(k=>Boolean(process.env[k])) && (process.env.UPLOAD_SIGNING_SECRET?.length || 0)>=32; }
export function storage() {
 if(!storageConfigured()) throw new Error('Private object storage is not configured.');
 const endpoint=process.env.S3_ENDPOINT;
 if(endpoint && (new URL(endpoint).protocol!=='https:' || new URL(endpoint).username || new URL(endpoint).password))throw new Error('Storage endpoint must use HTTPS without embedded credentials.');
 return new S3Client({region:process.env.S3_REGION||'auto',endpoint,forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID!,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY!},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:1});
}
const bucket=()=>process.env.S3_BUCKET!;
export function objectKey(id: string, result=false, format='png') { if(!/^[a-f0-9]{32}$/.test(id)||!['png','mp4','webm','jpeg','jpg','webp','avif','gif','tiff'].includes(format))throw new Error('Invalid object reference.');return `toolroom/${result?'results':'uploads'}/${id}/${result?'output.'+format:'input'}`; }
export function signClaim(claim:UploadClaim) { const body=Buffer.from(JSON.stringify(claim)).toString('base64url');return body+'.'+createHmac('sha256',process.env.UPLOAD_SIGNING_SECRET!).update(body).digest('base64url'); }
export function verifyClaim(ticket: string): UploadClaim {
 if(!storageConfigured() || ticket.length>4096)throw new Error('Invalid upload authorization.');
 const [body,signature,...rest]=ticket.split('.'); if(!body||!signature||rest.length)throw new Error('Invalid upload authorization.');
 const expected=createHmac('sha256',process.env.UPLOAD_SIGNING_SECRET!).update(body).digest();const supplied=Buffer.from(signature,'base64url');if(supplied.length!==expected.length||!timingSafeEqual(expected,supplied))throw new Error('Invalid upload authorization.');
 const parsed=JSON.parse(Buffer.from(body,'base64url').toString());const claim={...uploadIntent.parse(parsed),id:z.string().regex(/^[a-f0-9]{32}$/).parse(parsed.id),expires:z.number().int().parse(parsed.expires)};
 if(claim.expires<=Date.now()||claim.expires>Date.now()+16*60*1000)throw new Error('Upload authorization expired.');return claim;
}
export async function issueUpload(input: unknown) {
 const spec=uploadIntent.parse(input),claim:UploadClaim={...spec,id:randomBytes(16).toString('hex'),expires:Date.now()+15*60*1000};
 const uploadUrl=await getSignedUrl(storage(),new PutObjectCommand({Bucket:bucket(),Key:objectKey(claim.id),ContentType:spec.mime,ContentLength:spec.bytes}),{expiresIn:300,signableHeaders:new Set(['content-type','content-length'])});
 // Browser supplies Content-Length automatically from the File/Blob. R2 has no POST size-policy support.
 return {uploadUrl,headers:{'Content-Type':spec.mime},ticket:signClaim(claim),expiresInSeconds:300};
}
export async function validatedUpload(claim:UploadClaim) {
 const client=storage(),key=objectKey(claim.id),head=await client.send(new HeadObjectCommand({Bucket:bucket(),Key:key}),{abortSignal:AbortSignal.timeout(10000)});
 if(head.ContentLength!==claim.bytes||head.ContentType!==claim.mime)throw new Error('Uploaded object size or type does not match authorization.');
 const object=await client.send(new GetObjectCommand({Bucket:bucket(),Key:key,IfMatch:head.ETag}),{abortSignal:AbortSignal.timeout(20000)});
 if(!object.Body)throw new Error('Uploaded object is empty.');
 const chunks:Uint8Array[]=[];let size=0;
 try { for await(const chunk of object.Body as AsyncIterable<Uint8Array>) {size+=chunk.length;if(size>claim.bytes)throw new Error('Uploaded object exceeds authorized size.');chunks.push(chunk);} } finally { (object.Body as {destroy?:()=>void}).destroy?.(); }
 const bytes=Buffer.concat(chunks);if(bytes.length!==claim.bytes||createHash('sha256').update(bytes).digest('hex')!==claim.sha256)throw new Error('Uploaded object integrity mismatch.');return bytes;
}
export async function putResult(id:string,format:string,mime:string,body:Buffer) {if(body.length>60*1024*1024)throw new Error('Result exceeds storage limit.');await storage().send(new PutObjectCommand({Bucket:bucket(),Key:objectKey(id,true,format),Body:body,ContentType:mime,ContentDisposition:`attachment; filename="toolroom-result.${format}"`,CacheControl:'private, no-store'}),{abortSignal:AbortSignal.timeout(20000)});}
export async function resultUrl(id:string,format:string,expiresIn=60) {return getSignedUrl(storage(),new GetObjectCommand({Bucket:bucket(),Key:objectKey(id,true,format),ResponseContentDisposition:`attachment; filename="toolroom-result.${format}"`}),{expiresIn});}
export async function deleteObjects(id:string,format='png',includeResult=true) {const client=storage();await client.send(new DeleteObjectCommand({Bucket:bucket(),Key:objectKey(id)}));if(includeResult)await client.send(new DeleteObjectCommand({Bucket:bucket(),Key:objectKey(id,true,format)}));}
export async function cleanupObjects() {
 const client=storage();let continuation:string|undefined,count=0,pages=0;const deadline=Date.now()+20000;
 do { const page=await client.send(new ListObjectsV2Command({Bucket:bucket(),Prefix:'toolroom/',ContinuationToken:continuation,MaxKeys:100}),{abortSignal:AbortSignal.timeout(10000)});
 for(const o of page.Contents||[])if(Date.now()<deadline&&count<100&&o.Key&&o.LastModified&&o.LastModified.getTime()<Date.now()-60*60*1000){await client.send(new DeleteObjectCommand({Bucket:bucket(),Key:o.Key}),{abortSignal:AbortSignal.timeout(5000)});count++;}
 continuation=page.NextContinuationToken;
 pages++;}while(continuation&&count<100&&pages<10&&Date.now()<deadline);return count;
}
