import { database, tokenHash } from "../../../../../../../packages/jobs/runtime";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request, context: Context) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const job = await database().renderedAuditJob.findUnique({ where: { id } });
  return job && job.tokenHash === tokenHash(token) && job.expiresAt.getTime() > Date.now() ? job : null;
}
export async function GET(request: Request, context: Context) {
  try {
    const job = await authorize(request, context);
    if (!job) return Response.json({ error: "Job not found or expired." }, { status: 404 });
    return Response.json(
      {
        id: job.id,
        status: job.status,
        url: job.url,
        error: job.status === "failed" ? job.error || "Rendered audit failed. Check worker logs." : job.error,
        expiresAt: job.expiresAt,
        report: job.status === "completed" ? job.report : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Job service unavailable." }, { status: 503 });
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const job = await authorize(request, context);
    if (!job) return Response.json({ error: "Job not found or expired." }, { status: 404 });
    // A single render is short (bounded to ~15-30s) and has no mid-run
    // cancellation flag; the only thing worth cancelling is a job still
    // sitting in the queue.
    if (job.status === "queued") {
      await database().renderedAuditJob.update({ where: { id: job.id }, data: { status: "cancelled" } });
      return Response.json({ status: "cancelled" });
    }
    return Response.json({ status: job.status, note: "Already processing or finished; a single render is brief enough that mid-run cancellation isn't supported." });
  } catch {
    return Response.json({ error: "Cancellation service unavailable." }, { status: 503 });
  }
}
