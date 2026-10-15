// Shared base for the screen tests: Playwright from the project (devDependency, pinned)
// and a static server for the built site. Run `node scripts/build-cloudflare.mjs` first.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export { chromium } from 'playwright';

export const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'deploy-cloud', 'public');

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf',
  '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

// Serves `root` on a free local port; folders answer with their index.html, like the published site.
export async function serveSite(root = siteRoot) {
  const server = createServer(async (req, res) => {
    try {
      let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (file !== root && !file.startsWith(root + path.sep)) throw new Error('fora do site');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
