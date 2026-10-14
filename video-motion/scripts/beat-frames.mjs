// Um quadro por batida (e meio-batida opcional) para revisão: node scripts/beat-frames.mjs <saida> [passo]
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || 'renders/beats');
const stepS = Number(process.argv[3] || 0.5);
const offset = Number(process.argv[4] || 0);
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.ttf': 'font/ttf', '.wav': 'audio/wav' };
const server = createServer(async (req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1440 } });
await page.addInitScript(() => { window.__timelines = {}; });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
page.on('console', (m) => errors.push(m.type() + ': ' + m.text()));
page.on('requestfailed', (r) => errors.push('fail ' + r.url()));
try { await page.waitForFunction(() => !!(window.__timelines && window.__timelines.main), null, { timeout: 15000 }); } catch (e) { console.log(JSON.stringify(errors)); throw e; }
let n = 0;
for (let t = offset; t < 16 - 1e-9; t += stepS) {
  await page.evaluate((tt) => window.__render(tt), t);
  await page.screenshot({ path: path.join(out, `f${String(n++).padStart(3, '0')}.png`) });
}
await browser.close(); server.close();
console.log(JSON.stringify({ frames: n, errors }));
