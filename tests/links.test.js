import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const pages = ['index.html', 'about.html', 'features.html', 'contact.html'];

test('Link Integrity: No dead href="#" or href="" links', () => {
  for (const p of pages) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    assert.equal(/href\s*=\s*["']#["']/.test(content), false, `${p} must not contain dead href="#"`);
    assert.equal(/href\s*=\s*["']["']/.test(content), false, `${p} must not contain empty href=""`);
  }
});

test('Internal Links: All relative href paths resolve to existing files', () => {
  for (const p of pages) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const hrefs = [...content.matchAll(/href="(\/[^"#]*)/g)].map(m => m[1]);
    for (const h of hrefs) {
      if (h === '/') {
        assert.ok(fs.existsSync(path.join(ROOT, 'index.html')), `${p} root link resolves`);
      } else {
        const candidateHtml = path.join(ROOT, `${h.replace(/^\//, '')}.html`);
        const candidateStatic = path.join(ROOT, h.replace(/^\//, ''));
        const exists = fs.existsSync(candidateHtml) || fs.existsSync(candidateStatic);
        assert.ok(exists, `${p} link "${h}" resolves to file on disk`);
      }
    }
  }
});

test('Product Navigation: enVoy links route to https://weyouenvoy.com', () => {
  for (const p of pages) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    // Any link with text "enVoy" or pointing to envoy
    const envoyMatches = [...content.matchAll(/<a[^>]*href="([^"]*)"[^>]*>enVoy<\/a>/gi)];
    for (const m of envoyMatches) {
      assert.equal(m[1], 'https://weyouenvoy.com', `${p} enVoy link must route to https://weyouenvoy.com`);
    }
  }
});
