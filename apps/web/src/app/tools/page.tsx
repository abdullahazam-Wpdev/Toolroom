import { Catalog } from "@/components/catalog";
import { metadata } from "@/lib/seo";
export const generateMetadata = () =>
  metadata(
    "All tools",
    "Search the Toolroom catalog, filter by category and see which utilities are available today.",
    "/tools",
  );
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <section className="section page-section">
      <div className="eyebrow">YOUR TOOLBOX</div>
      <h1>Find a little more flow.</h1>
      <p className="lead">
        Search the collection. Available tools and the roadmap, clearly
        separated.
      </p>
      <Catalog initialQuery={q.slice(0, 200)} mediaJobsEnabled={process.env.MEDIA_JOBS_ENABLED === "true"} />
    </section>
  );
}
