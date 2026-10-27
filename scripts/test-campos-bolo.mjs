// Detalhes do bolo por produto: node scripts/build-cloudflare.mjs && node scripts/test-campos-bolo.mjs
// Cada doce diz se pede os detalhes do bolo ("Naked cake" sim, "Bolo de pote" não). Doces antigos, sem a marca,
// seguem o nome com "bolo". Em Ajustes, a caixa acompanha o nome até ela decidir.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';
import { demoSeedState } from '../cloud/demo-seed.js';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const products = [
  { name: 'Naked cake', description: '', cakeFields: true }, { name: 'Bolo de pote', description: '', cakeFields: false },
  { name: 'Bolo de cenoura', description: '' }, { name: 'Torta de limão', description: '' },
];
const template = { version: 1, fields: [{ key: 'flavor', label: 'Sabor', enabled: true, required: true, options: ['Chocolate', 'Ninho'] }] };
const spToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const day = (offset) => { const d = new Date(`${spToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

try {
  for (const [width, height] of [[360, 780], [1280, 900]]) {
    // 1. Vitrine: as perguntas aparecem pela marca do produto.
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.route('**/functions/v1/doce-public/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/availability')) return route.fulfill({ json: Array.from({ length: 90 }, (_, i) => ({ date: day(i), available: i >= 2 })) });
      return route.fulfill({ json: { active: true, displayName: 'Doces da Lu', welcome: '', whatsapp: '', products, style: 'atelie', color: '', instagram: '', logo: '', cover: '', share: '', noticeHours: 0, orderTemplate: template } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const asks = async (index) => {
      await page.goto(`${server.origin}/encomenda/`);
      await page.locator('#vitrine:not([hidden])').waitFor();
      await page.locator(`[data-product="${index}"]`).first().click();
      await page.locator('#sheet-order').click();
      await page.locator('.step[data-step="1"]:not([hidden])').waitFor();
      return !(await page.locator('#cake-fields').evaluate((el) => el.hidden));
    };
    assert.equal(await asks(0), true, 'Naked cake marcado: pede os detalhes');
    assert.equal(await asks(1), false, 'Bolo de pote desmarcado: não pede');
    assert.equal(await asks(2), true, 'Bolo de cenoura sem marca: segue o nome');
    assert.equal(await asks(3), false, 'Torta sem marca: não pede');
    await context.close();

    // 2. Ajustes (conta simulada): a caixa mostra a marca, acompanha o nome num doce novo e é gravada.
    const seed = demoSeedState(new Date());
    seed.orderPage = { ...seed.orderPage, active: false, products };
    const account = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await account.route('**/data-client.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '"use strict"; window.DoceApi = Object.freeze({ mode: "cloud", fetch: window.DoceStore.fetch.bind(window.DoceStore) });' }));
    await account.addInitScript((state) => {
      if (!localStorage.getItem('doce-agenda.demo.v2')) localStorage.setItem('doce-agenda.demo.v2', state);
      localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] }));
    }, JSON.stringify(seed));
    const settings = await account.newPage();
    settings.on('pageerror', (error) => errors.push(String(error)));
    await settings.goto(`${server.origin}/demo/completa/`);
    await settings.locator('#today-title').waitFor();
    await settings.locator('[data-view="settings"]:visible').first().click();
    await settings.locator('.settings-card[data-settings="link"] > summary').click();
    const rows = settings.locator('#product-list .product-item');
    const box = (i) => rows.nth(i).locator('[name=productCakeFields]');
    assert.deepEqual(await Promise.all([0, 1, 2, 3].map((i) => box(i).isChecked())), [true, false, true, false]);
    await rows.nth(3).locator('summary').click();
    await box(3).check();
    await settings.locator('[data-action="add-product"]').click();
    await rows.nth(4).locator('[name=productName]').fill('Bolo de milho');
    assert.equal(await box(4).isChecked(), true, 'doce novo com "bolo" no nome já vem marcado');
    await settings.locator('#order-page-form button[value="save"]').click();
    await settings.locator('#toast').filter({ hasText: 'Link salvo' }).waitFor();
    const saved = await settings.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).orderPage.products.map((p) => [p.name, p.cakeFields]));
    assert.deepEqual(saved, [['Naked cake', true], ['Bolo de pote', false], ['Bolo de cenoura', undefined], ['Torta de limão', true], ['Bolo de milho', undefined]],
      'só o que ela decidiu vira marca; o resto segue o nome');
    assert.ok(await settings.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    await account.close();
    assert.deepEqual(errors, []);
    results.push(`${width}px: vitrine segue a marca de cada doce (e o nome nos antigos); Ajustes grava só o que ela decidiu`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
