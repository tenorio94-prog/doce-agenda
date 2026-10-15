import test from 'node:test';
import assert from 'node:assert/strict';
import { clientKeyFor, clientsSummary, phoneKey } from './clients.js';
import { createEmptyState, transactState } from './state-engine.js';

const NOW = new Date('2026-10-15T15:00:00Z'); // 15/10/2026, 12h em São Paulo
let seq = 0;
const order = (fields) => ({
  id: `O${++seq}`, client: 'Ana', product: 'Bolo', details: '', dueAt: '2026-10-20T10:00', mode: 'Retirada', location: '', total: 100,
  status: 'Confirmado', nextAction: '', nextAt: '', pendingChange: '', contact: '', origin: 'manual', createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z', history: [], ...fields,
});
const stateWith = (orders, payments = []) => ({ ...createEmptyState(), orders, payments });

test('phone is the identity, with or without +55 and punctuation', () => {
  assert.equal(phoneKey('(11) 99999-8888'), '11999998888');
  assert.equal(phoneKey('+55 11 99999-8888'), '11999998888');
  assert.equal(phoneKey('5511999998888'), '11999998888');
  assert.equal(phoneKey('9999-8888'), '');
  assert.equal(clientKeyFor({ contact: '11 3333-4444', client: 'Ana' }), 'tel:1133334444');
  assert.equal(clientKeyFor({ contact: '', client: '  Ána  Paula ' }), 'nome:ana paula');
});

test('a ficha sums purchases in cents, counts orders and finds the next and last order', () => {
  const summary = clientsSummary(stateWith([
    order({ client: 'Ana Clara', contact: '(11) 98888-0001', dueAt: '2026-09-01T10:00', status: 'Entregue', total: 100.1, product: 'Bolo de pistache' }),
    order({ client: 'Ana Clara', contact: '11988880001', dueAt: '2026-10-25T10:00', status: 'Confirmado', total: 50.2, product: 'Bolo de pistache' }),
    order({ client: 'Ana C.', contact: '+55 11 98888-0001', dueAt: '2026-10-30T10:00', status: 'Orçamento', total: 999, product: 'Torta' }),
    order({ client: 'Ana Clara', contact: '11988880001', status: 'Recusado' }),
    order({ client: 'Exemplo', contact: '11988880001', isSample: true }),
  ]), NOW);
  assert.equal(summary.today, '2026-10-15');
  assert.equal(summary.clients.length, 1);
  const [ana] = summary.clients;
  assert.equal(ana.key, 'tel:11988880001');
  assert.equal(ana.name, 'Ana C.', 'name of the most recent order');
  assert.equal(ana.orders, 3);
  assert.equal(ana.purchases, 2);
  assert.equal(ana.totalCents, 15030, 'quote and refused request do not count');
  assert.equal(ana.lastPurchaseDay, '2026-09-01');
  assert.equal(ana.nextOrderDay, '2026-10-25');
  assert.equal(ana.daysSinceLast, 44);
  assert.equal(ana.away, false);
  assert.deepEqual(ana.topProducts, [{ product: 'Bolo de pistache', count: 2 }]);
});

test('away after 90 days without a new order; a value to combine does not count', () => {
  const summary = clientsSummary(stateWith([
    order({ client: 'Helena', contact: '11 97777-0001', dueAt: '2026-07-10T10:00', status: 'Entregue', total: 80 }),
    order({ client: 'Helena', contact: '11 97777-0001', dueAt: '2026-05-10T10:00', status: 'Entregue', total: 0, totalKnown: false }),
    order({ client: 'Bia', contact: '11 97777-0002', dueAt: '2026-07-01T10:00', status: 'Entregue' }),
    order({ client: 'Bia', contact: '11 97777-0002', dueAt: '2026-10-16T10:00', status: 'Confirmado' }),
  ]), NOW);
  const helena = summary.clients.find((client) => client.name === 'Helena');
  const bia = summary.clients.find((client) => client.name === 'Bia');
  assert.equal(helena.away, true);
  assert.equal(helena.totalCents, 8000);
  assert.equal(bia.away, false, 'has an upcoming order');
  assert.equal(summary.away, 1);
});

