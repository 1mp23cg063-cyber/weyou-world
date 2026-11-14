// Pre-render weYou World pages to static HTML.
//
//   npm run build
//
// Reads src/pages/*.html (SEO <head> + <x-dc> design-component template), renders each in headless
// Chromium (Playwright) using support.js, and writes the rendered result to the repo root
// (index.html, about.html, features.html, contact.html) plus the hydration payloads in assets/dc/.
//
// The output is fully readable with JS disabled. A small bootstrap re-attaches the interactive
// runtime (support.js + React) after load and swaps the static copy for the live one.
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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'application/xml' };

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

async function main() {
  const pw = await loadPlaywright();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await pw.chromium.launch();
  fs.mkdirSync(path.join(ROOT, 'assets/dc'), { recursive: true });
  try {
    for (const name of PAGES) {
      const srcText = fs.readFileSync(path.join(ROOT, 'src/pages', `${name}.html`), 'utf8');
      const parts = extractParts(srcText);
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => { const r = document.getElementById('dc-root'); return r && r.children.length && !/\{\{/.test(r.innerText); }, null, { timeout: 30000 });
      // Scroll through the page so scroll-triggered state (stat count-ups) reaches its final values.
      // (the page scrolls inside the full-height root, so step through each section rather than window.scrollTo)
      const n = await page.evaluate(() => document.querySelectorAll('#dc-root section, #dc-root footer').length);
      for (let i = 0; i < n; i++) { await page.evaluate(k => document.querySelectorAll('#dc-root section, #dc-root footer')[k].scrollIntoView(), i); await page.waitForTimeout(250); }
      await page.evaluate(() => document.querySelector('#dc-root section, #dc-root header').scrollIntoView());
      await page.waitForTimeout(1200); // let count-ups / post-mount state settle
      const out = await page.evaluate(() => {
        const root = document.getElementById('dc-root');
        root.querySelectorAll('canvas').forEach(c => { c.removeAttribute('width'); c.removeAttribute('height'); });
        const head = document.head.cloneNode(true);
        head.querySelectorAll('script[src], script[data-dc-script]').forEach(n => n.remove());
        // keep the x-dc{display:none!important} rule: the raw template container must never be visible
        return { head: head.innerHTML, body: root.innerHTML };
      });
      if (errors.length) console.warn(`[${name}] console errors:\n  ` + errors.join('\n  '));
      if (/\{\{/.test(out.body) || /\{\{/.test(out.head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''))) throw new Error(`${name}: unrendered {{ }} remains`);
      const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n${out.head.trim()}\n<style>#prerender,#prerender>.sc-host{height:100%}</style>\n</head>\n<body>\n<div id="prerender">\n${out.body}\n</div>\n${BOOTSTRAP(name)}\n</body>\n</html>\n`;
      fs.writeFileSync(path.join(ROOT, `${name}.html`), html);
      fs.writeFileSync(path.join(ROOT, `assets/dc/${name}.json`), JSON.stringify(parts));
      console.log(`built ${name}.html (${(html.length / 1024).toFixed(0)} KB)`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
main().catch(e => { console.error(e); process.exit(1); });
