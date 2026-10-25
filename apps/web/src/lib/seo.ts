import type { Metadata } from "next";
import { siteOrigin } from "../../../../packages/core/site-origin";
export const origin = siteOrigin(process.env);
export function metadata(
  title: string,
  description: string,
  path: string,
  index = true,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: new URL(path, origin).href },
    openGraph: {
      title,
      description,
      url: new URL(path, origin).href,
      type: "website",
      siteName: "Toolroom",
    },
    robots: { index: index && !origin.includes("localhost"), follow: true },
  };
}