test('a date that repeats next month becomes a reminder, unless there is already an order around it', () => {
  const summary = clientsSummary(stateWith([
    order({ client: 'Carla', contact: '11 96666-0001', dueAt: '2025-11-02T10:00', status: 'Entregue', product: 'Bolo de aniversário' }),
    order({ client: 'Sônia', contact: '11 96666-0002', dueAt: '2025-10-20T10:00', status: 'Entregue', product: 'Bolo' }),
    order({ client: 'Sônia', contact: '11 96666-0002', dueAt: '2026-10-22T10:00', status: 'Confirmado', product: 'Bolo' }),
    order({ client: 'Lia', contact: '11 96666-0003', dueAt: '2025-12-25T10:00', status: 'Entregue' }),
    order({ client: 'Rui', contact: '11 96666-0004', dueAt: '2026-02-01T10:00', status: 'Entregue' }),
  ]), NOW);
  assert.deepEqual(summary.reminders.map(({ name, day, daysUntil, originalDay }) => ({ name, day, daysUntil, originalDay })),
    [{ name: 'Carla', day: '2026-11-02', daysUntil: 18, originalDay: '2025-11-02' }]);
});

test('29 February becomes 28 February in a common year', () => {
  const summary = clientsSummary(stateWith([order({ client: 'Leo', contact: '11 95555-0001', dueAt: '2024-02-29T10:00', status: 'Entregue' })]), new Date('2026-02-10T15:00:00Z'));
  assert.equal(summary.reminders[0].day, '2026-02-28');
});

test('same name without phone is suggested, never merged', () => {
  const summary = clientsSummary(stateWith([
    order({ client: 'Paula', contact: '11 94444-0001', status: 'Entregue', dueAt: '2026-10-01T10:00' }),
    order({ client: 'paula', contact: '', status: 'Entregue', dueAt: '2026-06-01T10:00' }),
    order({ client: 'Paula', contact: '11 94444-0009', status: 'Entregue', dueAt: '2026-05-01T10:00' }),
  ]), NOW);
  assert.equal(summary.clients.length, 3);
  const withoutPhone = summary.clients.find((client) => !client.phone);
  assert.equal(withoutPhone.key, 'nome:paula');
  assert.deepEqual(withoutPhone.sameNameAs.map(({ phone }) => phone).sort(), ['11944440001', '11944440009']);
});

test('the account route returns fichas; anonymizing removes personal data but keeps values and dates', () => {
  const state = stateWith([
    order({ id: 'A', client: 'Ana', contact: '11 93333-0001', details: 'Mora na rua X', location: 'Rua X, 10', status: 'Entregue', dueAt: '2026-09-01T10:00',
      cake: { templateVersion: 1, values: { inscription: 'Feliz aniversário, Ana!' }, labels: {} }, history: [{ at: '2026-09-01T10:00:00Z', text: 'Cliente: Ana' }] }),
    order({ id: 'B', client: 'Bia', contact: '11 93333-0002', dueAt: '2026-09-02T10:00' }),
  ], [{ id: 'P1', orderId: 'A', amount: 50, status: 'Conferido', note: 'Pix da Ana', createdAt: '2026-09-01T10:00:00Z' }]);
  const read = transactState(state, '/api/clientes');
  assert.equal(read.status, 200);
  assert.equal(read.mutated, false);
  assert.equal(read.body.clients.length, 2);

  const done = transactState(state, `/api/clientes/${encodeURIComponent('tel:11933330001')}/anonimizar`, { method: 'POST', body: '{}' });
  assert.equal(done.status, 200);
  assert.deepEqual(done.body, { ok: true, orders: 1 });
  const ana = done.state.orders.find((item) => item.id === 'A');
  assert.equal(ana.client, 'Cliente removida');
  assert.equal(ana.contact, '');
  assert.equal(ana.details, '');
  assert.equal(ana.location, '');
  assert.equal(ana.cake.values.inscription, '');
  assert.deepEqual(ana.history.map((item) => item.text), ['Dados pessoais da cliente apagados a pedido.']);
  assert.equal(ana.total, 100);
  assert.equal(ana.dueAt, '2026-09-01T10:00');
  assert.equal(done.state.payments[0].note, '');
  assert.equal(done.state.payments[0].amount, 50);
  assert.equal(done.state.orders.find((item) => item.id === 'B').client, 'Bia');
  // The result is still a valid backup.
  assert.equal(transactState(createEmptyState(), '/api/import', { method: 'POST', body: JSON.stringify(done.state) }).status, 200);

  const missing = transactState(state, `/api/clientes/${encodeURIComponent('tel:11000000000')}/anonimizar`, { method: 'POST', body: '{}' });
  assert.equal(missing.status, 404);
  assert.equal(missing.mutated, false);
});
