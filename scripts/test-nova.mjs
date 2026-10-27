// Versão nova das telas da confeiteira (Etapa 1): os critérios de aceite de docs/NOVA_VERSAO.md.
//   node scripts/build-cloudflare.mjs && node scripts/test-nova.mjs [pasta-de-capturas]
// Relógio fixo numa terça (27/10/2026, 12h em São Paulo); os dados são o exemplo da demonstração.
// axe: usa axe-core se estiver em DOCE_AXE ou em ../doce-agenda-auditoria (fora do site); sem ele, avisa e segue.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite, siteRoot } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const axePath = [process.env.DOCE_AXE, path.resolve(siteRoot, '..', '..', '..', 'doce-agenda-auditoria', 'node_modules', 'axe-core', 'axe.min.js')].find((file) => file && existsSync(file));
const axeSource = axePath ? await readFile(axePath, 'utf8') : '';
if (!axeSource) console.warn('axe-core não encontrado: acessibilidade automática não conferida nesta rodada.');

const NOW = new Date('2026-10-27T12:00:00-03:00');
const TODAY = '2026-10-27', TOMORROW = '2026-10-28', SATURDAY = '2026-10-31', SUNDAY = '2026-11-01';
const FORBIDDEN = ['vaga', 'informado', 'solicitação', 'carimbo', 'etapa', 'fazendo', 'em produção', 'aguardando confirmação'];

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const cents = (text) => Math.round(Number(text.replace(/[^\d,]/g, '').replace(',', '.')) * 100);

async function open(width, height, url = '/demo/') {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [], texts = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => { if (/wa\.me|whatsapp/i.test(request.url())) errors.push(`abriu WhatsApp: ${request.url()}`); });
  await page.clock.setFixedTime(NOW);
  await page.goto(server.origin + url);
  await page.locator('#days .order').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Guarda o texto visível de cada passo, para conferir as palavras e a rolagem lateral.
  const look = async (label) => {
    texts.push(await page.evaluate(() => document.body.innerText));
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(wide, false, `sem rolagem lateral em ${width}px (${label})`);
    const filled = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      return [...(dialog || document).querySelectorAll('.btn-primary')].filter((el) => el.offsetParent !== null && (dialog || !el.closest('dialog'))).length;
    });
    assert.ok(filled <= 1, `no máximo um botão cheio (${label}): ${filled}`);
    if (axeSource) {
      if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })).violations
        .map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
      assert.deepEqual(violations, [], `axe sem violações (${label})`);
    }
  };
  const api = (route, options) => page.evaluate(async ([r, o]) => { const res = await window.DoceApi.fetch(r, o); return res.json(); }, [route, options]);
  const order = async (id) => (await api('/api/state')).orders.find((item) => item.id === id);
  const finish = async () => {
    const all = texts.join('\n').toLocaleLowerCase('pt-BR');
    assert.deepEqual(FORBIDDEN.filter((word) => all.includes(word)), [], 'nenhuma palavra proibida');
    assert.deepEqual(errors, [], 'sem erro no console');
    await context.close();
  };
  return { context, page, look, api, order, finish, errors };
}
const sheet = (page) => page.locator('#sheet[open]');
const closeSheet = async (page) => { await page.locator('#sheet [data-act="close"]').click(); await page.locator('#sheet[open]').waitFor({ state: 'detached' }).catch(() => {}); };
const tab = (page, name) => page.locator(`.bar [data-tab="${name}"]`).click();
async function received(page) {
  await tab(page, 'dinheiro');
  await page.locator('#money-received').waitFor();
  const value = cents(await page.locator('#money-received').innerText());
  await tab(page, 'agenda');
  return value;
}

