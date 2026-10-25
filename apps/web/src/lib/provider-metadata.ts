import { safeFetch } from './safe-fetch';
export function providerTarget(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS video link without credentials or custom ports.');
  const host=url.hostname.replace(/^www\./,'');
  if (['youtube.com','m.youtube.com','youtu.be'].includes(host)) {
    const id=host==='youtu.be'?url.pathname.slice(1):url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1];
    if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Error('Use a YouTube video, Shorts or share link.');
    return {provider:'YouTube',id,url:`https://www.youtube.com/watch?v=${id}`,endpoint:'https://www.youtube.com/oembed'};
  }
  if(host==='vimeo.com'){
    const id=url.pathname.match(/^\/(\d{1,12})$/)?.[1];if(!id)throw new Error('Use a public Vimeo video link.');
    return {provider:'Vimeo',id,url:`https://vimeo.com/${id}`,endpoint:'https://vimeo.com/api/oembed.json'};
  }
  throw new Error('Official public metadata is currently supported for YouTube and Vimeo only. Other providers require approved integrations.');
}
export async function providerMetadata(raw: string, fetcher = safeFetch) {
  const target=providerTarget(raw),query=new URLSearchParams({url:target.url,format:'json'});
  const response=await fetcher(`${target.endpoint}?${query}`,{maxBytes:128*1024,timeoutMs:10000,maxRedirects:0});
  if(response.status!==200)throw new Error(`Provider metadata unavailable (HTTP ${response.status}). The video may be restricted, removed or not embeddable.`);
  const data=JSON.parse(response.body.toString('utf8'));
  const text=(value:unknown)=>typeof value==='string'?value.slice(0,1000):null;
  return {provider:target.provider,id:target.id,url:target.url,title:text(data.title),author:text(data.author_name),source:'Official provider oEmbed',fetchedAt:new Date().toISOString(),views:null,likes:null,downloadSupported:false,note:'oEmbed does not provide view/like counts or authorize media downloads. Provider HTML is not embedded or executed.'};
}
