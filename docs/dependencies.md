# Installed dependency inventory

Package manifest license declarations, recorded after installation. These are not an audit of transitive code, native codecs, model weights or distribution obligations. No AI models are installed.

| Package              | Installed version | Declared license          |
| -------------------- | ----------------- | ------------------------- |
| next                 | 16.4.3            | MIT                       |
| react                | 19.3.1            | MIT                       |
| sharp                | 0.35.5            | Apache-2.0                |
| zod                  | 4.6.7             | MIT                       |
| lucide-react         | 1.61.0            | ISC                       |
| @radix-ui/react-slot | 1.5.0             | MIT                       |
| @prisma/client       | 6.19.3            | Apache-2.0                |
| bullmq               | 6.4.2             | MIT                       |
| ioredis              | 6.0.0             | MIT                       |
| jszip                | 3.10.2            | (MIT OR GPL-3.0-or-later) |
| @playwright/test     | 1.64.1            | Apache-2.0                |
| vitest               | 5.0.5             | MIT                       |

Use `npm ci` with the committed lockfile. `deepmerge-ts` is explicitly overridden to the patched major and Prisma generation was checked. Run the dependency audit in CI and review future upgrades.


## Added in the research-led phase

| Package | Installed version | Declared license |
|---|---|---|
| cheerio | 1.2.0 | MIT |
| ipaddr.js | 2.5.0 | MIT |
| pdf-lib | 1.17.1 | MIT |
| fast-xml-parser | 5.11.2 | MIT |
