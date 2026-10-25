import {it,expect,vi,afterEach} from 'vitest';
import sharp from 'sharp';
import {downloadDirectMedia,mediaType,MAX_MEDIA_BYTES} from '../apps/web/src/lib/direct-media';
import {safeFetch} from '../apps/web/src/lib/safe-fetch';
vi.mock('../apps/web/src/lib/safe-fetch',async()=>({...await vi.importActual('../apps/web/src/lib/safe-fetch'),safeFetch:vi.fn()}));
afterEach(()=>vi.resetAllMocks());
it('returns original image bytes with a sanitized attachment name and bounded fetch',async()=>{
 const data=await sharp({create:{width:8,height:8,channels:3,background:'#345'}}).png().toBuffer();
 vi.mocked(safeFetch).mockResolvedValue({url:'https://example.com/%22%0Aunsafe.png',status:200,headers:{'content-type':'image/png'},body:data,redirects:[]});
 const output=await downloadDirectMedia({url:'https://example.com/photo.png',authorized:true});
 expect(output.data).toEqual(data);expect(output.filename).toBe('__unsafe.png');expect(output.mime).toBe('image/png');
 expect(safeFetch).toHaveBeenCalledWith('https://example.com/photo.png',{maxBytes:MAX_MEDIA_BYTES,timeoutMs:20000,maxRedirects:3});
});
it('requires explicit permission and blocks private input before fetch',async()=>{
 await expect(downloadDirectMedia({url:'https://example.com/a.jpg',authorized:false})).rejects.toThrow();
 await expect(downloadDirectMedia({url:'http://169.254.169.254/a.jpg',authorized:true})).rejects.toThrow('Private-network');
 expect(safeFetch).not.toHaveBeenCalled();
});
it('rejects HTML pages and MIME spoofing',async()=>{
 expect(()=>mediaType(Buffer.from('<html>login required</html>'))).toThrow('direct media');
 vi.mocked(safeFetch).mockResolvedValue({url:'https://example.com/a.jpg',status:200,headers:{'content-type':'text/html'},body:Buffer.from([255,216,255,0]),redirects:[]});
 await expect(downloadDirectMedia({url:'https://example.com/a.jpg',authorized:true})).rejects.toThrow('content type');
});
it('recognizes supported video headers without treating AVIF as MP4',()=>{
 expect(mediaType(Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom')])).mime).toBe('video/mp4');
 expect(()=>mediaType(Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypavif')]))).toThrow();
 expect(mediaType(Buffer.concat([Buffer.from([26,69,223,163]),Buffer.from('webm')])).mime).toBe('video/webm');
});
it('rejects non-success and empty upstream responses',async()=>{
 for(const status of [403,404,500]){
 vi.mocked(safeFetch).mockResolvedValue({url:'https://example.com/a.png',status,headers:{},body:Buffer.alloc(0),redirects:[]});
 await expect(downloadDirectMedia({url:'https://example.com/a.png',authorized:true})).rejects.toThrow(`HTTP ${status}`);
 }
 vi.mocked(safeFetch).mockResolvedValue({url:'https://example.com/a.png',status:200,headers:{},body:Buffer.alloc(0),redirects:[]});
 await expect(downloadDirectMedia({url:'https://example.com/a.png',authorized:true})).rejects.toThrow('empty');
});
