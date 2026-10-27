// Ajustes de 27/10 da tela nova (docs/NOVA_VERSAO.md): tela vazia, Meu link na tela nova, landing,
// responder o pedido do link, Dinheiro em duas listas e a linha da agenda.
//   node scripts/build-cloudflare.mjs && node scripts/test-nova-ajustes.mjs [pasta-de-capturas]
// Relógio fixo numa terça (27/10/2026, 12h em São Paulo). axe como em test-nova.mjs (DOCE_AXE ou ../doce-agenda-auditoria).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createEmptyState } from '../cloud/state-engine.js';
import { chromium, serveSite, siteRoot } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const axePath = [process.env.DOCE_AXE, path.resolve(siteRoot, '..', '..', '..', 'doce-agenda-auditoria', 'node_modules', 'axe-core', 'axe.min.js')].find((file) => file && existsSync(file));
const axeSource = axePath ? await readFile(axePath, 'utf8') : '';
if (!axeSource) console.warn('axe-core não encontrado: acessibilidade automática não conferida nesta rodada.');

const NOW = new Date('2026-10-27T12:00:00-03:00');
const KEY = 'doce-agenda.demo.v2';
const FORBIDDEN = ['vaga', 'informado', 'solicitação', 'carimbo', 'etapa', 'fazendo', 'em produção', 'aguardando confirmação'];
const LANDING_OLD = ['informado', 'carimbo', 'meu mês', 'fazendo', 'ficou pronto', 'vaga', 'coisas pedem você', 'marcar conferido', 'ainda vou passar o preço', 'topo de hoje', 'aviso de pedido novo'];
const cents = (text) => Math.round(Number(String(text).replace(/[^\d,]/g, '').replace(',', '.')) * 100);

const server = await serveSite();
const browser = await chromium.launch();
const results = [];

async function open(width, height, { state = null, url = '/demo/' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  if (state) await context.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(state)]);
  const page = await context.newPage();
  const errors = [], texts = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => { if (/wa\.me|whatsapp\.com/i.test(request.url())) errors.push(`abriu WhatsApp: ${request.url()}`); });
  await page.clock.setFixedTime(NOW);
  await page.goto(server.origin + url);
  await page.locator('#views:not([hidden])').waitFor();
  await page.evaluate(() => document.fonts.ready);
  const look = async (label) => {
    texts.push(await page.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label'))].join('\n')));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `sem rolagem lateral em ${width}px (${label})`);
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
  const api = (route, options) => page.evaluate(async ([r, o]) => (await window.DoceApi.fetch(r, o)).json(), [route, options]);
  const finish = async () => {
    const all = texts.join('\n').toLocaleLowerCase('pt-BR');
    assert.deepEqual(FORBIDDEN.filter((word) => all.includes(word)), [], 'nenhuma palavra proibida');
    assert.deepEqual(errors, [], 'sem erro no console');
    await context.close();
  };
  return { context, page, look, api, finish };
}
const sheet = (page) => page.locator('#sheet[open]');
const closeSheet = async (page) => { await page.locator('#sheet [data-act="close"]').click(); await page.locator('#sheet[open]').waitFor({ state: 'detached' }).catch(() => {}); };

// Conta nova: nenhum pedido na agenda, só um cancelado (não conta).
const empty = createEmptyState();
empty.orders.push({ id: 'C-1', client: 'Bia', product: 'Pudim', details: '', dueAt: '2026-10-28T10:00', mode: 'Retirada', location: '', total: 70, status: 'Cancelado', nextAction: '', nextAt: '', pendingChange: '', contact: '', origin: 'manual', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), history: [] });

