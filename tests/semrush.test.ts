import {it,expect,vi,afterEach} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules()});
const fixture={meta:{success:true,status_code:200},data:{search_volume:'60500',keyword_difficulty:74,competitive_density:78,cpc:'1245'}};
async function setup(){vi.stubEnv('SEMRUSH_ENABLED','true');vi.stubEnv('SEMRUSH_API_KEY','test-server-secret');vi.stubEnv('SEMRUSH_DAILY_UNIT_BUDGET','40');return await import('../apps/web/src/lib/semrush');}
it('never contacts the provider without configuration or explicit unit confirmation',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const m=await import('../apps/web/src/lib/semrush');vi.stubEnv('SEMRUSH_ENABLED','false');await expect(m.keywordMetrics({keyword:'image',country:'US',confirmUnits:true})).rejects.toThrow('No request was sent');expect(fetch).not.toHaveBeenCalled();
});
it('uses official v4 header auth, fixed endpoint, same-day cache and deduplicated requests',async()=>{
 const m=await setup();const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture)));vi.stubGlobal('fetch',fetch);
 await expect(m.keywordMetrics({keyword:'image',country:'US',confirmUnits:false})).rejects.toThrow();
 const [a,b]=await Promise.all([m.keywordMetrics({keyword:'image',country:'US',confirmUnits:true}),m.keywordMetrics({keyword:'image',country:'US',confirmUnits:true})]);
 expect(fetch).toHaveBeenCalledTimes(1);expect(String(fetch.mock.calls[0][0])).toContain('https://api.semrush.com/apis/v4/keywords/v1/metrics?');expect(String(fetch.mock.calls[0][0])).not.toContain('secret');expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Apikey test-server-secret');expect(a.data.search_volume).toBe('60500');expect(a.actualBilledUnits).toBeNull();expect(b.cached).toBe(true);expect(b.estimatedRequestUnits).toBe(0);
 expect((await m.keywordMetrics({keyword:'IMAGE',country:'US',confirmUnits:true})).cached).toBe(true);
});
it('reserves a bounded budget even on failures, without automatic retries',async()=>{
 const m=await setup();const fetch=vi.fn().mockImplementation(()=>Promise.resolve(new Response('quota',{status:429})));vi.stubGlobal('fetch',fetch);
 for(const keyword of ['a','b'])await expect(m.keywordMetrics({keyword,country:'US',confirmUnits:true})).rejects.toThrow('HTTP 429');
 await expect(m.keywordMetrics({keyword:'c',country:'US',confirmUnits:true})).rejects.toThrow('budget');expect(fetch).toHaveBeenCalledTimes(2);
});
it('rejects invalid provider responses instead of inventing metrics',async()=>{
 const m=await setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"data":{}}')));await expect(m.keywordMetrics({keyword:'a',country:'US',confirmUnits:true})).rejects.toThrow('successful keyword report');
});
