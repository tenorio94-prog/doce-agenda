import test from 'node:test';
import assert from 'node:assert/strict';
import { demoMonthState, demoMonthSummary, shouldUseDemoMonth } from './demo-month.js';
import { monthlySummary } from './monthly-summary.js';

const now = new Date('2026-10-14T12:00:00Z');
const sampleOnly = { orders: [{ id: 'EXEMPLO-001', status: 'Confirmado', dueAt: '2026-10-15T16:00', total: 150, isSample: true }], payments: [] };

test('example month is computed by the real summary and fills every card', () => {
  const result = demoMonthSummary('2026-10', now);
  assert.equal(result.isExample, true);
  assert.equal(result.ordersCount, 8);
  assert.equal(result.soldCents, 118000);
  assert.equal(result.receivedCents, 75500);
  assert.equal(result.receivableCents, 42500);
  assert.deepEqual(result.busiestDays.map(day => [day.name, day.count]), [['Sábado', 4], ['Sexta-feira', 2], ['Quarta-feira', 1]]);
  assert.deepEqual(result.topProducts.slice(0, 2), [{ name: 'Bolo de chocolate', count: 3 }, { name: 'Brigadeiro (cento)', count: 2 }]);
  assert.equal(result.averageNoticeDays, 7.5);
});

test('example orders stay inside the requested month', () => {
  for (const month of ['2026-02', '2026-10', '2027-03']) {
    assert.ok(demoMonthState(month).orders.every(order => order.dueAt.startsWith(month)), month);
  }
});

test('example only replaces an empty current month before the visitor has own orders', () => {
  const empty = monthlySummary(sampleOnly, '2026-10', now);
  assert.equal(shouldUseDemoMonth(sampleOnly, empty), true);
  assert.equal(shouldUseDemoMonth(sampleOnly, monthlySummary(sampleOnly, '2026-09', now)), false);
  const withOwn = { ...sampleOnly, orders: [...sampleOnly.orders, { id: 'mine', status: 'Orçamento', dueAt: '2026-10-20T10:00', total: 80 }] };
  assert.equal(shouldUseDemoMonth(withOwn, monthlySummary(withOwn, '2026-10', now)), false);
});
