"""Bounded refresh; keep original source reviews and explicit access failures."""
import concurrent.futures,datetime,json,urllib.request,importlib.util
from pathlib import Path
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('inventory',root/'scripts/research/inventory.py');inv=importlib.util.module_from_spec(spec);spec.loader.exec_module(inv)
def check(repo):
 row={'repository':repo,'url':'https://github.com/'+repo}
 try:
  raw,_,_=inv.fetch('https://api.github.com/repos/'+repo);m=json.loads(raw)
  raw,_,_=inv.fetch('https://api.github.com/repos/'+repo+'/commits?per_page=1');c=json.loads(raw)
  row.update(sha=c[0]['sha'],archived=m['archived'],license=(m.get('license') or {}).get('spdx_id'),pushed_at=m['pushed_at'],status='metadata refreshed; retained bounded source review')
 except Exception as e:row.update(status='inaccessible on refresh; retained prior review',error=str(e))
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: rows=list(pool.map(check,inv.REPOS+['morluto/rea','undefdev/token-efficiency']))
(root/'docs/research/refresh-2026-10-25.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repositories':rows},indent=2))
print('Refreshed',len(rows),'repositories; errors',sum('error' in r for r in rows))
