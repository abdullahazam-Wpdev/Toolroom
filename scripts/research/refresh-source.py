"""Recheck retained entrypoints, without executing upstream code or replacing old evidence."""
import concurrent.futures,datetime,hashlib,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('inventory.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
text=(m.ROOT/'docs/github-research.md').read_text()
def check(repo):
 section=text.split('## '+repo+'\n',1)[-1].split('\n## ',1)[0]
 match=re.search(r'Useful paths: (.+)',section)
 paths=re.findall(r'`([^`]+)`',match.group(1)) if match else []
 paths=list(dict.fromkeys(['README.md','LICENSE']+paths))[:7]
 results=[]
 for path in paths:
  row={'path':path}
  try:
   raw,status,url=m.fetch('https://raw.githubusercontent.com/'+repo+'/HEAD/'+path,600000)
   old=m.OUT/'repos'/repo.replace('/','--')/path
   row.update(status=status,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),changed=old.exists() and old.read_bytes()!=raw)
   target=m.OUT/'refresh-source'/repo.replace('/','--')/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
  except Exception as e:row['error']=str(e)
  results.append(row)
 return {'repository':repo,'entrypoints':results}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(check,m.REPOS))
(m.ROOT/'docs/research/source-refresh-2026-10-25.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repositories':rows},indent=2))
print('Repos',len(rows),'successful files',sum('status' in f for r in rows for f in r['entrypoints']),'changed files',[(r['repository'],f['path']) for r in rows for f in r['entrypoints'] if f.get('changed')])
