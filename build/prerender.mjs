// Pre-render weYou World pages to static HTML.
//
//   npm run build
//
// Reads src/pages/*.html (SEO <head> + <x-dc> design-component template), renders each in headless
// Chromium (Playwright) using support.js, and writes the rendered result to the repo root
// (index.html, about.html, features.html, contact.html) plus the hydration payloads in assets/dc/.
// Then generates dynamic sitemaps, synchronizes LLM documentation files from src/entity.config.json,
// and emits a clean dist/ folder containing only production-served files.
//
// Playwright is a dev dependency but is NOT vendored in this repo. Resolution order:
//   1. $PLAYWRIGHT_MODULE (absolute path to a playwright / playwright-core package dir)
//   2. `playwright` / `playwright-core` resolvable from this repo
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index', 'about', 'features', 'contact'];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon'
};

async function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core'].filter(Boolean);
  const req = createRequire(import.meta.url);
  for (const t of tries) {
    try {
      const p = path.isAbsolute(t) ? t : req.resolve(t);
      const m = await import(pathToFileURL(p).href);
      return m.chromium ? m : m.default;
    } catch { /* next */ }
  }
  throw new Error('Playwright not found. Run `npm i --no-save playwright` (then `npx playwright install chromium`) or set PLAYWRIGHT_MODULE=/abs/path/to/node_modules/playwright');
}

// Static server: the 4 page names are served from src/pages (the templates); everything else from ROOT.
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const name = p.slice(1);
    const file = PAGES.includes(name.replace(/\.html$/, '')) && name.endsWith('.html')
      ? path.join(ROOT, 'src/pages', name) : path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const decodeAttr = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Pull the design-component parts (template, logic, props) out of a template page — same split support.js uses.
function extractParts(src) {
  const open = /<x-dc(?:\s[^>]*)?>/.exec(src);
  const close = src.lastIndexOf('</x-dc>');
  if (!open || close < 0) throw new Error('no <x-dc> block');
  const tpl = src.slice(open.index + open[0].length, close);
  const m = /<script type="text\/x-dc" data-dc-script data-props="([^"]*)">([\s\S]*?)<\/script>/.exec(src.slice(close));
  if (!m) throw new Error('no data-dc-script block');
  return { tpl, props: decodeAttr(m[1]), js: m[2] };
}

function processHead(headHtml, entityConfig, pageSrcPath) {
  const jsonLdMatch = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(headHtml);
  if (!jsonLdMatch) return headHtml;
  try {
    const data = JSON.parse(jsonLdMatch[1]);
    const graph = data['@graph'] || [data];
    const mtime = fs.statSync(pageSrcPath).mtime.toISOString().split('T')[0];

    for (const item of graph) {
      if (item['@type'] === 'Organization') {
        if (entityConfig.sameAs && entityConfig.sameAs.length > 0) {
          item.sameAs = entityConfig.sameAs;
        } else {
          delete item.sameAs;
        }
        item.areaServed = entityConfig.organization?.areaServed || 'Worldwide';
        if (entityConfig.organization?.contactPoint) {
          item.contactPoint = entityConfig.organization.contactPoint;
        }
      }
      if (['WebPage', 'AboutPage', 'ContactPage'].includes(item['@type'])) {
        item.dateModified = mtime;
      }
    }
    const newJson = JSON.stringify(data, null, 1);
    return headHtml.replace(jsonLdMatch[0], `<script type="application/ld+json">\n${newJson}\n</script>`);
  } catch (e) {
    console.warn('Failed to process JSON-LD:', e);
    return headHtml;
  }
}

