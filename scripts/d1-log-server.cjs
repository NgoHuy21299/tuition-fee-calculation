// Simple local log server to receive logs from the worker during dev
// Usage: node scripts/d1-log-server.cjs

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.D1_LOG_PORT ? Number(process.env.D1_LOG_PORT) : 3001;
const ROUTE = '/log';

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === ROUTE) {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const fileName = payload.fileName || `logs/query_${Date.now()}.txt`;
        const content = typeof payload.content === 'string' ? payload.content : '';
        const append = payload.append !== false; // default to append

        const fullPath = path.resolve(process.cwd(), fileName);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, content, {
          encoding: 'utf-8',
          flag: append ? 'a' : 'w',
        });

        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('ok');
      } catch (e) {
        console.error('[d1-log-server] error:', e);
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('error');
      }
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[d1-log-server] listening at http://127.0.0.1:${PORT}${ROUTE}`);
});
