import { rateLimitResponse } from "@/lib/request-guard";
import { z } from "zod";
import { auditSite, MAX_CRAWL_PAGES } from "@/lib/site-audit";
import { boundedJson, takeQuota } from "@/lib/request-guard";
export const runtime = "nodejs";
export const maxDuration = 60;
let active = false;
export async function POST(request: Request) {
  try {
    takeQuota("site-audit", 3);
    if (active)
      return Response.json(
        { error: "A crawl is running. Retry shortly." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const input = z
      .object({
        url: z.string().url().max(2048),
        external: z.boolean().default(false),
        maxPages: z.coerce
          .number()
          .int()
          .min(1)
          .max(MAX_CRAWL_PAGES)
          .default(10),
      })
      .parse(await boundedJson(request, 4096));
    active = true;
    try {
      return Response.json(await auditSite(input.url, input), {
        headers: { "Cache-Control": "no-store" },
      });
    } finally {
      active = false;
    }
  } catch (e) {
    const limited = rateLimitResponse(e);
    if (limited) return limited;
    return Response.json(
      { error: e instanceof Error ? e.message : "Crawl failed." },
      { status: 400 },
    );
  }
}