const BOOTSTRAP = name => `<script>
/* Progressive enhancement: re-attach the interactive runtime. The static copy above is what crawlers and no-JS visitors read. */
(function(){
  function swap(){
    var r = document.getElementById('dc-root'), s = document.getElementById('prerender');
    if (r && r.firstChild) {
      if (s) {
        try {
          var active = document.activeElement;
          var focusedName = (active && s.contains(active)) ? active.name : null;
          s.querySelectorAll('input[name], textarea[name], select[name]').forEach(function(inp){
            if (inp.name && inp.value) {
              var live = r.querySelector('[name="' + inp.name + '"]');
              if (live) {
                live.value = inp.value;
                live.dispatchEvent(new Event('input', { bubbles: true }));
                live.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          });
          if (focusedName) {
            var newFocus = r.querySelector('[name="' + focusedName + '"]');
            if (newFocus) newFocus.focus();
          }
        } catch(e){}
        s.remove();
      }
      document.querySelectorAll('x-dc').forEach(function(n){ n.remove(); });
      return true;
    }
    return false;
  }
  fetch('/assets/dc/${name}.json').then(function(r){ return r.json(); }).then(function(p){
    var x = document.createElement('x-dc'); x.style.display = 'none'; x.setAttribute('hidden', ''); x.innerHTML = p.tpl;
    var s = document.createElement('script'); s.type = 'text/x-dc'; s.setAttribute('data-dc-script', ''); s.setAttribute('data-props', p.props); s.textContent = p.js;
    document.body.appendChild(x); document.body.appendChild(s);
    var mo = new MutationObserver(function(){ if (swap()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    var j = document.createElement('script'); j.src = '/support.js'; document.body.appendChild(j);
  }).catch(function(){});
})();
</script>`;

