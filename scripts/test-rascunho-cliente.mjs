// Rascunho da cliente no link: node scripts/build-cloudflare.mjs && node scripts/test-rascunho-cliente.mjs
// O que ela escolheu (doce, extras, data, campos do bolo) fica no aparelho dela por 24 h; voltando ao link,
// "Continuar" refaz o pedido. Nome e WhatsApp não são guardados; enviar ou "Começar de novo" apaga.
// Servidor simulado (respostas interceptadas): nada é enviado de verdade.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const KEY = 'doce-agenda.rascunho-pedido.encomenda';
const products = [{ name: 'Bolo de aniversário', description: 'Massa e recheio à escolha.', priceFromCents: 15000, featured: true }, { name: 'Brigadeiro (cento)', description: '', priceFromCents: 17000 }];
const config = { active: true, displayName: 'Doces da Lu', welcome: '', whatsapp: '+5511999999999', products, style: 'atelie', color: '', instagram: '', logo: '', cover: '', share: '', noticeHours: 0,
  orderTemplate: { version: 1, fields: [{ key: 'flavor', label: 'Sabor', enabled: true, required: true, options: ['Chocolate', 'Ninho'] }, { key: 'inscription', label: 'Inscrição', enabled: true, required: false, options: [] }] } };
const spToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const day = (offset) => { const d = new Date(`${spToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

try {
  for (const [width, height] of [[360, 780], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const sent = [];
    await context.route('**/functions/v1/doce-public/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/availability')) return route.fulfill({ json: Array.from({ length: 90 }, (_, i) => ({ date: day(i), available: i >= 2 })) });
      if (url.pathname.endsWith('/requests')) { sent.push(JSON.parse(route.request().postData())); return route.fulfill({ status: 201, json: { code: 'DA-RASC1', summary: 'Solicitação DA-RASC1', whatsapp: '' } }); }
      return route.fulfill({ json: config });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const open = async () => { await page.goto(`${server.origin}/encomenda/`); await page.locator('#vitrine:not([hidden])').waitFor(); };
    const banner = page.locator('.draft-banner');

    // Começa um pedido: bolo, sabor, inscrição, um extra, data e o próprio nome.
    await open();
    assert.equal(await banner.count(), 0, 'sem rascunho, sem aviso');
    await page.locator('[data-product]').first().click();
    await page.locator('#sheet-order').click();
    await page.locator('[data-cake="flavor"]').selectOption('Ninho');
    await page.locator('[data-cake="inscription"]').fill('Parabéns, Lu');
    await page.locator('[data-extra="Brigadeiro (cento)"]').click();
    await page.locator('.step[data-step="1"] [data-next]').click();
    await page.locator(`#quick-dates [data-date="${day(5)}"]`).click();
    await page.locator('#time').fill('15:30');
    await page.locator('.step[data-step="2"] [data-next]').click();
    await page.locator('#client').fill('Cliente Teste');
    await page.locator('#contact').fill('11 98888-1234');
    const stored = await page.evaluate((key) => localStorage.getItem(key), KEY);
    const draft = JSON.parse(stored);
    assert.equal(draft.product, 'Bolo de aniversário');
    assert.equal(draft.date, day(5));
    assert.deepEqual(draft.extras, ['Brigadeiro (cento)']);
    assert.equal(draft.cake.flavor, 'Ninho');
    assert.equal(draft.time, '15:30');
    assert.doesNotMatch(stored, /Cliente Teste|98888/, 'nome e WhatsApp não ficam guardados');

    // Fecha e volta ao link: o aviso oferece continuar, e o pedido volta como estava.
    await open();
    await banner.waitFor();
    assert.match(await banner.innerText(), /Você começou um pedido de Bolo de aniversário para/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    await banner.locator('[data-draft="resume"]').click();
    await page.locator('.step[data-step="1"]:not([hidden])').waitFor();
    assert.match(await page.locator('#chosen').innerText(), /Bolo de aniversário/);
    assert.equal(await page.locator('[data-cake="flavor"]').inputValue(), 'Ninho');
    assert.equal(await page.locator('[data-cake="inscription"]').inputValue(), 'Parabéns, Lu');
    assert.equal(await page.locator('[data-extra="Brigadeiro (cento)"]').getAttribute('aria-pressed'), 'true');
    await page.locator('.step[data-step="1"] [data-next]').click();
    assert.equal(await page.locator(`#quick-dates [data-date="${day(5)}"]`).getAttribute('aria-pressed'), 'true', 'a data volta escolhida');
    assert.equal(await page.locator('#time').inputValue(), '15:30');
    await page.locator('.step[data-step="2"] [data-next]').click();
    assert.equal(await page.locator('#client').inputValue(), '', 'o nome não volta');

    // Enviar apaga o rascunho.
    await page.locator('#client').fill('Cliente Teste');
    await page.locator('#contact').fill('11 98888-1234');
    await page.locator('#consent').check();
    await page.locator('#send').click();
    await page.locator('#confirmation:not([hidden])').waitFor();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].product, 'Bolo de aniversário');
    assert.equal(sent[0].date, day(5));
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null, 'enviado: rascunho apagado');
    await open();
    assert.equal(await banner.count(), 0);

    // "Começar de novo" apaga; rascunho com mais de 24 h é ignorado.
    await page.evaluate(({ key, date }) => localStorage.setItem(key, JSON.stringify({ at: Date.now(), product: 'Brigadeiro (cento)', other: '', extras: [], date, time: '', mode: '', cake: {} })), { key: KEY, date: day(6) });
    await open();
    await banner.locator('[data-draft="discard"]').click();
    assert.equal(await banner.count(), 0);
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null);
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ at: Date.now() - 25 * 3600e3, product: 'Brigadeiro (cento)', extras: [], cake: {} })), KEY);
    await open();
    assert.equal(await banner.count(), 0, 'mais de 24 h: some');

    // A prévia dos Ajustes nunca mostra rascunho.
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ at: Date.now(), product: 'Bolo de aniversário', extras: [], cake: {} })), KEY);
    await page.goto(`${server.origin}/encomenda/?preview=1`);
    await page.locator('#vitrine:not([hidden])').waitFor();
    assert.equal(await banner.count(), 0, 'prévia sem rascunho');

    assert.deepEqual(errors, []);
    results.push(`${width}px: rascunho sem nome e WhatsApp, volta com doce, extras, data e bolo; some ao enviar, ao recomeçar e depois de 24 h`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
