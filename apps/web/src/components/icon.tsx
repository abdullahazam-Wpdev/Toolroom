import {
  Image,
  Search,
  Video,
  Share2,
  Code2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
export function CategoryIcon({ category }: { category: string }) {
  const Icon =
    category === "image-tools"
      ? Image
      : category === "seo-tools"
        ? Search
        : category === "video-tools"
          ? Video
          : category === "social-media-tools"
            ? Share2
            : category === "developer-tools"
              ? Code2
              : Sparkles;
  return <Icon size={20} aria-hidden="true" />;
}
export { ArrowUpRight };
