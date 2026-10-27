// Capacidade por tamanho: node scripts/build-cloudflare.mjs && node scripts/test-capacidade-tamanho.mjs
// Um pedido pode ocupar mais de uma vaga do dia ("Vagas que ocupa no dia"). A vaga da data soma vagas, o doce da
// vitrine diz quantas ocupa e a vitrine pede as datas livres para aquele doce.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
// Relógio fixo no meio do mês: com a data real, hoje + 5 podia cair no mês seguinte, fora do calendário da vitrine.
const NOW = new Date('2026-10-15T12:00:00-03:00');
const spToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(NOW);
const day = (offset) => { const d = new Date(`${spToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const target = day(40);
const setSlots = (page, value) => page.evaluate((v) => { const select = document.querySelector('#order-form wa-select[name="slots"]'); select.value = v; select.dispatchEvent(new Event('change', { bubbles: true })); }, value);

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const errors = [];
    // 1. App (demo): limite de 3 por dia; um bolo de casamento de 3 vagas lota a data sozinho.
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.clock.setFixedTime(NOW);
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();
    await page.evaluate(() => { const k = 'doce-agenda.demo.v2', s = JSON.parse(localStorage.getItem(k)); s.availability.dailyOrderLimit = 3; localStorage.setItem(k, JSON.stringify(s)); });
    await page.reload();
    await page.locator('#today-title').waitFor();
    const openNew = async () => { await page.locator('[data-action="new-order"]:visible').first().click(); await page.locator('#order-dialog[open]').waitFor(); await page.waitForTimeout(150); };
    await openNew();
    await page.locator('wa-input[name="client"] input').fill('Noiva Teste');
    await page.locator('wa-input[name="product"] input').fill('Bolo de casamento');
    await page.locator('wa-input[name="dueDate"] input').fill(target);
    await page.locator('wa-input[name="dueTime"] input').fill('10:00');
    await page.locator('#status-choice input[value="Confirmado"]').check();
    await page.locator('#order-form .optional-fields > summary').click();
    assert.equal(await page.locator('#order-form wa-select[name="slots"]').evaluate((el) => el.value), '1', 'novo pedido: 1 vaga');
    await setSlots(page, '3');
    assert.match(await page.locator('#due-note').innerText(), /0 de 3 vagas ocupadas\./);
    await page.locator('#save-order-button').click();
    await page.locator('#order-dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).orders.find((order) => order.client === 'Noiva Teste'));
    assert.equal(saved.slots, 3);

    await openNew();
    await page.locator('wa-input[name="dueDate"] input').fill(target);
    await page.locator('#status-choice input[value="Confirmado"]').check();
    assert.match(await page.locator('#due-note').innerText(), /3 de 3 vagas ocupadas, dia lotado/, 'o casamento ocupa as 3 vagas');
    await page.locator('#order-dialog [data-close="order-dialog"]').first().click();

    // Editar: o pedido não conta contra ele mesmo; "Mais detalhes" só abre sozinho quando há algo além do normal.
    await page.evaluate((id) => { window.__id = id; }, saved.id);
    await page.locator('.nav-item[data-view="orders"]:visible').first().click();
    await page.locator('#order-search').fill('Noiva Teste');
    await page.locator(`#view-orders [data-open-order="${saved.id}"]`).first().click();
    await page.locator('#detail-dialog[open] [data-action="edit-order"]').click();
    await page.locator('#order-dialog[open]').waitFor();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#order-form wa-select[name="slots"]').evaluate((el) => el.value), '3');
    assert.match(await page.locator('#due-note').innerText(), /0 de 3 vagas ocupadas\./);
    await setSlots(page, '4');
    assert.match(await page.locator('#due-note').innerText(), /0 de 3 vagas ocupadas, este pedido ocupa 4\. Para confirmar, você vai anotar o motivo/, '4 vagas não cabem num limite de 3');
    await page.locator('#order-dialog [data-close="order-dialog"]').first().click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    await context.close();

    // 2. Vitrine: um doce de 3 vagas pede as datas livres para ele; um normal, não.
    const shop = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await shop.clock.setFixedTime(NOW);
    const asked = [];
    await shop.route('**/functions/v1/doce-public/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/availability')) { asked.push(url.searchParams.get('produto')); return route.fulfill({ json: Array.from({ length: 90 }, (_, i) => ({ date: day(i), available: i >= 2 && !(url.searchParams.get('produto') && i === 5) })) }); }
      if (url.pathname.endsWith('/inicio')) return route.fulfill({ status: 204, body: '' });
      return route.fulfill({ json: { active: true, displayName: 'Doces da Lu', welcome: '', whatsapp: '', products: [{ name: 'Brigadeiro', description: '' }, { name: 'Bolo de casamento', description: '', slots: 3 }], style: 'atelie', color: '', instagram: '', logo: '', cover: '', share: '', noticeHours: 0, orderTemplate: { fields: [] } } });
    });
    const vitrine = await shop.newPage();
    vitrine.on('pageerror', (error) => errors.push(String(error)));
    const choose = async (index) => {
      await vitrine.goto(`${server.origin}/encomenda/`);
      await vitrine.locator('#vitrine:not([hidden])').waitFor();
      await vitrine.locator(`[data-product="${index}"]`).first().click();
      await vitrine.locator('#sheet-order').click();
      await vitrine.locator('.step[data-step="1"] [data-next]').click();
      await vitrine.locator('.step[data-step="2"]:not([hidden])').waitFor();
      await vitrine.waitForTimeout(300);
    };
    await choose(0);
    assert.deepEqual(asked, [null, 'Brigadeiro'], 'as datas são pedidas para o doce escolhido (vagas e datas especiais)');
    await choose(1);
    assert.equal(asked.at(-1), 'Bolo de casamento', 'doce de 3 vagas: datas para ele');
    assert.equal(await vitrine.locator(`#calendar-days [data-date="${day(5)}"]`).isDisabled(), true, 'dia sem 3 vagas fica riscado');
    await shop.close();

    // 3. Ajustes (conta simulada): o doce guarda quantas vagas ocupa.
    const account = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await account.route('**/data-client.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '"use strict"; window.DoceApi = Object.freeze({ mode: "cloud", fetch: window.DoceStore.fetch.bind(window.DoceStore) });' }));
    await account.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const settings = await account.newPage();
    settings.on('pageerror', (error) => errors.push(String(error)));
    await settings.goto(`${server.origin}/demo/`);
    await settings.locator('#today-title').waitFor();
    await settings.evaluate(() => { const k = 'doce-agenda.demo.v2', s = JSON.parse(localStorage.getItem(k)); s.orderPage.active = false; localStorage.setItem(k, JSON.stringify(s)); });
    await settings.reload();
    await settings.locator('#today-title').waitFor();
    await settings.locator('[data-view="settings"]:visible').first().click();
    await settings.locator('.settings-card[data-settings="link"] > summary').click();
    const first = settings.locator('#product-list .product-item').first();
    await first.locator('summary').click();
    await first.locator('[name=productSlots]').selectOption('3');
    await settings.locator('#order-page-form button[value="save"]').click();
    await settings.locator('#toast').filter({ hasText: 'Link salvo' }).waitFor();
    const products = await settings.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).orderPage.products);
    assert.equal(products[0].slots, 3);
    assert.ok(products.slice(1).every((product) => !('slots' in product)), 'os outros continuam com 1 vaga, sem marca');
    await account.close();
    assert.deepEqual(errors, []);
    results.push(`${width}px: pedido de 3 vagas lota a data; edição não conta contra si; vitrine pede datas pelo doce; Ajustes grava as vagas do doce`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
