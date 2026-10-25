import { test, expect } from "@playwright/test";
import sharp from "sharp";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test("server-rendered metadata, real conversion, download and ZIP", async ({
  page,
}) => {
  await page.goto("/image-tools/jpg-to-webp");
  await expect(page.locator("h1")).toHaveText("JPG to WebP");
  await expect(page).toHaveTitle(/JPG to WebP/);
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "http://localhost:3000/image-tools/jpg-to-webp",
  );
  const fixture = await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#24694d" },
  })
    .jpeg()
    .toBuffer();
  await page.locator("input[type=file]").setInputFiles([
    { name: "sample.jpg", mimeType: "image/jpeg", buffer: fixture },
    { name: "second.jpg", mimeType: "image/jpeg", buffer: fixture },
  ]);
  await page.getByRole("spinbutton", { name: "Width" }).fill("320");
  await page.getByRole("button", { name: "Convert 2 images" }).click();
  await expect(page.getByText("320 × 240 · WebP")).toHaveCount(2);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download sample.jpg as WebP" }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("sample.webp");
  const output = await readFile((await download.path())!);
  expect((await sharp(output).metadata()).format).toBe("webp");
  const zipped = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP (2)" }).click();
  const zip = await zipped;
  const archive = await JSZip.loadAsync(await readFile((await zip.path())!));
  expect(Object.keys(archive.files)).toHaveLength(2);
  await page.getByRole("button", { name: "Clear all files" }).click();
  await expect(
    page.getByRole("button", { name: "Convert images" }),
  ).toBeDisabled();
});
test("invalid uploads and signature spoofing show useful errors", async ({
  page,
  request,
}) => {
  await page.goto("/image-tools/jpg-to-webp");
  await page.locator("input[type=file]").setInputFiles({
    name: "spoof.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake jpeg"),
  });
  await page.getByRole("button", { name: "Convert 1 image" }).click();
  await expect(
    page.getByText("This file is not a valid JPEG image."),
  ).toBeVisible();
  const response = await request.post("/api/images", {
    multipart: {
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake"),
      },
    },
  });
  expect(response.status()).toBe(400);
  const cross = await request.post("/api/images", {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(cross.status()).toBe(403);
});
test("search, availability, favorites consent and planned pages", async ({
  page,
}) => {
  await page.goto("/tools");
  await page.getByRole("textbox", { name: "Search tools" }).fill("jpg to webp");
  // Generous timeout: this filter is synchronous client-side state (no
  // debounce), but running concurrently with the real CPU-bound AI
  // inference test (tests/e2e/workspace.spec.ts) can starve this worker's
  // event loop for longer than the 5s default under the 2-worker pool.
  await expect(page.locator(".tool-card")).toHaveCount(1, { timeout: 15000 });
  await page
    .getByRole("button", { name: "Favorite JPG to WebP", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("toolroom-favorites")),
  ).toBeNull();
  await page
    .getByLabel("Remember favorites and recent tools on this device")
    .check();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Favorite JPG to WebP", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/social-media-tools/social-media-inspector");
  await expect(
    page.getByRole("heading", { name: "This tool is in the plan." }),
  ).toBeVisible();
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
  // Background removal now has a real, verified MODNet worker behind it; it
  // is "requires-configuration" (self-hosted infra), not "planned", so the
  // real upload panel renders instead of the roadmap placeholder, while
  // still staying noindex until an operator confirms infra is configured.
  // (The .eyebrow status label is intentionally display:none in this
  // workspace shell on every tool page, so it is not asserted here.)
  await page.goto("/image-tools/background-remover");
  await expect(
    page.getByRole("button", { name: "Start processing" }),
  ).toBeVisible();
  await expect(
    page.getByText("Portrait background removal with MODNet."),
  ).toBeVisible();
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
});
test("mobile layout, SEO artifacts, 404 and structured data", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/tools", "/image-tools/jpg-to-webp"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  for (const script of await page
    .locator('script[type="application/ld+json"]')
    .allTextContents())
    expect(() => JSON.parse(script)).not.toThrow();
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/image-tools/jpg-to-webp");
  expect(await sitemap.text()).not.toContain("background-remover");
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect((await request.get("/missing-page")).status()).toBe(404);
  await page.screenshot({
    path: "artifacts/converter-mobile.png",
    fullPage: true,
  });
});
test("cancellation, processing errors and keyboard file selection", async ({
  page,
}) => {
  await page.goto("/image-tools/jpg-to-webp");
  const button = page.getByRole("button", { name: "Choose images" });
  await expect(button).toBeEnabled();
  await button.focus();
  await expect(button).toBeFocused();
  const chooser = page.waitForEvent("filechooser", { timeout: 10000 });
  await button.press("Enter");
  const fileChooser = await chooser;
  const buffer = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#24694d" },
  })
    .jpeg()
    .toBuffer();
  await fileChooser.setFiles({
    name: "cancel.jpg",
    mimeType: "image/jpeg",
    buffer,
  });
  await page.route("**/api/images", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route
      .fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "The converter is busy. Please retry shortly.",
        }),
      })
      .catch(() => {});
  });
  await page.getByRole("button", { name: "Convert 1 image" }).click();
  await page.getByRole("button", { name: "Cancel batch" }).click();
  await expect(page.getByText("Cancelled. You can try again.")).toBeVisible();
  await page.getByRole("button", { name: "Convert 1 image" }).click();
  await expect(
    page.getByText("The converter is busy. Please retry shortly."),
  ).toBeVisible();
});
test("mobile drag and drop produces a valid downloadable file", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/image-tools/jpg-to-webp");
  const buffer = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "#24694d" },
  })
    .jpeg()
    .toBuffer();
  const transfer = await page.evaluateHandle((bytes) => {
    const data = new DataTransfer();
    data.items.add(
      new File([new Uint8Array(bytes)], "dropped.jpg", { type: "image/jpeg" }),
    );
    return data;
  }, Array.from(buffer));
  await page
    .locator(".dropzone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await page.getByRole("button", { name: "Convert 1 image" }).click();
  await expect(page.getByText("300 × 200 · WebP")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download dropped.jpg as WebP" })
    .click();
  const download = await pending;
  expect(
    (await sharp(await readFile((await download.path())!)).metadata()).width,
  ).toBe(300);
  await page.screenshot({
    path: "artifacts/converter-mobile-result.png",
    fullPage: true,
  });
  const limit = await request.post("/api/images", {
    headers: { "content-length": String(11 * 1024 * 1024) },
    data: Buffer.alloc(11 * 1024 * 1024),
  });
  expect(limit.status()).toBe(413);
});
