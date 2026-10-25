import { rateLimitResponse } from "@/lib/request-guard";
import { z } from "zod";
import { queryPageSpeed } from "@/lib/pagespeed";
import { boundedJson, takeQuota } from "@/lib/request-guard";
export const runtime = "nodejs";
const schema = z.object({
  url: z.string().url().max(2048),
  strategy: z.enum(["mobile", "desktop"]),
});
let active = 0;
export async function POST(request: Request) {
  try {
    takeQuota("pagespeed", 6);
    if (active >= 2)
      return Response.json(
        { error: "Measurement service is busy. Retry shortly." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const input = schema.parse(await boundedJson(request, 8192));
    active++;
    try {
      return Response.json(await queryPageSpeed(input.url, input.strategy), {
        headers: { "Cache-Control": "no-store" },
      });
    } finally {
      active--;
    }
  } catch (error) { const limited = rateLimitResponse(error); if (limited) return limited;
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "PageSpeed request failed.",
      },
      { status: 502 },
    );
  }
}
