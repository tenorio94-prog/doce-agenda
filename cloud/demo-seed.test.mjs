import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSeedState } from './demo-seed.js';
import { createEmptyState, transactState } from './state-engine.js';
import { monthlySummary } from './monthly-summary.js';
import { clientsSummary } from './clients.js';

const request = (state, url, method = 'GET', body) => transactState(state, url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });

test('demo bakery passes the same validation as a restored backup', () => {
  const seed = demoSeedState(new Date(2026, 9, 14, 9, 0));
  const result = request(createEmptyState(), '/api/import', 'POST', seed);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.orders, 21);
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
  assert.deepEqual(monthlySummary(seed, '2026-10', at), monthlySummary(recent, '2026-10', at), 'older orders stay out of this month');
});
