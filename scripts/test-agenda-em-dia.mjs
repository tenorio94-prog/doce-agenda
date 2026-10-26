// Agenda sempre em dia: node scripts/build-cloudflare.mjs && node scripts/test-agenda-em-dia.mjs
// A demo passa por "conta" (mode cloud) sobre o armazenamento do navegador. Um pedido que chega pelo link
// aparece sozinho em até 2 minutos, com aviso; em Ajustes ou com campo em uso, a tela não é recarregada.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
// Conta simulada: mesma API da demo, mas o app se comporta como conta (LOCAL_ONLY falso).
const cloudClient = `"use strict"; window.DoceApi = Object.freeze({ mode: "cloud", fetch: window.DoceStore.fetch.bind(window.DoceStore) });`;
// O "link" grava direto no armazenamento, como a função pública grava no servidor.
const arrive = (page, id, client) => page.evaluate(({ id, client }) => {
  const key = 'doce-agenda.demo.v2', state = JSON.parse(localStorage.getItem(key)), now = new Date().toISOString();
  const day = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  state.orders.push({ id, client, product: 'Bolo de cenoura', details: '', dueAt: `${day}T15:00`, total: 0, status: 'Solicitação', mode: 'Retirada', location: '', nextAction: '', nextAt: '', pendingChange: '', contact: '', origin: 'link', publicCode: 'DA-TESTE', createdAt: now, history: [{ at: now, text: 'Solicitação recebida pelo link.' }] });
  localStorage.setItem(key, JSON.stringify(state));
}, { id, client });

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.route('**/data-client.js', (route) => route.fulfill({ contentType: 'text/javascript', body: cloudClient }));
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.clock.install();
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();
    // Pedidos monta a lista inteira; o texto existe mesmo com a aba escondida.
    const listed = () => page.evaluate(() => document.querySelector('#view-orders').textContent);

    // 1. Pedido novo pelo link: em 2 minutos aparece, com aviso, sem recarregar a página.
    await arrive(page, 'LINK-NOVO-1', 'Rafaela');
    await page.clock.runFor(121_000);
    await page.locator('#toast').filter({ hasText: 'Chegou 1 pedido novo pelo link.' }).waitFor();
    assert.match(await listed(), /Rafaela/, 'o pedido novo já está na agenda');

    // 2. Em Ajustes, nada é recarregado (não apaga o que ela está digitando).
    await page.locator('.settings-button:visible, [data-view="settings"]:visible').first().click();
    await page.locator('#view-settings').waitFor();
    await arrive(page, 'LINK-NOVO-2', 'Sofia');
    await page.clock.runFor(121_000);
    assert.doesNotMatch(await listed(), /Sofia/, 'em Ajustes não recarrega');

    // 3. Com um campo em uso, espera; depois do próximo ciclo, aparece.
    await page.locator('.nav-item[data-view="orders"]:visible').first().click();
    const search = page.locator('#view-orders input[type="search"], #order-search').first();
    if (await search.count()) {
      await search.focus();
      await page.clock.runFor(121_000);
      assert.equal(await page.evaluate(() => document.activeElement?.matches('input')), true, 'campo continua em uso');
      await search.blur();
    }
    await page.clock.runFor(121_000);
    await page.locator('#toast').filter({ hasText: 'Chegou 1 pedido novo pelo link.' }).waitFor();
    assert.match(await listed(), /Sofia/);

    // 4. Aviso de outra sessão (o servidor pulou versões): recarrega na hora.
    await arrive(page, 'LINK-NOVO-3', 'Tainá');
    await page.evaluate(() => window.dispatchEvent(new Event('doce:stale')));
    await page.locator('#toast').filter({ hasText: 'Chegou 1 pedido novo pelo link.' }).waitFor();
    assert.match(await listed(), /Tainá/);

    assert.deepEqual(errors, []);
    results.push(`${width}px: pedido do link aparece sozinho com aviso; Ajustes e campo em uso preservados; aviso de outra sessão recarrega`);
    await context.close();
  }

  // A demo de verdade (só no navegador) não fica recarregando.
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(`${server.origin}/demo/`);
  await page.locator('#today-title').waitFor();
  let reads = 0;
  await page.exposeFunction('countRead', () => { reads += 1; });
  // Cada leitura da agenda passa por getItem da chave da demo.
  await page.evaluate(() => { const getItem = Storage.prototype.getItem; Storage.prototype.getItem = function (key) { if (key === 'doce-agenda.demo.v2') window.countRead(); return getItem.call(this, key); }; });
  await page.clock.runFor(360_000);
  assert.equal(reads, 0, 'demo sem recarga periódica');
  await page.locator('.nav-item[data-view="month"]:visible').first().click();
  await page.locator('.month-stats').waitFor();
  assert.ok(reads > 0, 'o contador enxerga leituras de verdade');
  await context.close();
  results.push('360px: demonstração não recarrega sozinha');
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
