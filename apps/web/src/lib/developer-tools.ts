export const developerIds = [
  "json-formatter",
  "base64-converter",
  "url-encoder",
  "uuid-generator",
  "hash-generator",
  "color-converter",
] as const;
export type DeveloperId = (typeof developerIds)[number];
export async function runDeveloperTool(
  tool: DeveloperId,
  input: string,
  mode = "default",
): Promise<string> {
  if (new TextEncoder().encode(input).byteLength > 1024 * 1024)
    throw new Error("Input exceeds the 1 MiB limit.");
  switch (tool) {
    case "json-formatter": {
      let value: unknown;
      try {
        value = JSON.parse(input);
      } catch {
        throw new Error("Invalid JSON. Check quotes, commas and brackets.");
      }
      return JSON.stringify(value, null, mode === "minify" ? undefined : 2);
    }
    case "base64-converter":
      if (mode === "decode") {
        try {
          const binary = atob(input.replace(/\s/g, ""));
          return new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(binary, (c) => c.charCodeAt(0)),
          );
        } catch {
          throw new Error("Enter valid Base64 containing UTF-8 text.");
        }
      } else {
        const bytes = new TextEncoder().encode(input);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return btoa(binary);
      }
    case "url-encoder":
      try {
        return mode === "decode"
          ? decodeURIComponent(input)
          : encodeURIComponent(input);
      } catch {
        throw new Error("Malformed percent-encoding or Unicode.");
      }
    case "uuid-generator": {
      const count = Number(input || 1);
      if (!Number.isInteger(count) || count < 1 || count > 100)
        throw new Error("Choose 1–100 UUIDs.");
      return Array.from({ length: count }, () => crypto.randomUUID()).join(
        "\n",
      );
    }
    case "hash-generator": {
      if (!["SHA-256", "SHA-384", "SHA-512"].includes(mode))
        throw new Error("Choose a supported SHA algorithm.");
      const digest = await crypto.subtle.digest(
        mode,
        new TextEncoder().encode(input),
      );
      return Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    }
    case "color-converter": {
      const value = input.trim();
      let rgb: number[];
      if (/^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
        let hex = value.replace("#", "");
        if (hex.length === 3)
          hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
        rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      } else {
        const m =
          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(
            value,
          );
        if (!m || m.slice(1).some((n) => Number(n) > 255))
          throw new Error("Use #RGB, #RRGGBB or rgb(0–255, 0–255, 0–255).");
        rgb = m.slice(1).map(Number);
      }
      const [r, g, b] = rgb.map((n) => n / 255),
        max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        d = max - min,
        l = (max + min) / 2,
        s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h =
        d === 0
          ? 0
          : max === r
            ? ((g - b) / d) % 6
            : max === g
              ? (b - r) / d + 2
              : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
      return `HEX: #${rgb
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}\nRGB: rgb(${rgb.join(", ")})\nHSL: hsl(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`;
    }
  }
}
