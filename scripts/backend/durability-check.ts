import { Queue } from 'bullmq';
import { database, connection } from '../../packages/jobs/runtime.ts';
const db=database(),redis=connection();redis.on('error',()=>{});
const q=new Queue('toolroom-restart-proof',{connection:redis});
try {
 if(process.argv[2]==='prepare'){
  await q.add('persisted-before-restart',{value:42},{jobId:'durability-marker'});
  await db.toolEvent.upsert({where:{id:'durability-marker'},create:{id:'durability-marker',toolId:'infrastructure-check',outcome:'before-restart'},update:{outcome:'before-restart'}});
  console.log('Marker stored in PostgreSQL and BullMQ.');
 }else{
  const record=await db.toolEvent.findUnique({where:{id:'durability-marker'}}),job=await q.getJob('durability-marker');
  if(!record||job?.data.value!==42)throw new Error('Durability verification failed');
  console.log(JSON.stringify({postgresSurvived:true,redisQueueSurvived:true,state:await job.getState()}));
  await db.toolEvent.delete({where:{id:'durability-marker'}});await q.obliterate({force:true});
 }
}finally{await q.close();await redis.quit();await db.$disconnect();}
process.exit(0);
