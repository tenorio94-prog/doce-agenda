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
  const requests = [], scripts = [], redirects = [], nodes = new Map();
  const element = id => nodes.get(id) || (nodes.set(id, { hidden: false, append() {}, addEventListener() {} }), nodes.get(id));
  let revision = 0, failWrite = false;
  const window = { DoceCloudConfig: { url: 'https://test.invalid', publishableKey: 'public-test' }, testClient: { auth: {
    async getSession() { return { data: { session }, error: null }; }, onAuthStateChange() {}, async signOut() { return { error: null }; },
  } } };
  vm.runInNewContext(bundled.outputFiles[0].text, { window, document: {
    getElementById: element, querySelector: element, createElement: () => ({ addEventListener() {} }), body: { append: x => scripts.push(x.src) },
  }, location: { replace: url => redirects.push(url), reload() {} }, Response, setTimeout,
  fetch: async (url, options) => {
    const input = JSON.parse(options.body); requests.push(input);
    if (input.method !== 'GET' && failWrite) return new Response('{}', { status: 409, headers: { 'X-Agenda-Revision': '8' } });
    if (input.method !== 'GET') revision++;
    return new Response('{}', { headers: { 'X-Agenda-Revision': String(input.path === '/api/export' ? 99 : revision) } });
  } });
  await new Promise(resolve => setImmediate(resolve));
  return { window, requests, scripts, redirects, setFailure: value => { failWrite = value; }, setRevision: value => { revision = value; } };
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
