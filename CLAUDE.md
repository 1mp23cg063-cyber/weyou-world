# weYou World — project notes
- Brand name is written **weYou™ World** (™ after "You") in header and footer.
- Wordmark: one font/weight, colour cycles through one word at a time (we → You → World); ™ pinned top-right of "You"; Disney touch = tiny twinkling ✦ sparkles + gentle float.
- Fonts (site-wide): DM Sans (UI/body) + Newsreader (display). Never Inter.

## Build
The served pages (`index.html`, `about.html`, `features.html`, `contact.html`) are **generated** — do not edit them by hand.
- Sources: `src/pages/*.html` (SEO `<head>` + `<x-dc>` design-component template + logic). `src/legacy/` holds the original `.dc.html` files (reference only); `src/` IS deployed as plain files if the repo root is the Cloudflare Pages output (Pages `_redirects` cannot return 404s, so those rules were removed); it is only noindexed via `_headers` (`/src/*`, `/seo/*`, `/assets/dc/*`) and `Disallow` in `robots.txt`. Recommended deploy setup: set the Pages build output directory to `dist` (a folder containing only the served files) or otherwise exclude `src/`, `build/` and `package.json` from the output.
- `npm test` runs the built-in test suite (`tests/*.test.js`) validating font compliance, link integrity, Schema.org JSON-LD, security headers, vendor SRI hashes, and progressive enhancement.
- `npm run build` runs `build/prerender.mjs`: it renders each source page headlessly (Playwright + Chromium, using `support.js`) and writes static HTML to the repo root plus hydration payloads to `assets/dc/*.json`. Output has no `{{ }}` tokens and a real `<h1>`; the interactive runtime (support.js + React from unpkg) re-attaches after load and swaps the static copy for the live one.
- Playwright is not vendored: `npm i --no-save playwright && npx playwright install chromium`, or `PLAYWRIGHT_MODULE=/abs/path/to/node_modules/playwright npm run build`.
- Edit copy/SEO in `src/pages/*.html`, rebuild, commit the generated files. URLs are clean (`/about`, not `about.html`); `_redirects` maps `.html` to clean.
- The runtime still needs `unsafe-eval` in the CSP (support.js uses `new Function`).
