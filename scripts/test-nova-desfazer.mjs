// Saídas seguras da tela nova (quarta avaliação impeccable, 04/11/2026): pedido pela metade não se perde com um toque
// fora, cancelar e recusar têm Desfazer, dia cheio é um bloco só e o Recebido do mês mostra os pagamentos que o formam.
//   node scripts/build-cloudflare.mjs && node scripts/test-nova-desfazer.mjs
// Relógio fixo numa terça (27/10/2026, 12h em São Paulo), como test-nova.mjs.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const NOW = new Date('2026-10-27T12:00:00-03:00');
const TODAY = '2026-10-27';
const cents = (text) => Math.round(Number(String(text).replace(/[^\d,]/g, '').replace(',', '.')) * 100);

const server = await serveSite();
const browser = await chromium.launch();
const results = [];

async function open(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.clock.setFixedTime(NOW);
  await page.goto(`${server.origin}/demo/`);
  await page.locator('#days .order').first().waitFor();
  const api = (route, options) => page.evaluate(async ([r, o]) => (await window.DoceApi.fetch(r, o)).json(), [route, options]);
  const state = () => api('/api/state');
  const filled = () => page.evaluate(() => [...document.querySelectorAll('dialog[open] .btn-primary')].filter((el) => el.offsetParent !== null).length);
  return { context, page, api, state, errors, filled };
}
const sheetOpen = (page) => page.evaluate(() => document.querySelector('#sheet').open);
const outside = (page) => page.mouse.click(5, 5);

