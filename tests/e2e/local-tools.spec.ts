import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
async function pdf(widths = [200, 300]) {
  const d = await PDFDocument.create();
  widths.forEach((w) => d.addPage([w, 400]).drawText("Original page " + w));
  d.setTitle("Browser fixture");
  return Buffer.from(await d.save());
}
for (const op of [
  "pdf-merge",
  "pdf-extract",
  "pdf-rotate",
  "pdf-split",
  "pdf-metadata",
]) {
  test(`actual browser worker ${op} output and mobile layout`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pdf-tools/" + op);
    const file = await pdf();
    await page.getByLabel("Choose PDF files").setInputFiles(
      op === "pdf-merge"
        ? [
            { name: "first.pdf", mimeType: "application/pdf", buffer: file },
            {
              name: "second.pdf",
              mimeType: "application/pdf",
              buffer: await pdf([500]),
            },
          ]
        : { name: "first.pdf", mimeType: "application/pdf", buffer: file },
    );
    if (op === "pdf-merge")
      await page
        .getByRole("button", { name: "Move file 2 up", exact: true })
        .click();
    if (op === "pdf-extract" || op === "pdf-rotate")
      await page.getByLabel("Pages", { exact: true }).fill("2");
    await page
      .getByRole("button", {
        name: op === "pdf-metadata" ? "Inspect metadata" : "Process PDFs",
        exact: true,
      })
      .click();
    await expect(page.getByRole("region", { name: "PDF results" })).toBeVisible(
      { timeout: 35000 },
    );
    if (op === "pdf-metadata") {
      await expect(page.locator(".local-results pre")).toContainText(
        "Browser fixture",
      );
      const wait = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download metadata JSON" })
        .click();
      expect(
        JSON.parse(await readFile((await (await wait).path())!, "utf8")).pages,
      ).toBe(2);
    } else {
      const wait = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name:
            op === "pdf-split"
              ? "Download all pages as ZIP"
              : /Download toolroom-/,
        })
        .click();
      const bytes = await readFile((await (await wait).path())!);
      if (op === "pdf-split") {
        const zip = await JSZip.loadAsync(bytes);
        expect(Object.keys(zip.files)).toEqual(["page-1.pdf", "page-2.pdf"]);
        expect(
          (
            await PDFDocument.load(
              await zip.file("page-2.pdf")!.async("uint8array"),
            )
          ).getPageCount(),
        ).toBe(1);
      } else {
        const d = await PDFDocument.load(bytes);
        if (op === "pdf-merge") {
          expect(d.getPageCount()).toBe(3);
          expect(d.getPage(0).getWidth()).toBe(500);
        }
        if (op === "pdf-extract") {
          expect(d.getPageCount()).toBe(1);
          expect(d.getPage(0).getWidth()).toBe(300);
        }
        if (op === "pdf-rotate")
          expect(d.getPages().map((p) => p.getRotation().angle)).toEqual([
            0, 90,
          ]);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("PDF worker rejects corrupt input and recovers, clears stale output", async ({
  page,
}) => {
  await page.goto("/pdf-tools/pdf-extract");
  await page.getByLabel("Choose PDF files").setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-invalid"),
  });
  await page.getByRole("button", { name: "Process PDFs", exact: true }).click();
  await expect(page.locator(".local-tool [role=alert]")).toContainText(
    /encrypted|damaged|unsupported/,
    { timeout: 35000 },
  );
  await page.getByLabel("Choose PDF files").setInputFiles({
    name: "good.pdf",
    mimeType: "application/pdf",
    buffer: await pdf(),
  });
  await page.getByLabel("Pages", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Process PDFs", exact: true }).click();
  await expect(page.locator(".local-tool [role=alert]")).toContainText(
    "1 to 2",
    { timeout: 35000 },
  );
  await page.getByLabel("Pages", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Process PDFs", exact: true }).click();
  await expect(page.getByRole("region", { name: "PDF results" })).toBeVisible({
    timeout: 35000,
  });
  await page.getByRole("button", { name: "Clear files", exact: true }).click();
  await expect(page.getByRole("region", { name: "PDF results" })).toHaveCount(
    0,
  );
});
for (const [tool, input, expected] of [
  ["json-formatter", '{"hello":true}', '"hello": true'],
  ["base64-converter", "世界", "5LiW55WM"],
  ["url-encoder", "a & b", "a%20%26%20b"],
  ["uuid-generator", "2", "-"],
  ["hash-generator", "hello", "2cf24dba"],
  ["color-converter", "#0f0", "#00FF00"],
]) {
  test(`local ${tool} actual output and download`, async ({ page }) => {
    await page.goto("/developer-tools/" + tool);
    await page
      .getByLabel(tool === "uuid-generator" ? "Number of UUIDs" : "Input", {
        exact: true,
      })
      .fill(input);
    await page
      .getByRole("button", {
        name: tool === "uuid-generator" ? "Generate UUIDs" : "Run tool",
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Output", { exact: true })).toContainText(
      expected,
    );
    const wait = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download result", exact: true })
      .click();
    expect(await readFile((await (await wait).path())!, "utf8")).toContain(
      expected,
    );
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByLabel("Output", { exact: true })).toHaveCount(0);
  });
}
test("developer tabs decode Unicode, invalid input and keyboard controls", async ({
  page,
}) => {
  await page.goto("/developer-tools/base64-converter");
  await page
    .getByRole("button", { name: "Decode Base64", exact: true })
    .click();
  await page.getByLabel("Input", { exact: true }).fill("5LiW55WM");
  await page.getByRole("button", { name: "Run tool", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Output", { exact: true })).toHaveValue("世界");
  await page.getByLabel("Input", { exact: true }).fill("%%%");
  await page.getByRole("button", { name: "Run tool", exact: true }).click();
  await expect(page.locator(".local-tool [role=alert]")).toContainText(
    "valid Base64",
  );
});

test("PDF cancellation terminates the worker and keeps files local", async ({
  page,
}) => {
  await page.goto("/pdf-tools/pdf-merge");
  const posted: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posted.push(r.url());
  });
  await page.getByLabel("Choose PDF files").setInputFiles({
    name: "private.pdf",
    mimeType: "application/pdf",
    buffer: await pdf(),
  });
  await page.route("**/_next/static/chunks/*", async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await route.continue();
    } catch {}
  });
  await page.getByRole("button", { name: "Process PDFs", exact: true }).click();
  await page
    .getByRole("button", { name: "Cancel processing", exact: true })
    .click();
  await expect(page.locator(".local-tool [role=alert]")).toContainText(
    "cancelled",
  );
  await expect(page.getByRole("region", { name: "PDF results" })).toHaveCount(
    0,
  );
  expect(posted).toEqual([]);
});
