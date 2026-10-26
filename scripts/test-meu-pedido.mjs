// Meu pedido: node scripts/build-cloudflare.mjs && node scripts/test-meu-pedido.mjs
// O link /p/<loja>?pedido=<código secreto> mostra só a situação do pedido (passos, doce, data, valores), sem dados
// pessoais. Depois de enviar, a cliente recebe esse endereço. No app, a mensagem pronta leva o mesmo endereço.
// Servidor simulado (respostas interceptadas): nada é enviado de verdade.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const TOKEN = 'abcdefghijkmnpqrstuvwxyz2';
const config = { active: true, displayName: 'Doces da Lu', welcome: '', whatsapp: '+5511999999999', products: [{ name: 'Bolo de aniversário', description: '' }], style: 'atelie', color: '', instagram: '', logo: '', cover: '', share: '', noticeHours: 0, orderTemplate: { fields: [] } };
const spToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const day = (offset) => { const d = new Date(`${spToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

try {
  for (const [width, height] of [[360, 780], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    let view = { code: 'DA-ABC234', displayName: 'Doces da Lu', whatsapp: '+5511999999999', product: 'Bolo de aniversário', dueAt: `${day(5)}T15:30`, mode: 'Retirada', stage: 'fazendo', totalCents: 20000, paidCents: 6000 };
    await context.route('**/functions/v1/doce-public/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/pedido/')) return url.pathname.endsWith(TOKEN) ? route.fulfill({ json: view }) : route.fulfill({ status: 404, json: { error: 'Pedido não encontrado.' } });
      if (url.pathname.endsWith('/availability')) return route.fulfill({ json: Array.from({ length: 90 }, (_, i) => ({ date: day(i), available: i >= 2 })) });
      if (url.pathname.endsWith('/inicio')) return route.fulfill({ status: 204, body: '' });
      if (url.pathname.endsWith('/requests')) return route.fulfill({ status: 201, json: { code: 'DA-ABC234', summary: 'Solicitação DA-ABC234', whatsapp: '+5511999999999', trackUrl: `https://lucast.app/p/encomenda?pedido=${TOKEN}` } });
      return route.fulfill({ json: config });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const box = page.locator('#tracking');

    // 1. Situação: passos, doce, data e valores pelo conferido; nada pessoal.
    await page.goto(`${server.origin}/encomenda/?pedido=${TOKEN}`);
    await box.locator('#track-title').waitFor();
    assert.equal(await page.locator('#vitrine').isHidden(), true);
    const text = await box.innerText();
    assert.match(text, /Seu pedido na Doces da Lu/);
    assert.match(text, /Seu pedido está sendo feito/);
    assert.equal(await box.locator('.track-steps [aria-current="step"]').innerText(), 'Fazendo');
    assert.equal(await box.locator('.track-steps .is-done').count(), 2, 'Recebido e Combinado já passaram');
    assert.match(text, /Bolo de aniversário/);
    assert.match(text, /às 15h30 · retirada/);
    assert.match(text.replace(/\s+/g, ' '), /Total R\$ 200 · conferido R\$ 60 · falta R\$ 140/);
    assert.match(await box.locator('a.wa').getAttribute('href'), /wa\.me\/5511999999999\?text=Oi!%20Sobre%20o%20meu%20pedido%20DA-ABC234/);
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth, null, { timeout: 3000 }).catch(() => {});
    const wide = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && el.getBoundingClientRect().width).map((el) => `${el.tagName}.${el.className}`).slice(0, 4));
    assert.deepEqual(wide, [], `sem rolagem lateral em ${width}px`);
    await box.locator('[data-track-home]').click();
    assert.equal(await page.locator('#vitrine').isVisible(), true, 'Ver a vitrine leva à loja');
    assert.equal(new URL(page.url()).search, '', 'o código sai do endereço');

    // 2. Recusado: sem passos. Código desconhecido: aviso claro.
    view = { ...view, stage: 'recusado' };
    delete view.totalCents; delete view.paidCents;
    await page.goto(`${server.origin}/encomenda/?pedido=${TOKEN}`);
    await box.locator('#track-title').waitFor();
    assert.equal(await box.locator('#track-title').innerText(), 'Desta vez não vai dar');
    assert.equal(await box.locator('.track-steps').count(), 0);
    await page.goto(`${server.origin}/encomenda/?pedido=${'x'.repeat(24)}`);
    await box.locator('#track-title').waitFor();
    assert.equal(await box.locator('#track-title').innerText(), 'Pedido não encontrado');

    // 3. Depois de enviar, o endereço de acompanhamento aparece.
    await page.goto(`${server.origin}/encomenda/`);
    await page.locator('#vitrine:not([hidden])').waitFor();
    await page.locator('[data-product]').first().click();
    await page.locator('#sheet-order').click();
    await page.locator('.step[data-step="1"] [data-next]').click();
    await page.locator(`#quick-dates [data-date="${day(5)}"]`).click();
    await page.locator('#time').fill('15:30');
    await page.locator('.step[data-step="2"] [data-next]').click();
    await page.locator('#client').fill('Cliente Teste');
    await page.locator('#contact').fill('11 98888-1234');
    await page.locator('#consent').check();
    await page.locator('#send').click();
    await page.locator('#confirmation:not([hidden])').waitFor();
    assert.equal(await page.locator('#track-link').isVisible(), true);
    assert.equal(await page.locator('#track-url').getAttribute('href'), `https://lucast.app/p/encomenda?pedido=${TOKEN}`);
    assert.deepEqual(errors, []);
    await context.close();

    // 4. App (demo): a mensagem pronta de um pedido do link leva o endereço.
    const app = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await app.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const demo = await app.newPage();
    demo.on('pageerror', (error) => errors.push(String(error)));
    await demo.goto(`${server.origin}/demo/`);
    await demo.locator('#today-title').waitFor();
    const id = await demo.evaluate((token) => {
      const k = 'doce-agenda.demo.v2', s = JSON.parse(localStorage.getItem(k)), order = s.orders.find((item) => item.origin === 'link' && item.contact);
      order.trackToken = token; localStorage.setItem(k, JSON.stringify(s)); return order.id;
    }, TOKEN);
    await demo.reload();
    await demo.locator('#today-title').waitFor();
    await demo.locator('.nav-item[data-view="orders"]:visible').first().click();
    await demo.locator('[data-stage="all"]').click();
    await demo.locator(`#view-orders [data-open-order="${id}"]`).first().click();
    await demo.locator('#detail-dialog[open] [data-action="demo-whatsapp"]').first().click();
    const message = await demo.locator('#zap-demo-dialog[open] #zap-demo-text').innerText();
    assert.match(message, new RegExp(`Acompanhe o pedido: https://lucast\\.app/p/doces-da-lu\\?pedido=${TOKEN}`));
    await app.close();
    assert.deepEqual(errors, []);
    results.push(`${width}px: situação em passos sem dados pessoais; recusado e código errado claros; endereço após enviar e na mensagem do app`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
