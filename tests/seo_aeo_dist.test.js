import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const pages = ['index.html', 'about.html', 'features.html', 'contact.html', 'privacy.html', 'terms.html'];

test('Dist: Output folder exists and contains all required served files', () => {
  assert.ok(fs.existsSync(DIST), 'dist directory must exist');

  const requiredFiles = [
    'index.html', 'about.html', 'features.html', 'contact.html',
    'privacy.html', 'terms.html', '404.html',
    'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'logo.png', 'og-image.jpg',
    'support.js', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt',
    '_headers', '_redirects'
  ];

  for (const f of requiredFiles) {
    assert.ok(fs.existsSync(path.join(DIST, f)), `dist/${f} must exist`);
  }

  assert.ok(fs.existsSync(path.join(DIST, 'assets/dc')), 'dist/assets/dc must exist');
  assert.ok(fs.existsSync(path.join(DIST, 'assets/vendor')), 'dist/assets/vendor must exist');
});

test('Dist: Output folder excludes undeployed source and dev files', () => {
  const forbidden = [
    'src', 'build', 'package.json', 'package-lock.json',
    'CLAUDE.md', 'dev-log', 'node_modules', 'tests', 'OWNER_TODO.md', 'SOURCES.md'
  ];

  for (const f of forbidden) {
    assert.ok(!fs.existsSync(path.join(DIST, f)), `dist/${f} must NOT exist`);
  }
});

test('Robots.txt: No Disallow of undeployed paths or asset noindex paths', () => {
  for (const dir of [ROOT, DIST]) {
    const robots = fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8');
    const undeployed = ['/src/', '/build/', '/dev-log/', '/package.json', '/CLAUDE.md', '/seo/'];
    for (const p of undeployed) {
      assert.ok(!robots.includes(`Disallow: ${p}`), `robots.txt in ${dir} must not disallow undeployed path ${p}`);
    }
    assert.ok(!robots.includes('Disallow: /assets/dc/'), 'robots.txt must not disallow /assets/dc/');
    assert.ok(!robots.includes('Disallow: /assets/vendor/'), 'robots.txt must not disallow /assets/vendor/');
  }
});

test('Meta: Titles <= 60 chars, descriptions <= 155 chars, all unique', () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const p of pages) {
    const content = fs.readFileSync(path.join(DIST, p), 'utf8');
    
    const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
    assert.ok(titleMatch, `${p} must have a title`);
    const title = titleMatch[1].replace(/&amp;/g, '&');
    assert.ok(title.length <= 60, `${p} title is ${title.length} chars (must be <= 60): "${title}"`);
    assert.ok(!titles.has(title), `${p} title must be unique, duplicate found: "${title}"`);
    titles.add(title);

    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    assert.ok(descMatch, `${p} must have a meta description`);
    const desc = descMatch[1];
    assert.ok(desc.length <= 155, `${p} description is ${desc.length} chars (must be <= 155): "${desc}"`);
    assert.ok(!descriptions.has(desc), `${p} description must be unique`);
    descriptions.add(desc);
  }
});

test('JSON-LD: Valid JSON-LD and internal @id references resolve', () => {
  const entityConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/entity.config.json'), 'utf8'));

  for (const p of pages) {
    const content = fs.readFileSync(path.join(DIST, p), 'utf8');
    const match = content.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    assert.ok(match, `${p} must contain JSON-LD`);

    const data = JSON.parse(match[1]);
    const graph = data['@graph'] || [data];
    const definedIds = new Set(graph.map(node => node['@id']).filter(Boolean));

    // Organization sameAs check
    for (const node of graph) {
      if (node['@type'] === 'Organization') {
        if (!entityConfig.sameAs || entityConfig.sameAs.length === 0) {
          assert.equal(node.sameAs, undefined, `${p} Organization sameAs must be absent when config array is empty`);
        }
      }

      // Check @id references for internal fragments
      const checkRefs = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          obj.forEach(checkRefs);
          return;
        }
        for (const [key, val] of Object.entries(obj)) {
          if (key === '@id' && typeof val === 'string' && val.startsWith('#')) {
            assert.ok(definedIds.has(val), `${p} internal reference ${val} must resolve`);
          }
          if (typeof val === 'object') {
            checkRefs(val);
          }
        }
      };
      checkRefs(node);
    }
  }
});

test('FAQ: Visible FAQ text matches FAQPage JSON-LD schema with exact string equality', () => {
  const primaryPages = ['index.html', 'about.html', 'features.html', 'contact.html'];

  const normalize = s => (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  for (const p of primaryPages) {
    const content = fs.readFileSync(path.join(DIST, p), 'utf8');
    const match = content.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    assert.ok(match, `${p} must contain JSON-LD`);
    const data = JSON.parse(match[1]);
    const graph = data['@graph'] || [data];

    const faqPage = graph.find(node => node['@type'] === 'FAQPage');
    assert.ok(faqPage, `${p} must have an FAQPage schema node`);
    assert.ok(Array.isArray(faqPage.mainEntity) && faqPage.mainEntity.length >= 4, `${p} FAQPage must have at least 4 questions`);

    // Extract visible body text from static prerender container
    const prerenderMatch = content.match(/<div id=["']prerender["']>([\s\S]*?)<\/div>\s*<script>/i);
    const visibleHtml = prerenderMatch ? prerenderMatch[1] : content;
    const normalizedVisible = normalize(visibleHtml);

    // Verify each question and answer text appears in page HTML with normalized whitespace and exact string equality
    for (const q of faqPage.mainEntity) {
      assert.equal(q['@type'], 'Question');
      const questionText = normalize(q.name);
      const answerText = normalize(q.acceptedAnswer.text);

      assert.ok(
        normalizedVisible.includes(questionText),
        `${p} FAQ mismatch: visible text does not contain question "${questionText}"`
      );

      assert.ok(
        normalizedVisible.includes(answerText),
        `${p} FAQ mismatch: visible text does not contain answer "${answerText}"`
      );
    }
  }
});

test('Sitemap: All sitemap URLs exist in dist', () => {
  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locMatches = [...sitemap.matchAll(/<loc>(https:\/\/weyouworld\.com(\/[^<]*)?)<\/loc>/g)];
  assert.ok(locMatches.length >= 6, 'sitemap must have at least 6 URLs');

  for (const match of locMatches) {
    const urlPath = match[2] || '/';
    let expectedFile;
    if (urlPath === '/' || urlPath === '') {
      expectedFile = 'index.html';
    } else {
      expectedFile = urlPath.replace(/^\//, '') + '.html';
    }
    assert.ok(
      fs.existsSync(path.join(DIST, expectedFile)),
      `Sitemap URL ${match[1]} target ${expectedFile} must exist in dist`
    );
  }
});

test('LLMs: llms.txt and llms-full.txt list identical canonical service names', () => {
  const entityConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/entity.config.json'), 'utf8'));
  const canonicalServices = entityConfig.servicePillars.flatMap(p => p.services.map(s => s.name));

  const llms = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8');
  const llmsFull = fs.readFileSync(path.join(DIST, 'llms-full.txt'), 'utf8');

  // Verify header summary opens with >
  assert.ok(llms.startsWith('> '), 'llms.txt must open with > summary line');
  assert.ok(llmsFull.startsWith('> '), 'llms-full.txt must open with > summary line');

  for (const service of canonicalServices) {
    assert.ok(llms.includes(service), `llms.txt must include canonical service: "${service}"`);
    assert.ok(llmsFull.includes(service), `llms-full.txt must include canonical service: "${service}"`);
  }
});
