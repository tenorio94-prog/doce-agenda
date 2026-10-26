// Aviso de pedido novo: node scripts/build-cloudflare.mjs && node scripts/test-aviso-pedido.mjs
// Conta simulada sobre a demo. O título mostra quantos pedidos do link esperam. Com "Ligar avisos" em Ajustes,
// um pedido que chega com o app em outra aba vira notificação do aparelho; desligado, não avisa.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const cloudClient = `"use strict"; window.DoceApi = Object.freeze({ mode: "cloud", fetch: window.DoceStore.fetch.bind(window.DoceStore) });`;
const arrive = (page, id, client) => page.evaluate(({ id, client }) => {
  const key = 'doce-agenda.demo.v2', state = JSON.parse(localStorage.getItem(key)), now = new Date().toISOString();
  const day = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
  state.orders.push({ id, client, product: 'Bolo de cenoura', details: '', dueAt: `${day}T15:00`, total: 0, status: 'Solicitação', mode: 'Retirada', location: '', nextAction: '', nextAt: '', pendingChange: '', contact: '', origin: 'link', publicCode: 'DA-AVISO', createdAt: now, history: [] });
  localStorage.setItem(key, JSON.stringify(state));
}, { id, client });

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.grantPermissions(['notifications'], { origin: server.origin });
    await context.route('**/data-client.js', (route) => route.fulfill({ contentType: 'text/javascript', body: cloudClient }));
    await context.addInitScript(() => {
      localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] }));
      // Aba escondida controlada pelo teste; notificações registradas em vez de mostradas.
      window.__hidden = false;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
      window.__shown = [];
      // O navegador de teste nega avisos de fábrica: a permissão começa "não perguntada" e vira concedida ao ligar.
      window.__permission = 'default';
      Object.defineProperty(Notification, 'permission', { configurable: true, get: () => window.__permission });
      Notification.requestPermission = async () => { window.__permission = 'granted'; return 'granted'; };
      if (window.ServiceWorkerRegistration) ServiceWorkerRegistration.prototype.showNotification = function (title, options) { window.__shown.push({ title, body: options?.body }); return Promise.resolve(); };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.clock.install();
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();
    const waiting = () => page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).orders.filter((order) => order.status === 'Solicitação').length);
    assert.equal(await page.title(), `(${await waiting()}) Doce Agenda — pedidos da sua confeitaria`, 'o título conta os pedidos do link');

    // Ajustes: ligar os avisos registra o service worker do aviso.
    await page.locator('[data-view="settings"]:visible').first().click();
    const card = page.locator('.settings-card[data-settings="alerts"]');
    assert.match(await card.locator('summary').innerText(), /Desligado/);
    await card.locator('summary').click();
    await card.locator('[data-action="alerts-on"]').click();
    await page.locator('#toast').filter({ hasText: 'Avisos ligados' }).waitFor();
    assert.match(await page.locator('.settings-card[data-settings="alerts"]').innerText(), /Ligados neste aparelho/);
    assert.ok(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/demo/'))), 'service worker do aviso registrado');
    await page.locator('.nav-item[data-view="today"]:visible').first().click();

    // App em outra aba: chega um pedido, vira notificação e o título sobe.
    await page.evaluate(() => { window.__hidden = true; });
    await arrive(page, 'AVISO-1', 'Rafaela');
    await page.clock.runFor(121_000);
    await page.waitForFunction(() => window.__shown.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__shown[0]), { title: 'Pedido novo pelo link', body: 'Rafaela quer Bolo de cenoura.' });
    assert.match(await page.title(), new RegExp(`^\\(${await waiting()}\\) `));

    // Com a aba à vista, só o aviso na tela (sem notificação do aparelho).
    await page.evaluate(() => { window.__hidden = false; });
    await arrive(page, 'AVISO-2', 'Sofia');
    await page.clock.runFor(121_000);
    await page.locator('#toast').filter({ hasText: 'Chegou 1 pedido novo pelo link.' }).waitFor();
    assert.equal(await page.evaluate(() => window.__shown.length), 1);

    // Desligado: nada de notificação, nem com a aba escondida.
    await page.locator('[data-view="settings"]:visible').first().click();
    await page.locator('.settings-card[data-settings="alerts"] [data-action="alerts-off"]').click();
    await page.locator('.nav-item[data-view="today"]:visible').first().click();
    await page.evaluate(() => { window.__hidden = true; });
    await arrive(page, 'AVISO-3', 'Tainá');
    await page.clock.runFor(242_000);
    assert.equal(await page.evaluate(() => window.__shown.length), 1, 'desligado não avisa');
    assert.deepEqual(errors, []);
    results.push(`${width}px: título com pedidos do link; avisos ligados notificam com o app em outra aba; desligados não`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
