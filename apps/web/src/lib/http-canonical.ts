// Adapted from every-app/open-seo, site-audit-workflow-helpers.ts.
// Copyright (c) 2026 Ben Senescu. MIT; full license: third_party/open-seo/LICENSE.
// Keep commas inside a URL and accept relation lists; never fetch the target.
export function parseLinkHeaderCanonical(header:string|null|undefined,pageUrl:string):string|null{
 if(!header || header.length>16384)return null;
 const parts=header.matchAll(/<([^<>]+)>\s*;([^]*?)(?=,\s*<|$)/g);
 for(const match of parts){
  const rel=match[2].match(/(?:^|;)\s*rel\s*=\s*(?:"([^"]*)"|([^;\s,]+))/i);
  const names=(rel?.[1]||rel?.[2]||'').toLowerCase().split(/\s+/);
  if(!names.includes('canonical'))continue;
  try{const target=new URL(match[1].trim(),pageUrl);if(['http:','https:'].includes(target.protocol)&&!target.username&&!target.password)return target.href;}catch{}
 }
 return null;
}
