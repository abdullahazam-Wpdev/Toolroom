export const socialProviders = [
  {
    id: "youtube",
    name: "YouTube",
    hosts: ["youtube.com", "youtu.be"],
    metadata:
      "Official YouTube Data API can provide permitted public metadata; no download permission is implied.",
  },
  {
    id: "instagram",
    name: "Instagram",
    hosts: ["instagram.com", "instagr.am"],
    metadata:
      "Use approved Meta integrations and required account permissions.",
  },
  {
    id: "facebook",
    name: "Facebook",
    hosts: ["facebook.com", "fb.watch"],
    metadata:
      "Use approved Meta integrations and required account permissions.",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    hosts: ["pinterest.com", "pin.it"],
    metadata: "Provider authorization and approved API access are required.",
  },
  {
    id: "x",
    name: "X",
    hosts: ["x.com", "twitter.com"],
    metadata:
      "Use authorized API access; account pricing and policy limits apply.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    hosts: ["tiktok.com"],
    metadata: "Approved developer integrations and permissions are required.",
  },
  {
    id: "vimeo",
    name: "Vimeo",
    hosts: ["vimeo.com"],
    metadata:
      "Downloads require an authorized provider method and owner permissions.",
  },
] as const;
export function inspectSocialUrl(raw: string) {
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an HTTP or HTTPS link without embedded credentials.");
  const host = url.hostname.toLowerCase();
  const provider = socialProviders.find((p) =>
    p.hosts.some((h) => host === h || host.endsWith("." + h)),
  );
  if (!provider)
    throw new Error(
      "This domain is not one of the supported social platforms.",
    );
  return {
    platform: provider.name,
    id: provider.id,
    hostname: host,
    path: url.pathname,
    hasContentPath: url.pathname !== "/",
    capabilities: {
      urlInspection: true,
      remoteMetadata: false,
      download: false,
    },
    note: provider.metadata,
  };
}