try {
  for (const [width, height] of [[360, 640], [1280, 800]]) {
    const { context, page, state, errors, filled } = await open(width, height);

    // 1. Pedido pela metade: tocar fora pergunta; Continuar mantém o que foi digitado; Esc pergunta de novo; Descartar fecha.
    await page.locator('.bar [data-act="new"]').click();
    await outside(page);
    assert.equal(await sheetOpen(page), false, 'formulário vazio fecha com um toque fora');
    await page.locator('.bar [data-act="new"]').click();
    await page.locator('#order-form [name=client]').fill('Cida Teste');
    await page.locator('#order-form [name=product]').fill('Torta de limão');
    await outside(page);
    await page.locator('#discard').waitFor();
    assert.equal(await sheetOpen(page), true, 'com algo digitado, o toque fora não fecha');
    assert.ok(await filled() <= 1, 'no máximo um botão cheio com a pergunta');
    await page.locator('[data-act="keep-editing"]').click();
    assert.equal(await page.locator('#discard').count(), 0);
    assert.equal(await page.locator('#order-form [name=client]').inputValue(), 'Cida Teste', 'o que ela digitou continua');
    await page.keyboard.press('Escape');
    await page.locator('#discard').waitFor();
    assert.equal(await sheetOpen(page), true, 'Esc também pergunta');
    await page.locator('[data-act="discard"]').click();
    assert.equal(await sheetOpen(page), false, 'Descartar fecha');
    await page.locator('.bar [data-act="new"]').click();
    assert.equal(await page.locator('#order-form [name=client]').inputValue(), '', 'descartado não volta');
    await page.locator('#sheet [data-act="close"]').click();
    results.push(`${width}: pedido pela metade não se perde`);

    // 2. Cancelar: a confirmação diz quanto ela já pagou; o aviso tem Desfazer, que devolve o pedido como estava.
    const before = await state();
    const paid = before.orders.find((order) => ['Confirmado', 'Em produção', 'Pronto'].includes(order.status)
      && before.payments.some((payment) => payment.orderId === order.id && payment.status === 'Conferido') && order.dueAt.slice(0, 10) >= TODAY);
    assert.ok(paid, 'o exemplo tem um pedido combinado com sinal');
    await page.locator(`[data-act="day"][data-day="${paid.dueAt.slice(0, 10)}"]`).click().catch(() => {});
    await page.locator(`.order[data-id="${paid.id}"] .order-open`).click();
    await page.locator('#sheet [data-act="cancel-order"]').click();
    assert.match(await page.locator('#sheet-body').innerText(), /Ela já pagou R\$ [\d.,]+: esse valor continua contando no Recebido\./);
    assert.equal(await page.locator('#sheet [data-act="cancel-confirm"]').getAttribute('class'), 'btn btn-danger', 'cancelar não parece confirmar');
    await page.locator('#sheet [data-act="cancel-confirm"]').click();
    await page.locator('#toast-undo:visible').waitFor();
    assert.equal((await state()).orders.find((order) => order.id === paid.id).status, 'Cancelado');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'main', 'o foco não cai no nada');
    await page.locator('#toast-undo').click();
    await page.locator('#toast-text', { hasText: 'Cancelamento desfeito.' }).waitFor();
    assert.equal((await state()).orders.find((order) => order.id === paid.id).status, paid.status, 'Desfazer devolve o pedido como estava');
    results.push(`${width}: cancelar com Desfazer`);

    // 3. Recusar o pedido do link: botão tijolo e "Desfazer a recusa" volta para decidir.
    const request = before.orders.find((order) => order.status === 'Solicitação');
    await page.locator('#notice-decide [data-act]').click();
    if (await page.locator('#sheet .list-row').count()) await page.locator(`#sheet .list-row[data-id="${request.id}"]`).click();
    await page.locator('#sheet [data-act="refuse"]').click();
    assert.match(await page.locator('#refuse-form [type=submit]').getAttribute('class'), /btn-danger/);
    await page.locator('#refuse-form [type=submit]').click();
    await page.locator('#sheet [data-act="unrefuse"]').click();
    await page.locator('#toast-text', { hasText: 'Recusa desfeita' }).waitFor();
    assert.equal((await state()).orders.find((order) => order.id === request.id).status, 'Solicitação');
    assert.equal(await page.locator('#sheet [data-act="accept"]').count(), 1, 'a ficha volta com Aceitar');
    await page.locator('#sheet [data-act="close"]').click();
    results.push(`${width}: recusar com Desfazer`);

    // 4. Orçamento num dia cheio: Confirmar mostra o bloco único com "Confirmar mesmo assim" e "Trocar o dia".
    await page.locator('.bar [data-act="new"]').click();
    await page.locator('#order-form [name=client]').fill('Dora Teste');
    await page.locator('#order-form [name=product]').fill('Pudim');
    await page.locator('#order-form [data-act="quick"][data-days="0"]').click();
    await page.locator('#order-form [name=time]').fill('17:00');
    await page.locator('#order-form [name=quote]').check();
    await page.locator('#order-form [type=submit]').click();
    await page.locator('#sheet[open]').waitFor({ state: 'detached' }).catch(() => {});
    const quote = (await state()).orders.find((order) => order.client === 'Dora Teste');
    assert.equal(quote.status, 'Orçamento');
    await page.evaluate((id) => document.querySelector(`[data-act="open"][data-id="${id}"]`)?.click() ?? document.querySelector('#notice-decide [data-act]').click(), quote.id);
    if (await page.locator('#sheet .list-row').count()) await page.locator(`#sheet .list-row[data-id="${quote.id}"]`).click();
    await page.locator('#sheet [data-act="confirm"]').click();
    await page.locator('#conflict-text', { hasText: 'já está cheio' }).waitFor();
    assert.equal(await page.locator('#confirm-form [type=submit]').isVisible(), false, 'o botão que repetiria o erro some');
    assert.ok(await filled() <= 1, 'um botão cheio no conflito');
    await page.locator('#conflict [data-act="change-day"]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.name), 'date', 'Trocar o dia leva ao campo do dia');
    await page.locator('#conflict [data-act="confirm-anyway"]').click();
    await page.locator('#toast-text', { hasText: 'confirmado' }).waitFor();
    assert.equal((await state()).orders.find((order) => order.id === quote.id).status, 'Confirmado');
    results.push(`${width}: dia cheio num bloco só`);

    // 5. Dinheiro: "Ver os pagamentos" lista o que forma o Recebido do mês, e a soma bate.
    await page.locator('.bar [data-tab="dinheiro"]').click();
    await page.locator('#money-received').waitFor();
    const total = cents(await page.locator('#money-received').innerText());
    await page.locator('[data-act="month-payments"]').click();
    const rows = await page.locator('#month-payments .list-row strong').allInnerTexts();
    assert.equal(rows.reduce((sum, text) => sum + cents(text.split('·')[0]), 0), total, 'a lista soma o Recebido');
    assert.equal(await page.locator('h1').count(), 1, 'um título principal só');
    await page.locator('#month-payments .list-row').first().click();
    await page.locator('#sheet-back:visible').click();
    await page.locator('#month-payments').waitFor();
    results.push(`${width}: Recebido com a lista dos pagamentos`);

    assert.deepEqual(errors, [], 'sem erro no console');
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await browser.close();
  server.close();
}
