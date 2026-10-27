import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSeedState } from './demo-seed.js';
import { prepareDemoState, stampNewDemo } from './demo-clock.js';
import { createEmptyState, transactState } from './state-engine.js';
import { addDays, dayOrders, todayKey } from '../public/nova/model.js';

const oldNow = new Date('2026-10-20T15:00:00Z');
const now = new Date('2026-10-27T15:00:00Z');
const originalDay = '2026-10-20', today = '2026-10-27';
const due = (state, id) => state.orders.find((order) => order.id === id).dueAt;

test('avança só os exemplos, suas datas e seus pagamentos; abrir de novo não move nada', () => {
  const seed = demoSeedState(oldNow);
  const visitor = { id: 'visitante-1', client: 'Visitante', dueAt: '2026-12-22T09:30', createdAt: '2026-10-20T12:00:00Z', history: [{ at: '2026-10-20T12:00:00Z', text: 'Meu pedido' }] };
  const visitorPayment = { id: 'pagamento-da-visitante', orderId: visitor.id, amount: 10, status: 'Conferido', createdAt: '2026-10-20T12:00:00Z' };
  seed.orders.push(visitor); seed.payments.push(visitorPayment);
  const sample = seed.orders.find((order) => order.id === 'DEMO-07');
  Object.assign(sample, { updatedAt: '2026-10-20T21:15:00.000Z', confirmedAt: '2026-10-20T18:00:00-03:00', reviewedAt: '2026-10-19T12:00:00Z', nextAt: '2026-10-21T08:45', consentAt: '2026-10-18T10:00:00Z' });
  const payment = seed.payments.find((item) => item.orderId === 'DEMO-07');
  payment.confirmedAt = '2026-10-20T22:35:00.000Z';
  const unchangedInput = structuredClone(seed);
  const advanced = prepareDemoState(seed, originalDay, now);
  assert.equal(advanced.changed, true); assert.equal(advanced.day, today);
  assert.deepEqual(seed, unchangedInput, 'a entrada não é alterada');
  assert.equal(due(advanced.state, 'DEMO-07'), '2026-10-27T10:00');
  assert.deepEqual(dayOrders(advanced.state, today).map((order) => order.client), ['Ana Clara', 'Marcos', 'Juliana']);
  assert.equal(due(advanced.state, 'DEMO-15').slice(0, 10), addDays(today, 5));
  assert.deepEqual(advanced.state.orders.find((order) => order.id === visitor.id), visitor);
  assert.deepEqual(advanced.state.payments.find((item) => item.id === visitorPayment.id), visitorPayment);
  const moved = advanced.state.orders.find((order) => order.id === 'DEMO-07');
  assert.equal(moved.createdAt, '2026-10-18T12:00:00.000Z');
  assert.equal(moved.updatedAt, '2026-10-27T21:15:00.000Z');
  assert.equal(moved.confirmedAt, '2026-10-27T18:00:00-03:00');
  assert.equal(moved.reviewedAt, '2026-10-26T12:00:00Z');
  assert.equal(moved.nextAt, '2026-10-28T08:45');
  assert.equal(moved.consentAt, '2026-10-25T10:00:00Z');
  assert.equal(moved.history[0].at, '2026-10-18T12:00:00.000Z');
  assert.equal(advanced.state.payments.find((item) => item.id === payment.id).confirmedAt, '2026-10-27T22:35:00.000Z');
  assert.equal(advanced.state.payments.find((item) => item.id === payment.id).createdAt, '2026-10-18T12:00:00.000Z');
  const again = prepareDemoState(advanced.state, today, now);
  assert.equal(again.changed, false); assert.deepEqual(again.state, advanced.state);
  // Se a gravação do estado funcionou e a da chave do dia falhou, não desloca uma segunda vez.
  const interrupted = prepareDemoState(advanced.state, originalDay, now);
  assert.equal(interrupted.changed, false); assert.deepEqual(interrupted.state, advanced.state);
});

