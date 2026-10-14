import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSeedState } from './demo-seed.js';
import { createEmptyState, transactState } from './state-engine.js';
import { monthlySummary } from './monthly-summary.js';

const request = (state, url, method = 'GET', body) => transactState(state, url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });

test('demo bakery passes the same validation as a restored backup', () => {
  const seed = demoSeedState(new Date(2026, 9, 14, 9, 0));
  const result = request(createEmptyState(), '/api/import', 'POST', seed);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.orders, 15);
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
