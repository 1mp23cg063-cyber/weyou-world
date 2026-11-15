import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon'
};

const PORT = parseInt(process.env.PORT, 10) || 3000;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  
  let file = path.join(DIST, p);
  
  if (!fs.existsSync(file) || (fs.existsSync(file) && fs.statSync(file).isDirectory())) {
    if (fs.existsSync(file + '.html')) {
      file = file + '.html';
    } else if (fs.existsSync(path.join(file, 'index.html'))) {
      file = path.join(file, 'index.html');
    }
  }

  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    const nfPath = path.join(DIST, '404.html');
    if (fs.existsSync(nfPath)) {
      return fs.createReadStream(nfPath).pipe(res);
    }
    return res.end('<h1>404 Not Found</h1>');
  }

  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`weYou World live server listening at http://localhost:${PORT}/ (serving dist/)`);
});
