import {it,expect} from 'vitest';
import {parseLinkHeaderCanonical} from '../apps/web/src/lib/http-canonical';
import {analyzeHtml} from '../apps/web/src/lib/audit';
it('reads relative canonical relation lists while preserving URL commas',()=>{
 expect(parseLinkHeaderCanonical('</en/page?a=1,2>; rel="alternate canonical", </next>; rel="next"','https://example.com/')).toBe('https://example.com/en/page?a=1,2');
 expect(parseLinkHeaderCanonical('<https://example.com/>; REL=canonical','https://other.example')).toBe('https://example.com/');
});
it('rejects malformed, credentialed or non-web canonical targets',()=>{
 for(const value of ['<javascript:alert(1)>; rel=canonical','<https://user:pass@example.com>; rel=canonical','not a link'])expect(parseLinkHeaderCanonical(value,'https://example.com')).toBeNull();
});
it('uses HTTP canonical evidence and reports HTML/header disagreement',()=>{
 const r=analyzeHtml('<html><title>A title</title></html>','https://example.com/page',{status:200,headers:{link:'</main>; rel=canonical'},redirects:[]});expect(r.metadata.canonical).toBe('https://example.com/main');expect(r.metadata.canonicalSource).toBe('http-header');
 const conflict=analyzeHtml('<link rel="canonical" href="/different">','https://example.com/page',{status:200,headers:{link:'</main>; rel=canonical'},redirects:[]});expect(conflict.checks.find(c=>c.id==='canonical')?.status).toBe('warning');expect(conflict.metadata.httpCanonical).toBe('https://example.com/main');
});