try {
  for (const [width, height] of [[360, 640], [390, 844], [1280, 800]]) {
    const { page, look, order, finish, api } = await open(width, height);
    await look('agenda');
    if (shots) await page.screenshot({ path: path.join(shots, `nova-agenda-${width}.png`) });

    // 1. Os pedidos de hoje à vista, sem rolar, acima da barra de baixo.
    const barTop = await page.locator('.bar').evaluate((el) => el.getBoundingClientRect().top);
    const today = page.locator(`#d-${TODAY} .order`);
    assert.equal(await today.count(), 3, 'três pedidos hoje no exemplo');
    for (const box of await today.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().bottom))) assert.ok(box <= barTop, `pedido de hoje sem rolar (${box} ≤ ${barTop})`);
    assert.match(await page.locator(`#d-${TODAY} .day-meta`).innerText(), /3 pedidos · cheio/);
    assert.match(await page.locator('#notice-decide').innerText(), /2 pedidos para decidir/);
    assert.match(await page.locator('#demo-line').innerText(), /Exemplo de uma semana de encomendas\./);
    assert.match(await page.locator('#days').innerText(), /nada marcado/, 'dia vazio em linha curta');
    results.push(`${width}: hoje à vista`);

    // 4. Tocar em amanhã na faixa mostra os pedidos de amanhã.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator(`.wk-day[data-day="${TOMORROW}"]`).click();
    await page.waitForFunction((day) => { const r = document.getElementById(`d-${day}`).getBoundingClientRect(); return r.top >= 0 && r.top < 120; }, TOMORROW);
    assert.match(await page.locator(`#d-${TOMORROW}`).innerText(), /Amanhã[\s\S]*Carla/);
    results.push(`${width}: faixa leva a amanhã`);

    // 6. Entregue com Desfazer; o pedido entregue fica riscado no fim do dia.
    const juliana = page.locator(`#d-${TODAY} .order[data-id="DEMO-09"]`);
    await juliana.locator('.order-done').click();
    await page.locator('#toast-undo:visible').waitFor();
    assert.equal(await page.locator('#toast-text').innerText(), 'Pedido entregue: Docinhos sortidos (50 un.).', 'aviso sem errar o plural');
    assert.equal(await page.locator(`#d-${TODAY} .order`).last().getAttribute('data-id'), 'DEMO-09', 'entregue vai para o fim do dia');
    assert.equal((await order('DEMO-09')).status, 'Entregue');
    await page.locator('#toast-undo').click();
    await page.waitForFunction(() => !document.querySelector('.order[data-id="DEMO-09"]').classList.contains('is-done'));
    assert.equal((await order('DEMO-09')).status, 'Confirmado', 'desfazer volta à situação de antes');
    results.push(`${width}: entregue e desfazer`);

    // Pix avisado pela cliente: anotação na ficha, "Vi na conta" passa a recebido.
    await juliana.locator('.order-open').click();
    await sheet(page).locator('text=A cliente avisou que pagou R$ 60. Já viu na conta?').waitFor();
    assert.match(await page.locator('#money-line').innerText(), /Total R\$ 120 · Recebido R\$ 0 · Falta R\$ 120/);
    await look('ficha com aviso de pagamento');
    if (shots) await page.screenshot({ path: path.join(shots, `nova-ficha-${width}.png`) });
    await sheet(page).locator('[data-act="seen"]').click();
    await page.locator('#money-line', { hasText: 'Recebido R$ 60 · Falta R$ 60' }).waitFor();
    await closeSheet(page);

    // 2. "Ana, bolo de cenoura, sábado 15h, R$ 120".
    const before = await received(page);
    await page.locator('.bar [data-act="new"]').click();
    const form = page.locator('#order-form');
    await form.locator('[name=client]').fill('Ana');
    await form.locator('[name=product]').fill('Bolo de cenoura');
    await form.locator('[name=date]').fill(SATURDAY);
    await form.locator('[name=time]').fill('15:00');
    await form.locator('[name=total]').fill('120');
    await look('novo pedido');
    if (shots) await page.screenshot({ path: path.join(shots, `nova-novo-${width}.png`) });
    await form.locator('[type=submit]').click();
    await page.locator('#sheet[open]').waitFor({ state: 'detached' }).catch(() => {});
    const ana = page.locator(`#d-${SATURDAY} .order`, { hasText: 'Ana' });
    await ana.waitFor();
    assert.match(await ana.innerText(), /15h[\s\S]*Bolo de cenoura[\s\S]*Ana[\s\S]*Falta R\$ 120/);
    assert.doesNotMatch(await ana.innerText(), /Retirada/, 'retirada é o normal e não aparece');
    results.push(`${width}: anotar no sábado`);

    // 3. Recebi R$ 50 → Falta R$ 70, e o Dinheiro soma R$ 50.
    await ana.locator('.order-open').click();
    await sheet(page).locator('[data-act="received"]').click();
    assert.equal(await page.locator('#pay-form [name=amount]').inputValue(), '120', 'sugere o que falta');
    await page.locator('#pay-form [name=amount]').fill('50');
    await look('recebi');
    await page.locator('#pay-form [type=submit]').click();
    await page.locator('#money-line', { hasText: 'Falta R$ 70' }).waitFor();
    await closeSheet(page);
    assert.match(await ana.innerText(), /Falta R\$ 70/);
    const after = await received(page);
    assert.equal(after - before, 5000, 'Recebido soma R$ 50');
    await tab(page, 'dinheiro');
    await page.locator('#coming-list').waitFor();
    await look('dinheiro');
    if (shots) await page.screenshot({ path: path.join(shots, `nova-dinheiro-${width}.png`) });
    assert.match(await page.locator('#coming-list').innerText(), /Ana[\s\S]*Falta R\$ 70/, 'confirmado com saldo: ainda vai entrar');
    await tab(page, 'agenda');
    results.push(`${width}: recebi e Dinheiro`);

    // 5. Aceitar o pedido da Camila: o que ela pediu vem antes dos botões; depois sai do aviso e entra no domingo.
    await page.locator('#notice-decide [data-act="list"]').click();
    await sheet(page).locator('[data-act="open"]', { hasText: 'Camila' }).click();
    const order15 = sheet(page).locator('.ficha');
    await order15.locator('text=Para 20 pessoas').waitFor();
    assert.ok(await order15.evaluate((el) => {
      const notes = [...el.querySelectorAll('.f-notes')][0], button = el.querySelector('[data-act="accept"]');
      return !!(notes.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), 'o pedido vem antes de Aceitar');
    await look('pedido do link');
    await order15.locator('[data-act="accept"]').click();
    await page.locator('#accept-form [name=total]').fill('150');
    await look('aceitar');
    await page.locator('#accept-form [type=submit]').click();
    await page.locator(`#d-${SUNDAY} .order[data-id="DEMO-15"]`).waitFor();
    assert.equal((await order('DEMO-15')).status, 'Confirmado');
    assert.doesNotMatch(await page.locator('#notice-decide').innerText(), /Camila/);
    assert.match(await page.locator('#notice-decide').innerText(), /Renata espera sua resposta/);
    assert.match(await page.locator(`#d-${SUNDAY} .order[data-id="DEMO-15"]`).innerText(), /Falta R\$ 150/);
    results.push(`${width}: aceitar pelo link`);

    // Dia cheio: a mensagem do servidor e "Salvar mesmo assim".
    await page.locator('.bar [data-act="new"]').click();
    await form.locator('[name=client]').fill('Lia Nove');
    await form.locator('[name=product]').fill('Pudim');
    await form.locator('[data-act="quick"][data-days="0"]').click();
    await form.locator('[name=time]').fill('19:00');
    await form.locator('[type=submit]').click();
    await page.locator('#form-error', { hasText: 'O limite de pedidos para esta data foi atingido.' }).waitFor();
    await look('dia cheio');
    await page.locator('[data-act="force-save"]').click();
    await page.locator(`#d-${TODAY} .order`, { hasText: 'Lia Nove' }).waitFor();
    assert.match(await page.locator(`#d-${TODAY} .order`, { hasText: 'Lia Nove' }).innerText(), /Valor a combinar/);
    results.push(`${width}: salvar mesmo assim`);

    // 8. Editar um pedido com bolo, vagas e próxima ação não apaga esses campos.
    const created = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      client: 'Teresa', product: 'Bolo de nozes', dueAt: '2026-11-03T10:00', total: 200, totalKnown: true, status: 'Confirmado', slots: 2,
      nextAction: 'Comprar nozes', pendingChange: 'Talvez troque o recheio', details: 'Sem açúcar no topo',
      cake: { templateVersion: 1, values: { size: '2 kg', filling: 'Doce de leite' }, labels: { size: 'Tamanho', filling: 'Recheio' } },
    }) });
    await page.reload();
    await page.locator(`#d-2026-11-03 .order[data-id="${created.id}"]`).waitFor();
    await page.locator(`.order[data-id="${created.id}"] .order-open`).click();
    assert.match(await sheet(page).innerText(), /Tamanho[\s\S]*2 kg[\s\S]*Recheio[\s\S]*Doce de leite/);
    await sheet(page).locator('[data-act="edit"]').click();
    await form.locator('[name=details]').fill('Sem açúcar no topo. Vela azul.');
    await form.locator('[type=submit]').click();
    await page.locator('#toast', { hasText: 'Pedido salvo.' }).waitFor();
    const edited = await order(created.id);
    assert.equal(edited.details, 'Sem açúcar no topo. Vela azul.');
    assert.equal(edited.slots, 2);
    assert.equal(edited.nextAction, 'Comprar nozes');
    assert.equal(edited.pendingChange, 'Talvez troque o recheio');
    assert.deepEqual(edited.cake.values, { size: '2 kg', filling: 'Doce de leite' });
    assert.equal(edited.status, 'Confirmado');
    results.push(`${width}: editar preserva bolo e vagas`);

    // Meu link (inativo no exemplo) e menu.
    await page.locator('[data-act="link"]').click();
    await page.locator('#link-wizard').waitFor();
    await look('meu link');
    await closeSheet(page);
    await page.locator('[data-act="menu"]').click();
    await sheet(page).locator('[data-act="days"]').click();
    await page.locator('#days-form').waitFor();
    assert.equal(await page.locator('#days-form [name=limit]').inputValue(), '3');
    await look('dias e limite');
    await closeSheet(page);
    await finish();
  }

  // Recusar e avisar no WhatsApp (só o texto na demonstração).
  {
    const { page, look, order, finish } = await open(360, 740);
    await page.locator('#notice-decide [data-act="list"]').click();
    await sheet(page).locator('[data-act="open"]', { hasText: 'Camila' }).click();
    await sheet(page).locator('[data-act="refuse"]').click();
    await page.locator('#refuse-form [name=reason]').fill('Agenda cheia no domingo');
    await page.locator('#refuse-form [type=submit]').click();
    await sheet(page).locator('[data-act="refuse-message"]').click();
    assert.match(await page.locator('#message-text').innerText(), /Oi, Camila! .*não vou conseguir atender o pedido de bolo de aniversário para domingo, 1\/11/);
    await look('avisar recusa');
    await closeSheet(page);
    assert.equal((await order('DEMO-15')).status, 'Recusado');
    assert.match(await page.locator('#notice-decide').innerText(), /Renata/);
    assert.equal(await page.locator('.order[data-id="DEMO-15"]').count(), 0, 'recusado fica fora da agenda');
    // Cobrar no WhatsApp: mensagem pronta, sem abrir nada.
    await page.locator(`#d-${TODAY} .order[data-id="DEMO-07"] .order-open`).click();
    await sheet(page).locator('[data-act="charge"]').click();
    assert.match(await page.locator('#message-text').innerText(), /Oi, Ana! .*falta R\$ 90/);
    await closeSheet(page);
    // Semana passada pelas setas, e de volta.
    await page.locator('[data-act="week"][data-step="-7"]').click();
    assert.match(await page.locator('.week-title').innerText(), /19\/10 a 25\/10/);
    await page.locator('.wk-day[data-day="2026-10-21"]').click();
    await page.locator('#d-2026-10-21').waitFor();
    await finish();
    results.push('360: recusar, cobrar e semana passada');
  }

  // 7. O mesmo armazenamento da versão completa (/demo/completa/), nos dois sentidos; /demo/nova/ continua abrindo a tela nova.
  {
    const { page, context, api, finish } = await open(360, 800);
    await page.locator('.bar [data-act="new"]').click();
    const form = page.locator('#order-form');
    await form.locator('[name=client]').fill('Joana Sete');
    await form.locator('[name=product]').fill('Torta de maçã');
    await form.locator('[name=date]').fill('2026-10-30');
    await form.locator('[name=time]').fill('16:00');
    await form.locator('[type=submit]').click();
    await page.locator('.order', { hasText: 'Joana Sete' }).waitFor();
    const old = await context.newPage();
    await old.clock.setFixedTime(NOW);
    await old.goto(`${server.origin}/demo/completa/`);
    await old.locator('#today-title').waitFor();
    await old.locator('[data-view="orders"]:visible').first().click();
    await old.locator('#view-orders', { hasText: 'Joana Sete' }).waitFor();
    await old.evaluate(() => window.DoceApi.fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: 'Rita Oito', product: 'Brigadeiro (cento)', dueAt: '2026-11-02T10:00', total: 95, status: 'Confirmado' }) }));
    await old.close();
    await page.reload();
    await page.locator('#d-2026-11-02 .order', { hasText: 'Rita Oito' }).waitFor();
    assert.ok((await api('/api/state')).orders.some((item) => item.client === 'Joana Sete'));
    await page.goto(`${server.origin}/demo/nova/`);
    await page.locator('#d-2026-11-02 .order', { hasText: 'Rita Oito' }).waitFor();
    await finish();
    results.push('360: /demo/, /demo/nova/ e /demo/completa/ com os mesmos pedidos');
  }

  // Sem rolagem lateral em 320 px nas telas principais.
  {
    const { page, look, finish } = await open(320, 640);
    await look('agenda 320');
    await page.locator(`#d-${TODAY} .order-open`).first().click();
    await look('ficha 320');
    await closeSheet(page);
    await page.locator('.bar [data-act="new"]').click();
    await look('novo 320');
    await closeSheet(page);
    await tab(page, 'dinheiro');
    await page.locator('#coming-list').waitFor();
    await look('dinheiro 320');
    await finish();
    results.push('320: sem rolagem lateral');
  }

  // noindex na página e na rota publicada.
  const html = await readFile(path.join(siteRoot, 'demo', 'nova', 'index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(await readFile(path.join(siteRoot, '_headers'), 'utf8'), /\/demo\/nova\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ passed: results.length, axe: axeSource ? 'conferido' : 'não disponível', results }, null, 2));
