export * from "../../../../packages/core/registry";
import type { Tool } from "../../../../packages/core/registry";
/**
 * A tool's registry `status` describes what ANY deployment of this
 * codebase needs in general. Whether a self-hosted-infra tool
 * (background-remover, ai-image-upscaler, video-compressor,
 * video-converter) is actually usable on THIS specific running instance
 * depends on whether its operator has configured Postgres/Redis/worker
 * (`MEDIA_JOBS_ENABLED`) — read server-side and passed in here, never
 * assumed. Third-party-API-gated tools (PageSpeed, Semrush) are never
 * "effectively available" this way: their own live key/quota state is
 * surfaced by the tool itself, not a static flag.
 */
export function effectivelyAvailable(tool: Tool, mediaJobsEnabled: boolean) {
  return (
    tool.status === "available" ||
    (mediaJobsEnabled &&
      tool.status === "requires-configuration" &&
      (tool.execution === "queue" || tool.execution === "model"))
  );
}
