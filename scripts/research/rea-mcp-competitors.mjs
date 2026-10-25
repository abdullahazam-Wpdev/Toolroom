// REA is an operator tool, deliberately excluded from the public application.
// Run after inspecting/authorizing REA: REA_PACKAGE_ROOT=/path/to/rea-agents node scripts/research/rea-mcp-competitors.mjs
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.REA_PACKAGE_ROOT;
if(!root) throw new Error('Set REA_PACKAGE_ROOT to the reviewed rea-agents installation.');
const sdk=join(dirname(resolve(root)),'@modelcontextprotocol/client/dist');
const {Client}=await import(pathToFileURL(join(sdk,'index.mjs')).href);
const {StdioClientTransport}=await import(pathToFileURL(join(sdk,'stdio.mjs')).href);
const client=new Client({name:'toolroom-competitor-research',version:'1'});
const transport=new StdioClientTransport({command:process.execPath,args:[join(resolve(root),'scripts/rea.mjs'),'mcp'],env:{...process.env},stderr:'pipe'});
const output=process.env.RESEARCH_OUTPUT_DIR || `artifacts/research/rea-mcp-${new Date().toISOString().replace(/[:.]/g,'-')}`;await mkdir(output,{recursive:true});
try {
 await client.connect(transport);
 const tools=(await client.listTools()).tools;
 if(!tools.some(t=>t.name==='capture_browser_scenario')) throw new Error('Connected REA does not advertise the required tool.');
 await writeFile(`${output}/server.json`,JSON.stringify({verifiedAt:new Date().toISOString(),toolCount:tools.length,transport:'standalone MCP stdio client'},null,2));
 for(const id of ['cloudconvert','freeconvert','removebg','imgupscaler','pagespeed','seobility']){
  const input=JSON.parse(await readFile(`artifacts/research/rea/${id}-scenario.json`,'utf8'));
  try {const result=await client.callTool({name:'capture_browser_scenario',arguments:input},undefined,{timeout:60000});await writeFile(`${output}/${id}.json`,JSON.stringify(result,null,2));console.log(id,result.isError?'tool error':'MCP capture returned');}
  catch(error){await writeFile(`${output}/${id}.json`,JSON.stringify({error:String(error)},null,2));console.log(id,String(error));}
 }
}finally{await client.close();}
