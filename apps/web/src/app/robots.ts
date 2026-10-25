import type { MetadataRoute } from "next";
import { origin } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: origin.includes("localhost") ? "/" : ["/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
