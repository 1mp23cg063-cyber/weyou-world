import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const pages = ['index', 'about', 'features', 'contact'];

test('Payload Integrity: assets/dc/*.json match expected DC schema', () => {
  for (const p of pages) {
    const jsonPath = path.join(ROOT, 'assets', 'dc', `${p}.json`);
    assert.ok(fs.existsSync(jsonPath), `assets/dc/${p}.json must exist`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.equal(typeof data.tpl, 'string', `${p}.json tpl must be string`);
    assert.ok(data.tpl.length > 50, `${p}.json tpl must not be empty`);
    assert.equal(typeof data.props, 'string', `${p}.json props must be string`);
    assert.equal(typeof data.js, 'string', `${p}.json js must be string`);
  }
});

test('Prerender Cleanliness: No unescaped {{ }} template tokens in static HTML body', () => {
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, `${p}.html`), 'utf8');
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<template[\s\S]*?<\/template>/gi, '');
    assert.equal(/\{\{[^}]+\}\}/.test(withoutScripts), false, `${p}.html static DOM must not contain stray template tokens`);
  }
});
