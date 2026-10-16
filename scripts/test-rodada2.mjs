// Rodada 2 da auditoria (16/10): o que um usuário perceberia se voltasse a quebrar.
// Roda na demonstração, sem rede, em 320, 390 e 1440 px.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const check = (name) => results.push(name);
try {
  for (const [width, height] of [[320, 640], [390, 844], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', (route) => new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();

    // Etapa 3: a Agenda responde "o que faço hoje?": semana acima da lista, primeiro pedido sem rolar,
    // cobranças e decisões numa lista só, nenhum resumo financeiro na Agenda.
    const week = await page.locator('#view-today .vn-weekbar').boundingBox();
    const list = await page.locator('#view-today #today-list-title').boundingBox();
    assert.ok(week && list && week.y < list.y, 'a semana fica acima da lista do dia');
    const firstOrder = await page.locator('#view-today .today-agenda .vn-order').first().boundingBox();
    if (height >= 800) assert.ok(firstOrder.y + 60 < height, `primeiro pedido fora da primeira tela (${Math.round(firstOrder.y)})`);
    assert.equal(await page.locator('#view-today .finance-summary').count(), 0, 'resumo financeiro saiu da Agenda');
    assert.match(await page.locator('#view-today .vn-attention').innerText(), /Pedem sua atenção[\s\S]*Pedido novo pelo link/);
    check(`${width}px: Agenda com a semana no topo e o dia na primeira tela`);

    // Etapa 0: Pedidos mostra o dia de cada pedido e começa pelo que está em aberto.
    await page.locator('[data-view="orders"]:visible').first().click();
    const cards = page.locator('#view-orders .vn-order');
    await cards.first().waitFor();
    // Etapa 4: a lista é agrupada por dia; cada grupo diz o dia.
    const labels = await page.locator('#view-orders .vn-date-head').allInnerTexts();
    assert.ok(labels.length >= 8, `grupos por dia (${labels.length})`);
    assert.ok(labels.every((label) => /\d/.test(label) || /Sem data/.test(label)), `cabeçalho de dia vazio: ${labels.join('|')}`);
    assert.match(labels[0], /^Hoje, /);
    const firstText = await cards.first().innerText();
    assert.doesNotMatch(firstText, /Entregue/, 'a lista começa pelos pedidos em aberto');
    check(`${width}px: Pedidos com dia e em aberto primeiro`);

    // Etapa 1: entregue com saldo nunca fica verde; o carimbo diz quanto falta.
    const roberta = page.locator('#view-orders .vn-order', { hasText: 'Roberta' }).first();
    assert.equal(await roberta.locator('.vn-stamp.is-ok').count(), 0, 'entregue com saldo aparece como conferido');
    assert.match(await roberta.locator('.vn-stamp').innerText(), /Falta R\$\s?55/);
    const marcos = page.locator('#view-orders .vn-order', { hasText: 'Marcos' }).first();
    assert.match(await marcos.locator('.vn-stamp').innerText(), /R\$\s?28,50\s+falta o sinal/);
    const juliana = page.locator('#view-orders .vn-order', { hasText: 'Juliana' }).first();
    assert.match(await juliana.locator('.vn-stamp').innerText(), /Pix R\$\s?60\s+falta conferir/);
    check(`${width}px: carimbo com valor`);

    // Etapa 0: linha do Pix informado sem quebrar letra por letra; foto do combinado contida.
    await page.locator('#view-orders .vn-order', { hasText: 'Juliana' }).first().locator('.vn-open').click();
    await page.locator('#detail-dialog[open]').waitFor();
    const note = await page.locator('#detail-dialog .payment-note').first().boundingBox();
    assert.ok(note.width > 120, `descrição do pagamento espremida (${note.width}px)`);
    const contained = await page.evaluate(() => {
      const box = document.querySelector('#detail-dialog .detail-summary');
      const img = box?.querySelector('img');
      return !img || img.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + 1;
    });
    assert.ok(contained, 'a foto do combinado sai do próprio bloco');
    // Etapa 2: o botão de conferir aparece sem rolar, acima do rodapé fixo, e é o único da ficha.
    const confirm = page.locator('#detail-dialog [data-action="confirm-payment"]');
    assert.equal(await confirm.count(), 1, 'um botão de conferir por pagamento informado');
    const footerTop = await page.locator('#detail-dialog .detail-actions').evaluate((el) => el.getBoundingClientRect().top);
    const confirmBox = await confirm.boundingBox();
    if (height >= 800) assert.ok(confirmBox.y + confirmBox.height <= footerTop + 1, `conferir escondido sob o rodapé (${Math.round(confirmBox.y + confirmBox.height)} > ${Math.round(footerTop)})`);
    await page.keyboard.press('Escape');
    check(`${width}px: ficha sem linha espremida nem foto vazando, conferir à vista`);

    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'rolagem lateral');
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ passed: results.length, results }));
