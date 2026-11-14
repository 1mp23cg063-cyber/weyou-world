import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const forbiddenFontPatterns = [
  /'Cormorant Garamond'/i,
  /"Cormorant Garamond"/i,
  /family=Cormorant\+Garamond/i,
  /'Josefin Sans'/i,
  /"Josefin Sans"/i,
  /family=Josefin\+Sans/i,
  /'Inter'/i,
  /"Inter"/i,
  /family=Inter/i
];

function scanFiles(dir, filterExts) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === 'tests') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      files.push(...scanFiles(full, filterExts));
    } else if (!filterExts || filterExts.some(ext => ent.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

test('Strict Font Compliance: No forbidden fonts in HTML or DC payloads', () => {
  const targetFiles = scanFiles(ROOT, ['.html', '.json', '.js', '.mjs', '_headers'])
    .filter(f => !f.endsWith('CLAUDE.md') && !f.endsWith('llms.txt') && !f.endsWith('llms-full.txt') && !f.includes('dev-log'));

  for (const f of targetFiles) {
    const content = fs.readFileSync(f, 'utf8');
    for (const pat of forbiddenFontPatterns) {
      assert.equal(
        pat.test(content),
        false,
        `Forbidden font pattern ${pat} detected in ${path.relative(ROOT, f)}`
      );
    }
  }
});

test('Font Stylesheet: Root pages only request DM Sans and Newsreader', () => {
  const pages = ['index.html', 'about.html', 'features.html', 'contact.html'];
  for (const p of pages) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const fontMatches = [...content.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s>]+/g)];
    assert.ok(fontMatches.length > 0, `${p} should load Google Fonts`);
    for (const match of fontMatches) {
      const url = match[0];
      assert.ok(url.includes('family=Newsreader'), `${p} should include Newsreader`);
      assert.ok(url.includes('family=DM+Sans'), `${p} should include DM Sans`);
      assert.ok(!url.includes('Cormorant'), `${p} must not include Cormorant`);
      assert.ok(!url.includes('Josefin'), `${p} must not include Josefin`);
      assert.ok(!url.includes('Inter'), `${p} must not include Inter`);
    }
  }
});
