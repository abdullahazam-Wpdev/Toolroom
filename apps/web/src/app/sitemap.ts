import type { MetadataRoute } from "next";
import { origin } from "@/lib/seo";
import { tools, categories, toolHref } from "@/lib/catalog";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/tools",
    "/guides",
    ...categories
      .filter((c) =>
        tools.some(
          (tool) => tool.category === c.slug && tool.status === "available",
        ),
      )
      .map((c) => "/" + c.slug),
    ...tools.filter((t) => t.status === "available").map(toolHref),
  ].map((path) => ({ url: origin + path, changeFrequency: "weekly" as const }));
}
