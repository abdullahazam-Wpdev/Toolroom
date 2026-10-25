import { timingSafeEqual } from 'node:crypto';
import { cleanupObjects,storageConfigured } from '../../../../../../../packages/storage/s3';
export const runtime='nodejs';
export async function GET(request:Request) {
 const secret=process.env.CRON_SECRET,auth=request.headers.get('authorization')||'',expected=`Bearer ${secret}`;
 if(!secret||secret.length<32||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return Response.json({error:'Unauthorized.'},{status:401});
 if(!storageConfigured())return Response.json({error:'Object storage not configured.'},{status:503});
 try{return Response.json({deleted:await cleanupObjects()},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Object cleanup failed; check operator logs.'},{status:503});}
}
