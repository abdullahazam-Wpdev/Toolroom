import {it,expect} from 'vitest';
import sharp from 'sharp';
import {processImage,inputFormat,imageFormats} from '../apps/web/src/lib/image';
it.each(imageFormats)('decodes %s input and produces all six advertised formats',async sourceFormat=>{
 const source=await sharp({create:{width:48,height:32,channels:3,background:'#7862ab'}}).toFormat(sourceFormat).toBuffer();
 expect(inputFormat(source)).toBe(sourceFormat);
 for(const format of imageFormats){const result=await processImage(source,{tool:'image-converter',format});const meta=await sharp(result.data).metadata();expect(meta.format).toBe(format==='avif'?'heif':format);expect([meta.width,meta.height]).toEqual([48,32]);expect(result.mime).toBe(`image/${format}`);expect((await sharp(result.data).raw().toBuffer()).length).toBeGreaterThan(0);}
});
it('rejects animated GIF instead of silently flattening it',async()=>{
 const frames=Buffer.from('47494638396101000100800000000000ffffff21f90400000000002c000000000100010000020244010021f90400000000002c00000000010001000002024401003b','hex');
 expect((await sharp(frames).metadata()).pages).toBe(2);
 await expect(processImage(frames,{tool:'image-converter'})).rejects.toThrow('Animated and multipage');
});
it('does not confuse a HEIC brand or arbitrary documents with AVIF',()=>{
 expect(()=>inputFormat(Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypheic'),Buffer.alloc(12)]))).toThrow('valid JPEG');
 expect(()=>inputFormat(Buffer.from('%PDF-1.7'))).toThrow();
});
