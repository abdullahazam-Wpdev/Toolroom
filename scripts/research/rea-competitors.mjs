import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const output=process.env.RESEARCH_OUTPUT_DIR || `artifacts/research/rea-${new Date().toISOString().replace(/[:.]/g,'-')}`;
await mkdir(output,{recursive:true});
const sites=[['cloudconvert','https://cloudconvert.com/jpg-to-webp'],['freeconvert','https://www.freeconvert.com/jpg-to-webp'],['removebg','https://www.remove.bg/'],['imgupscaler','https://imgupscaler.com/'],['pagespeed','https://pagespeed.web.dev/'],['seobility','https://www.seobility.net/en/seocheck/']];
for(const [id,url] of sites){
 const actions=[{step_id:'settle',action:'wait_for_timeout',duration_ms:500}];
 if(id==='pagespeed')actions.push({step_id:'invalid',action:'fill',locator:{kind:'css',selector:'input'},value:{source:'literal',value:'not-a-url'},timeout_ms:5000},{step_id:'submit',action:'click',locator:{kind:'role',role:'button',name:'Analyze'},timeout_ms:5000});
 if(id==='seobility')actions.push({step_id:'invalid',action:'fill',locator:{kind:'css',selector:'input[type=text]'},value:{source:'literal',value:'not-a-url'},timeout_ms:5000});
 const input={browser:{mode:'launch',executable_path:chromium.executablePath()},start_url:{url},environment:{viewport:{width:390,height:844},timezone:'Asia/Karachi'},actions,capture:{at_end:['url','dom','accessibility']}};
 const file=`${output}/${id}-scenario.json`;await writeFile(file,JSON.stringify(input,null,2));
 const result=await new Promise(resolve=>{const child=spawn('npx',['-y','rea-agents@6.7.0','capture-browser-scenario',file,'--format','json'],{stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const timer=setTimeout(()=>child.kill('SIGTERM'),45000);child.on('exit',code=>{clearTimeout(timer);resolve({code,out,err});});});
 await writeFile(`${output}/${id}-evidence.json`,result.out);await writeFile(`${output}/${id}-stderr.txt`,result.err);console.log(id,result.code,result.out.slice(0,100),result.err.slice(-150));
}
