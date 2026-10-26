import test from 'node:test';
import assert from 'node:assert/strict';
import { canRebaseWrite, createEmptyState, orderStamp, transactState } from './state-engine.js';

const request = (state, path, method = 'GET', body) => transactState(state, path, {
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

function orderBody(overrides = {}) {
  return {
    client: 'Ana', product: 'Bolo de chocolate', total: 180, status: 'Orçamento', dueAt: '',
    ...overrides,
  };
}

function futureAt(day = '2099-06-18', time = '16:00') {
  return `${day}T${time}`;
}

test('starts without sample records and keeps São Paulo wall-clock dates in the order API', () => {
  const state = createEmptyState();
  assert.deepEqual(state.orders, []);
  assert.deepEqual(state.payments, []);

  const draft = request(state, '/api/orders', 'POST', orderBody());
  assert.equal(draft.status, 201);
  assert.equal(draft.body.status, 'Orçamento');
  assert.equal(draft.body.dueAt, '');

  const confirmed = request(draft.state, '/api/orders', 'POST', orderBody({ status: 'Confirmado', dueAt: futureAt() }));
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.body.dueAt, '2099-06-18T16:00');
  assert.equal(confirmed.state.orders.length, 2);
  assert.equal(state.orders.length, 0);
});

test('payment confirmation is idempotent and records one confirmation event', () => {
  const created = request(createEmptyState(), '/api/orders', 'POST', orderBody());
  const payment = request(created.state, `/api/orders/${created.body.id}/payments`, 'POST', {
    amount: 50, status: 'Informado', note: 'Entrada',
  });
  const before = payment.state.orders[0].history.length;
  const confirmed = request(payment.state, `/api/payments/${payment.body.id}`, 'PUT', { status: 'Conferido' });
  const confirmedAt = confirmed.body.confirmedAt;
  const repeated = request(confirmed.state, `/api/payments/${payment.body.id}`, 'PUT', { status: 'Conferido' });

  assert.equal(confirmed.body.status, 'Conferido');
  assert.ok(confirmedAt);
  assert.equal(repeated.body.confirmedAt, confirmedAt);
  assert.equal(repeated.state.orders[0].history.length, before + 1);
});

test('closed days and full dates block confirmation unless a reasoned exception is supplied', () => {
  let state = createEmptyState();
  const day = '2099-06-18';
  const availability = {
    ...state.availability,
    dailyOrderLimit: 1,
    dateOverrides: { [day]: { closed: false, limit: 1 } },
  };
  state = request(state, '/api/availability', 'PUT', availability).state;
  const first = request(state, '/api/orders', 'POST', orderBody({ status: 'Confirmado', dueAt: futureAt(day) }));
  assert.equal(first.status, 201);

  const blocked = request(first.state, '/api/orders', 'POST', orderBody({ status: 'Confirmado', dueAt: futureAt(day) }));
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'DAILY_LIMIT');
  assert.equal(blocked.mutated, false);
  assert.equal(blocked.state.orders.length, 1);

  const excepted = request(first.state, '/api/orders', 'POST', orderBody({
    status: 'Confirmado', dueAt: futureAt(day), capacityOverride: { allowed: true, reason: 'Equipe reforçada' },
  }));
  assert.equal(excepted.status, 201);
  assert.match(excepted.body.history.at(-1).text, /DAILY_LIMIT/);

  const closedState = request(createEmptyState(), '/api/availability', 'PUT', {
    ...createEmptyState().availability,
    dateOverrides: { [day]: { closed: true, limit: null } },
  }).state;
  const closed = request(closedState, '/api/orders', 'POST', orderBody({ status: 'Confirmado', dueAt: futureAt(day) }));
  assert.equal(closed.body.code, 'DATE_CLOSED');
});

