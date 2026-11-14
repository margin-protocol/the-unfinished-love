// 本機預覽伺服器（零依賴）
// 模擬 GitHub Pages 的子路徑：http://localhost:4173/the-unfinished-love/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BASE = '/the-unfinished-love/';
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') { res.writeHead(302, { Location: BASE }); return res.end(); }
  if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('Not found'); }
  let rel = normalize(url.slice(BASE.length)).replace(/^(\.\.[/\\])+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  let file = join(dist, rel);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    const body = await readFile(join(dist, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(body);
  }
}).listen(PORT, () => console.log(`預覽：http://localhost:${PORT}${BASE}`));
