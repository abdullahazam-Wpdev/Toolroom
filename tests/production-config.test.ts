import{describe,it,expect,vi,afterEach}from'vitest';
import{siteOrigin}from'../packages/core/site-origin';
import{inlineImageLimit}from'../packages/core/upload-limits';
import{takeQuota,rateLimitResponse}from'../apps/web/src/lib/request-guard';
afterEach(()=>vi.unstubAllEnvs());
describe('Production configuration',()=>{
 it('normalizes the configured canonical origin and safely defaults only the known production deployment',()=>{expect(siteOrigin({NEXT_PUBLIC_SITE_URL:'https://toolroom-woad.vercel.app/'})).toBe('https://toolroom-woad.vercel.app');expect(siteOrigin({VERCEL_ENV:'production'})).toBe('https://toolroom-woad.vercel.app');expect(()=>siteOrigin({VERCEL_ENV:'production',NEXT_PUBLIC_SITE_URL:'http://localhost:3000'})).toThrow();expect(()=>siteOrigin({NEXT_PUBLIC_SITE_URL:'https://example.com/path'})).toThrow();expect(siteOrigin({})).toBe('http://localhost:3000');});
 it('uses a 4 MiB inline image cap on Vercel while retaining the 10 MiB self-hosted engine',()=>{vi.stubEnv('VERCEL','1');expect(inlineImageLimit()).toBe(4194304);vi.stubEnv('VERCEL','');expect(inlineImageLimit()).toBe(10485760);});
 it('returns 429 and remaining-window Retry-After for a genuine quota error',()=>{takeQuota('test-production-429',1,30000);try{takeQuota('test-production-429',1,30000);throw new Error('Expected limit');}catch(e){const response=rateLimitResponse(e)!;expect(response.status).toBe(429);expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);expect(Number(response.headers.get('Retry-After'))).toBeLessThanOrEqual(30);}expect(rateLimitResponse(new Error('Bad input'))).toBeNull();});
});
