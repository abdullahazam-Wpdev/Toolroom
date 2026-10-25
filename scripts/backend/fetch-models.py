"""Fetch only pinned ONNX graphs; no runtime model hub or remote Python code."""
import hashlib,json,pathlib,urllib.request,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
for item in json.loads((root/'workers/ai/model-sources.json').read_text()):
    f=next(f for f in item['files'] if f['rfilename']=='onnx/model.onnx')
    path=root/'.runtime/models'/item['repository'].split('/')[1]/'model.onnx'
    path.parent.mkdir(parents=True,exist_ok=True)
    expected=f['lfs']['sha256']
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==expected:
        print(item['repository'],'already verified');continue
    url=f"https://huggingface.co/{item['repository']}/resolve/{item['revision']}/{f['rfilename']}"
    temporary=path.with_suffix('.part')
    try:
        subprocess.run(['curl','--fail','--location','--continue-at','-','--retry','6','--retry-all-errors','--connect-timeout','20','--max-time','600','--output',str(temporary),url],check=True)
        size=temporary.stat().st_size;digest=hashlib.sha256(temporary.read_bytes())
        if size!=f['size'] or digest.hexdigest()!=expected:raise ValueError('Model integrity mismatch')
        temporary.replace(path);print(item['repository'],size,digest.hexdigest(),flush=True)
    except Exception:
        print("Download incomplete; rerun to resume",temporary,flush=True)
        raise
