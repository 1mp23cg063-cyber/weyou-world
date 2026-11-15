# weYou World — project notes
- Brand name is written **weYou™ World** (™ after "You") in header and footer.
- Wordmark: one font/weight, colour cycles through one word at a time (we → You → World); ™ pinned top-right of "You"; Disney touch = tiny twinkling ✦ sparkles + gentle float.
- Fonts (site-wide): DM Sans (UI/body) + Newsreader (display). Never Inter.

## Build
The served pages (`index.html`, `about.html`, `features.html`, `contact.html`) are **generated** — do not edit them by hand.
- Sources: `src/pages/*.html` (SEO `<head>` + `<x-dc>` design-component template + logic). Entity configuration, canonical services, and `sameAs` definitions reside in `src/entity.config.json`.
- `npm run build` runs `build/prerender.mjs`: it renders each source page headlessly (Playwright + Chromium, using `support.js`), writes static HTML to the repo root and `assets/dc/*.json`, dynamically updates `sitemap.xml` with file mtime dates, synchronizes `llms.txt`, `llms-full.txt`, and `src/weyouworld-seo-all-in-one.txt`, and emits a production-ready `dist/` folder.
- Deploy setup: point the hosting build output directory directly to `dist/` so source code, build scripts, and package manifests are never served.
- `npm test` runs the built-in test suite (`tests/*.test.js`) validating font compliance, link integrity, Schema.org JSON-LD graph resolution, security headers, vendor SRI hashes, dist folder isolation, meta lengths, and AEO FAQ synchronization.
- Playwright is a dev dependency: `npx playwright install chromium` before running builds.
- Edit copy/SEO in `src/pages/*.html`, rebuild (`npm run build`), and verify tests (`npm test`). URLs are clean (`/about`, not `about.html`); `_redirects` maps `.html` to clean.
- The runtime still needs `unsafe-eval` in the CSP (support.js uses `new Function`).
