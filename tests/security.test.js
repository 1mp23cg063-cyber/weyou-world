import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('Security Headers: Content-Security-Policy & Frame Denial', () => {
  const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
  assert.ok(headers.includes("default-src 'self'"), 'CSP default-src is configured');
  assert.ok(headers.includes("frame-ancestors 'none'"), 'CSP denies embedding via frame-ancestors');
  assert.ok(headers.includes("X-Frame-Options: DENY"), 'X-Frame-Options is DENY');
  assert.ok(headers.includes("X-Content-Type-Options: nosniff"), 'X-Content-Type-Options is nosniff');
  assert.ok(headers.includes("Strict-Transport-Security:"), 'HSTS is enabled');
  assert.ok(headers.includes("Referrer-Policy: strict-origin-when-cross-origin"), 'Referrer-Policy is strict');
});

test('Security Headers: Internal Assets Protected with noindex', () => {
  const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
  assert.ok(headers.includes('/assets/dc/*'), '/assets/dc/* rule configured');
  assert.ok(headers.includes('/assets/vendor/*'), '/assets/vendor/* rule configured');
});

test('Robots.txt: Crawl boundaries configured', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.ok(!robots.includes('Disallow: /build/'), 'robots.txt does not disallow undeployed /build/');
  assert.ok(!robots.includes('Disallow: /src/'), 'robots.txt does not disallow undeployed /src/');
  assert.ok(!robots.includes('Disallow: /assets/dc/'), 'robots.txt does not disallow /assets/dc/');
  assert.ok(!robots.includes('Disallow: /assets/vendor/'), 'robots.txt does not disallow /assets/vendor/');
  assert.ok(robots.includes('Disallow: /*?utm_*'), 'robots.txt disallows tracking query params');
  assert.ok(robots.includes('Sitemap: https://weyouworld.com/sitemap.xml'), 'robots.txt declares canonical sitemap');
});

test('Redirects: Clean URL 301 mappings', () => {
  const redirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
  assert.ok(redirects.includes('/about.html /about 301'), '_redirects handles /about.html');
  assert.ok(redirects.includes('/features.html /features 301'), '_redirects handles /features.html');
  assert.ok(redirects.includes('/contact.html /contact 301'), '_redirects handles /contact.html');
  assert.ok(redirects.includes('/index.html /'), '_redirects handles /index.html');
});
