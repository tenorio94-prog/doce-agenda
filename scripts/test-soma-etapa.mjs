// Soma por etapa em Pedidos: node scripts/build-cloudflare.mjs && node scripts/test-soma-etapa.mjs
// Ao lado de "N pedidos encontrados": Para decidir soma os valores; Combinados e Entregues mostram o que falta
// receber pelo dinheiro conferido (Pix informado não conta). Valores conferidos contra a demo, em centavos.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const brl = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100).replace(/,00$/, '').replace(/\s+/g, ' ');
const norm = (text) => text.replace(/\s+/g, ' ');
try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();
    // O esperado sai do próprio armazenamento da demo, com a regra do Meu mês: só o conferido conta.
    const expected = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('doce-agenda.demo.v2'));
      const cents = (value) => Math.round(Number(value || 0) * 100);
      const own = state.orders.filter((order) => !order.isSample && !order.isDemo && !order.sample);
      const paid = (id) => state.payments.filter((payment) => payment.orderId === id && payment.status === 'Conferido').reduce((sum, payment) => sum + cents(payment.amount), 0);
      const known = (order) => order.totalKnown !== false && cents(order.total) > 0;
      const pick = (statuses) => own.filter((order) => statuses.includes(order.status));
      const due = (list) => list.filter(known).reduce((sum, order) => sum + Math.max(0, cents(order.total) - paid(order.id)), 0);
      const fresh = pick(['Solicitação', 'Orçamento', 'Aguardando confirmação']);
      return { decide: fresh.filter(known).reduce((sum, order) => sum + cents(order.total), 0), decideOpen: fresh.filter((order) => !known(order)).length,
        combined: due(pick(['Confirmado', 'Em produção', 'Pronto'])), delivered: due(pick(['Entregue'])) };
    });
    await page.locator('.nav-item[data-view="orders"]:visible').first().click();
    const line = page.locator('#view-orders .order-results');
    assert.doesNotMatch(norm(await line.innerText()), /R\$/, 'em Todos, só a contagem');
    const pickStage = async (key) => { await page.locator(`[data-stage="${key}"]`).click(); return norm(await line.innerText()); };
    const decide = await pickStage('new');
    if (expected.decide) assert.ok(decide.includes(`${brl(expected.decide)} para decidir`), decide);
    if (expected.decideOpen) assert.ok(decide.includes(`${expected.decideOpen} sem valor`), decide);
    const combined = await pickStage('confirmed');
    assert.ok(expected.combined > 0, 'a demo tem combinados com saldo');
    assert.ok(combined.includes(`${brl(expected.combined)} a receber`), combined);
    const delivered = await pickStage('delivered');
    assert.ok(delivered.includes(expected.delivered ? `${brl(expected.delivered)} a receber` : 'tudo recebido'), delivered);
    assert.doesNotMatch(norm(await pickStage('closed')), /R\$|recebido/);

    // Conferir o Pix informado de um combinado diminui o "a receber" na hora.
    const informed = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('doce-agenda.demo.v2'));
      const payment = state.payments.find((item) => item.status === 'Informado' && ['Confirmado', 'Em produção', 'Pronto'].includes(state.orders.find((order) => order.id === item.orderId)?.status));
      return payment && { orderId: payment.orderId, cents: Math.round(Number(payment.amount) * 100) };
    });
    if (informed) {
      await pickStage('confirmed');
      await page.locator(`#view-orders [data-open-order="${informed.orderId}"]`).first().click();
      await page.locator('#detail-dialog[open] [data-action="confirm-payment"]').click();
      await page.locator('#toast').filter({ hasText: 'conferido' }).waitFor();
      await page.keyboard.press('Escape');
      assert.ok(norm(await line.innerText()).includes(`${brl(expected.combined - informed.cents)} a receber`), 'Pix conferido entra no recebido');
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    assert.deepEqual(errors, []);
    results.push(`${width}px: Para decidir, Combinados e Entregues com soma pelo conferido; Pix conferido atualiza`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