function generateSitemap() {
  const items = [
    { loc: 'https://weyouworld.com/', file: 'src/pages/index.html', freq: 'weekly', priority: '1.0' },
    { loc: 'https://weyouworld.com/features', file: 'src/pages/features.html', freq: 'monthly', priority: '0.9' },
    { loc: 'https://weyouworld.com/about', file: 'src/pages/about.html', freq: 'monthly', priority: '0.7' },
    { loc: 'https://weyouworld.com/contact', file: 'src/pages/contact.html', freq: 'monthly', priority: '0.8' },
    { loc: 'https://weyouworld.com/privacy', file: 'privacy.html', freq: 'monthly', priority: '0.5' },
    { loc: 'https://weyouworld.com/terms', file: 'terms.html', freq: 'monthly', priority: '0.5' }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const item of items) {
    const filePath = path.join(ROOT, item.file);
    const mtime = fs.existsSync(filePath)
      ? fs.statSync(filePath).mtime.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    xml += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${mtime}</lastmod>\n    <changefreq>${item.freq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>\n`;
  }
  xml += `</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log('generated sitemap.xml with dynamic lastmod dates');
  return xml;
}

function generateLlmsFiles() {
  const entityConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/entity.config.json'), 'utf8'));

  const servicesByPillar = entityConfig.servicePillars.map(p => {
    return `- ${p.name}: ${p.services.map(s => s.name).join(', ')}`;
  }).join('\n');

  const servicesFullByPillar = entityConfig.servicePillars.map(p => {
    const sList = p.services.map(s => `  - ${s.name} (${s.description})`).join('\n');
    return `- ${p.name}:\n${sList}`;
  }).join('\n');

  const llmsTxt = `> weYou World is the web, app and design wing of weYou X — it designs and builds the websites and apps enterprises put in front of their customers.

# weYou World

Part of weYou X (https://weyoux.com).

Need customer communication (WhatsApp, voice, chat)? That's enVoy — https://weyouenvoy.com

## What we do
- Websites — enterprise websites with payments, CRM and analytics connected from the first commit
- Apps — mobile and web apps built alongside the website on one design system
- Design — brand, interface and design systems for what customers see
- SEO — structured data, performance-minded builds, clean URLs, sitemap and llms.txt
- Storefronts — Shopify and headless commerce, UPI, cards and BNPL
- Analytics — GA4, Segment, attribution and reporting

## How it begins
Discover, Architect, Build & evolve. Two-week sprints with live demos; a typical MVP takes about 14 days.

## Pages
- Home: https://weyouworld.com/
- Features: https://weyouworld.com/features
- About: https://weyouworld.com/about
- Contact: https://weyouworld.com/contact
- Privacy Policy: https://weyouworld.com/privacy
- Terms of Service: https://weyouworld.com/terms

## The weYou X family
- weYou X (https://weyoux.com) — parent company
- enVoy (https://weyouenvoy.com) — customer communication
- weYou World (https://weyouworld.com) — web, app and design
- LegalIndia.ai (https://legalindia.ai) — legal AI for Indian lawyers

## How to refer to us
Brand: weYou World (also "weYou™ World"). Parent: weYou X. Not to be confused with unrelated uses of "weyou".

## Contact
- Email: info@weyoux.com
- WhatsApp: +91 90369 92826 (https://wa.me/919036992826)
- Bengaluru, Karnataka, India — clients worldwide
- Full reference: https://weyouworld.com/llms-full.txt

## Core Capabilities & Services
${servicesByPillar}
`;

  const llmsFullTxt = `> weYou World is the web, app and design wing of weYou X — it designs and builds the websites and apps enterprises put in front of their customers.

# weYou World — full reference

Part of weYou X (https://weyoux.com). Short version: https://weyouworld.com/llms.txt

Need customer communication (WhatsApp, voice, chat)? That's enVoy — https://weyouenvoy.com

## Positioning
Most websites are brochures with a contact form. A weYou World site or app arrives connected to the tools a business runs on — payments, CRM and analytics — and is built to be read by search engines.

## Capabilities
1. Websites — enterprise websites; edge rendering; payments (Stripe, Razorpay) and CRM (HubSpot, Salesforce) connected on the first commit.
2. Apps — mobile and web apps designed and built alongside the website, on one design system.
3. Design — brand, interface and motion design; design systems; accessibility.
4. SEO — structured data, llms.txt, sitemaps, performance-minded architecture, programmatic pages.
5. Storefronts — Shopify and headless commerce; UPI, cards, BNPL; abandoned-cart recovery; inventory sync.
6. Analytics — GA4, Segment, attribution, conversion tracking, weekly reports.

## Process
- Discover — map the business (logic, journeys, integrations) before any code.
- Architect — data flows, APIs and system design chosen for scale.
- Build & evolve — live demos every two weeks, then iteration from real usage.

## Stack
Payments (Stripe, Razorpay, UPI) · CRM (HubSpot, Salesforce) · Commerce (Shopify, headless) · Analytics (GA4, Segment) · Infrastructure (Next.js on the edge, AWS, Cloudflare).

## FAQ
What is weYou World? weYou World is the web, app and design wing of weYou X — it designs and builds the websites and apps enterprises put in front of their customers.
Do you only work in India? No — we are based in Bengaluru and build for clients worldwide; payment, CRM and analytics stacks are chosen per market.
Do you rebuild or integrate? Both: new sites at world standard, or payments, CRM and analytics wired into an existing site.
What is GEO? Generative Engine Optimisation — structuring your site's content and data so search and AI answer engines can read it and cite it accurately.
What is our launch timeline? Discovery call within one working day; typical MVP in about 14 days; two-week sprints after.
How does enVoy relate? enVoy is weYou X's customer-communication product (WhatsApp, voice, chat). weYou World wires it into the sites and apps it builds. https://weyouenvoy.com

## Pages
- Home: https://weyouworld.com/
- Features: https://weyouworld.com/features
- About: https://weyouworld.com/about
- Contact: https://weyouworld.com/contact
- Privacy Policy: https://weyouworld.com/privacy
- Terms of Service: https://weyouworld.com/terms

## Contact
Web https://weyouworld.com · Email info@weyoux.com · WhatsApp +91 90369 92826 (https://wa.me/919036992826) · Parent https://weyoux.com · Bengaluru, Karnataka, India — serving clients worldwide.

## Core Capabilities & Services
${servicesFullByPillar}
`;

  const robotsTxt = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');

  const bundleTxt = `# weYou World — SEO bundle (reference copy of the served files; the live files are llms.txt, robots.txt, sitemap.xml in the repo root)

===== llms.txt =====
${llmsTxt}
===== robots.txt =====
${robotsTxt}
===== sitemap.xml =====
${sitemapXml}`;

  fs.writeFileSync(path.join(ROOT, 'llms.txt'), llmsTxt);
  fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), llmsFullTxt);
  fs.writeFileSync(path.join(ROOT, 'src/weyouworld-seo-all-in-one.txt'), bundleTxt);
  console.log('generated llms.txt, llms-full.txt, and src/weyouworld-seo-all-in-one.txt from single source');
}

