// Rodada 2 da auditoria (16/10): o que um usuário perceberia se voltasse a quebrar.
// Roda na demonstração, sem rede, em 320, 390 e 1440 px.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const check = (name) => results.push(name);
try {
  for (const [width, height] of [[320, 640], [360, 800], [390, 844], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', (route) => new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();

    // Simplificação, etapa 2: Hoje responde "o que faço agora?". O título traz o número do que pede você,
    // a lista vem primeiro e as entregas de hoje logo abaixo; a semana com as vagas fica em Pedidos > Semana.
    const pending = await page.locator('#attention-title .vn-count').innerText();
    assert.equal(await page.locator('#today-title').innerText(), `${pending} coisas pedem você`);
    assert.equal(await page.locator('#view-today .vn-weekbar, #view-today .agenda-mode').count(), 0, 'Hoje sem a semana nem a chave de modo');
    const attention = await page.locator('#view-today .vn-attention').boundingBox();
    const todayList = await page.locator('#view-today #hoje-list-title').boundingBox();
    assert.ok(attention.y < todayList.y, 'o que pede você vem antes das entregas de hoje');
    assert.ok(attention.y < height, 'o que pede você já na primeira tela');
    assert.match(await page.locator('#hoje-list-title').innerText(), /Entregas de hoje/);
    assert.equal(await page.locator('#view-today .finance-summary').count(), 0, 'resumo financeiro saiu da Agenda');
    assert.match(await page.locator('#view-today .vn-attention').innerText(), /Pedido novo pelo link/);
    assert.equal(await page.locator('#view-today .vn-schedule .vn-attention').count(), 1, 'a lista fica na coluna principal em todas as larguras');
    check(`${width}px: Hoje com o que pede você no topo e as entregas de hoje logo abaixo`);


    // Etapa 0: Pedidos mostra o dia de cada pedido e começa pelo que está em aberto.
    await page.locator('[data-view="orders"]:visible').first().click();
    const cards = page.locator('#view-orders .vn-order');
    await cards.first().waitFor();
    // Etapa 4: a lista é agrupada por dia; cada grupo diz o dia.
    const labels = await page.locator('#view-orders .vn-date-head').allInnerTexts();
    // Rodada 5: dias com pedido em aberto (5 na demo) + o entregue que ainda deve; o histórico vira lista de linhas.
    assert.ok(labels.length >= 6, `grupos por dia (${labels.length})`);
    assert.ok(labels.every((label) => /\d/.test(label) || /Sem data/.test(label)), `cabeçalho de dia vazio: ${labels.join('|')}`);
    assert.match(labels[0], /^Hoje, /);
    const firstText = await cards.first().innerText();
    assert.doesNotMatch(firstText, /Entregue/, 'a lista começa pelos pedidos em aberto');
    check(`${width}px: Pedidos com dia e em aberto primeiro`);

    // Rodada 5: encerrados sem pendência viram uma linha cada (data no lugar da hora); o que ainda deve continua cartão.
    const history = page.locator('#view-orders .vn-history .vn-line.is-history');
    assert.ok(await history.count() >= 8, `histórico em linhas (${await history.count()})`);
    assert.equal(await page.locator('#view-orders .vn-closed-group .vn-order', { hasText: 'Roberta' }).count(), 1, 'entregue com saldo continua cartão');
    const lineBox = await history.first().boundingBox();
    assert.ok(lineBox.height <= 80, `linha do histórico alta demais (${Math.round(lineBox.height)})`);
    // Botão cheio só para o que é para agora (hoje, amanhã, decisões); dias mais distantes, o mesmo verbo mais calmo.
    const saturday = page.locator('#view-orders .vn-order', { hasText: 'Sônia' }).first();
    assert.equal(await saturday.locator('.vn-btn.secondary[data-action="advance-order"]').count(), 1, 'sábado com botão calmo');
    const todayCard = page.locator('#view-orders .vn-order', { hasText: 'Marcos' }).first();
    assert.equal(await todayCard.locator('.vn-btn.primary[data-action="advance-order"]').count(), 1, 'hoje com botão cheio');
    const decision = page.locator('#view-orders .vn-order', { hasText: 'Renata' }).first();
    assert.equal(await decision.locator('.vn-btn.primary[data-action="confirm-order"]').count(), 1, 'decisão continua cheia');
    check(`${width}px: histórico em linhas e peso do botão pelo tempo`);

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
    assert.ok(confirmBox.y + confirmBox.height <= footerTop + 1, `conferir escondido sob o rodapé (${Math.round(confirmBox.y + confirmBox.height)} > ${Math.round(footerTop)})`);
    await page.keyboard.press('Escape');
    check(`${width}px: ficha sem linha espremida nem foto vazando, conferir à vista`);

    // Etapa 6: na demonstração o botão verde aparece e mostra a mensagem, sem abrir o WhatsApp.
    await page.locator('#view-orders .vn-order', { hasText: 'Marcos' }).first().locator('.vn-open').click();
    const zap = page.locator('#detail-dialog [data-action="demo-whatsapp"]');
    assert.match(await zap.innerText(), /Pedir o sinal de R\$\s?28,50/);
    assert.equal(await page.locator('#detail-dialog a[href*="wa.me"]').count(), 0, 'demonstração nunca abre o WhatsApp');
    await zap.click();
    assert.match(await page.locator('#zap-demo-dialog[open] #zap-demo-text').innerText(), /Oi, Marcos!/);
    await page.locator('#zap-demo-dialog button[type=submit]').click();
    await page.keyboard.press('Escape');
    check(`${width}px: WhatsApp visível na demonstração, sem abrir nada`);

    // Rodada 3: com a ficha aberta, rolar sobre o fundo escurecido não mexe na lista de trás.
    await page.evaluate(() => scrollTo(0, 400));
    const before = await page.evaluate(() => scrollY);
    await page.locator('#view-orders .vn-order', { hasText: 'Juliana' }).first().locator('.vn-open').evaluate((el) => el.click());
    await page.locator('#detail-dialog[open]').waitFor();
    await page.mouse.move(2, height - 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => scrollY), before, 'a página de trás rolou com a janela aberta');
    await page.keyboard.press('Escape');
    check(`${width}px: janela não rola a página de trás`);

    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'rolagem lateral');
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Rodada 5: entregue que ainda deve nunca vira linha discreta do histórico, inclusive quando
  // nada foi conferido (saldo indefinido) ou só há Pix informado. Quitado e sem valor viram linha.
  {
    const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T15:00`; };
    const order = (id, extra) => ({ id, client: `QA ${id}`, product: `Teste ${id}`, total: 100, status: 'Entregue', mode: 'Retirada', dueAt: day(-3), history: [], createdAt: '2026-10-01T12:00:00.000Z', ...extra });
    const fixture = { version: 1, orders: [
      // Um pedido em aberto, para o histórico ficar recolhido com "Ver mais" como no uso normal.
      order('aberto', { status: 'Confirmado', dueAt: day(1) }),
      order('sem-pagamento'), order('so-informado'), order('parcial'), order('quitado'), order('sem-valor', { total: 0, totalKnown: false }),
      ...Array.from({ length: 9 }, (_, i) => order(`antigo-${i}`, { dueAt: day(-10 - i) })),
    ], payments: [
      ['so-informado', 100, 'Informado'], ['parcial', 40, 'Conferido'], ['quitado', 100, 'Conferido'],
      ...Array.from({ length: 9 }, (_, i) => [`antigo-${i}`, 100, 'Conferido']),
    ].map(([orderId, amount, status], i) => ({ id: `p-${i}`, orderId, amount, status, createdAt: '2026-10-02T12:00:00.000Z' })) };
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', (route) => new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort());
    await context.addInitScript((seed) => { localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })); if (!localStorage.getItem('doce-agenda.demo.v2')) localStorage.setItem('doce-agenda.demo.v2', JSON.stringify(seed)); }, fixture);
    const page = await context.newPage();
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();
    await page.locator('[data-view="orders"]:visible').first().click();
    await page.locator('#view-orders .vn-closed-group').waitFor();
    for (const id of ['sem-pagamento', 'so-informado', 'parcial']) {
      assert.equal(await page.locator(`#view-orders .vn-closed-group .vn-order[data-open-order="${id}"]:visible`).count(), 1, `${id}: entregue que deve fica como cartão à vista`);
    }
    for (const id of ['quitado', 'sem-valor']) {
      assert.equal(await page.locator(`#view-orders .vn-line.is-history[data-open-order="${id}"]`).count(), 1, `${id}: vira linha do histórico`);
    }
    await context.close();
    check('360px: entregue sem conferido ou com saldo nunca fica escondido no histórico');
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ passed: results.length, results }));