try {
  for (const [width, height] of [[320, 640], [360, 640], [390, 844], [1280, 800]]) {
    // 1. Tela vazia com convite; salvar o primeiro pedido traz a agenda.
    {
      const { page, look, finish } = await open(width, height, { state: empty });
      const start = page.locator('#empty-start');
      await start.waitFor();
      assert.match(await start.innerText(), /Anote sua primeira encomenda[\s\S]*Quem pediu, o quê, quando e o valor\. Leva um minuto\./);
      assert.equal(await page.locator('#week').count(), 0, 'sem faixa da semana');
      assert.doesNotMatch(await page.locator('#view-agenda').innerText(), /nada marcado/);
      assert.equal(await start.locator('.btn-primary').count(), 0, 'o convite é de contorno; o cheio é o da barra');
      await look('tela vazia');
      if (shots) await page.screenshot({ path: path.join(shots, `vazia-${width}.png`) });
      await start.locator('[data-act="link"]').click();
      await page.locator('#link-wizard').waitFor();
      await closeSheet(page);
      await start.locator('[data-act="new"]').click();
      const form = page.locator('#order-form');
      await form.locator('[name=client]').fill('Primeira Cliente');
      await form.locator('[name=product]').fill('Bolo de fubá');
      await form.locator('[data-act="quick"][data-days="1"]').click();
      await form.locator('[name=time]').fill('10:00');
      await form.locator('[type=submit]').click();
      await page.locator('#d-2026-10-28 .order', { hasText: 'Primeira Cliente' }).waitFor();
      assert.equal(await page.locator('#empty-start').count(), 0);
      assert.equal(await page.locator('#week').count(), 1, 'a agenda normal volta');
      await finish();
      results.push(`${width}: tela vazia e primeiro pedido`);
    }

    // 2-6 sobre o exemplo da demonstração.
    const { page, look, api, finish } = await open(width, height);

    // 6. Linha da agenda: sem "Retirada"; "Entrega" quando for; nome longo em 2 linhas, inteiro.
    const days = await page.locator('#days').innerText();
    assert.doesNotMatch(days, /Retirada/);
    assert.match(await page.locator('.order[data-id="DEMO-10"]').innerText(), /Carla · Entrega/);
    await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: 'Helena', product: 'Bolo de chocolate com morango', dueAt: '2026-10-30T16:00', total: 230, status: 'Confirmado' }) });
    await page.reload();
    const long = page.locator('#d-2026-10-30 .order', { hasText: 'Helena' }).locator('.o-what');
    await long.waitFor();
    const box = await long.evaluate((el) => { const s = getComputedStyle(el); return { lines: Math.round(el.clientHeight / parseFloat(s.lineHeight)), clipped: el.scrollHeight > el.clientHeight + 1, nowrap: s.whiteSpace === 'nowrap' }; });
    assert.equal(box.nowrap, false, 'o nome quebra linha');
    assert.equal(box.clipped, false, 'nada cortado');
    assert.ok(box.lines <= 2, `até 2 linhas: ${box.lines}`);
    if (width <= 390) assert.equal(box.lines, 2, 'nome longo usa a segunda linha no celular');
    results.push(`${width}: linha da agenda`);

    // 4. Pedido do link: "O que ela pediu" antes de Aceitar/Recusar; responder sem decidir.
    await page.locator('#notice-decide [data-act="list"]').click();
    await sheet(page).locator('[data-act="open"]', { hasText: 'Camila' }).click();
    const ficha = sheet(page).locator('.ficha');
    await ficha.locator('h3', { hasText: 'O que ela pediu' }).waitFor();
    assert.equal(await ficha.locator('h3', { hasText: 'O combinado' }).count(), 0);
    assert.ok(await ficha.evaluate((el) => {
      const asked = [...el.querySelectorAll('h3')].find((h) => h.textContent === 'O que ela pediu'), accept = el.querySelector('[data-act="accept"]'), refuse = el.querySelector('[data-act="refuse"]');
      return !!(asked.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(asked.compareDocumentPosition(refuse) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    await look('ficha do link');
    await ficha.locator('[data-act="reply"]').click();
    assert.match(await page.locator('#message-text').innerText(), /^Oi, Camila! Vi seu pedido de bolo de aniversário para domingo, 1\/11\./);
    await look('responder no WhatsApp');
    await closeSheet(page);
    assert.equal((await api('/api/state')).orders.find((o) => o.id === 'DEMO-15').status, 'Solicitação', 'continua para decidir');
    // Pedido que não é do link continua com "O combinado".
    await page.locator('.order[data-id="DEMO-07"] .order-open').click();
    await sheet(page).locator('h3', { hasText: 'O combinado' }).waitFor();
    await closeSheet(page);
    results.push(`${width}: responder o pedido do link`);

    // 5. Dinheiro: quem já levou separado do que vai entrar; números batem com as listas; número na barra.
    const badge = page.locator('.bar [data-tab="dinheiro"] .bar-badge');
    assert.equal(await badge.innerText(), '1', 'um entregue com saldo (Roberta)');
    await page.locator('.bar [data-tab="dinheiro"]').click();
    await page.locator('#money-received').waitFor();
    const owed = page.locator('#owed-list'), coming = page.locator('#coming-list');
    assert.match(await page.locator('#owed-title').innerText(), /Já entregue, falta receber/);
    assert.match(await owed.innerText(), /Roberta[\s\S]*Falta R\$ 55/);
    assert.equal(await owed.locator('li').count(), 1);
    assert.match(await owed.locator('li').first().innerText(), /Recebi[\s\S]*Cobrar|Cobrar[\s\S]*Recebi/);
    const thursday = (await api('/api/state')).orders.filter((o) => o.dueAt.startsWith('2026-10-29') && o.status === 'Confirmado').map((o) => o.client);
    assert.ok(thursday.length >= 2);
    for (const name of thursday) assert.match(await coming.innerText(), new RegExp(name));
    const sum = async (list) => (await list.locator('.tag-due').allInnerTexts()).reduce((total, text) => total + cents(text), 0);
    assert.equal(cents(await page.locator('#money-delivered-due').innerText()), await sum(owed), 'número grande = soma da lista 1');
    assert.equal(cents((await page.locator('#coming-title').innerText()).split('·').pop()), await sum(coming), 'título da lista 2 = soma dela');
    const comingDays = await coming.locator('li').evaluateAll((items) => items.map((li) => li.dataset.day));
    assert.deepEqual(comingDays, [...comingDays].sort(), 'por data');
    await look('dinheiro');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.due-row')].some((row) => {
      const tag = row.querySelector('.tag').getBoundingClientRect();
      return [...row.querySelectorAll('.due-actions .btn')].some((btn) => { const r = btn.getBoundingClientRect(); return !(r.right <= tag.left || r.left >= tag.right || r.bottom <= tag.top || r.top >= tag.bottom); });
    })), false, 'Recebi e Cobrar não cobrem o valor');
    if (shots) await page.screenshot({ path: path.join(shots, `dinheiro-${width}.png`), fullPage: true });
    // As setas mudam só o Recebido.
    const owedBefore = await owed.innerText();
    await page.locator('[data-act="month"][data-step="-1"]').click();
    await page.locator('#month-title', { hasText: 'Setembro de 2026' }).waitFor();
    await page.locator('#money-received').waitFor();
    assert.equal(await page.locator('#owed-list').innerText(), owedBefore);
    // Receber o que a Roberta deve: some da lista 1 e o número da barra some.
    await page.locator('#owed-list [data-act="received-money"]').first().click();
    await page.locator('#pay-form [type=submit]').click();
    await page.locator('#owed-empty').waitFor();
    assert.equal(cents(await page.locator('#money-delivered-due').innerText()), 0);
    assert.equal(await badge.isVisible(), false, 'sem entregues com saldo, o número some');
    await page.locator('.bar [data-tab="agenda"]').click();
    results.push(`${width}: Dinheiro em duas listas`);

    // 2. Meu link: sem link ativo, assistente na tela nova; o fim mostra a prévia com o nome digitado.
    await page.locator('.top [data-act="link"]').click();
    const wizard = page.locator('#link-wizard');
    await wizard.waitFor();
    assert.equal(await sheet(page).locator('[data-act="preview-link"]').count(), 1, 'na demo, Ver como a cliente vê');
    for (const href of await sheet(page).locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href')))) assert.notEqual(href, '/demo/completa/', 'nada leva à tela Hoje da versão completa');
    assert.match(await wizard.locator('.lw-step').innerText(), /Passo 1 de 3/);
    await wizard.locator('[name=displayName]').fill('');
    await wizard.locator('[value=next]').click();
    await page.locator('#link-wizard-error', { hasText: 'Escreva o nome da confeitaria.' }).waitFor();
    await wizard.locator('[name=displayName]').fill('Doçuras da Rô');
    assert.equal(await wizard.locator('[name=slug]').inputValue(), 'doces-da-lu', 'endereço que já existe não muda sozinho (como no app.js)');
    await wizard.locator('[name=slug]').fill('Doçuras da Rô');
    await wizard.locator('[name=whatsapp]').fill('123');
    await wizard.locator('[value=next]').click();
    await page.locator('#link-wizard-error', { hasText: 'Confira o WhatsApp' }).waitFor();
    await wizard.locator('[name=whatsapp]').fill('(11) 98888-7777');
    await look('assistente 1');
    await wizard.locator('[value=next]').click();
    await page.locator('#link-wizard .lw-step', { hasText: 'Passo 2 de 3' }).waitFor();
    await page.locator('#link-wizard [data-product="name"][data-index="0"]').fill('Bolo de fubá');
    await page.locator('#link-wizard [data-product="price"][data-index="0"]').fill('abc');
    await page.locator('#link-wizard [value=next]').click();
    await page.locator('#link-wizard-error', { hasText: 'Confira o valor de Bolo de fubá' }).waitFor();
    await page.locator('#link-wizard [data-product="price"][data-index="0"]').fill('60');
    await look('assistente 2');
    await page.locator('#link-wizard [value=next]').click();
    await page.locator('#link-wizard .lw-step', { hasText: 'Passo 3 de 3' }).waitFor();
    assert.match(await page.locator('#link-wizard').innerText(), /docuras-da-ro/);
    await look('assistente 3');
    await page.locator('#link-wizard [value=next]').click();
    const frame = page.frameLocator('#link-preview-frame');
    await frame.locator('text=Doçuras da Rô').first().waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.link-preview')).displayName), 'Doçuras da Rô');
    const pageAfter = await api('/api/order-page');
    assert.equal(pageAfter.active, false, 'na demo nada é ativado');
    assert.equal(pageAfter.displayName, 'Doces da Lu', 'na demo o link salvo não muda');
    if (shots) await page.screenshot({ path: path.join(shots, `previa-${width}.png`) });
    await closeSheet(page);
    // "Ver como a cliente vê" na demo: a Doces da Lu, do link salvo (não do que foi digitado no assistente).
    await page.locator('.top [data-act="link"]').click();
    await sheet(page).locator('[data-act="preview-link"]').click();
    await page.frameLocator('#link-preview-frame').locator('text=Doces da Lu').first().waitFor();
    await closeSheet(page);
    results.push(`${width}: Meu link monta na tela nova e mostra a prévia`);

    // Link ativo: "Mudar doces e fotos" abre a versão completa já em Sua vitrine.
    const current = await api('/api/order-page');
    await api('/api/order-page', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...current, active: true }) });
    await page.reload();
    await page.locator('#days .order').first().waitFor();
    await page.locator('.top [data-act="link"]').click();
    await sheet(page).locator('text=lucast').first().waitFor().catch(() => {});
    const change = sheet(page).locator('a', { hasText: 'Mudar doces e fotos' });
    assert.equal(await change.getAttribute('href'), '/demo/completa/#vitrine');
    for (const href of await sheet(page).locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href')))) assert.notEqual(href, '/demo/completa/');
    await look('meu link ativo');
    await change.click();
    await page.locator('#settings-title').waitFor();
    assert.equal(await page.locator('#view-settings').isVisible(), true, 'abre em Ajustes, não em Hoje');
    assert.equal(await page.locator('.settings-card[data-settings="link"]').evaluate((el) => el.open), true, 'Sua vitrine aberta');
    // Com conta e link no ar o formulário fica dentro de "Editar vitrine", que o endereço abre; na demo ele já está à vista.
    assert.equal(await page.locator('#order-page-form').isVisible(), true, 'o formulário da vitrine à vista');
    await finish();
    results.push(`${width}: Mudar doces e fotos abre Sua vitrine`);

    // 3. Landing com a tela nova; Experimentar sem cadastro continua indo para /demo/.
    {
      const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', reducedMotion: 'reduce' });
      const landing = await context.newPage();
      const errors = [];
      landing.on('pageerror', (error) => errors.push(String(error)));
      await landing.goto(`${server.origin}/`);
      await landing.waitForFunction(() => customElements.get('wa-button'));
      const text = (await landing.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label'))].join('\n'))).toLocaleLowerCase('pt-BR');
      assert.deepEqual(LANDING_OLD.filter((word) => text.includes(word)), [], 'landing sem palavras do app antigo');
      for (const expected of ['anote o que recebeu', 'viu o dinheiro na conta? toque em recebi. o dinheiro mostra quanto entrou e quem já levou e ainda deve.', 'no topo da agenda', 'pediu pelo link', 'o que ela pediu', 'falta r$', 'pago', 'recebi', 'exemplos fictícios']) {
        assert.ok(text.includes(expected), `landing diz "${expected}"`);
      }
      assert.equal(await landing.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `landing sem rolagem lateral em ${width}px`);
      const ctas = await landing.locator('.btn-cta').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
      assert.ok(ctas.length >= 2 && ctas.every((href) => href === '/demo/?de=landing'));
      await landing.locator('.hero-actions .btn-cta').click();
      await landing.locator('#days .order').first().waitFor();
      assert.equal(new URL(landing.url()).pathname, '/demo/');
      assert.deepEqual(errors, []);
      await context.close();
      results.push(`${width}: landing com a tela nova`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ passed: results.length, axe: axeSource ? 'conferido' : 'não disponível', results }, null, 2));
