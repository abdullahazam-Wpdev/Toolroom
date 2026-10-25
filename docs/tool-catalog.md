# Launch catalog

18 launch entries: 11 available tools, 1 PageSpeed integration requiring project quota/key verification, and 6 planned tools. No simulated AI/video/download results. See testing-results.md for actual acceptance scope.

| Tool | Route | Readiness | Execution |
|---|---|---|---|
| JPG to WebP | /image-tools/jpg-to-webp | available | node |
| Image compressor | /image-tools/image-compressor | available | node |
| WebP to PNG | /image-tools/webp-to-png | available | node |
| PNG to JPG | /image-tools/png-to-jpg | available | node |
| Image resizer | /image-tools/image-resizer | available | node |
| Background remover | /image-tools/background-remover | planned | model |
| AI image upscaler | /image-tools/ai-image-upscaler | planned | model |
| Website SEO checker | /seo-tools/website-seo-checker | available | node |
| Meta tag analyzer | /seo-tools/meta-tag-analyzer | available | node |
| Heading checker | /seo-tools/heading-checker | available | node |
| PageSpeed checker | /seo-tools/pagespeed-checker | requires-configuration | provider |
| Robots.txt checker | /seo-tools/robots-txt-checker | available | node |
| Sitemap validator | /seo-tools/sitemap-validator | available | node |
| Video compressor | /video-tools/video-compressor | planned | queue |
| Video converter | /video-tools/video-converter | planned | queue |
| Social media inspector | /social-media-tools/social-media-inspector | planned | provider |
| Direct media downloader | /social-media-tools/direct-media-downloader | planned | queue |
| Social URL inspector | /social-media-tools/social-url-inspector | available | node |

## Latest additions

- `/image-tools/image-converter`: available. JPEG/PNG/WebP input; JPEG/PNG/WebP/AVIF output; batch, actual download and decode tests.
- `/social-media-tools/direct-media-downloader`: available for authorized public file URLs, 10 MiB; JPEG/PNG/WebP/MP4/WebM signature recognition. No social-page extraction, conversion or provider statistics.

Current registry totals: 19 tools, 13 available, one API-quota gate, five planned. These counts supersede earlier milestone totals above.

## Compact converter / SEO API revision

General converter now supports JPEG, PNG, WebP, AVIF, GIF and TIFF in all 36 single-frame directions. Animated/multipage, HEIC, RAW, PSD, document and vector formats are excluded. Existing pair routes remain functional but are de-emphasized in primary navigation.

`/seo-tools/semrush-keyword-metrics`: configuration-gated official v4 keyword report, with unit confirmation/cache/budget and genuine provider fields. No live report claimed yet; excluded from sitemap/working-only. Pexels picker is an optional feature of the converter and is separately API-key dependent. Current totals: 20 tools, 13 available, two configuration gates, five planned.

## Infrastructure and AI/video verification phase

`background-remover`, `ai-image-upscaler`, `video-compressor` and `video-converter` are no longer `planned`: each was verified end to end with real output through the actual job API, a real Postgres/Redis/BullMQ worker, real FFmpeg, and real ONNX inference (MODNet, Swin2SR — both Apache-2.0). They are now `requires-configuration`, the same category as PageSpeed/Semrush, because they need an operator-deployed Postgres/Redis/worker installation rather than working out of the box like the Sharp-based image tools. See `docs/progress.md` for the full verification record, the one remaining truly `planned` tool (`social-media-inspector`), and the PageSpeed quota diagnosis.

**Current registry totals: 20 tools, 13 available, 6 requires-configuration, 1 planned.**
