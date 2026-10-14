import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from './state-engine.js';
import { createDoceApiHandler } from './doce-api.ts';

const API_ORIGIN = 'https://doce-agenda-piloto.netlify.app';
const LOCAL_ORIGIN = 'http://localhost:4173';
const TOKEN = 'verified-access-token';

function makeHarness(options = {}) {
  const calls = { auth: [], selects: [], upserts: [], rpc: [], clients: [] };
  const row = options.row ?? null;
  let currentRow = row ? structuredClone(row) : null;
  const createClient = (url, key, config) => {
    calls.clients.push({ url, key, config });
    if (key === 'anon-key') {
      return {
        auth: {
          async getUser(jwt) {
            calls.auth.push(jwt);
            return options.authError
              ? { data: { user: null }, error: options.authError }
              : { data: { user: options.user ?? { id: 'auth-user-id', user_metadata: { business_name: 'Doces da Ana', owner_user_id: 'spoofed' } } }, error: null };
          },
        },
      };
    }
    assert.equal(key, 'server-only-service-role');
    return {
      auth: { async getUser() { throw new Error('Admin client must not verify callers.'); } },
      from(table) {
        assert.equal(table, 'pilot_agendas');
        const query = { operation: null, filters: [], payload: null, upsertOptions: null };
        const builder = {
          select(columns) { query.operation = 'select'; query.columns = columns; return builder; },
          eq(column, value) { query.filters.push([column, value]); return builder; },
          maybeSingle: async () => {
            calls.selects.push({ columns: query.columns, filters: query.filters });
            if (options.latestRevision !== undefined && query.columns === 'revision') {
              return { data: { revision: options.latestRevision }, error: null };
            }
            return { data: currentRow ? structuredClone(currentRow) : null, error: null };
          },
          single: async () => {
            calls.selects.push({ columns: query.columns, filters: query.filters });
            return currentRow
              ? { data: structuredClone(currentRow), error: null }
              : { data: null, error: { code: 'PGRST116' } };
          },
          async upsert(payload, upsertOptions) {
            calls.upserts.push({ payload: structuredClone(payload), options: upsertOptions });
            if (!currentRow) currentRow = { ...structuredClone(payload), revision: 0 };
            return { data: null, error: null };
          },
        };
        return builder;
      },
      async rpc(name, args) {
        if(name==='record_pilot_owner_visit')return {data:null,error:null};
        calls.rpc.push({ name, args: structuredClone(args) });
        if (options.rpcError) {
          if (options.advanceOnConflict && currentRow) currentRow.revision = options.latestRevision;
          return { data: null, error: options.rpcError };
        }
        if (!currentRow || Number(currentRow.revision) !== Number(args.p_expected_revision)) {
          return { data: null, error: { code: '40001' } };
        }
        currentRow.state = structuredClone(args.p_state);
        currentRow.revision = Number(currentRow.revision) + 1;
        return { data: currentRow.revision, error: null };
      },
    };
  };
  const handler = createDoceApiHandler({
    env: name => ({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role',
    })[name],
    createClient,
  });
  const send = (body, { origin = API_ORIGIN, token = TOKEN, method = 'POST', headers = {} } = {}) => handler(new Request(
    'https://edge.example/functions/v1/doce-api',
    {
      method,
      headers: {
        ...(origin ? { Origin: origin } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    },
  ));
  return { calls, send, get row() { return currentRow; } };
}

const envelope = (path, method = 'GET', expectedRevision, body) => ({
  path,
  method,
  ...(expectedRevision === undefined ? {} : { expectedRevision }),
  ...(body === undefined ? {} : { body }),
});

test('preflight is limited to configured origins and exposes the revision header', async () => {
  const { send, calls } = makeHarness();
  const allowed = await send(undefined, { method: 'OPTIONS', origin: LOCAL_ORIGIN, token: null });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), LOCAL_ORIGIN);
  assert.match(allowed.headers.get('Access-Control-Allow-Headers'), /x-client-info/);
  assert.equal(allowed.headers.get('Access-Control-Expose-Headers'), 'X-Agenda-Revision');
  assert.equal(calls.clients.length, 0);

  const denied = await send(undefined, { method: 'OPTIONS', origin: 'https://evil.example', token: null });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
});

