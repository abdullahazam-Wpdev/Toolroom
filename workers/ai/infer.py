"""Bounded CPU inference. Fixed local ONNX files; no downloads or remote code."""
import hashlib,json,os,pathlib,sys,warnings
import numpy as np
import onnxruntime as ort
from PIL import Image,ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[2]
Image.MAX_IMAGE_PIXELS=4_000_000
warnings.simplefilter('error',Image.DecompressionBombWarning)
def infer(kind,source,destination):
    name='modnet' if kind=='background-remover' else 'swin2SR-lightweight-x2-64'
    records=json.loads((ROOT/'workers/ai/model-sources.json').read_text())
    item=next(x for x in records if x['repository'].endswith('/'+name))
    expected=next(f['lfs']['sha256'] for f in item['files'] if f['rfilename']=='onnx/model.onnx')
    model=pathlib.Path(os.environ.get('MODEL_STORAGE_DIR',str(ROOT/'.runtime/models')))/name/'model.onnx'
    if hashlib.sha256(model.read_bytes()).hexdigest()!=expected:raise ValueError('Model integrity check failed')
    with Image.open(source) as opened:
        if getattr(opened,'n_frames',1)!=1:raise ValueError('Animated images are unsupported')
        if opened.width*opened.height>4_000_000:raise ValueError('Image exceeds 4 megapixels')
        image=ImageOps.exif_transpose(opened).convert('RGB')
    width,height=image.size
    options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
    options.enable_mem_pattern=False
    session=ort.InferenceSession(str(model),sess_options=options,providers=['CPUExecutionProvider'])
    if kind=='background-remover':
        # MODNet's published preprocessing: [-1,1], aspect-preserving, divisible by32.
        ratio=512/min(width,height)
        nw=max(32,min(1024,int(width*ratio)//32*32));nh=max(32,min(1024,int(height*ratio)//32*32))
        values=np.asarray(image.resize((nw,nh),Image.Resampling.BILINEAR),dtype=np.float32)/127.5-1
    elif kind=='ai-image-upscaler':
        if width>256 or height>256:raise ValueError('CPU upscaling supports images up to 256 × 256 pixels')
        values=np.asarray(image,dtype=np.float32)/255
        values=np.pad(values,((0,8-height%8),(0,8-width%8),(0,0)),mode='reflect')
    else:raise ValueError('Unsupported AI operation')
    tensor=values.transpose(2,0,1)[None].astype(np.float32)
    output=session.run(None,{session.get_inputs()[0].name:tensor})[0]
    if not np.isfinite(output).all():raise ValueError('Nonfinite model output')
    if kind=='background-remover':
        mask=Image.fromarray(np.clip(output.squeeze()*255,0,255).astype('uint8')).resize((width,height),Image.Resampling.BILINEAR)
        image.putalpha(mask);result=image
    else:
        pixels=np.clip(output[0].transpose(1,2,0)[:height*2,:width*2]*255,0,255).round().astype('uint8')
        result=Image.fromarray(pixels)
        if result.size!=(width*2,height*2):raise ValueError('Incorrect output dimensions')
    result.save(destination,format='PNG')
    print(json.dumps({'model':name,'width':result.width,'height':result.height,'mode':result.mode}),flush=True)
if __name__=='__main__':
    try:infer(*sys.argv[1:])
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
