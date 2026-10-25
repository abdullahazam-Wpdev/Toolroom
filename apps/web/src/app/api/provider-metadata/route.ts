import { z } from 'zod';
import { boundedJson,takeQuota } from '@/lib/request-guard';
import { providerMetadata } from '@/lib/provider-metadata';
export const runtime='nodejs';
export async function POST(request:Request){try{takeQuota('provider-metadata',6);const input=z.object({url:z.string().url().max(2048)}).parse(await boundedJson(request,4096));return Response.json(await providerMetadata(input.url),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'Provider unavailable.'},{status:400});}}
