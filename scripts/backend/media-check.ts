import { randomBytes } from 'node:crypto';
import { mkdir,copyFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { database,queue,jobDirectory,tokenHash,newToken,ttlMs } from '../../packages/jobs/runtime.ts';
const db=database(),q=queue(),id=randomBytes(16).toString('hex'),kind=process.argv[2]||'video-converter',format=kind.startsWith('video-')?(process.argv[4]||'webm'):'png';
try{
 const dir=jobDirectory(id);await mkdir(dir,{recursive:true,mode:0o700});await copyFile(process.argv[3]||'.runtime/fixtures/input.webm',join(dir,'input'));
 await db.mediaJob.create({data:{id,tokenHash:tokenHash(newToken()),kind,format,quality:'smaller',inputBytes:1,expiresAt:new Date(Date.now()+ttlMs)}});
 await q.add(kind,{}, {jobId:id});
 const deadline=Date.now()+190000;let record;
 while(Date.now()<deadline){record=await db.mediaJob.findUnique({where:{id}});if(['completed','failed','cancelled'].includes(record!.status))break;await new Promise(r=>setTimeout(r,500));}
 const result={id,kind,status:record?.status,progress:record?.progress,outputBytes:record?.outputBytes,error:record?.error,path:join(dir,`output.${format}`)};
 await writeFile(`artifacts/backend/${kind}-${format}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(record?.status!=='completed')process.exitCode=1;
}finally{await q.close();await db.$disconnect();}
process.exit(process.exitCode||0);