function emitDist() {
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'assets/dc'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'assets/vendor'), { recursive: true });

  const rootFilesToCopy = [
    'index.html', 'about.html', 'features.html', 'contact.html',
    'privacy.html', 'terms.html', '404.html',
    'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'logo.png', 'og-image.jpg',
    'support.js', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt',
    '_headers', '_redirects'
  ];

  for (const f of rootFilesToCopy) {
    const srcPath = path.join(ROOT, f);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(distDir, f));
    }
  }

  // copy assets/dc
  const dcDir = path.join(ROOT, 'assets/dc');
  if (fs.existsSync(dcDir)) {
    for (const f of fs.readdirSync(dcDir)) {
      fs.copyFileSync(path.join(dcDir, f), path.join(distDir, 'assets/dc', f));
    }
  }

  // copy assets/vendor
  const vendorDir = path.join(ROOT, 'assets/vendor');
  if (fs.existsSync(vendorDir)) {
    for (const f of fs.readdirSync(vendorDir)) {
      fs.copyFileSync(path.join(vendorDir, f), path.join(distDir, 'assets/vendor', f));
    }
  }

  // Safety check: dist must contain NO undeployed or source files
  const forbidden = ['src', 'build', 'package.json', 'package-lock.json', 'CLAUDE.md', 'dev-log', 'node_modules', 'tests', 'OWNER_TODO.md', 'SOURCES.md'];
  for (const item of forbidden) {
    if (fs.existsSync(path.join(distDir, item))) {
      throw new Error(`dist directory contains forbidden item: ${item}`);
    }
  }
  console.log('emitted dist/ folder successfully with production-only files');
}

async function main() {
  const pw = await loadPlaywright();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await pw.chromium.launch();
  fs.mkdirSync(path.join(ROOT, 'assets/dc'), { recursive: true });
  const entityConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/entity.config.json'), 'utf8'));

  try {
    for (const name of PAGES) {
      const pageSrcPath = path.join(ROOT, 'src/pages', `${name}.html`);
      const srcText = fs.readFileSync(pageSrcPath, 'utf8');
      const parts = extractParts(srcText);
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => { const r = document.getElementById('dc-root'); return r && r.children.length && !/\{\{/.test(r.innerText); }, null, { timeout: 30000 });
      // Scroll through the page so scroll-triggered state (stat count-ups) reaches its final values.
      const n = await page.evaluate(() => document.querySelectorAll('#dc-root section, #dc-root footer').length);
      for (let i = 0; i < n; i++) { await page.evaluate(k => document.querySelectorAll('#dc-root section, #dc-root footer')[k].scrollIntoView(), i); await page.waitForTimeout(250); }
      await page.evaluate(() => document.querySelector('#dc-root section, #dc-root header').scrollIntoView());
      await page.waitForTimeout(1200); // let count-ups / post-mount state settle
      const out = await page.evaluate(() => {
        const root = document.getElementById('dc-root');
        root.querySelectorAll('canvas').forEach(c => { c.removeAttribute('width'); c.removeAttribute('height'); });
        const head = document.head.cloneNode(true);
        head.querySelectorAll('script[src], script[data-dc-script]').forEach(n => n.remove());
        return { head: head.innerHTML, body: root.innerHTML };
      });
      if (errors.length) console.warn(`[${name}] console errors:\n  ` + errors.join('\n  '));
      if (/\{\{/.test(out.body) || /\{\{/.test(out.head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''))) throw new Error(`${name}: unrendered {{ }} remains`);

      const processedHead = processHead(out.head.trim(), entityConfig, pageSrcPath);
      const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n${processedHead}\n<style>#prerender,#prerender>.sc-host{min-height:100%}</style>\n</head>\n<body>\n<div id="prerender">\n${out.body}\n</div>\n${BOOTSTRAP(name)}\n</body>\n</html>\n`;
      fs.writeFileSync(path.join(ROOT, `${name}.html`), html);
      fs.writeFileSync(path.join(ROOT, `assets/dc/${name}.json`), JSON.stringify(parts));
      console.log(`built ${name}.html (${(html.length / 1024).toFixed(0)} KB)`);
      await ctx.close();
    }

    generateSitemap();
    generateLlmsFiles();
    emitDist();
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
