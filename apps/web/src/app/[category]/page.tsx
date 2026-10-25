import { notFound } from "next/navigation";
import Link from "next/link";
import { categories, tools } from "@/lib/catalog";
import { Catalog } from "@/components/catalog";
import { metadata } from "@/lib/seo";
const pages: Record<string, { title: string; text: string }> = {
  about: {
    title: "Thoughtful tools for everyday work.",
    text: "Toolroom is an independent tools platform in active development. Our first milestone is reliable image conversion, with a documented path toward SEO, video and social utilities. We publish availability honestly and keep processing controls straightforward.",
  },
  contact: {
    title: "Get in touch",
    text: "A public support channel has not been configured yet. During development, report bugs through the project repository or directly to the operator. Public launch requires a verified support address.",
  },
  privacy: {
    title: "Privacy and file handling",
    text: "JPEG images are uploaded to the Toolroom server and processed in memory by Sharp. This version does not persist uploads or results, or forward files to third-party processing APIs. Request metadata may appear in infrastructure logs. Favorites and recent tool names are saved locally only when you opt in, and can be removed by disabling that option in the directory. No advertising or analytics trackers are enabled. This is a development policy and requires operator identity, contact details and jurisdiction review before public launch.",
  },
  terms: {
    title: "Terms of use",
    text: "Use only files you have permission to process. Review output before relying on it: lossy conversion can change image detail and results may be larger. The service is in development, without uptime guarantees. Do not use it to process unlawful content or attempt to disrupt infrastructure. Operator identity, jurisdiction and formal terms require review before public launch.",
  },
  copyright: {
    title: "Copyright and reporting",
    text: "You retain your rights in files you upload and must have permission to process them. Toolroom does not offer a redistributable media library. A designated copyright contact and jurisdiction-specific reporting process must be configured before launch; do not send sensitive claims through an unverified channel.",
  },
  marketplace: {
    title: "A marketplace, when it’s ready.",
    text: "Original templates and legally redistributable resources are a future phase. No products, purchases or paid downloads are available today.",
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = categories.find((c) => c.slug === category);
  const p = pages[category];
  return metadata(
    c?.name || p?.title || "Not found",
    c?.description || p?.text.slice(0, 155) || "Page not found",
    "/" + category,
    !!c &&
      tools.some(
        (tool) => tool.category === category && tool.status === "available",
      ),
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = categories.find((c) => c.slug === category);
  if (c)
    return (
      <section className="section page-section">
        <nav className="breadcrumbs">
          <Link href="/tools">All tools</Link>
          <span>/</span>
          <span>{c.name}</span>
        </nav>
        <div className="eyebrow">THE COLLECTION</div>
        <h1>{c.name}</h1>
        <p className="lead">{c.description}</p>
        <Catalog initialCategory={category} />
      </section>
    );
  const p = pages[category];
  if (!p) notFound();
  return (
    <article className="section prose page-section">
      <div className="eyebrow">TOOLROOM</div>
      <h1>{p.title}</h1>
      <p>{p.text}</p>
      <Link className="text-link" href="/tools">
        Explore the tool directory →
      </Link>
    </article>
  );
}
