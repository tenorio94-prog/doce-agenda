import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSeedState } from './demo-seed.js';
import { createEmptyState, transactState } from './state-engine.js';
import { monthlySummary } from './monthly-summary.js';
import { clientsSummary } from './clients.js';
import { addDays, balance, dayMark, dayOrders, todayKey } from '../public/nova/model.js';

const request = (state, url, method = 'GET', body) => transactState(state, url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });

test('demo bakery passes the same validation as a restored backup', () => {
  const seed = demoSeedState(new Date(2026, 9, 14, 9, 0));
  const result = request(createEmptyState(), '/api/import', 'POST', seed);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.orders, 31);
});

test('agenda do exemplo ocupa as duas semanas sem alterar os pedidos conhecidos', () => {
  for (let date = 19; date <= 25; date++) {
    const now = new Date(`2026-10-${date}T15:00:00Z`);
    const state = demoSeedState(now), today = todayKey(now);
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const last = 13 - ((weekday + 6) % 7);
    const visibleDays = Array.from({ length: last + 1 }, (_, offset) => addDays(today, offset));
    const sizes = visibleDays.map((day) => dayOrders(state, day).length);
    assert.equal(sizes.filter((n) => n === 0).length, 2, `${today}: dois dias livres`);
    assert.ok(sizes.filter((n) => n === 3).length >= 2, `${today}: pelo menos dois dias cheios`);
    assert.ok(sizes.every((n) => n <= 3), `${today}: limite diário respeitado`);
    assert.ok(sizes.filter((n) => n === 1 || n === 2).length > sizes.filter((n) => n === 0).length, `${today}: maioria ocupada`);
    assert.equal(dayMark(state, today), 'cheio');
    const extra = state.orders.filter((order) => /^DEMO-(?:1[6-9]|2[0-9])$/.test(order.id));
    assert.ok(extra.every((order) => ['Confirmado', 'Em produção', 'Pronto'].includes(order.status)));
    assert.ok(extra.every((order) => order.contact && !['Paula', 'Helena', 'Ana Clara'].includes(order.client)));
    assert.ok(extra.some((order) => order.mode === 'Entrega' && order.location));
    assert.ok(extra.some((order) => order.totalKnown === false));
    assert.ok(extra.some((order) => order.totalKnown && balance(state, order).due === 0));
    assert.ok(extra.some((order) => order.totalKnown && balance(state, order).received === 0));
    assert.equal(balance(state, extra.find((order) => order.client === 'Rita')).due, 7000);
    assert.equal(balance(state, extra.find((order) => order.client === 'Rose')).due, 0);
    assert.equal(state.orders.find((order) => order.id === 'DEMO-15').dueAt.slice(0, 10), addDays(today, 5));
    assert.deepEqual(state.orders.filter((order) => order.status === 'Entregue' && balance(state, order).due > 0).map((order) => order.client), ['Roberta']);
  }
});

test('datas da demo usam o dia de São Paulo na virada da meia-noite', () => {
  for (const [instant, day] of [['2026-10-28T02:59:59Z', '2026-10-27'], ['2026-10-28T03:00:00Z', '2026-10-28']]) {
    const state = demoSeedState(new Date(instant));
    assert.equal(state.orders.find((order) => order.id === 'DEMO-07').dueAt, `${day}T10:00`);
  }
});

test('demo covers every stage the tour explains', () => {
  const { orders, payments } = demoSeedState(new Date(2026, 9, 14, 9, 0));
  const statuses = new Set(orders.map(order => order.status));
  for (const status of ['Solicitação', 'Orçamento', 'Confirmado', 'Em produção', 'Pronto', 'Entregue', 'Cancelado']) assert.ok(statuses.has(status), status);
  assert.ok(payments.some(payment => payment.status === 'Informado'), 'a payment waiting to be checked');
  assert.equal(orders.filter(order => order.dueAt.startsWith('2026-10-14')).length, 3, 'three orders today');
  assert.ok(orders.every(order => !order.isSample && !order.isDemo && !order.sample), 'demo orders count like real ones inside the demo');
});

test('a mid-month visit fills Meu mês with real numbers and one full day', () => {
  const seed = demoSeedState(new Date(2026, 9, 14, 9, 0));
  const summary = monthlySummary(seed, '2026-10', new Date('2026-10-14T12:00:00Z'));
  assert.ok(summary.ordersCount >= 3);
  assert.ok(summary.receivedCents > 0 && summary.receivableCents > 0);
  const fullDay = seed.orders.filter(order => order.dueAt.startsWith('2026-10-16') && ['Confirmado', 'Em produção', 'Pronto', 'Entregue'].includes(order.status));
  assert.equal(fullDay.length, seed.availability.dailyOrderLimit, 'one day reaches the daily limit');
});

test('demo gives Clientes a regular customer, one away, a birthday coming back and a suggested name', () => {
  const now = new Date(2026, 9, 14, 9, 0);
  const summary = clientsSummary(demoSeedState(now), now);
  const byName = (name, phone = true) => summary.clients.find((client) => client.name === name && !!client.phone === phone);
  assert.equal(byName('Paula').purchases, 3);
  assert.ok(byName('Paula', false), 'Paula without phone keeps her own ficha');
  assert.equal(byName('Paula', false).sameNameAs.length, 1);
  assert.equal(byName('Helena').away, true);
  assert.deepEqual(summary.reminders.map(({ name, daysUntil }) => ({ name, daysUntil })), [{ name: 'Ana Clara', daysUntil: 20 }]);
  const seed = demoSeedState(now);
  const recent = { ...seed, orders: seed.orders.filter((order) => !order.id.startsWith('DEMO-H')), payments: seed.payments.filter((payment) => !payment.orderId.startsWith('DEMO-H')) };
  const at = new Date('2026-10-14T12:00:00Z');
  const month = (state) => { const { lifetime, ...rest } = monthlySummary(state, '2026-10', at); return rest; };
  assert.deepEqual(month(seed), month(recent), 'older orders stay out of this month');
  assert.ok(monthlySummary(seed, '2026-10', at).lifetime.ordersCount > monthlySummary(recent, '2026-10', at).lifetime.ordersCount, 'but they count in what she kept');
});
