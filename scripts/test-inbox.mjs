// Para decidir (antiga caixa de entrada): apenas a demo local, sem contas ou dados externos.
// npm run build && node scripts/test-inbox.mjs [pasta-de-capturas]
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createEmptyState, transactState } from '../cloud/state-engine.js';
import { createPublicRequest } from '../cloud/public-orders.js';
import { chromium, serveSite } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const day = '2099-10-19', fullDay = '2099-10-20', closedDay = '2099-10-21', unlimitedDay = '2099-10-22';
const key = 'doce-agenda.demo.v2';
function request(id, client, date = day) {
  const state = createEmptyState();
  state.orderPage = { active: true, slug: 'qa-caixa-entrada', displayName: 'Confeitaria sintética', products: [{ name: 'Torta de teste', description: '' }] };
  const code = `DA-${id.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(6, 'X').slice(0, 6)}`;
  const { order } = createPublicRequest(state, { client, contact: '11900000000', product: 'Torta de teste', date, time: '15:00', mode: 'Retirada', details: 'Dados sintéticos para testar a revisão.', consent: true }, code);
  return { ...order, id };
}
function fixture() {
  const state = createEmptyState();
  state.availability.dailyOrderLimit = null;
  state.availability.dateOverrides = { [day]: { closed: false, limit: 2 }, [fullDay]: { closed: false, limit: 1 }, [closedDay]: { closed: true, limit: null } };
  const known = { ...request('known', 'Cliente valor conhecido'), total: 155.5, totalKnown: true };
  const unknown = request('unknown', 'Cliente valor a combinar');
  const zero = { ...request('zero', 'Cliente valor zero', unlimitedDay), total: 0, totalKnown: true };
  const manual = { ...known, id: 'manual', origin: 'manual', status: 'Orçamento', client: 'Cadastro com contato manual', publicCode: undefined, contact: '11900000000', total: 90, history: [] };
  const waiting = { ...manual, id: 'waiting', status: 'Aguardando confirmação', client: 'Cadastro antigo sem origem', dueAt: '', origin: undefined };
  const committed = { ...manual, id: 'committed', status: 'Confirmado', client: 'Confirmada de teste' };
  const full = { ...committed, id: 'full', dueAt: `${fullDay}T12:00` };
  state.orders = [known, unknown, zero, manual, waiting, committed, full];
  const validated = transactState(createEmptyState(), '/api/import', { method: 'POST', body: JSON.stringify(state) });
  assert.equal(validated.status, 200, JSON.stringify(validated.body));
  return state;
}
const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const stateOf = page => page.evaluate(async () => (await window.DoceStore.fetch('/api/state')).json());
const orderOf = async (page, id) => (await stateOf(page)).orders.find(o => o.id === id);
const section = (page, name) => page.locator(`.vn-inbox-section[aria-labelledby="inbox-${name}-title"]`);
const card = (page, id) => page.locator(`#view-orders [data-open-order="${id}"]`);
async function inbox(page) {
  await page.locator('[data-view="orders"]:visible').first().click();
  await page.locator('[data-stage="new"]').click();
  await page.locator('#inbox-review-title').waitFor();
}
async function loadFixture(page, data) {
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data });
  await page.reload(); await page.locator('#today-title').waitFor(); await inbox(page);
}
async function closeDetails(page) {
  await page.locator('#detail-dialog [data-close="detail-dialog"]').click();
  await page.locator('#detail-dialog[open]').waitFor({ state: 'hidden' });
}
async function review(page, id, status) {
  await card(page, id).locator('[data-action="review-request"]').click();
  await page.locator(`#detail-dialog [data-action="accept-request"][data-status="${status}"]`).click();
  await page.waitForFunction(({ key, id, status }) => JSON.parse(localStorage.getItem(key)).orders.find(o => o.id === id).status === status, { key, id, status });
  await page.locator('#detail-dialog .request-review').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#detail-dialog .vn-origin').innerText(), /Recebido pelo link/);
  assert.equal((await orderOf(page, id)).origin, 'link');
  await closeDetails(page);
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem lateral na página');
  assert.ok(await page.locator('#detail-dialog').evaluate(d => !d.open || d.scrollWidth <= d.clientWidth), 'sem rolagem lateral na revisão');
}

