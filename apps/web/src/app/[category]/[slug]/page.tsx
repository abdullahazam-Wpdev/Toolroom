import { LocalToolGuide } from "@/components/local-tool-guide";
import { PdfTool } from "@/components/pdf-tool";
import { DeveloperTool } from "@/components/developer-tool";
import { CategoryIcon } from "@/components/icon";
import type { PdfOperation } from "@/lib/pdf-tools";
import type { DeveloperId } from "@/lib/developer-tools";
import { storageConfigured } from "../../../../../../packages/storage/s3";
import { inlineImageLimit } from "../../../../../../packages/core/upload-limits";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  tools,
  toolHref,
  categories,
  effectivelyAvailable,
} from "@/lib/catalog";
import { metadata, origin } from "@/lib/seo";
import { MediaJobTool } from "@/components/media-job-tool";
import { Converter } from "@/components/converter";
import { SiteAuditTool } from "@/components/site-audit-tool";
import { CrawlJobTool } from "@/components/crawl-job-tool";
import { RenderedAuditTool } from "@/components/rendered-audit-tool";
import { AuditTool } from "@/components/audit-tool";
import { PageSpeedTool } from "@/components/pagespeed-tool";
import { ProviderMetadataTool } from "@/components/provider-metadata-tool";
import { SocialTool } from "@/components/social-tool";
import { SemrushTool } from "@/components/semrush-tool";
import { AdPlacement } from "@/components/ad-placement";
import { ToolActions } from "@/components/tool-actions";
import { DirectMediaTool } from "@/components/direct-media-tool";
import { TechnicalTool } from "@/components/technical-tool";
import {
  imageToolConfig,
  type ImageToolId,
} from "../../../../../../packages/core/image-tools";
import { Clock3, ArrowUpRight } from "lucide-react";
type Props = { params: Promise<{ category: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await params;
  const t = tools.find((t) => t.id === p.slug && t.category === p.category);
  return metadata(
    t?.name || "Tool not found",
    t?.description || "This tool could not be found.",
    `/${p.category}/${p.slug}`,
    Boolean(t) &&
      effectivelyAvailable(t!, process.env.MEDIA_JOBS_ENABLED === "true"),
  );
}
export default async function Page({ params }: Props) {
  const { category, slug } = await params;
  const tool = tools.find((t) => t.id === slug && t.category === category);
  if (!tool) notFound();
  const storedImages =
    storageConfigured() &&
    Boolean(process.env.REDIS_URL?.match(/^rediss?:\/\//));
  const imageMaxBytes = storedImages ? 10 * 1024 * 1024 : inlineImageLimit();
  const name = categories.find((c) => c.slug === category)?.name;
  const isMediaJob = [
    "video-compressor",
    "video-converter",
    "background-remover",
    "ai-image-upscaler",
  ].includes(tool.id);
  // Media-job tools are now verified working code gated by operator
  // infrastructure (Postgres/Redis/worker/model weights), the same
  // "requires-configuration" shape as PageSpeed/Semrush below: the real
  // component always renders, and the API itself reports "Background worker
  // is not enabled on this installation." when MEDIA_JOBS_ENABLED isn't set.
  const available = tool.status !== "planned";
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Tools",
        item: origin + "/tools",
      },
      { "@type": "ListItem", position: 2, name, item: origin + "/" + category },
      {
        "@type": "ListItem",
        position: 3,
        name: tool.name,
        item: origin + toolHref(tool),
      },
    ],
  };
  return (
    <section className="section page-section tool-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(crumbs).replace(/</g, "\u003c"),
        }}
      />
      {available && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: tool.name,
              description: tool.description,
              applicationCategory:
                category === "image-tools"
                  ? "MultimediaApplication"
                  : "DeveloperApplication",
              operatingSystem: "Web browser",
              url: origin + toolHref(tool),
            }).replace(/</g, "\u003c"),
          }}
        />
      )}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/tools">All tools</Link>
        <span>/</span>
        <Link href={"/" + category}>{name}</Link>
        <span>/</span>
        <span>{tool.name}</span>
      </nav>
      <div className="eyebrow">
        {tool.status === "requires-configuration" &&
        !(isMediaJob && process.env.MEDIA_JOBS_ENABLED === "true")
          ? tool.id === "semrush-keyword-metrics"
            ? "API ACCESS REQUIRED"
            : isMediaJob
              ? "SELF-HOSTED SETUP REQUIRED"
              : "API QUOTA REQUIRED"
          : available
            ? "READY WHEN YOU ARE"
            : "ON THE ROADMAP"}
      </div>
      <div className="tool-title-row">
        <h1>{tool.name}</h1>
        <ToolActions />
      </div>
      <p className="lead">{tool.description}</p>
      {available ? (
        category === "pdf-tools" ? (
          <PdfTool key={tool.id} operation={tool.id as PdfOperation} />
        ) : category === "developer-tools" ? (
          <DeveloperTool key={tool.id} tool={tool.id as DeveloperId} />
        ) : tool.id === "social-media-inspector" ? (
          <ProviderMetadataTool />
        ) : isMediaJob ? (
          <MediaJobTool
            key={tool.id}
            kind={tool.id}
            useStorage={storedImages}
            enabled={process.env.MEDIA_JOBS_ENABLED === "true"}
          />
        ) : tool.id in imageToolConfig ? (
          <Converter
            key={tool.id}
            tool={tool.id as ImageToolId}
            maxBytes={imageMaxBytes}
            useStorage={storedImages}
          />
        ) : tool.id === "semrush-keyword-metrics" ? (
          <SemrushTool />
        ) : tool.id === "pagespeed-checker" ? (
          <PageSpeedTool />
        ) : tool.id === "direct-media-downloader" ? (
          <DirectMediaTool maxMiB={inlineImageLimit() / 1024 / 1024} />
        ) : tool.id === "social-url-inspector" ? (
          <SocialTool />
        ) : tool.id === "robots-txt-checker" ||
          tool.id === "sitemap-validator" ? (
          <TechnicalTool
            key={tool.id}
            mode={tool.id === "robots-txt-checker" ? "robots" : "sitemap"}
          />
        ) : (
          <AuditTool
            key={tool.id}
            view={
              tool.id === "meta-tag-analyzer"
                ? "metadata"
                : tool.id === "heading-checker"
                  ? "headings"
                  : "audit"
            }
          />
        )
      ) : (
        <div className="planned-panel">
          <Clock3 size={27} />
          <div>
            <h2>This tool is in the plan.</h2>
            <p>
              Processing is not available yet.{" "}
              {tool.execution === "model"
                ? "This feature needs a licensed, separately deployed AI model worker."
                : tool.execution === "queue"
                  ? "This feature needs an isolated background worker and resource limits."
                  : "We are building and testing the required integration before enabling it."}
            </p>
            <Link className="button outline" href="/image-tools/jpg-to-webp">
              Try JPG to WebP
            </Link>
          </div>
        </div>
      )}
      {tool.id === "website-seo-checker" && <SiteAuditTool />}
      {tool.id === "website-seo-checker" && <CrawlJobTool />}
      {tool.id === "website-seo-checker" && <RenderedAuditTool />}
      {available && tool.id === "jpg-to-webp" && (
        <>
          <div className="tool-explainer">
            <div>
              <h2>Web-ready images, with you in control.</h2>
              <p>
                Convert JPEG photographs into WebP images using a real encoder.
                Choose quality and dimensions, inspect the preview and compare
                actual file sizes before downloading. Results can be larger than
                the original; size savings are never guaranteed.
              </p>
              <h3>How to convert JPG to WebP</h3>
              <ol>
                <li>Choose or drop up to ten JPEG images.</li>
                <li>
                  Set quality and optional dimensions. Preserve aspect ratio for
                  a natural fit.
                </li>
                <li>
                  Convert your batch and download individual images or a ZIP.
                </li>
              </ol>
            </div>
            <aside>
              <h3>Know the limits</h3>
              <p>
                {imageMaxBytes / 1024 / 1024} MiB per image. Up to 24 million
                pixels and 8,000 pixels on either edge. JPEG inputs only.
                Animated files and SVG are not supported. Metadata is removed by
                default, and orientation is applied.
              </p>
              <Link href="/guides" className="text-link">
                Read the conversion guide <ArrowUpRight size={16} />
              </Link>
            </aside>
          </div>
          <div className="tool-faq">
            <h2>Questions about the conversion?</h2>
            <details>
              <summary>Will this preserve every detail?</summary>
              <p>
                WebP conversion defaults to lossy encoding. Enable lossless WebP
                to preserve decoded pixels. Higher lossy quality keeps more
                detail but usually increases file size. Always inspect your
                output.
              </p>
            </details>
            <details>
              <summary>Are my files stored?</summary>
              <p>
                Files are uploaded to our server and processed in memory for the
                request. This version does not save them to disk or send them to
                third-party APIs.
              </p>
            </details>
            <details>
              <summary>Why is my output larger?</summary>
              <p>
                An already optimized JPEG or a high quality setting can produce
                a larger WebP. Try reducing quality or dimensions and compare
                the actual result.
              </p>
            </details>
          </div>
        </>
      )}
      {available && tool.execution === "browser" && (
        <LocalToolGuide id={tool.id} name={tool.name} />
      )}
      {available && <AdPlacement />}
      {available &&
        tool.id !== "jpg-to-webp" &&
        tool.id !== "direct-media-downloader" &&
        tool.id !== "semrush-keyword-metrics" &&
        tool.execution !== "browser" && (
          <div className="tool-explainer">
            <div>
              <h2>{tool.name}: what to expect</h2>
              <p>{tool.description}</p>
              <h3>How to use this tool</h3>
              <ol>
                {(category === "image-tools"
                  ? [
                      "Choose compatible images or drop them into the upload area.",
                      "Set the output controls for your task and process the batch.",
                      "Inspect the actual before/after preview and download individual files or a ZIP.",
                    ]
                  : tool.id === "social-url-inspector"
                    ? [
                        "Paste a link from a supported social platform.",
                        "Inspect the identified hostname and path.",
                        "Review provider limitations; no media is downloaded by this inspector.",
                      ]
                    : [
                        "Enter a public URL, or choose pasted source when available.",
                        "Run the check and read the observed evidence and coverage notes.",
                        "Review recommendations in context; download PDF/JSON for the full SEO audit.",
                      ]
                ).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <aside>
              <h3>Limits and privacy</h3>
              <p>
                {category === "image-tools"
                  ? `JPEG, PNG, WebP, AVIF, GIF and TIFF operations accept up to 10 images per batch and ${imageMaxBytes / 1024 / 1024} MiB per image, subject to the specific tool’s format requirements. Maximum 24 megapixels and 8,000 pixels per edge. PNG and LZW TIFF encoding are lossless; GIF uses a limited palette. JPEG/WebP/AVIF quality controls can change details. Metadata is stripped by default (optional retention), orientation applied, and images are not enlarged. Inputs are processed in server memory; direct storage uploads use private temporary objects when configured.`
                  : tool.id === "pagespeed-checker"
                    ? "The submitted URL is sent to Google’s PageSpeed Insights service. API quotas, availability and field-data coverage apply. Lab scores are measurements, not ranking guarantees. API keys remain on the server."
                    : tool.id === "social-url-inspector"
                      ? "Runs locally without fetching content. Platform identification does not verify that a post exists, establish ownership, or grant download permission."
                      : "Static HTML or technical-document analysis has explicit response and time limits. Private networks, reserved IPs, credentials and nonstandard ports are blocked. No rendering or whole-site crawl is implied. A custom diagnostic score does not predict rankings."}
              </p>
              <h3>Is every check performed?</h3>
              <p>
                Read the result’s evidence and coverage. Missing measurements
                are shown as Not tested; empty or unavailable data is never
                treated as a passed check.
              </p>
            </aside>
          </div>
        )}
      <div className="related">
        <h2>Also in {name?.toLowerCase()}</h2>
        <div>
          {tools
            .filter((t) => t.category === category && t.id !== slug)
            .slice(0, 3)
            .map((t) => (
              <Link key={t.id} href={toolHref(t)}>
                <span className={"tool-icon " + t.category}>
                  <CategoryIcon category={t.category} />
                </span>
                {t.name}
                <span>
                  {t.status === "available"
                    ? "Available"
                    : t.status === "requires-configuration"
                      ? "API quota required"
                      : "Planned"}{" "}
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
