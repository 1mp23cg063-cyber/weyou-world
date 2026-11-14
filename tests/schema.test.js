import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const pages = ['index.html', 'about.html', 'features.html', 'contact.html'];

test('JSON-LD: All pages include valid Schema.org graphs', () => {
  for (const p of pages) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const matches = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    assert.ok(matches.length > 0, `${p} must contain at least one JSON-LD block`);

    for (const match of matches) {
      let parsed;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(match[1]);
      }, `${p} JSON-LD block must parse without syntax error`);

      assert.equal(parsed['@context'], 'https://schema.org', `${p} JSON-LD context must be https://schema.org`);
      const hasGraph = Array.isArray(parsed['@graph']) && parsed['@graph'].length > 0;
      const hasType = Boolean(parsed['@type']);
      assert.ok(hasGraph || hasType, `${p} JSON-LD must contain either a non-empty @graph or @type`);
    }
  }
});
