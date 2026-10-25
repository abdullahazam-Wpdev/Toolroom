/** Read-only checks. Never apply migrations or print connection values. */
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { readdir } from 'node:fs/promises';
const dbUrl=process.env.DATABASE_URL||'',redisUrl=process.env.REDIS_URL||'';
const result:{[key:string]:unknown}={databaseConfigured:Boolean(dbUrl)&&dbUrl!=='[SENSITIVE]',redisConfigured:Boolean(redisUrl)&&redisUrl!=='[SENSITIVE]',postgresConnected:null,redisConnected:null,migrations:null};
if(/^postgres(ql)?:\/\//.test(dbUrl)){
 const db=new PrismaClient();
 try{await db.$queryRaw`SELECT 1`;result.postgresConnected=true;const rows=await db.$queryRaw<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations"`;const expected=(await readdir('infra/migrations')).filter(s=>/^\d+_/.test(s));result.migrations={pending:expected.filter(name=>!rows.some(r=>r.migration_name===name&&r.finished_at&&!r.rolled_back_at)),unfinished:rows.filter(r=>!r.finished_at&&!r.rolled_back_at).map(r=>r.migration_name)};}catch{result.postgresConnected=false;result.databaseError='Connection or migration-table check failed; credentials and SQL details withheld.';}finally{await db.$disconnect();}
}else result.databaseError=dbUrl==='[SENSITIVE]'?'Vercel exported a redacted placeholder; run inside the trusted production environment.':'Supply a real PostgreSQL connection URL.';
if(/^rediss?:\/\//.test(redisUrl)){const client=new IORedis(redisUrl,{maxRetriesPerRequest:1,connectTimeout:3000});client.on('error',()=>{});try{result.redisConnected=await client.ping()==='PONG';}catch{result.redisConnected=false;}finally{client.disconnect();}}else result.redisError=redisUrl==='[SENSITIVE]'?'Vercel exported a redacted placeholder.':'Supply a real Redis connection URL.';
console.log(JSON.stringify(result,null,2));
process.exit(result.postgresConnected===true&&result.redisConnected===true?0:2);
