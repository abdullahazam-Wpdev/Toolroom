import {z} from 'zod';
import {publicUrl,safeFetch} from './safe-fetch';
export const mediaRequestSchema=z.object({url:z.string().url().max(2048),authorized:z.literal(true)});
export const MAX_MEDIA_BYTES=10*1024*1024;
export function mediaType(body:Buffer){
 if(body.length>=3 && body[0]===255 && body[1]===216 && body[2]===255)return {mime:'image/jpeg',extension:'jpg'};
 if(body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png',extension:'png'};
 if(body.toString('ascii',0,4)==='RIFF'&&body.toString('ascii',8,12)==='WEBP')return {mime:'image/webp',extension:'webp'};
 if(body.toString('ascii',4,8)==='ftyp'&&['isom','iso2','mp41','mp42','avc1','M4V '].includes(body.toString('ascii',8,12)))return {mime:'video/mp4',extension:'mp4'};
 if(body.subarray(0,4).equals(Buffer.from([26,69,223,163]))&&body.subarray(0,4096).includes(Buffer.from('webm')))return {mime:'video/webm',extension:'webm'};
 throw new Error('This is not a supported direct media file. Use a JPEG, PNG, WebP, MP4 or WebM file URL, rather than a social post or webpage.');
}
export async function downloadDirectMedia(raw:unknown){
 const input=mediaRequestSchema.parse(raw);publicUrl(input.url);
 const response=await safeFetch(input.url,{maxBytes:MAX_MEDIA_BYTES,timeoutMs:20000,maxRedirects:3});
 if(response.status!==200)throw new Error(`Media server returned HTTP ${response.status}.`);
 if(!response.body.length)throw new Error('The media file is empty.');
 const type=mediaType(response.body);
 // Never trust the destination's Content-Disposition or an HTML MIME claim.
 const declared=(response.headers['content-type']||'').split(';')[0].trim().toLowerCase();
 if(declared && ![type.mime,'application/octet-stream','binary/octet-stream'].includes(declared))throw new Error('The media signature does not match the server’s content type.');
 let name='media';try{name=decodeURIComponent(new URL(response.url).pathname.split('/').pop()||'media').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'_').slice(0,80)||'media';}catch{}
 return {data:response.body,...type,filename:`${name}.${type.extension}`};
}
