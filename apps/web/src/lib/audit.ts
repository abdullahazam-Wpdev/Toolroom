import { additionalSeoEvidence } from "./seo-evidence.ts";
import { parseLinkHeaderCanonical } from "./http-canonical.ts";
import { load } from "cheerio";
import { safeFetch, type NetworkResponse } from "./safe-fetch.ts";
export const auditWeights = {
  technical: 30,
  metadata: 20,
  structure: 15,
  links: 15,
  images: 10,
  social: 10,
} as const;
type Group = keyof typeof auditWeights;
type Status = "pass" | "warning" | "critical" | "not-tested";
export type Check = {
  id: string;
  category: Group;
  title: string;
  status: Status;
  evidence: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
  effort: "small" | "medium";
};
export function analyzeHtml(
  html: string,
  url: string,
  network?: Pick<NetworkResponse, "status" | "headers" | "redirects">,
) {
  const $ = load(html);
  const checks: Check[] = [];
  const attr = (selector: string, name: string) =>
    $(selector).first().attr(name) || "";
  const meta = (name: string) =>
    $(`meta[name="${name}" i]`).first().attr("content") || "";
  const resolve = (raw: string) => {
    try {
      return new URL(raw, url).href;
    } catch {
      return null;
    }
  };
  const check = (
    id: string,
    category: Group,
    title: string,
    status: Status,
    evidence: string,
    recommendation: string,
    priority: Check["priority"] = "medium",
  ) =>
    checks.push({
      id,
      category,
      title,
      status,
      evidence,
      recommendation,
      priority,
      effort: "small",
    });
  const title = $("title").first().text().trim(),
    description = meta("description"),
    robots = meta("robots"),
    htmlCanonical = attr('link[rel~="canonical" i]', "href"),
    httpCanonical = parseLinkHeaderCanonical(network?.headers.link, url),
    canonical = htmlCanonical || httpCanonical || "",
    language = attr("html", "lang");
  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, e) => ({
      level: Number(e.tagName[1]),
      text: $(e).text().replace(/\s+/g, " ").trim(),
    }))
    .get();
  const links = $("a[href]")
    .map((_, e) => {
      const el = $(e),
        href = resolve(el.attr("href") || "");
      return {
        href,
        text: el.text().replace(/\s+/g, " ").trim(),
        rel: (el.attr("rel") || "").toLowerCase().split(/\s+/).filter(Boolean),
        internal: href ? new URL(href).origin === new URL(url).origin : false,
      };
    })
    .get();
  const images = $("img")
    .map((_, e) => {
      const el = $(e),
        alt = el.attr("alt");
      return {
        src: resolve(el.attr("src") || ""),
        alt: alt ?? null,
        decorative:
          alt === "" &&
          (el.attr("role") === "presentation" ||
            el.attr("aria-hidden") === "true"),
        width: el.attr("width") || null,
        height: el.attr("height") || null,
        loading: el.attr("loading") || null,
        format: (el.attr("src") || "").split("?")[0].split(".").pop() || null,
      };
    })
    .get();
  const structured = $('script[type="application/ld+json" i]')
    .map((_, e) => {
      const text = $(e).text();
      try {
        const value = JSON.parse(text);
        const entries = Array.isArray(value) ? value : [value];
        return {
          valid: true,
          types: entries.flatMap((v) =>
            v && typeof v === "object"
              ? v["@type"]
                ? [v["@type"]]
                : Array.isArray(v["@graph"])
                  ? v["@graph"]
                      .map((n: Record<string, unknown>) => n["@type"])
                      .filter(Boolean)
                  : []
              : [],
          ),
          error: null,
        };
      } catch {
        return { valid: false, types: [], error: "Invalid JSON syntax" };
      }
    })
    .get();
  const social = $('meta[property^="og:"],meta[name^="twitter:"]')
    .map((_, e) => ({
      name: $(e).attr("property") || $(e).attr("name"),
      content: $(e).attr("content") || "",
    }))
    .get();
  const hreflang = $('link[rel~="alternate" i][hreflang]')
    .map((_, e) => ({
      lang: $(e).attr("hreflang") || "",
      href: resolve($(e).attr("href") || ""),
    }))
    .get();
  check(
    "title",
    "metadata",
    "Page title",
    title ? "pass" : "critical",
    title || "No title found.",
    "Write a specific title describing this page.",
    "high",
  );
  check(
    "title-length",
    "metadata",
    "Title length",
    title.length >= 15 && title.length <= 65 ? "pass" : "warning",
    `${title.length} characters. This is an editorial guideline, not a Google limit.`,
    "Review clarity and likely snippet truncation.",
  );
  check(
    "description",
    "metadata",
    "Meta description",
    description ? "pass" : "warning",
    description || "No meta description found.",
    "Add a useful page-specific description.",
  );
  check(
    "description-length",
    "metadata",
    "Description length",
    description.length >= 70 && description.length <= 170 ? "pass" : "warning",
    `${description.length} characters; search snippets vary.`,
    "Review description usefulness and length.",
  );
  check(
    "canonical",
    "metadata",
    "Canonical declaration",
    canonical &&
      !(
        htmlCanonical &&
        httpCanonical &&
        resolve(htmlCanonical) !== httpCanonical
      )
      ? "pass"
      : "warning",
    htmlCanonical && httpCanonical && resolve(htmlCanonical) !== httpCanonical
      ? `HTML canonical ${resolve(htmlCanonical)} differs from HTTP Link canonical ${httpCanonical}.`
      : canonical || "No canonical declared.",
    "Review canonical intent; missing canonicals do not automatically cause a ranking penalty.",
  );
  const h1 = headings.filter((h) => h.level === 1);
  check(
    "h1",
    "structure",
    "Primary heading",
    h1.length === 1 ? "pass" : "warning",
    `${h1.length} H1 elements. Multiple H1s are not automatically a ranking penalty.`,
    "Use a clear primary topic and intentional hierarchy.",
  );
  check(
    "empty-headings",
    "structure",
    "Heading text",
    headings.some((h) => !h.text) ? "warning" : "pass",
    `${headings.filter((h) => !h.text).length} empty headings.`,
    "Give structural headings meaningful text.",
  );
  // Rule adapted from SEONaut internal/issues/page/headings.go (MIT); see third-party notices.
  const jumps = headings.filter(
    (h, i) => h.level > (i ? headings[i - 1].level : 0) + 1,
  );
  check(
    "heading-order",
    "structure",
    "Heading hierarchy",
    jumps.length ? "warning" : "pass",
    jumps.map((h) => `H${h.level}: ${h.text}`).join("; ") ||
      "No skipped heading levels found.",
    "Organize headings by document structure.",
  );
  check(
    "language",
    "technical",
    "Document language",
    language ? "pass" : "warning",
    language || "HTML lang attribute is missing.",
    "Declare the document language.",
  );
  check(
    "viewport",
    "technical",
    "Viewport declaration",
    meta("viewport") ? "pass" : "warning",
    meta("viewport") || "No viewport metadata.",
    "Use a responsive viewport appropriate to the layout.",
  );
  check(
    "https",
    "technical",
    "HTTPS URL",
    new URL(url).protocol === "https:" ? "pass" : "warning",
    url,
    "Serve the public site over HTTPS.",
    "high",
  );
  const noindex = /\b(noindex|none)\b/i.test(
    robots + " " + (network?.headers["x-robots-tag"] || ""),
  );
  check(
    "indexability",
    "technical",
    "Robots indexability indicator",
    noindex ? "warning" : network ? "pass" : "not-tested",
    `Meta: ${robots || "not declared"}; X-Robots-Tag: ${network?.headers["x-robots-tag"] || "not observed"}. This does not establish indexing.`,
    "Confirm that noindex is intentional.",
    "high",
  );
  check(
    "status",
    "technical",
    "HTTP status",
    network
      ? network.status >= 200 && network.status < 300
        ? "pass"
        : "critical"
      : "not-tested",
    network
      ? String(network.status)
      : "HTML-only analysis; HTTP status not tested.",
    "Resolve unexpected HTTP errors.",
    "high",
  );
  check(
    "security",
    "technical",
    "Basic security headers",
    network
      ? network.headers["content-security-policy"] &&
        network.headers["x-content-type-options"]
        ? "pass"
        : "warning"
      : "not-tested",
    network
      ? `CSP: ${network.headers["content-security-policy"] ? "present" : "absent"}; nosniff: ${network.headers["x-content-type-options"] || "absent"}`
      : "Headers were not supplied.",
    "Review security headers; this is not a ranking score.",
  );
  check(
    "anchor-text",
    "links",
    "Link text",
    links.some((l) => !l.text) ? "warning" : "pass",
    `${links.filter((l) => !l.text).length} links have no visible text; image/ARIA names need manual review.`,
    "Give links an accessible descriptive name.",
  );
  const mixed = links.filter(
    (l) => l.href?.startsWith("http:") && url.startsWith("https:"),
  );
  check(
    "http-links",
    "links",
    "HTTP link destinations",
    mixed.length ? "warning" : "pass",
    `${mixed.length} HTTP destinations on an HTTPS page. Links alone are not mixed-content subresources.`,
    "Prefer HTTPS destinations when supported.",
  );
  check(
    "alt",
    "images",
    "Image alternatives",
    images.some((i) => i.alt === null) ? "warning" : "pass",
    `${images.filter((i) => i.alt === null).length} missing alt; ${images.filter((i) => i.alt === "").length} empty alt. Empty alt may be intentional for decorative images.`,
    "Describe meaningful images and explicitly mark decorative images.",
  );
  check(
    "dimensions",
    "images",
    "Image dimension attributes",
    images.some((i) => !i.width || !i.height) ? "warning" : "pass",
    `${images.filter((i) => !i.width || !i.height).length} images lack width or height attributes; CSS may reserve space.`,
    "Reserve image space to reduce layout shifts.",
  );
  check(
    "schema",
    "social",
    "Structured data JSON",
    structured.length
      ? structured.every((s) => s.valid)
        ? "pass"
        : "warning"
      : "warning",
    `${structured.length} JSON-LD blocks; ${structured.filter((s) => !s.valid).length} have invalid JSON. This is not full schema/rich-results validation.`,
    "Use accurate schema and validate against the supported schema requirements.",
  );
  check(
    "social",
    "social",
    "Social metadata",
    social.some((s) => s.name === "og:title") ? "pass" : "warning",
    `${social.length} Open Graph/Twitter tags.`,
    "Supply relevant social title, description and preview metadata.",
    "low",
  );
  for (const [id, category, title, reason] of [
    [
      "broken-links",
      "links",
      "Broken link verification",
      "Link destinations have not been fetched.",
    ],
    [
      "image-bytes",
      "images",
      "Image resource size",
      "Image files have not been downloaded or measured.",
    ],
    [
      "rendering",
      "technical",
      "Rendered JavaScript content",
      "This report inspects static HTML only.",
    ],
    [
      "hreflang-return",
      "technical",
      "Hreflang reciprocity",
      "Alternate pages have not been fetched.",
    ],
    [
      "performance",
      "technical",
      "Lab and field performance",
      "Run the separate PageSpeed tool for available measurements.",
    ],
  ] as const)
    check(
      id,
      category,
      title,
      "not-tested",
      reason,
      "Run a separately bounded verification workflow.",
    );
  const additional = additionalSeoEvidence(html, url, network?.headers);
  checks.push(...additional.checks);
  return {
    platform: additional.platform,
    contentFingerprint: additional.contentFingerprint,
    contentCharacters: additional.contentCharacters,
    alternateEvidence: additional.alternates,
    url,
    generatedAt: new Date().toISOString(),
    metadata: {
      title,
      titleLength: title.length,
      description,
      descriptionLength: description.length,
      robots,
      canonical: canonical ? resolve(canonical) : null,
      canonicalSource: htmlCanonical
        ? "html"
        : httpCanonical
          ? "http-header"
          : null,
      httpCanonical,
      language,
      viewport: meta("viewport"),
    },
    headings,
    headingCounts: Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((n) => [
        `h${n}`,
        headings.filter((h) => h.level === n).length,
      ]),
    ),
    links,
    linkCounts: {
      total: links.length,
      internal: links.filter((l) => l.internal).length,
      external: links.filter((l) => !l.internal).length,
      unique: new Set(links.map((l) => l.href)).size,
      nofollow: links.filter((l) => l.rel.includes("nofollow")).length,
      sponsored: links.filter((l) => l.rel.includes("sponsored")).length,
      ugc: links.filter((l) => l.rel.includes("ugc")).length,
    },
    images,
    structured,
    social,
    hreflang,
    redirects: network?.redirects || [],
    checks,
  };
}
export function scoreAudit(checks: Check[]) {
  const categoryScores = Object.fromEntries(
    Object.keys(auditWeights).map((key) => {
      const eligible = checks.filter(
        (c) => c.category === key && c.status !== "not-tested",
      );
      return [
        key,
        eligible.length
          ? Math.round(
              (eligible.reduce(
                (s, c) =>
                  s +
                  (c.status === "pass" ? 1 : c.status === "warning" ? 0.5 : 0),
                0,
              ) /
                eligible.length) *
                100,
            )
          : null,
      ];
    }),
  ) as Record<Group, number | null>;
  let total = 0,
    weight = 0;
  for (const key of Object.keys(auditWeights) as Group[]) {
    if (categoryScores[key] !== null) {
      total += categoryScores[key]! * auditWeights[key];
      weight += auditWeights[key];
    }
  }
  return {
    overall: weight ? Math.round(total / weight) : null,
    metadata: categoryScores.metadata,
    categoryScores,
    weights: auditWeights,
    tested: checks.filter((c) => c.status !== "not-tested").length,
    total: checks.length,
    methodology:
      "Custom diagnostic score, not a Google score or ranking predictor. Pass=1, warning=0.5, critical=0 within tested checks. Not-tested checks are excluded; coverage is reported separately.",
  };
}
export async function runAudit(url: string) {
  const response = await safeFetch(url);
  if (
    !/text\/html|application\/xhtml\+xml/i.test(
      response.headers["content-type"] || "",
    )
  )
    throw new Error("The destination did not return an HTML page.");
  const report = analyzeHtml(
    response.body.toString("utf8"),
    response.url,
    response,
  );
  const auxiliary = await Promise.all(
    ["robots.txt", "sitemap.xml"].map(async (name) => {
      try {
        const r = await safeFetch(new URL("/" + name, response.url).href, {
          maxBytes: 512 * 1024,
          timeoutMs: 5000,
        });
        return {
          name,
          url: r.url,
          status: r.status,
          available: r.status === 200,
          contentType: r.headers["content-type"] || "",
          preview: r.body.toString("utf8").slice(0, 2000),
        };
      } catch (error) {
        return {
          name,
          url: new URL("/" + name, response.url).href,
          status: null,
          available: null,
          error: error instanceof Error ? error.message : "Not tested",
        };
      }
    }),
  );
  for (const item of auxiliary)
    report.checks.push({
      id: item.name,
      category: "technical",
      title: `${item.name} availability`,
      status:
        item.available === null
          ? "not-tested"
          : item.available
            ? "pass"
            : "warning",
      evidence:
        item.status === null
          ? item.error || "Not tested"
          : `HTTP ${item.status} at ${item.url}. Availability only; syntax/directives not fully validated.`,
      recommendation:
        "Review document content and site-specific indexing intent.",
      priority: "medium",
      effort: "small",
    });
  return {
    ...report,
    scores: scoreAudit(report.checks),
    auxiliary,
    httpStatus: response.status,
    coverage:
      "Single static page. No cross-site crawl, broken-link verification, resource measurements or browser execution.",
  };
}
export type AuditReport = Awaited<ReturnType<typeof runAudit>>;
