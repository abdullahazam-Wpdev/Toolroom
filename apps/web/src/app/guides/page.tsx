import Link from "next/link";
import { metadata } from "@/lib/seo";
export const generateMetadata = () =>
  metadata(
    "Guides",
    "Practical instructions for converting JPEG images to WebP, choosing quality and understanding file sizes.",
    "/guides",
  );
export default function Page() {
  return (
    <article className="section page-section prose">
      <div className="eyebrow">THE FIELD NOTES</div>
      <h1>A practical guide to JPG to WebP.</h1>
      <p>
        WebP can reduce the size of photographs on websites. It is not a
        guarantee of a smaller file: the source image, dimensions and encoder
        quality all affect the result.
      </p>
      <h2>Start with quality, then compare.</h2>
      <p>
        Try a quality value around 80. Look closely at text, skin tones and fine
        textures in the downloaded image. Increase quality if artifacts become
        distracting. Lossy conversion cannot preserve every original pixel.
      </p>
      <h2>Resize for the place it will appear.</h2>
      <p>
        A 4,000-pixel photograph is often unnecessary for a small content
        column. Enter a target width and preserve the aspect ratio. This
        converter does not enlarge images beyond their original dimensions.
      </p>
      <h2>Understand what leaves the file.</h2>
      <p>
        The converter applies EXIF orientation and strips embedded metadata by default (you can explicitly retain it),
        which can include location and camera information. It accepts JPEG
        images up to 10 MiB and 24 million pixels. Batch downloads are assembled
        in your browser.
      </p>
      <Link className="button primary" href="/image-tools/jpg-to-webp">
        Open JPG to WebP →
      </Link>
    </article>
  );
}
