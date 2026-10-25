import type { Check } from "./audit";
/** Quote every cell and neutralize spreadsheet formulas in untrusted website data. */
export function findingsCsv(pages: { url: string; checks: Check[] }[]): string {
  const cell = (value: string) =>
    '"' +
    (/^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? "'" + value : value).replace(
      /"/g,
      '""',
    ) +
    '"';
  const rows = [
    [
      "URL",
      "Status",
      "Category",
      "Finding",
      "Evidence",
      "Recommendation",
      "Priority",
    ],
    ...pages.flatMap((page) =>
      page.checks.map((c) => [
        page.url,
        c.status,
        c.category,
        c.title,
        c.evidence,
        c.recommendation,
        c.priority,
      ]),
    ),
  ];
  return (
    "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
  );
}
