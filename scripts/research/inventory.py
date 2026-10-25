#!/usr/bin/env python3
"""Read public source archives without installing or executing upstream code."""
import concurrent.futures,datetime,hashlib,io,json,re,tarfile,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
REPOS=['anthropics/claude-code','jeffallan/claude-skills','AgricIDaniel/claude-seo','public-apis/public-apis','stjudewashere/seonaut','Jesikurr/Universal-Image-Converter','tool3/upscaler-cli','Vette1123/social-media-downloader','XGenerationy/SocialMedia-Video-Downloader','addyosmani/bg-remove','Motasaith/image-bg-remover','tecnomanu/remove-background-local','codeforreal1/compressO','Cap-go/capacitor-file-compressor','avvio-agency/website-speed-test','websu-io/websu','aliesbelik/webperf-toolkit','sitespeedio/sitespeed.io']
TOPICS=['seo-audit-tool','image-converter-one-tool','total-image-converter-jpeg-to-png','super-resolution-image','photo-upscaler','social-media-downloader','media-downloader-gui','reels-downloader','background-removal','video-compress?o=asc&s=stars','web-performance-testing?l=javascript']
URLS=['https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md','https://github.com/jeffallan/claude-skills','https://github.com/AgricIDaniel/claude-seo','https://claudeseoskill.com/','https://github.com/public-apis/public-apis','https://cloudconvert.com/jpg-to-webp','https://www.freeconvert.com/jpg-to-webp','https://www.remove.bg/','https://imgupscaler.com/','https://pagespeed.web.dev/','https://www.seobility.net/en/seocheck/']
URLS += ['https://github.com/topics/'+t for t in TOPICS]
URLS += ['https://github.com/'+r for r in REPOS[4:]]
OUT=ROOT/'.research';OUT.mkdir(exist_ok=True)
def fetch(url,limit=25*1024*1024):
 req=urllib.request.Request(url,headers={'User-Agent':'Toolroom-public-source-review','Accept':'application/vnd.github+json' if 'api.github.com' in url else '*/*'})
 with urllib.request.urlopen(req,timeout=35) as r:
  started=time.monotonic();chunks=[];size=0
  while True:
   if time.monotonic()-started>60:raise TimeoutError('Research response exceeded the total time budget')
   chunk=r.read(min(65536,limit+1-size))
   if not chunk:break
   chunks.append(chunk);size+=len(chunk)
   if size>limit:raise ValueError('Response exceeds bounded research size limit')
  return b''.join(chunks),r.status,r.geturl()
def repo(name):
 d={'repository':name,'url':'https://github.com/'+name,'reviewedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'executedUpstreamCode':False}
 dest=OUT/'repos'/name.replace('/','--');dest.mkdir(parents=True,exist_ok=True)
 try:
  meta,_,_=fetch('https://api.github.com/repos/'+name);m=json.loads(meta);d.update({k:m.get(k) for k in ['default_branch','description','archived','pushed_at','size','license','language','html_url']})
 except Exception as e:d['metadataError']=str(e)
 try:
  raw,status,url=fetch('https://codeload.github.com/'+name+'/tar.gz/HEAD');d.update(archiveSha256=hashlib.sha256(raw).hexdigest(),archiveBytes=len(raw),status=status)
  files=[];extracted=0
  with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as tar:
   for member in tar:
    path=Path(*Path(member.name).parts[1:])
    if not member.isfile() or path.is_absolute() or '..' in path.parts or not path.parts:continue
    files.append(str(path))
    if member.size>500000 or any(p in path.parts for p in ['node_modules','.git','dist','vendor','build']):continue
    if path.suffix.lower() not in ['.md','.txt','.json','.toml','.yaml','.yml','.js','.mjs','.ts','.tsx','.jsx','.py','.go','.rs','.html','.css','.sh','.dart','.kt','.swift','.gradle','.svelte','.vue'] and not re.search(r'license|copying|dockerfile|go.mod|cargo.lock|requirements',path.name,re.I):continue
    extracted+=member.size
    if extracted>30*1024*1024:raise ValueError('Expanded text limit reached')
    target=dest/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(tar.extractfile(member).read())
  d['files']=files;d['textBytes']=extracted;d['sourceStatus']='downloaded for source inspection'
 except Exception as e:d['sourceError']=str(e);d['sourceStatus']='inaccessible or size limited'
 (dest/'_review-metadata.json').write_text(json.dumps(d,indent=2));print(name,d['sourceStatus'],len(d.get('files',[])),flush=True);return d
def topic(topic):
 url='https://github.com/topics/'+topic;d={'url':url}
 try:
  raw,status,final=fetch(url,3*1024*1024);text=raw.decode();(OUT/('topic-'+topic.split('?')[0]+'.html')).write_text(text)
  candidates=[]
  for owner,repo in re.findall(r'href="/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)"',text):
   if owner not in ['topics','sponsors','collections','features','marketplace','orgs','settings','login','signup','search'] and owner+'/'+repo not in candidates:candidates.append(owner+'/'+repo)
  d.update(status=status,candidates=candidates[:30],sha256=hashlib.sha256(raw).hexdigest())
 except Exception as e:d['error']=str(e)
 print('topic',topic,d.get('status',d.get('error')),flush=True);return d
if __name__=='__main__':
 ledger=ROOT/'docs/research/reference-links.json'
 old=json.loads(ledger.read_text()) if ledger.exists() else []
 seen={row['url'] for row in old}
 old.extend({'url':u,'status':'pending'} for u in dict.fromkeys(URLS) if u not in seen)
 ledger.write_text(json.dumps(old,indent=2))
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:repos=list(pool.map(repo,REPOS))
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:topics=list(pool.map(topic,TOPICS))
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 snapshots=ROOT/'docs/research/snapshots';snapshots.mkdir(exist_ok=True)
 (snapshots/(stamp+'-repositories.json')).write_text(json.dumps(repos,indent=2))
 (ROOT/'docs/research/repositories.json').write_text(json.dumps(repos,indent=2));(ROOT/'docs/research/topics.json').write_text(json.dumps(topics,indent=2))
