import { rateLimitResponse } from "@/lib/request-guard";
import { z } from "zod";
import { runAudit, analyzeHtml, scoreAudit } from "@/lib/audit";
import { publicUrl } from "@/lib/safe-fetch";
import { boundedJson, takeQuota } from "@/lib/request-guard";
export const runtime = "nodejs";
const schema = z.object({
  url: z.string().url().max(2048),
  html: z.string().max(200000).optional(),
});
let active = 0;
export async function POST(request: Request) {
  try {
    takeQuota("audit", 12);
    if (active >= 2)
      return Response.json(
        { error: "The audit service is busy. Retry shortly." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const input = schema.parse(await boundedJson(request));
    publicUrl(input.url);
    active++;
    try {
      if (input.html !== undefined) {
        const report = analyzeHtml(input.html, input.url);
        return Response.json(
          {
            ...report,
            scores: scoreAudit(report.checks),
            auxiliary: [],
            httpStatus: null,
            coverage:
              "Pasted static HTML. No network, response headers, robots.txt, sitemap, rendered JavaScript, resource sizes or broken links tested.",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return Response.json(await runAudit(input.url), {
        headers: { "Cache-Control": "no-store" },
      });
    } finally {
      active--;
    }
  } catch (error) { const limited = rateLimitResponse(error); if (limited) return limited;
    const message = error instanceof Error ? error.message : "Audit failed.";
    return Response.json(
      { error: message },
      { status: message.includes("limit reached") ? 429 : 400 },
    );
  }
}