try {
  for (const width of [360, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if(r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${server.origin}/demo/completa/`);
    await page.locator('#today-title').waitFor();
    await loadFixture(page, fixture());
    assert.match(await page.title(), /Doce Agenda/);
    assert.equal(new URL(page.url()).pathname, '/demo/completa/');
    assert.match(await page.locator('.vn-inbox-counts').textContent(), /3 pelo link · 2 orçamentos/);
    assert.equal(await section(page, 'review').locator('.vn-order').count(), 3);
    assert.equal(await section(page, 'negotiation').locator('.vn-order').count(), 2);
    assert.match(await card(page, 'known').innerText(), /Pelo link[\s\S]*Para decidir/);
    assert.match(await card(page, 'known').innerText(), /155,50/);
    assert.match(await card(page, 'unknown').innerText(), /A combinar/);
    assert.match(await card(page, 'zero').innerText(), /R\$\s*0,00/);
    assert.match(await card(page, 'known').innerText(), /1\/2 vagas ocupadas/);
    assert.match(await card(page, 'manual').innerText(), /Orçamento/);
    assert.match(await card(page, 'manual').innerText(), /1\/2 vagas ocupadas/);
    assert.doesNotMatch(await card(page, 'manual').innerText(), /WhatsApp|Recebido pelo link/);
    assert.doesNotMatch(await card(page, 'waiting').innerText(), /WhatsApp|Recebido pelo link/);
    assert.match(await card(page, 'waiting').innerText(), /Data e horário a combinar/);
    assert.match(await card(page, 'waiting').innerText(), /Ocupação disponível quando a data for definida/);
    await noOverflow(page);
    if (shots) {
      await page.screenshot({ path: path.join(shots, `inbox-top-${width}.png`) });
      await section(page, 'review').evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(shots, `inbox-review-${width}.png`) });
      await section(page, 'negotiation').evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(shots, `inbox-negotiation-${width}.png`) });
    }
    results.push(`${width}px: seções, origem sem inferência, valores e ocupação`);
    await page.locator('a[href="#inbox-negotiation-title"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'inbox-negotiation-title', 'atalho leva aos orçamentos');
    await page.locator('a[href="#inbox-review-title"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'inbox-review-title');

    // Busca restringe as duas seções, mantendo contagens e vazios coerentes.
    await page.locator('#order-search').fill('valor conhecido');
    assert.equal(await section(page, 'review').locator('.vn-order').count(), 1);
    assert.equal(await section(page, 'negotiation').locator('.vn-order').count(), 0);
    assert.match(await section(page, 'negotiation').innerText(), /Nenhum resultado nesta seção/);
    assert.match(await page.locator('.order-results').innerText(), /1 pedido encontrado/);
    await page.locator('#order-search').fill('inexistente');
    assert.equal(await page.locator('.vn-inbox-empty').count(), 2);
    await page.locator('#order-search').fill('');

    // Abrir com teclado e botão leva à mesma revisão, sem mudar situação/capacidade.
    await card(page, 'known').locator('.vn-open').focus(); await page.keyboard.press('Enter');
    await page.locator('#detail-dialog[open]').waitFor();
    assert.match(await page.locator('.request-review').innerText(), /Valor total: R\$\s*155,50/);
    assert.match(await page.locator('.request-review').innerText(), /1\/2 vagas ocupadas/);
    assert.equal(await page.locator('.request-review [data-action="accept-request"]').count(), 2);
    assert.equal(await page.locator('.request-review [data-action="refuse-request"]').count(), 1);
    assert.equal((await orderOf(page, 'known')).status, 'Solicitação');
    await noOverflow(page);
    if (shots) {
      await page.locator('.request-review').evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: path.join(shots, `decision-${width}.png`) });
    }
    await closeDetails(page);
    results.push(`${width}px: busca, vazios, teclado e revisão sem confirmação automática`);

    // As três decisões usam os handlers/engine reais da demo; nada é interceptado.
    await review(page, 'unknown', 'Orçamento');
    assert.equal(await section(page, 'negotiation').locator('[data-open-order="unknown"]').count(), 1);
    assert.match(await card(page, 'unknown').innerText(), /Recebido pelo link/);
    assert.match(await card(page, 'known').innerText(), /1\/2 vagas ocupadas/, 'orçamento não reserva');
    await review(page, 'zero', 'Confirmado');
    assert.equal((await orderOf(page, 'zero')).totalKnown, true);
    assert.equal((await orderOf(page, 'zero')).total, 0);
    await card(page, 'known').locator('[data-action="review-request"]').click();
    await page.locator('[data-action="refuse-request"]').click();
    await page.locator('#refuse-form textarea').fill('Recusa sintética para teste');
    await page.locator('#refuse-form [type="submit"]').click();
    await page.locator('#refuse-dialog[open]').waitFor({ state: 'hidden' });
    assert.equal((await orderOf(page, 'known')).status, 'Recusado');
    assert.match(await page.locator('#detail-dialog .vn-origin').innerText(), /Recebido pelo link/);
    await closeDetails(page);
    assert.match(await section(page, 'review').innerText(), /Nenhum pedido pelo link para decidir/);
    await page.reload(); await page.locator('#today-title').waitFor();
    await page.locator('[data-view="orders"]:visible').first().click();
    for (const id of ['known', 'unknown', 'zero']) {
      assert.match(await card(page, id).innerText(), /Recebido pelo link/, `${id}: origem após recarregar`);
    }
    assert.equal((await orderOf(page, 'unknown')).totalKnown, false);
    assert.deepEqual((await stateOf(page)).payments, [], 'aceitar não cria pagamento');
    results.push(`${width}px: aceitar orçamento/confirmado, recusar e preservar origem após recarregar`);

    // Editar e aceitar preserva também a origem e o código, com zero conhecido.
    await loadFixture(page, fixture());
    await card(page, 'known').locator('[data-action="review-request"]').click();
    await page.locator('#detail-dialog [data-action="edit-order"]').click();
    await page.locator('#order-dialog[open]').waitFor();
    await page.locator('#order-form wa-input[name="total"] input').fill('0');
    await page.locator('#save-order-button').click();
    await page.locator('#order-dialog[open]').waitFor({ state: 'hidden' });
    assert.equal((await orderOf(page, 'known')).status, 'Orçamento');
    assert.equal((await orderOf(page, 'known')).origin, 'link');
    assert.equal((await orderOf(page, 'known')).publicCode, 'DA-KNOWNX');
    await page.reload(); await page.locator('#today-title').waitFor(); await inbox(page);
    assert.match(await card(page, 'known').innerText(), /Recebido pelo link/);
    assert.match(await card(page, 'known').innerText(), /R\$\s*0,00/);
    results.push(`${width}px: editar e aceitar sem perder origem ou zero conhecido`);

    // Limites reais são revalidados; solicitações/orçamentos não ocupam capacidade.
    const capacity = fixture();
    capacity.orders.push(request('full-request', 'Solicitação dia lotado', fullDay), request('closed-request', 'Solicitação dia fechado', closedDay));
    await loadFixture(page, capacity);
    assert.match(await card(page, 'full-request').innerText(), /1\/1 vagas ocupadas.*Dia lotado/s);
    assert.match(await card(page, 'closed-request').innerText(), /Dia fechado/);
    assert.match(await card(page, 'zero').innerText(), /0 pedidos confirmados.*Sem limite diário/s);
    for (const id of ['full-request', 'closed-request']) {
      await card(page, id).locator('[data-action="review-request"]').click();
      await page.locator('.request-review [data-status="Confirmado"]').click();
      await page.locator('#toast').filter({ hasText: id === 'full-request' ? /limite|lotad/i : /fechad/i }).waitFor();
      assert.equal((await orderOf(page, id)).status, 'Solicitação');
      assert.equal(await page.locator('.request-review').isVisible(), true);
      await noOverflow(page); await closeDetails(page);
    }
    await review(page, 'full-request', 'Orçamento');
    assert.match(await card(page, 'full-request').innerText(), /1\/1 vagas ocupadas/);
    await review(page, 'unknown', 'Confirmado');
    assert.match(await card(page, 'known').innerText(), /2\/2 vagas ocupadas.*Dia lotado/s);
    results.push(`${width}px: lotação, dia fechado, sem limite e revalidação ao aceitar`);

    const empty = fixture(); empty.orders = []; empty.payments = [];
    await loadFixture(page, empty);
    assert.match(await page.locator('.vn-inbox-counts').textContent(), /0 pelo link · 0 orçamentos/);
    assert.match(await section(page, 'review').innerText(), /Nenhum pedido pelo link para decidir/);
    assert.match(await section(page, 'negotiation').innerText(), /Nenhum orçamento esperando resposta/);
    await noOverflow(page);
    assert.deepEqual(errors, [], 'sem erros de console, execução ou recursos');
    await context.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
} finally { await browser.close(); server.close(); }
