import assert from 'node:assert/strict';
import { demoSeedState } from '../cloud/demo-seed.js';
import { stampNewDemo } from '../cloud/demo-clock.js';
import { addDays, todayKey } from '../public/nova/model.js';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const NOW = new Date('2026-10-27T15:00:00Z');
const PAST = new Date('2026-10-20T15:00:00Z');
const KEY = 'doce-agenda.demo.v2', DAY = `${KEY}.dia`;
const visitor = { id: 'VISITANTE-TESTE', client: 'Cliente da visitante', product: 'Torta feita pela visitante', details: '', dueAt: '2026-12-15T16:30', total: 70, totalKnown: true, status: 'Confirmado', mode: 'Retirada', location: '', nextAction: '', nextAt: '', pendingChange: '', contact: '', origin: 'manual', createdAt: '2026-10-20T15:00:00Z', updatedAt: '2026-10-20T15:00:00Z', history: [{ at: '2026-10-20T15:00:00Z', text: 'Pedido da visitante.' }] };
const visitorPayment = { id: 'PAGAMENTO-VISITANTE', orderId: visitor.id, amount: 20, status: 'Conferido', note: '', createdAt: '2026-10-20T15:00:00Z' };
const old = demoSeedState(PAST); old.orders.push(visitor); old.payments.push(visitorPayment);
const oldWithDay = stampNewDemo(old, PAST);
// Simula a versão realmente antiga: os 21 exemplos originais, sem os novos IDs nem chave de dia.
const legacy = structuredClone(old);
const legacyIds = new Set(legacy.orders.filter((order) => !/^DEMO-(?:1[6-9]|2[0-9])$/.test(order.id)).map((order) => order.id));
legacy.orders = legacy.orders.filter((order) => legacyIds.has(order.id));
legacy.payments = legacy.payments.filter((payment) => legacyIds.has(payment.orderId));

async function open(width, height, seed = null, day = null, time = NOW) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
  if (seed) await context.addInitScript(({ key, dayKey, value, storedDay }) => {
    if (!sessionStorage.getItem('fixture-loaded')) {
      localStorage.setItem(key, JSON.stringify(value));
      if (storedDay) localStorage.setItem(dayKey, storedDay);
      sessionStorage.setItem('fixture-loaded', '1');
    }
  }, { key: KEY, dayKey: DAY, value: seed, storedDay: day });
  await context.addInitScript((dayKey) => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (this === localStorage && key === dayKey) sessionStorage.setItem('dia-removido', 'sim');
      return remove.call(this, key);
    };
  }, DAY);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.clock.setFixedTime(time);
  await page.goto(server.origin + '/demo/', { waitUntil: 'networkidle' });
  await page.locator('#days .order').first().waitFor();
  return { context, page, errors };
}
async function state(page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY); }
async function assertToday(page, now = NOW) {
  const today = todayKey(now), orders = page.locator(`#d-${today} .order`);
  assert.deepEqual(await orders.locator('.o-who').allInnerTexts(), ['Ana Clara', 'Marcos', 'Juliana']);
  assert.match(await page.locator('#notice-decide').innerText(), /2 pedidos para decidir/);
  assert.equal((await state(page)).orders.find((order) => order.id === 'DEMO-15').dueAt.slice(0, 10), addDays(today, 5));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}

try {
  for (const [width, height] of [[360, 800], [1280, 800]]) {
    // Exemplo novo preenche a semana, sem ocupar todos os dias.
    {
      const { context, page, errors } = await open(width, height);
      await assertToday(page);
      const days = page.locator('#days .day');
      // Dias livres seguidos viram uma linha só; cada dia a mais dessa linha guarda uma âncora (.day-anchor).
      const anchors = await page.locator('#days .day-anchor').count();
      const total = await days.count() + anchors, free = await page.locator('#days .day-empty').count() + anchors;
      assert.ok(free >= 2 && free <= 3, `${width}: dois ou três dias livres`);
      assert.ok(await page.locator('#days .mark-full').count() >= 2, `${width}: pelo menos dois dias cheios`);
      assert.ok(total - free > free, `${width}: maioria dos dias ocupada`);
      const counts = (await page.locator('#week .wk-count').allInnerTexts()).filter(Boolean);
      assert.ok(counts.length >= 4, `${width}: faixa com números na maioria dos dias`);
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), DAY), todayKey(NOW));
      assert.deepEqual(errors, []); await context.close();
    }
    // Uma demo salva sete dias antes avança apenas os exemplos; reabrir é idempotente.
    {
      const { context, page, errors } = await open(width, height, oldWithDay, todayKey(PAST));
      await assertToday(page);
      let saved = await state(page);
      assert.deepEqual(saved.orders.find((order) => order.id === visitor.id), visitor);
      assert.deepEqual(saved.payments.find((payment) => payment.id === visitorPayment.id), visitorPayment);
      const beforeReload = await page.evaluate((key) => localStorage.getItem(key), KEY);
      await page.reload({ waitUntil: 'networkidle' }); await assertToday(page);
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), beforeReload);
      await page.locator('[data-act=menu]').click(); await page.locator('[data-act=reset]').click();
      await page.locator('[data-act=reset-confirm]').click();
      await page.locator('#days .order').first().waitFor(); await assertToday(page);
      assert.equal(await page.evaluate(() => sessionStorage.getItem('dia-removido')), 'sim');
      saved = await state(page);
      assert.equal(saved.orders.some((order) => order.id === visitor.id), false, 'recomeçar segue removendo alterações, conforme o aviso');
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), DAY), todayKey(NOW));
      assert.deepEqual(errors, []); await context.close();
    }
    // A versão antiga ainda sem a chave aprende o dia pela Ana Clara.
    {
      const { context, page, errors } = await open(width, height, legacy, null);
      await assertToday(page);
      assert.deepEqual((await state(page)).orders.find((order) => order.id === visitor.id), visitor);
      assert.ok((await state(page)).orders.some((order) => order.id === 'DEMO-16'), 'agenda antiga recebe os novos exemplos');
      assert.equal(await page.locator('#days .day-empty').count() + await page.locator('#days .day-anchor').count(), 2, 'agenda antiga também fica preenchida');
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), DAY), todayKey(NOW));
      assert.deepEqual(errors, []); await context.close();
    }
    console.log(`ok - ${width}px: semana preenchida, demo antiga, reabertura e recomeçar`);
  }
  // Pouco antes e depois de meia-noite em São Paulo, mesmo com UTC já no dia seguinte.
  {
    const before = new Date('2026-10-28T02:59:59Z'), after = new Date('2026-10-28T03:00:00Z');
    const seed = stampNewDemo(demoSeedState(before), before);
    const { context, page, errors } = await open(360, 800, seed, '2026-10-27', before);
    await assertToday(page, before);
    assert.equal((await state(page)).orders.find((order) => order.id === 'DEMO-07').dueAt, '2026-10-27T10:00');
    await page.clock.setFixedTime(after); await page.reload({ waitUntil: 'networkidle' });
    await assertToday(page, after);
    assert.equal((await state(page)).orders.find((order) => order.id === 'DEMO-07').dueAt, '2026-10-28T10:00');
    assert.deepEqual(errors, []); await context.close();
    console.log('ok - virada da meia-noite de São Paulo');
  }
} finally { await browser.close(); server.close(); }