test('demo antiga sem chave usa a data de DEMO-07 e preserva o restante', () => {
  const seed = demoSeedState(oldNow);
  const originalIds = new Set(seed.orders.filter((order) => !/^DEMO-(?:1[6-9]|2[0-9])$/.test(order.id)).map((order) => order.id));
  seed.orders = seed.orders.filter((order) => originalIds.has(order.id));
  seed.payments = seed.payments.filter((payment) => originalIds.has(payment.orderId));
  const own = { id: 'pedido-pessoal', client: 'Visitante', dueAt: '2026-12-22T09:00', history: [] };
  seed.orders.push(own);
  const advanced = prepareDemoState(seed, null, now);
  assert.equal(advanced.day, today); assert.equal(due(advanced.state, 'DEMO-07'), '2026-10-27T10:00');
  assert.equal(due(advanced.state, 'DEMO-15').slice(0, 10), '2026-11-01');
  assert.deepEqual(advanced.state.orders.find((order) => order.id === own.id), own);
  assert.ok(advanced.state.orders.some((order) => order.id === 'DEMO-16'), 'novos exemplos também chegam à demo antiga');
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const end = 13 - ((weekday + 6) % 7);
  assert.equal(Array.from({ length: end + 1 }, (_, i) => dayOrders(advanced.state, addDays(today, i)).length).filter((n) => n === 0).length, 2);
  const again = prepareDemoState(advanced.state, null, now);
  assert.equal(again.changed, false); assert.deepEqual(again.state, advanced.state);
  assert.deepEqual(advanced.state.orderPage, seed.orderPage);
});

test('demo antiga montada hoje recebe os novos exemplos só uma vez', () => {
  const seed = demoSeedState(now);
  const ids = new Set(seed.orders.filter((order) => !/^DEMO-(?:1[6-9]|2[0-9])$/.test(order.id)).map((order) => order.id));
  seed.orders = seed.orders.filter((order) => ids.has(order.id));
  seed.payments = seed.payments.filter((payment) => ids.has(payment.orderId));
  const result = prepareDemoState(seed, null, now);
  assert.equal(result.changed, true);
  assert.equal(due(result.state, 'DEMO-07'), '2026-10-27T10:00');
  assert.ok(result.state.orders.some((order) => order.id === 'DEMO-16'));
  assert.equal(prepareDemoState(result.state, today, now).changed, false);
});

test('sem data da Ana Clara, recomeça os exemplos e preserva pedidos próprios', () => {
  const seed = demoSeedState(oldNow);
  seed.orders = seed.orders.filter((order) => order.id !== 'DEMO-07');
  seed.payments = seed.payments.filter((payment) => payment.orderId !== 'DEMO-07');
  const own = { id: 'meu-pedido', client: 'Visitante', dueAt: '2026-12-22T10:00', history: [] };
  const ownPayment = { id: 'meu-pagamento', orderId: own.id, amount: 20, status: 'Conferido', createdAt: '2026-10-20T12:00:00Z' };
  seed.orders.push(own); seed.payments.push(ownPayment);
  const result = prepareDemoState(seed, null, now);
  assert.equal(due(result.state, 'DEMO-07'), '2026-10-27T10:00');
  assert.deepEqual(result.state.orders.find((order) => order.id === own.id), own);
  assert.deepEqual(result.state.payments.find((payment) => payment.id === ownPayment.id), ownPayment);
  assert.deepEqual(result.state.orderPage, seed.orderPage);
});

test('só avança na virada do dia em São Paulo e nunca volta datas', () => {
  const before = new Date('2026-10-28T02:59:59Z'), after = new Date('2026-10-28T03:00:00Z');
  const seed = stampNewDemo(demoSeedState(before), before);
  assert.equal(todayKey(before), '2026-10-27'); assert.equal(todayKey(after), '2026-10-28');
  assert.equal(prepareDemoState(seed, '2026-10-27', before).changed, false);
  const advanced = prepareDemoState(seed, '2026-10-27', after);
  assert.equal(due(advanced.state, 'DEMO-07'), '2026-10-28T10:00');
  assert.equal(prepareDemoState(advanced.state, '2026-10-28', before).changed, false);
});

test('estado inválido é preservado para tratamento de erro existente', () => {
  const invalid = { version: 1, orders: 'não é uma lista' };
  assert.deepEqual(prepareDemoState(invalid, null, now), { state: invalid, day: null, changed: false });
});

test('marcador acompanha exportação e restauração sem mover exemplos de novo', () => {
  const advanced = prepareDemoState(demoSeedState(oldNow), originalDay, now).state;
  const exported = transactState(advanced, '/api/export', { method: 'GET' });
  const restored = transactState(createEmptyState(), '/api/import', { method: 'POST', body: JSON.stringify(exported.body) });
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  assert.equal(restored.state.demoExampleDay, today);
  assert.equal(prepareDemoState(restored.state, originalDay, now).changed, false);
  assert.equal(due(restored.state, 'DEMO-07'), '2026-10-27T10:00');
});
