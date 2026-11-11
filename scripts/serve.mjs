// Servidor local para revisar dist/: node scripts/serve.mjs  → http://localhost:4321
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const port = Number(process.env.PORT || 4321);
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(DIST, p);
  if (!f.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(f) && fs.existsSync(f + '/index.html')) f += '/index.html';
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': tipos['.html'] }); res.end(fs.readFileSync(path.join(DIST, '404.html'))); return; }
  res.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Sitio en http://localhost:${port}`));
