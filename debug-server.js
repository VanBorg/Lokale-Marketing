const http = require('http');
const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, 'debug-db3178.log');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Debug-Session-Id');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      fs.appendFileSync(LOG, body + '\n');
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  res.writeHead(404); res.end();
});

server.listen(7645, '127.0.0.1', () => {
  console.log('[debug-server] listening on http://127.0.0.1:7645 — writing to debug-db3178.log');
});
