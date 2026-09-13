import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './common.mjs';
const output = path.join(root, 'dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(output, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(output + path.sep) || path.basename(file).startsWith('_')) throw new Error('Not found');
    if (pathname === '/game.html' || pathname === '/brawl.html' || pathname.startsWith('/socket.io')) {
      res.writeHead(503, {'Content-Type':'text/plain; charset=utf-8'}); res.end('這是入口預覽。遊戲中繼需使用 Cloudflare Pages 或 wrangler pages dev dist。'); return;
    }
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(content);
  } catch { res.writeHead(404);res.end('Not found'); }
}).listen(4175,'127.0.0.1',()=>console.log('Entry preview only: http://127.0.0.1:4175 (Ctrl+C to stop)'));
