import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('Vendored Assets: React and ReactDOM production files exist', () => {
  const reactFile = path.join(ROOT, 'assets', 'vendor', 'react.production.min.js');
  const reactDomFile = path.join(ROOT, 'assets', 'vendor', 'react-dom.production.min.js');

  assert.ok(fs.existsSync(reactFile), 'react.production.min.js must exist');
  assert.ok(fs.existsSync(reactDomFile), 'react-dom.production.min.js must exist');
  assert.ok(fs.statSync(reactFile).size > 1000, 'react.production.min.js must not be empty');
  assert.ok(fs.statSync(reactDomFile).size > 10000, 'react-dom.production.min.js must not be empty');
});

test('Subresource Integrity: support.js includes correct SRI checksums', () => {
  const reactFile = path.join(ROOT, 'assets', 'vendor', 'react.production.min.js');
  const reactDomFile = path.join(ROOT, 'assets', 'vendor', 'react-dom.production.min.js');
  const supportJs = fs.readFileSync(path.join(ROOT, 'support.js'), 'utf8');

  const reactSri = 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(reactFile)).digest('base64');
  const reactDomSri = 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(reactDomFile)).digest('base64');

  assert.ok(supportJs.includes(reactSri), `support.js must include exact SRI hash for React (${reactSri})`);
  assert.ok(supportJs.includes(reactDomSri), `support.js must include exact SRI hash for ReactDOM (${reactDomSri})`);
});
