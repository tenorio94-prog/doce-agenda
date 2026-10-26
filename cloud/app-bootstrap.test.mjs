import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const bundled = await build({ entryPoints: ['cloud/app-bootstrap.js'], bundle: true, write: false, format: 'iife',
  plugins: [{ name: 'test-only-sdk', setup(builder) {
    builder.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'stub', namespace: 'stub' }));
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const createClient = () => window.testClient;', loader: 'js' }));
  } }],
});
async function harness(session) {
  const requests = [], scripts = [], redirects = [], events = [], nodes = new Map();
  const element = id => nodes.get(id) || (nodes.set(id, { hidden: false, append() {}, addEventListener() {} }), nodes.get(id));
  let revision = 0, failWrite = false, jump = 0, stateBody = '{}';
  const window = { dispatchEvent: event => events.push(event.type), DoceCloudConfig: { url: 'https://test.invalid', publishableKey: 'public-test' }, testClient: { auth: {
    async getSession() { return { data: { session }, error: null }; }, onAuthStateChange() {}, async signOut() { return { error: null }; },
  } } };
  vm.runInNewContext(bundled.outputFiles[0].text, { window, document: {
    getElementById: element, querySelector: element, createElement: () => ({ addEventListener() {} }), body: { append: x => scripts.push(x.src) },
  }, location: { replace: url => redirects.push(url), reload() {} }, Response, Event, setTimeout,
  fetch: async (url, options) => {
    const input = JSON.parse(options.body); requests.push(input);
    if (input.method !== 'GET' && failWrite) return new Response('{}', { status: 409, headers: { 'X-Agenda-Revision': '8' } });
    if (input.method !== 'GET') revision += 1 + jump;
    const body = input.path === '/api/state' ? stateBody : input.method !== 'GET' ? JSON.stringify(input.body || {}) : '{}';
    return new Response(body, { headers: { 'X-Agenda-Revision': String(input.path === '/api/export' ? 99 : revision) } });
  } });
  await new Promise(resolve => setImmediate(resolve));
  return { window, requests, scripts, redirects, events, setFailure: value => { failWrite = value; }, setRevision: value => { revision = value; },
    setJump: value => { jump = value; }, setState: value => { stateBody = JSON.stringify(value); } };
}
test('no session redirects without loading app or accessing API/local storage', async () => {
  const h = await harness(null);
  assert.deepEqual(h.redirects, ['/cadastro/?mode=login']); assert.deepEqual(h.scripts, []); assert.deepEqual(h.requests, []);
  assert.equal(h.window.DoceApi, undefined);
});
test('cloud adapter requires full state and blocks retries after stale revision', async () => {
  const h = await harness({ access_token: 'test-token' });
  assert.deepEqual(h.scripts, ['/cloud-app.js']); assert.equal(h.window.DoceApi.mode, 'cloud');
  const call = (path, method = 'GET') => h.window.DoceApi.fetch(path, { method, body: method === 'GET' ? undefined : '{}' });
  assert.equal((await call('/api/orders', 'POST')).status, 409); assert.equal(h.requests.length, 0);
  await call('/api/state'); await call('/api/orders', 'POST');
  assert.equal(h.requests.at(-1).expectedRevision, 0);
  await call('/api/export'); await call('/api/orders', 'POST');
  assert.equal(h.requests.at(-1).expectedRevision, 1, 'partial/export reads cannot adopt a newer base');
  h.setFailure(true); assert.equal((await call('/api/orders', 'POST')).status, 409);
  const count = h.requests.length; assert.equal((await call('/api/orders', 'POST')).status, 409); assert.equal(h.requests.length, count);
  await call('/api/export'); assert.equal((await call('/api/orders', 'POST')).status, 409);
  h.setRevision(8); h.setFailure(false); await call('/api/state'); await call('/api/orders', 'POST');
  assert.equal(h.requests.at(-1).expectedRevision, 8);
});

test('writes carry what the app saw and announce writes made by others', async () => {
  const h = await harness({ access_token: 'test-token' });
  const call = (path, method = 'GET', body) => h.window.DoceApi.fetch(path, { method, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  h.setState({ orders: [{ id: 'p1', updatedAt: '2030-01-02T10:00:00.000Z' }], payments: [{ id: 'pg1', orderId: 'p1' }], availability: { dailyOrderLimit: 3 } });
  await call('/api/state');
  await call('/api/orders/p1', 'PUT', { status: 'Pronto' });
  assert.deepEqual(h.requests.at(-1).base, { order: '2030-01-02T10:00:00.000Z' });
  await call('/api/payments/pg1', 'PUT', { status: 'Conferido' });
  assert.deepEqual(h.requests.at(-1).base, { order: '2030-01-02T10:00:00.000Z' }, 'pagamento leva o carimbo do pedido');
  await call('/api/availability', 'PUT', { dailyOrderLimit: 4 });
  assert.deepEqual(h.requests.at(-1).base, { section: JSON.stringify({ dailyOrderLimit: 3 }) });
  await call('/api/availability', 'PUT', { dailyOrderLimit: 5 });
  assert.deepEqual(h.requests.at(-1).base, { section: JSON.stringify({ dailyOrderLimit: 4 }) }, 'a própria gravação vira o novo visto');
  await call('/api/orders', 'POST', { client: 'Ana' });
  assert.deepEqual(h.requests.at(-1).base, {});
  assert.deepEqual(h.events, [], 'só as próprias gravações: nada a recarregar');
  h.setJump(1); await call('/api/orders/p1', 'PUT', { status: 'Entregue' });
  assert.deepEqual(h.events, ['doce:stale'], 'versão pulou: outra sessão ou o link gravou no meio');
});
