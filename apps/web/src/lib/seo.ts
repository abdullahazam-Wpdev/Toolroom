import type { Metadata } from "next";
export const origin =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export function metadata(
  title: string,
  description: string,
  path: string,
  index = true,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      siteName: "Toolroom",
    },
    robots: { index: index && !origin.includes("localhost"), follow: true },
  };
}
