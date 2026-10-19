// Local-only preview: serves only this prototype and the existing brand assets.
// It never serves the repository root or connects to account services.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../public/previa-g02');
const built = path.resolve(here, '../../deploy-cloud/public');
const files = new Map([
  ['/', [source, 'index.html', 'text/html; charset=utf-8']],
  ['/index.html', [source, 'index.html', 'text/html; charset=utf-8']],
  ['/style.css', [source, 'style.css', 'text/css; charset=utf-8']],
  ['/prototype.js', [source, 'prototype.js', 'text/javascript; charset=utf-8']],
  ['/tokens.css', [built, 'tokens.css', 'text/css; charset=utf-8']],
  ['/logo.svg', [built, 'logo.svg', 'image/svg+xml']],
  ...['bricolage-600.woff2', 'bricolage-700.woff2', 'plus-jakarta-sans.woff2'].map((name) =>
    [`/fonts/vnext/${name}`, [built, `fonts/vnext/${name}`, 'font/woff2']]),
]);

export async function startPreview(port = 0) {
  const server = createServer(async (request, response) => {
    const headers = {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, headers); response.end(); return;
    }
    const route = new URL(request.url, 'http://localhost').pathname;
    if (route === '/favicon.ico') { response.writeHead(204, headers); response.end(); return; }
    const file = files.get(route);
    if (!file) { response.writeHead(404, headers); response.end('Não encontrado.'); return; }
    try {
      const body = await readFile(path.join(file[0], file[1]));
      response.writeHead(200, { ...headers, 'content-type': file[2] });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404, headers);
      response.end('Arquivo local ausente. Execute npm run build antes de abrir a prévia.');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { origin } = await startPreview();
  console.log(`Protótipo G02 local: ${origin}`);
}
