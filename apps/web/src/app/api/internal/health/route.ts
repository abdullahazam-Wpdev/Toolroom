import { timingSafeEqual } from 'node:crypto';
import { database, connection } from '../../../../../../../packages/jobs/runtime';
export const runtime='nodejs';
export async function GET(request:Request) {
 const secret=process.env.OPERATOR_HEALTH_SECRET,auth=request.headers.get('authorization')||'',expected=`Bearer ${secret}`;
 if(!secret||secret.length<32||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return Response.json({error:'Unauthorized.'},{status:401});
 let postgres=false,redis=false,migrations:{name:string;finished:boolean}[]=[];
 try{await database().$queryRaw`SELECT 1`;postgres=true;const rows=await database().$queryRaw<{migration_name:string;finished_at:Date|null}[]>`SELECT migration_name,finished_at FROM "_prisma_migrations" ORDER BY started_at`;migrations=rows.map(r=>({name:r.migration_name,finished:Boolean(r.finished_at)}));}catch{/* Never return URLs, SQL errors or credentials. */}
 try{const client=connection();client.on('error',()=>{});try{redis=await client.ping()==='PONG';}finally{client.disconnect();}}catch{}
 return Response.json({postgres,redis,migrations,mediaEnabled:process.env.MEDIA_JOBS_ENABLED==='true',crawlEnabled:process.env.CRAWL_JOBS_ENABLED==='true'},{status:postgres&&redis?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
