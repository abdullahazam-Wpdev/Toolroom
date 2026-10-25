import { rateLimitResponse } from "@/lib/request-guard";
import { z } from "zod";
import { runTechnical, parseRobots, parseSitemap } from "@/lib/technical";
import { publicUrl } from "@/lib/safe-fetch";
import { boundedJson, takeQuota } from "@/lib/request-guard";
export const runtime = "nodejs";
const schema = z.object({
  url: z.string().url().max(2048),
  mode: z.enum(["robots", "sitemap"]),
  text: z.string().max(200000).optional(),
});
export async function POST(request: Request) {
  try {
    takeQuota("technical", 12);
    const input = schema.parse(await boundedJson(request));
    publicUrl(input.url);
    const result =
      input.text !== undefined
        ? {
            url: input.url,
            status: null,
            mode: input.mode,
            result:
              input.mode === "robots"
                ? parseRobots(input.text)
                : parseSitemap(input.text),
          }
        : await runTechnical(input.url, input.mode);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { const limited = rateLimitResponse(e); if (limited) return limited;
    return Response.json(
      { error: e instanceof Error ? e.message : "Document check failed." },
      { status: 400 },
    );
  }
}
