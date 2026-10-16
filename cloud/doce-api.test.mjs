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
      storage: options.storage,
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

test('monthly endpoint is authenticated, owner-scoped and returns no customer records',async()=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const key=`${parts.year}-${parts.month}`,state=createEmptyState();
  state.orders=[{id:'own-order',client:'PRIVATE CLIENT',contact:'+5511999990000',product:'Bolo',status:'Entregue',total:123.45,dueAt:`${key}-01T23:30`,createdAt:`${key}-01T12:00:00Z`}];
  const h=makeHarness({row:{owner_user_id:'auth-user-id',state,revision:4}});
  const denied=await h.send(envelope(`/api/resumo-mensal?mes=${key}`),{token:null});assert.equal(denied.status,401);assert.equal(h.calls.selects.length,0);
  const response=await h.send(envelope(`/api/resumo-mensal?mes=${key}&owner_user_id=other-user`));assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.ordersCount,1);assert.equal(data.soldCents,12345);assert.ok(!JSON.stringify(data).includes('PRIVATE CLIENT'));assert.ok(!JSON.stringify(data).includes('5511999990000'));
  assert.deepEqual(h.calls.selects[0].filters,[['owner_user_id','auth-user-id']]);assert.equal(h.calls.rpc.length,0);assert.equal(response.headers.get('X-Agenda-Revision'),'4');
  const invalid=await h.send(envelope('/api/resumo-mensal?mes=bad'));assert.equal(invalid.status,400);
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
  const cloudflare=await send(undefined,{method:'OPTIONS',origin:'https://doce-agenda.doce-agenda-local.workers.dev',token:null});
  assert.equal(cloudflare.status,204);assert.equal(cloudflare.headers.get('Access-Control-Allow-Origin'),'https://doce-agenda.doce-agenda-local.workers.dev');
  const otherWorker=await send(undefined,{method:'OPTIONS',origin:'https://other-account.workers.dev',token:null});assert.equal(otherWorker.status,403);
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

// Fotos da vitrine: Storage simulado em memória.
function fakeStorage() {
  const files = new Map(), log = { created: [], uploads: [], removed: [] };
  const bucket = { async list(folder) { return { data: [...files].filter(([k]) => k.startsWith(folder + '/')).map(([k, v]) => ({ name: k.slice(folder.length + 1), created_at: v.created_at })), error: null }; },
    async upload(key, bytes, options) { log.uploads.push({ key, options, size: bytes.length }); files.set(key, { created_at: '2020-01-01T00:00:00Z' }); return { data: { path: key }, error: null }; },
    async remove(keys) { log.removed.push(...keys); keys.forEach((k) => files.delete(k)); return { data: [], error: null }; } };
  return { files, log, getBucket: async () => ({ error: log.created.length ? null : { message: 'not found' } }), createBucket: async (id, options) => { log.created.push({ id, options }); return { error: null }; }, from: (id) => { assert.equal(id, 'vitrine'); return bucket; } };
}
const photoJpeg = () => { const b = new Uint8Array(300); b.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x84, 0x03, 0x84, 0x03]); return Buffer.from(b).toString('base64'); };

test('vitrine photos: checked bytes go to the account folder; foreign photos are refused and old ones cleaned', async () => {
  const storage = fakeStorage(), h = makeHarness({ row: { owner_user_id: 'auth-user-id', state: createEmptyState(), revision: 1 }, storage });
  const bad = await h.send(envelope('/api/vitrine/fotos', 'POST', 1, { type: 'image/jpeg', data: Buffer.from('<script>alert(1)</script>'.repeat(5)).toString('base64') }));
  assert.equal(bad.status, 400); assert.equal(storage.log.uploads.length, 0);
  const ok = await h.send(envelope('/api/vitrine/fotos', 'POST', 1, { type: 'image/jpeg', data: photoJpeg() }));
  assert.equal(ok.status, 201); const { key, width } = await ok.json(); assert.equal(width, 900);
  assert.match(key, /^[a-f0-9]{32}\/[a-f0-9-]{36}\.jpg$/); assert.ok(!key.includes('auth-user-id'));
  assert.equal(storage.log.created[0].options.public, true); assert.deepEqual(storage.log.created[0].options.allowedMimeTypes, ['image/webp', 'image/jpeg']);
  assert.equal(storage.log.uploads[0].options.contentType, 'image/jpeg'); assert.equal(h.calls.rpc.length, 0, 'upload does not touch the agenda');
  const page = { active: false, slug: '', displayName: 'Doces', welcome: '', whatsapp: '', products: [{ name: 'Bolo', description: '', photo: key }] };
  const foreign = await h.send(envelope('/api/order-page', 'PUT', 1, { ...page, logo: `${'b'.repeat(32)}/${key.split('/')[1]}` }));
  assert.equal(foreign.status, 400); assert.match((await foreign.json()).error, /não pertence/);
  // Uma foto antiga sem uso é apagada ao salvar; a usada fica.
  const folder = key.split('/')[0], old = `${folder}/00000000-0000-0000-0000-000000000000.webp`; storage.files.set(old, { created_at: '2020-01-01T00:00:00Z' });
  const saved = await h.send(envelope('/api/order-page', 'PUT', 1, page));
  assert.equal(saved.status, 200); assert.deepEqual(storage.log.removed, [old]); assert.ok(storage.files.has(key));
  assert.equal(h.row.state.orderPage.products[0].photo, key);
  // Backup de outra conta: o produto volta, a foto de outra pasta não.
  const backup = { ...createEmptyState(), orderPage: { ...page, products: [{ name: 'Bolo', description: '', photo: `${'c'.repeat(32)}/${key.split('/')[1]}` }] } };
  const imported = await h.send(envelope('/api/import', 'POST', 2, backup));
  assert.equal(imported.status, 200); assert.deepEqual(h.row.state.orderPage.products, [{ name: 'Bolo', description: '' }]);
});
