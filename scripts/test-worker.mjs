// Código da Cloudflare (worker/index.js) rodando localmente com wrangler dev e um Supabase simulado:
//   node scripts/test-worker.mjs
// Confere a prévia do link (título, descrição, imagem), os dados já na página, que a página abre sem buscar a
// vitrine de novo, o caso de endereço inexistente, robô de prévia sem contar visita, fotos com cache e rotas comuns.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from './lib/browser-test.mjs';

const key = `${'a'.repeat(32)}/11111111-1111-1111-1111-111111111111.jpg`;
const config = { active: true, displayName: 'Doces da <Lu> "Ateliê"', welcome: 'Bolos feitos em casa, em Campinas.', whatsapp: '', products: [{ name: 'Bolo', description: '', photo: 'exemplo/bolo.svg' }], style: 'moderna', color: '#3f7a4a', instagram: '', logo: '', cover: '', share: key, noticeHours: 0, orderTemplate: { fields: [] } };
const hits = [];
const upstream = createServer((req, res) => {
  hits.push(req.url);
  if (req.url.startsWith('/functions/v1/doce-public/p/doces-da-lu/availability')) { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end('[]'); }
  if (req.url.startsWith('/functions/v1/doce-public/p/doces-da-lu')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(config)); }
  if (req.url === `/storage/v1/object/public/vitrine/${key}`) { res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); }
  res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"Página não encontrada."}');
});
await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
const mock = `http://127.0.0.1:${upstream.address().port}`;
const port = 8700 + Math.floor(Math.random() * 200);
const dev = spawn('npx', ['--yes', '--package', 'wrangler@4.119.0', 'wrangler', 'dev', '--local', '--compatibility-date', '2026-08-08', '--port', String(port), '--var', `VITRINE_SUPABASE:${mock}`], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; dev.stdout.on('data', (d) => { log += d; }); dev.stderr.on('data', (d) => { log += d; });
const origin = `http://127.0.0.1:${port}`, results = [];
try {
  for (let i = 0; ; i++) { try { if ((await fetch(origin + '/')).ok) break; } catch { /* subindo */ } if (i > 120) throw new Error('wrangler dev não subiu:\n' + log.slice(-2000)); await new Promise((r) => setTimeout(r, 1000)); }

  const html = await (await fetch(`${origin}/p/doces-da-lu`)).text();
  assert.match(html, /<title>Doces da &lt;Lu&gt; "Ateliê" · encomendas<\/title>/);
  // Dentro de atributo, "<" é permitido no HTML; as aspas é que precisam de escape.
  assert.match(html, /<meta property="og:title" content="Doces da <Lu> &quot;Ateliê&quot;">/, 'aspas não quebram o atributo');
  assert.match(html, /<meta property="og:description" content="Bolos feitos em casa, em Campinas\.">/);
  assert.ok(new RegExp(`<meta property="og:image" content="https?://[^/"]+/fotos/${key}">`).test(html), 'imagem de compartilhamento pelo nosso endereço');
  assert.ok(html.includes('<script id="vitrine-data" type="application/json">{"active":true,"displayName":"Doces da \\u003cLu> \\"Ateliê\\""'), 'dados na página, sem "<" cru');
  assert.match(html, /id="request-page"/);
  results.push('prévia do link com nome, frase e imagem; dados na página');

  hits.length = 0;
  await fetch(`${origin}/p/doces-da-lu`, { headers: { 'User-Agent': 'WhatsApp/2.23.20.0 A' } });
  assert.ok(hits.some((u) => u.endsWith('/doces-da-lu?visita=0')), 'robô de prévia não conta visita');
  results.push('robô do WhatsApp não conta como visita');

  const missing = await fetch(`${origin}/p/nao-existe`);
  const missingHtml = await missing.text();
  assert.equal(missing.status, 200); assert.ok(!missingHtml.includes('vitrine-data')); assert.match(missingHtml, /<title>Encomendas<\/title>/);
  results.push('endereço inexistente recebe a página de sempre');

  const foto = await fetch(`${origin}/fotos/${key}`);
  assert.equal(foto.status, 200); assert.equal(foto.headers.get('content-type'), 'image/jpeg'); assert.match(foto.headers.get('cache-control'), /immutable/);
  for (const bad of ['/fotos/abc.jpg', `/fotos/${'b'.repeat(32)}/11111111-1111-1111-1111-111111111111.jpg`]) assert.equal((await fetch(origin + bad)).status, 404, bad);
  results.push('fotos com cache de um ano; caminhos inválidos dão 404');

  for (const [route, text] of [['/', 'Para quem vende doces'], ['/demo/', '/data-client.js'], ['/privacidade/', 'Cloudflare para hospedar'], ['/encomenda/exemplos/bolo.svg', '<svg']]) {
    const r = await fetch(origin + route); assert.equal(r.status, 200, route); assert.ok((await r.text()).includes(text), route);
  }
  results.push('resto do site continua estático');

  // No navegador: abre a vitrine com os dados embutidos, sem buscar a vitrine de novo.
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
    const configFetches = []; page.on('request', (r) => { if (/doce-public\/p\/doces-da-lu$/.test(r.url())) configFetches.push(r.url()); });
    await page.route('https://khvhnbopdluthpcduhqm.supabase.co/**', (route) => route.fulfill({ json: [], headers: { 'access-control-allow-origin': '*' } }));
    await page.goto(`${origin}/p/doces-da-lu`);
    await page.locator('#vitrine:not([hidden])').waitFor();
    assert.equal(await page.locator('h1.name').innerText(), 'Doces da <Lu> "Ateliê"');
    assert.equal(configFetches.length, 0);
    results.push('página abre com os dados embutidos, sem segunda busca');
  } finally { await browser.close(); }
} finally {
  dev.kill(); if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dev.pid), '/t', '/f'], { shell: true });
  upstream.close();
}
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
