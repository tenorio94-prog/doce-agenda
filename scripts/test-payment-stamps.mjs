import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium, serveSite, siteRoot as bundle } from './lib/browser-test.mjs';

const output = await mkdtemp(path.join(os.tmpdir(), 'doce-payment-stamps-'));
const fixtures = {
  version: 1,
  orders: ['none', 'informed', 'zero', 'partial', 'full', 'excess', 'partial-zero', 'cancelled'].map(id => ({
    id, client: `QA fictícia ${id}`, product: `Encomenda de teste ${id}`, total: 150,
    status: id === 'cancelled' ? 'Cancelado' : 'Confirmado', mode: 'Retirada',
    dueAt: '2026-10-14T15:00', history: [], createdAt: '2026-10-12T12:00:00.000Z',
  })),
  payments: [
    ['informed', 50, 'Informado'], ['zero', 0, 'Conferido'], ['partial', 50, 'Conferido'],
    ['full', 150, 'Conferido'], ['excess', 175, 'Conferido'], ['partial-zero', 50, 'Conferido'],
    ['partial-zero', 0, 'Conferido'], ['cancelled', 50, 'Conferido'],
  ].map(([orderId, amount, status], index) => ({ id: `receipt-${index}`, orderId, amount, status,
    createdAt: orderId === 'partial-zero' && amount === 0 ? '2026-10-13T12:00:00.000Z' : '2026-10-12T12:00:00.000Z', note: 'Dado fictício de teste' })),
};
const expected = {none: null, informed: null, zero: null, partial: 'Sinal pago', full: 'Pago', excess: 'Pago', 'partial-zero': 'Sinal pago', cancelled: null};
let server, browser;
const results = [], errors = [], blocked = [];
try {
  let origin = process.env.DOCE_TEST_ORIGIN;
  if (!origin) {
    assert.equal(await readFile(path.join(bundle, 'cloud-app.js'), 'utf8'), await readFile(path.join(bundle, 'app.js'), 'utf8'), 'Demo and account must use the same app bundle');
    server = await serveSite(bundle);
    origin = server.origin;
  }
  browser = await chromium.launch();
  const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo'});
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin !== new URL(origin).origin || !['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
      blocked.push(route.request().url());return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(seed => {
    if (!localStorage.getItem('doce-agenda.demo.v2')) localStorage.setItem('doce-agenda.demo.v2', JSON.stringify(seed));
  }, fixtures);
  if (process.env.DOCE_TEST_ORIGIN) {
    assert.equal(await (await context.request.get(origin + '/cloud-app.js')).text(), await readFile(path.join(bundle, 'cloud-app.js'), 'utf8'), 'Published cloud app must match the local build');
  }
  const page = await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({time: new Date('2026-10-13T12:00:00-03:00')});
  await page.goto(origin + '/demo/', {waitUntil: 'networkidle'});
  await page.locator('#view-today h1').waitFor();
  await page.locator('.nav-item[data-view="orders"]').click();
  for (const [id, stamp] of Object.entries(expected)) {
    const row = page.locator(`#view-orders [data-open-order="${id}"]`);
    // Na lista nova (identidade do laboratório) o carimbo virou selo verde: Sinal pago → Sinal conferido, Pago → Total conferido.
    const badge = { 'Sinal pago': 'Sinal conferido', 'Pago': 'Total conferido' }[stamp];
    assert.equal(await row.locator('.vn-badge.green', { hasText: 'conferido' }).count(), stamp ? 1 : 0, `${id}: row badge presence`);
    if (stamp) assert.equal(await row.locator('.vn-badge.green', { hasText: 'conferido' }).innerText(), badge, `${id}: row badge label`);
    if (id === 'zero') assert.match(await row.innerText(), /falta o sinal/i);
    await row.click();await page.locator('#detail-dialog').waitFor();
    const card = page.locator('#detail-content .deposit-card');
    assert.equal(await card.locator('.stamp').count(), stamp && id !== 'cancelled' ? 1 : 0, `${id}: detail stamp presence`);
    if (stamp) assert.equal(await card.locator('.stamp > span').innerText(), stamp.toUpperCase());
    if (id === 'zero') { assert.match(await card.innerText(), /Conferido: nenhum valor recebido/); assert.match(await page.locator('#detail-content .detail-split').innerText(), /Saldo a receber\s*R\$\s*150,00/); await page.screenshot({path: path.join(output, 'zero-detail.png'), fullPage: true}); }
    if (id === 'partial-zero') assert.match(await card.locator('.stamp small').innerText(), /12 OUT/, 'Zero entry must not change the actual receipt date');
    if (id === 'excess') assert.match(await page.locator('#detail-content').innerText(), /Excedente R\$\s*25,00/);
    await page.keyboard.press('Escape');results.push({case: id, stamp, passed: true});
  }
  // The same real payment form transitions zero -> partial -> full without changing old entries.
  await page.locator('#view-orders [data-open-order="zero"]').click();
  for (const [amount, stamp, balance] of [['50', 'SINAL PAGO', '100,00'], ['100', 'PAGO', '0,00']]) {
    await page.locator('#detail-content [data-action="add-payment"]').click();
    await page.locator('#payment-dialog [name=amount]').fill(amount);
    await page.locator('#payment-dialog [name=status]').selectOption('Conferido');
    await page.locator('#save-payment-button').click();await page.waitForFunction(() => !document.querySelector('#payment-dialog').open);
    assert.equal(await page.locator('#detail-content .deposit-card .stamp > span').innerText(), stamp);
    assert.match(await page.locator('#detail-content .detail-split').innerText(), new RegExp(`Saldo a receber\\s*R\\$\\s*${balance}`));
    results.push({case: `zero + ${amount}`, stamp, balance, passed: true});
  }
  const saved = await page.evaluate(async () => (await window.DoceStore.fetch('/api/state')).json());
  assert.equal(saved.payments.find(p => p.orderId === 'zero' && p.amount === 0)?.status, 'Conferido', 'Original zero receipt remains in history');
  await page.keyboard.press('Escape');await page.reload();await page.locator('#view-today h1').waitFor();
  await page.locator('.nav-item[data-view="orders"]').click();
  assert.equal(await page.locator('#view-orders [data-open-order="zero"] .vn-badge.green').innerText(), 'Total conferido');
  await page.goto(origin + '/', {waitUntil: 'networkidle'});
  assert.match(await page.locator('h1').first().innerText(), /Saiba o que fazer, entregar e cobrar/);
  assert.equal((await page.locator('body').innerText()).includes('Três campos'), false);
  await page.setViewportSize({width: 1440, height: 1000});await page.screenshot({path: path.join(output, 'landing.png'), fullPage: true});
  assert.deepEqual(errors, []);assert.deepEqual(blocked, []);
  await writeFile(path.join(output, 'result.json'), JSON.stringify({origin, results, errors, blocked, sourceSharedByCloud: true}, null, 2));
  console.log(JSON.stringify({origin, passed: results.length, output, errors, blocked}));
} finally {
  await browser?.close();server?.close();
}
