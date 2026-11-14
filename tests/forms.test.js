import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const formPages = ['index.html', 'contact.html'];

test('Progressive Enhancement: Static forms have action, method, and hidden security inputs', () => {
  for (const p of formPages) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    assert.ok(content.includes('action="https://formsubmit.co/info@weyoux.com"'), `${p} form must have POST action`);
    assert.ok(content.includes('method="POST"'), `${p} form must have method="POST"`);
    assert.ok(content.includes('name="_subject"'), `${p} form must include hidden _subject`);
    assert.ok(content.includes('name="_captcha"'), `${p} form must include hidden _captcha`);
  }
});

test('Hydration State Preservation: swap() retains active form values and focus', () => {
  for (const p of ['index.html', 'about.html', 'features.html', 'contact.html']) {
    const content = fs.readFileSync(path.join(ROOT, p), 'utf8');
    assert.ok(content.includes("s.querySelectorAll('input[name]"), `${p} BOOTSTRAP must transfer form field values`);
    assert.ok(content.includes('focusedName'), `${p} BOOTSTRAP must track and restore active element focus`);
  }
});
