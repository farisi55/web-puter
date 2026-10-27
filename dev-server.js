// dev-server.js — Static dev server with auto-restart (run via `bun run dev`).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;

    if (pathname === '/') {
      pathname = '/index.html';
    }

    const filePath = normalize(join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    try {
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(body);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404).end('Not Found');
      } else {
        res.writeHead(500).end('Internal Server Error');
      }
    }
  } catch (err) {
    res.writeHead(500).end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`\n  ➜  Puter Studio dev server running at http://localhost:${PORT}\n`);
});