test('auth is verified from the bearer token before any table or RPC access', async () => {
  const missing = makeHarness();
  const unauthorized = await missing.send(envelope('/api/state'), { token: null });
  assert.equal(unauthorized.status, 401);
  assert.equal(missing.calls.selects.length, 0);
  assert.equal(missing.calls.rpc.length, 0);

  const invalid = makeHarness({ authError: new Error('private auth detail') });
  const response = await invalid.send(envelope('/api/state'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autenticação inválida.' });
  assert.deepEqual(invalid.calls.auth, [TOKEN]);
  assert.equal(invalid.calls.selects.length, 0);
});

test('first authenticated read initializes a private empty agenda for the verified user id', async () => {
  const harness = makeHarness();
  const { send, calls } = harness;
  const response = await send(envelope('/api/state'));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Agenda-Revision'), '0');
  assert.deepEqual(payload.orders, []);
  assert.deepEqual(payload.payments, []);
  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.upserts[0].payload.owner_user_id, 'auth-user-id');
  assert.equal(calls.upserts[0].payload.business_name, 'Doces da Ana');
  assert.deepEqual(calls.upserts[0].payload.state, createEmptyState());
  assert.equal(calls.upserts[0].payload.owner_user_id, 'auth-user-id');
  assert.notEqual(calls.upserts[0].payload.owner_user_id, 'spoofed');
  assert.equal(harness.row.revision, 0);
});

test('writes require the current revision and commit with backup false', async () => {
  const seeded = {
    owner_user_id: 'auth-user-id', business_name: 'Doces da Ana', revision: 4, state: createEmptyState(),
  };
  const { send, calls, row } = makeHarness({ row: seeded });
  const response = await send(envelope('/api/orders', 'POST', 4, {
    client: 'Ana', product: 'Bolo', total: 100, status: 'Orçamento',
  }));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('X-Agenda-Revision'), '5');
  assert.equal(body.client, 'Ana');
  assert.equal(calls.rpc.length, 1);
  assert.equal(calls.rpc[0].name, 'commit_pilot_agenda');
  assert.equal(calls.rpc[0].args.p_owner, 'auth-user-id');
  assert.equal(calls.rpc[0].args.p_expected_revision, 4);
  assert.equal(calls.rpc[0].args.p_backup, false);
  assert.equal(row.state.orders.length, 1);
});

test('stale revisions and RPC CAS losses return 409 with the latest revision', async () => {
  const seeded = { owner_user_id: 'auth-user-id', revision: 8, state: createEmptyState() };
  const stale = makeHarness({ row: seeded });
  const staleResponse = await stale.send(envelope('/api/availability', 'PUT', 7, {
    ...createEmptyState().availability,
  }));
  assert.equal(staleResponse.status, 409);
  assert.equal(staleResponse.headers.get('X-Agenda-Revision'), '8');
  assert.equal(stale.calls.rpc.length, 0);

  const raced = makeHarness({ row: seeded, rpcError: { code: '40001' }, latestRevision: 9, advanceOnConflict: true });
  const racedResponse = await raced.send(envelope('/api/orders', 'POST', 8, {
    client: 'Ana', product: 'Bolo', total: 100, status: 'Orçamento',
  }));
  assert.equal(racedResponse.status, 409);
  assert.equal(racedResponse.headers.get('X-Agenda-Revision'), '9');
  assert.deepEqual(await racedResponse.json(), {
    error: 'O estado mudou em outra sessão. Atualize e tente novamente.', code: 'REVISION_CONFLICT',
  });
});

test('only a valid import requests an atomic restore point', async () => {
  const seeded = { owner_user_id: 'auth-user-id', revision: 2, state: createEmptyState() };
  const { send, calls } = makeHarness({ row: seeded });
  const importBody = {
    version: 1,
    orders: [{
      id: 'legacy-1', client: 'Ana', product: 'Bolo', total: 100, status: 'Orçamento', dueAt: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
    }],
    payments: [],
  };
  const response = await send(envelope('/api/import', 'POST', 2, importBody));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Agenda-Revision'), '3');
  assert.deepEqual(await response.json(), { ok: true, orders: 1, payments: 0 });
  assert.equal(calls.rpc[0].args.p_backup, true);

  const state2 = { owner_user_id: 'auth-user-id', revision: 3, state: createEmptyState() };
  const bad = makeHarness({ row: state2 });
  const failure = await bad.send(envelope('/api/import', 'POST', 3, {
    version: 1, orders: [], payments: [{ id: 'orphan', orderId: 'missing', amount: 1, status: 'Informado', createdAt: new Date().toISOString() }],
  }));
  assert.equal(failure.status, 400);
  assert.match((await failure.json()).error, /Pagamento inválido/);
  assert.equal(bad.calls.rpc.length, 0);
});

test('route allowlist and streaming body limit reject requests without touching agenda data', async () => {
  const unknown = makeHarness();
  const denied = await unknown.send(envelope('/api/admin/export'));
  assert.equal(denied.status, 404);
  assert.equal(unknown.calls.selects.length, 0);

  const huge = makeHarness();
  const oversizedBody = ' '.repeat(5 * 1024 * 1024 + 1);
  const tooLarge = await huge.send(oversizedBody);
  assert.equal(tooLarge.status, 413);
  assert.equal(huge.calls.selects.length, 0);
  assert.equal(huge.calls.rpc.length, 0);
});

test('business validation errors retain their status and body and do not commit', async () => {
  const seeded = { owner_user_id: 'auth-user-id', revision: 3, state: createEmptyState() };
  const { send, calls } = makeHarness({ row: seeded });
  const response = await send(envelope('/api/orders', 'POST', 3, { client: '', product: 'Bolo', total: 100 }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Preencha cliente e produto.' });
  assert.equal(response.headers.get('X-Agenda-Revision'), '3');
  assert.equal(calls.rpc.length, 0);
});