test('required cake fields are enforced when a draft becomes confirmed', () => {
  let state = createEmptyState();
  const template = structuredClone(state.orderTemplate);
  template.fields.find(field => field.key === 'flavor').required = true;
  template.fields.find(field => field.key === 'flavor').options = ['Chocolate', 'Baunilha'];
  state = request(state, '/api/order-template', 'PUT', template).state;
  const draft = request(state, '/api/orders', 'POST', orderBody({ cake: { templateVersion: 1, values: {}, labels: {} } }));

  const missing = request(draft.state, `/api/orders/${draft.body.id}`, 'PUT', { status: 'Confirmado', dueAt: futureAt() });
  assert.equal(missing.status, 400);
  assert.match(missing.body.error, /Sabor/);
  assert.equal(missing.state.orders[0].status, 'Orçamento');

  const valid = request(draft.state, `/api/orders/${draft.body.id}`, 'PUT', {
    status: 'Confirmado', dueAt: futureAt(), cake: { templateVersion: 1, values: { flavor: 'Chocolate' }, labels: {} },
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.status, 'Confirmado');
});

test('an invalid backup reports an error and leaves the caller state untouched', () => {
  const state = createEmptyState();
  const snapshot = structuredClone(state);
  const invalid = request(state, '/api/import', 'POST', {
    version: 1,
    orders: [{ ...orderBody({ status: 'Confirmado', dueAt: futureAt() }), id: 'bad', history: [] }],
    payments: [{ id: 'payment-without-order', orderId: 'missing', amount: 10, status: 'Informado', createdAt: new Date().toISOString() }],
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /Pagamento inválido/);
  assert.equal(invalid.mutated, false);
  assert.deepEqual(state, snapshot);
  assert.deepEqual(invalid.state, snapshot);
});

test('a valid import replaces state and the export route returns the imported document', () => {
  const state = createEmptyState();
  const importedOrder = {
    ...orderBody({ status: 'Confirmado', dueAt: futureAt() }),
    id: 'imported-order', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
  };
  const imported = request(state, '/api/import', 'POST', { version: 1, orders: [importedOrder], payments: [] });
  assert.deepEqual(imported.body, { ok: true, orders: 1, payments: 0 });
  assert.equal(imported.status, 200);
  assert.equal(imported.mutated, true);
  assert.equal(state.orders.length, 0);

  const exported = request(imported.state, '/api/export');
  assert.equal(exported.body.orders[0].id, 'imported-order');
  assert.equal(exported.mutated, false);
});

test('GET routes return current representations without mutating input', () => {
  const state = createEmptyState();
  const before = structuredClone(state);
  const result = request(state, '/api/state?include=all');
  assert.deepEqual(result.body, state);
  assert.notEqual(result.body, state);
  assert.deepEqual(state, before);
  assert.equal(result.mutated, false);
});

test('canRebaseWrite only replays what the app saw unchanged', () => {
  const state = createEmptyState();
  state.orders.push({ id: 'p1', client: 'Ana', product: 'Bolo', total: 100, status: 'Confirmado', dueAt: '2030-05-10T10:00', createdAt: '2030-01-01T10:00:00.000Z', updatedAt: '2030-01-02T10:00:00.000Z', history: [] });
  state.payments.push({ id: 'pg1', orderId: 'p1', amount: 50, status: 'Informado', createdAt: '2030-01-02T10:00:00.000Z' });
  const stamp = orderStamp(state.orders[0]);
  assert.equal(canRebaseWrite(state, '/api/orders', 'POST'), true);
  assert.equal(canRebaseWrite(state, '/api/orders/p1', 'PUT', { order: stamp }), true);
  assert.equal(canRebaseWrite(state, '/api/orders/p1/payments', 'POST', { order: stamp }), true);
  assert.equal(canRebaseWrite(state, '/api/orders/p1/accept', 'POST', { order: stamp }), true);
  assert.equal(canRebaseWrite(state, '/api/payments/pg1', 'PUT', { order: stamp }), true);
  assert.equal(canRebaseWrite(state, '/api/orders/p1', 'PUT', { order: 'outro' }), false);
  assert.equal(canRebaseWrite(state, '/api/orders/p1', 'PUT', {}), false);
  assert.equal(canRebaseWrite(state, '/api/orders/nao-existe', 'PUT', { order: stamp }), false);
  assert.equal(canRebaseWrite(state, '/api/import', 'POST', { order: stamp }), false);
  assert.equal(canRebaseWrite(state, '/api/clientes/x/anonimizar', 'POST', { order: stamp }), false);
  const seen = JSON.stringify(transactState(state, '/api/state').body.availability);
  assert.equal(canRebaseWrite(state, '/api/availability', 'PUT', { section: seen }), true);
  assert.equal(canRebaseWrite(state, '/api/availability', 'PUT', { section: '{}' }), false);
});
