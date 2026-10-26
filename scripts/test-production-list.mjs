// Lista da semana (Pedidos > Produção): node scripts/build-cloudflare.mjs && node scripts/test-production-list.mjs [pasta-de-capturas]
// Roda na demonstração (dados só no navegador do teste): marcar pronto, desfazer, copiar e 360 px sem rolagem lateral.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite(root);
const { origin } = server;
const browser = await chromium.launch();
const results = [];
try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/demo/`);
    // Simplificação, etapa 2: a lista da semana saiu de Hoje e fica em Pedidos > Produção.
    await page.locator('#today-title').waitFor();
    assert.equal(await page.locator('#view-today [data-orders-mode], #view-today .production-week').count(), 0, 'Hoje não tem mais a lista da semana');
    await page.locator('.nav-item[data-view="orders"]:visible').first().click();
    await page.locator('[data-orders-mode="production"]').click();
    await page.locator('#production-title').waitFor();
    const items = page.locator('.prod-item');
    assert.ok(await items.count() > 0, 'a semana da demonstração deve ter pedidos confirmados');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `lista-${width}.png`), fullPage: true });

    // Marcar pronto: o pedido vira Pronto; Desfazer volta à etapa anterior.
    const check = page.locator('.prod-check[aria-pressed="false"]:not([disabled])').first();
    const id = await check.getAttribute('data-id');
    const selector = `.prod-check[data-id="${id}"]`;
    await check.click();
    await page.locator('#toast').filter({ hasText: 'Pronto' }).waitFor();
    assert.equal(await page.locator(selector).getAttribute('aria-pressed'), 'true', 'marcado como pronto');
    await page.locator('#toast button').click();
    await page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute('aria-pressed') === 'false', selector);

    // Copiar lista: texto pronto para o WhatsApp.
    await page.locator('[data-action="copy-production"]').click();
    await page.locator('#toast').filter({ hasText: 'Lista da semana copiada' }).waitFor();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /^Produção da semana \(/);
    assert.match(text, /☐|✅/);

    // Semana: a faixa com as vagas e o dia escolhido; Lista volta à lista de antes.
    await page.locator('[data-orders-mode="week"]').click();
    await page.locator('#view-orders #today-list-title').waitFor();
    assert.equal(await page.locator('#view-orders .vn-weekbar').count(), 1);
    await page.locator('[data-orders-mode="list"]').click();
    await page.locator('#order-search').waitFor();
    assert.deepEqual(errors, []);
    results.push(width);
    await context.close();
  }
  console.log(JSON.stringify({ passed: results.length }));
} finally {
  await browser.close();
  server.close();
}
