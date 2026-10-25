import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  devIndicators: false,
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              (process.env.NODE_ENV === "development" ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " : "script-src 'self' 'unsafe-inline'; ") +
              `style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' ${process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : ""}; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
