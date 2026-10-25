# Frontend design decisions

Keep the established Toolroom identity and Next.js architecture. Source references: Anthropic frontend-design SKILL.md (reviewed, not redistributed), Jeffallan's Next.js/React/TypeScript skills (MIT), and competitor interactions documented separately.

## Direction

The interface is a working toolbench: files and evidence are the focal point. The latest user-supplied dashboard reference supersedes the initial green direction: background #f7f8fc, surface #ffffff, ink #11152b, muted #68718b, brand #4145ff, border #e7eaf3. Use color for actions/severity. Existing Arial stack remains local and avoids third-party font requests; a licensed self-hosted family may be evaluated later.

Prioritize a clear toolbar, meaningful native form labels and compact output rows. Reduce decorative eyebrows and category numbering when they do not communicate sequence. Avoid applying every competitor option to every tool. Resizing gets dimension/ratio controls, PNG→JPG gets an explicit flattening background, compression gets actual size comparisons, SEO gets findings and evidence tables.

Use before/after previews from real bytes. Progress can be measured upload bytes, completed batch count or worker-reported stages; do not animate invented completion percentages. Disable actions until their handlers are ready. Keep cancel, retry and remove reachable by keyboard. Respect reduced motion and maintain visible focus at 390px as well as desktop.

Validate output and downloads before promoting a tool. Capture screenshots to review actual layout; screenshots alone do not verify WCAG conformance. Preserve third-party attribution without copying brand assets.

## Dashboard reference implementation

Sticky header/global search; 236px desktop sidebar; native expandable category navigation; five-item mobile dock with safe-area padding. Keep Toolroom branding, real categories/statuses and existing server-rendered content. No invented pricing/account controls. Results sit below upload/settings in their own panel with actual filenames, bytes and savings. Share invokes browser sharing/clipboard; it has a clear failure message. A zero-width mobile input needs an actual focus button, not only programmatic test focus. Home provides three task shortcuts and catalog search instead of the earlier illustrative converter demo.

## Compact converter revision

The latest screenshots supersede the tall upload/settings split. Keep the primary format selector and batch action together at the top; show uploaded file rows and a selectable, fitting/zoomable original/result/compare canvas next; keep quality, dimensions and privacy below. Mobile Convert was measured near 400px from viewport top after sample upload, with no horizontal overflow at 390px; desktop screenshot width 1440 also fit. TIFF thumbnails are PNG renders, never broken native TIFF images or fake placeholder results. Sidebar/home emphasize the general converter while legacy pair URLs stay valid. Stock imagery uses real attributed photos and actual conversions. Separate labeled house advertising from interactive/download controls; no Google approval or ad serving is implied.
