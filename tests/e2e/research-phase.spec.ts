import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
for (const { tool, input, format, action } of [
  { tool: "webp-to-png", input: "webp", format: "png", action: "Convert" },
  { tool: "png-to-jpg", input: "png", format: "jpeg", action: "Convert" },
  { tool: "image-resizer", input: "png", format: "png", action: "Resize" },
  {
    tool: "image-compressor",
    input: "jpeg",
    format: "jpeg",
    action: "Compress",
  },
]) {
  test(`real ${tool} browser download`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/image-tools/${tool}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const fixture = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 60, g: 120, b: 80, alpha: 0.5 },
      },
    })
      .toFormat(input as "png" | "webp" | "jpeg")
      .toBuffer();
    await page.locator("input[type=file]").setInputFiles({
      name: `fixture.${input}`,
      mimeType: `image/${input}`,
      buffer: fixture,
    });
    if (tool === "image-resizer")
      await page.getByRole("spinbutton", { name: "Width" }).fill("200");
    await page
      .getByRole("button", { name: `${action} 1 image`, exact: true })
      .click();
    await expect(page.locator(".success")).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await page.locator("a[download]").click();
    const download = await downloaded;
    const meta = await sharp(
      await readFile((await download.path())!),
    ).metadata();
    expect(meta.format).toBe(format);
    expect(meta.width).toBe(tool === "image-resizer" ? 200 : 400);
    await expect(page.getByAltText("Original image comparison")).toBeVisible();
    await expect(page.getByAltText("Processed image comparison")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("SEO fixture report, inventories, PDF and JSON exports", async ({
  page,
}) => {
  await page.goto("/seo-tools/website-seo-checker");
  await page
    .getByLabel("Page URL", { exact: true })
    .fill("https://example.com/fixture");
  await page
    .getByLabel("Analyze pasted HTML instead of fetching this URL")
    .check();
  await page
    .getByLabel("HTML source", { exact: true })
    .fill(await readFile("tests/fixtures/seo-page.html", "utf8"));
  await page.getByRole("button", { name: "Inspect page", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your page, in focus." }),
  ).toBeVisible();
  await expect(page.getByText(/Pasted static HTML/)).toBeVisible();
  await page.getByRole("button", { name: "headings", exact: true }).click();
  await expect(
    page
      .locator(".heading-inventory li")
      .filter({ hasText: "Skipped heading level" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "images", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Decorative (declared)", exact: true }),
  ).toBeVisible();
  const jsonPending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const json = await jsonPending;
  const report = JSON.parse(await readFile((await json.path())!, "utf8"));
  expect(report.headingCounts.h1).toBe(1);
  expect(report.linkCounts.total).toBe(3);
  expect(report.scores.tested).toBeLessThan(report.scores.total);
  const pdfPending = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF report", exact: true }).click();
  const pdf = await pdfPending;
  expect(
    (
      await PDFDocument.load(await readFile((await pdf.path())!))
    ).getPageCount(),
  ).toBeGreaterThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/seo-report-mobile.png",
    fullPage: true,
  });
});
test("safe URL boundary rejects metadata URLs through the real API", async ({
  request,
}) => {
  const response = await request.post("/api/audits", {
    data: { url: "http://169.254.169.254/latest/meta-data" },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("Private-network");
});
test("technical-document tools parse actual pasted content and reject dangerous XML", async ({
  page,
  request,
}) => {
  await page.goto("/seo-tools/sitemap-validator");
  await page
    .getByLabel("Website or sitemap URL", { exact: true })
    .fill("https://example.com/sitemap.xml");
  await page
    .getByLabel("Check pasted content without a network request")
    .check();
  await page
    .getByLabel("Document content", { exact: true })
    .fill(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>',
    );
  await page
    .getByRole("button", { name: "Check document", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Document inspection" }),
  ).toBeVisible();
  await expect(page.locator(".technical-output")).toContainText('"total": 1');
  const bad = await request.post("/api/technical", {
    data: {
      url: "https://example.com",
      mode: "sitemap",
      text: "<!DOCTYPE a><urlset/>",
    },
  });
  expect(bad.status()).toBe(400);
  await page.goto("/seo-tools/robots-txt-checker");
  await page
    .getByLabel("Website URL", { exact: true })
    .fill("https://example.com");
  await page
    .getByLabel("Check pasted content without a network request")
    .check();
  await page
    .getByLabel("Document content", { exact: true })
    .fill("User-agent: *\nDisallow: /private");
  await page
    .getByRole("button", { name: "Check document", exact: true })
    .click();
  await expect(page.locator(".technical-output")).toContainText(
    '"name": "disallow"',
  );
});
test("PageSpeed renders fixture measurements, null field data, desktop and upstream errors", async ({
  page,
}) => {
  // Test-only provider response. No fixture metrics exist in production code.
  await page.route("**/api/pagespeed", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        strategy: "desktop",
        finalUrl: "https://example.com",
        scores: {
          performance: 92,
          seo: 88,
          accessibility: null,
          bestPractices: 95,
        },
        lab: {
          lcp: { display: "1.5 s" },
          cls: { display: "0.01" },
          fcp: { display: "1.0 s" },
          speedIndex: { display: "1.3 s" },
          tbt: { display: "20 ms" },
        },
        field: {
          available: false,
          lcp: { percentile: null, category: null },
          cls: { percentile: null, category: null },
          inp: { percentile: null, category: null },
        },
        opportunities: [],
        warnings: [],
        note: "Lab fixture, not live measurements.",
      }),
    }),
  );
  await page.goto("/seo-tools/pagespeed-checker");
  await page
    .getByLabel("Website URL", { exact: true })
    .fill("https://example.com");
  await page.getByLabel("desktop", { exact: true }).check();
  await page.getByRole("button", { name: "Measure speed" }).click();
  await expect(
    page.getByRole("heading", { name: "Lab measurements" }),
  ).toBeVisible();
  await expect(page.getByText("1.5 s", { exact: true })).toBeVisible();
  await expect(page.getByText(/Not available for this URL/)).toBeVisible();
  await page.unroute("**/api/pagespeed");
  await page.route("**/api/pagespeed", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "PageSpeed quota is exhausted." }),
    }),
  );
  await page.getByRole("button", { name: "Measure speed" }).click();
  await expect(page.locator(".tool-error[role=alert]")).toContainText("quota");
});
test("social URL inspector identifies supported domains without promising downloads", async ({
  page,
}) => {
  await page.goto("/social-media-tools/social-url-inspector");
  await page
    .getByLabel("Social platform URL")
    .fill("https://www.youtube.com/watch?v=abc");
  await page.getByRole("button", { name: "Inspect link" }).click();
  await expect(
    page.getByRole("heading", { name: "YouTube link identified" }),
  ).toBeVisible();
  await expect(page.getByText("Not enabled", { exact: true })).toBeVisible();
  await page
    .getByLabel("Social platform URL")
    .fill("https://youtube.com.evil.example/post");
  await page.getByRole("button", { name: "Inspect link" }).click();
  await expect(page.locator(".tool-error[role=alert]")).toContainText("domain");
});

test("image API rejects mismatched MIME and selected tool", async ({
  request,
}) => {
  const bytes = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#fff" },
  })
    .jpeg()
    .toBuffer();
  const response = await request.post("/api/images", {
    multipart: {
      tool: "jpg-to-webp",
      file: { name: "spoof.png", mimeType: "image/png", buffer: bytes },
    },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("requires a JPEG");
});
test("switching image tools clears previous files and updates accepted formats", async ({
  page,
}) => {
  await page.goto("/image-tools/jpg-to-webp");
  const buffer = await sharp({
    create: { width: 30, height: 20, channels: 3, background: "#fff" },
  })
    .jpeg()
    .toBuffer();
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "previous.jpg", mimeType: "image/jpeg", buffer });
  await expect(page.locator(".file-row")).toHaveCount(1);
  await page
    .locator(".related")
    .getByRole("link", { name: /WebP to PNG/ })
    .click();
  await expect(page.locator("input[type=file]")).toHaveAttribute(
    "accept",
    "image/webp",
  );
  await expect(page.locator(".file-row")).toHaveCount(0);
});
