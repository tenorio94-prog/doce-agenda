import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

const CONFIG_URL = new URL('../public/account/config.js', import.meta.url);
const apiPath = '/functions/v1/doce-api';
const testHeaders = { 'Content-Type': 'application/json' };

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing environment variable: ${name}`);
  return value.trim();
}

function safeCheck(condition, label) {
  if (!condition) throw new Error(`FAILED: ${label}`);
}

function readPublicConfig(source) {
  const sandbox = { window: Object.create(null) };
  runInNewContext(source, sandbox, {
    timeout: 250,
    contextCodeGeneration: { strings: false, wasm: false },
  });
  const config = sandbox.window.DoceCloudConfig;
  safeCheck(config && typeof config.url === 'string' && typeof config.publishableKey === 'string', 'public Supabase config exists');
  safeCheck(config.url.startsWith('https://'), 'public Supabase URL uses HTTPS');
  safeCheck(config.publishableKey.length > 20, 'public Supabase publishable key is configured');
  return config;
}

async function invoke(config, bearer, envelope) {
  const headers = { ...testHeaders, apikey: config.publishableKey };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const response = await fetch(`${config.url}${apiPath}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(envelope),
    redirect: 'error',
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('FAILED: API response is JSON');
  }
  return { status: response.status, revision: response.headers.get('X-Agenda-Revision'), body };
}

function checkApiResponse(response, status, revision, label) {
  safeCheck(response.status === status, `${label} returns HTTP ${status}`);
  if (revision !== undefined) safeCheck(response.revision === String(revision), `${label} returns the expected revision`);
}

async function signIn(config, email, password, label) {
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const result = await client.auth.signInWithPassword({ email, password });
  safeCheck(!result.error && !!result.data?.session?.access_token && !!result.data?.user?.id, `${label} synthetic account signs in`);
  return { client, token: result.data.session.access_token };
}

async function main() {
  const credentials = [
    { label: 'A', email: requiredEnvironment('CLOUD_TEST_EMAIL_A'), password: requiredEnvironment('CLOUD_TEST_PASSWORD_A') },
    { label: 'B', email: requiredEnvironment('CLOUD_TEST_EMAIL_B'), password: requiredEnvironment('CLOUD_TEST_PASSWORD_B') },
  ];
  safeCheck(credentials.every(item => item.email.toLowerCase().endsWith('.invalid')), 'test accounts use the reserved .invalid domain');
  safeCheck(credentials[0].email.toLowerCase() !== credentials[1].email.toLowerCase(), 'test accounts are distinct');

  const configSource = await readFile(fileURLToPath(CONFIG_URL), 'utf8');
  const config = readPublicConfig(configSource);
  const sessions = [];
  try {
    // The published anon key is deliberately not a user identity and must fail getUser.
    const unauthenticated = await invoke(config, null, { path: '/api/state', method: 'GET' });
    checkApiResponse(unauthenticated, 401, undefined, 'request without a bearer');
    const anonymous = await invoke(config, config.publishableKey, { path: '/api/state', method: 'GET' });
    checkApiResponse(anonymous, 401, undefined, 'legacy anon key as bearer');

    const first = await signIn(config, credentials[0].email, credentials[0].password, 'A');
    sessions.push(first);
    const second = await signIn(config, credentials[1].email, credentials[1].password, 'B');
    sessions.push(second);

    const stateA = await invoke(config, first.token, { path: '/api/state', method: 'GET' });
    checkApiResponse(stateA, 200, undefined, 'account A initial state');
    safeCheck(Number.isSafeInteger(Number(stateA.revision)), 'account A has a numeric revision');
    safeCheck(Array.isArray(stateA.body.orders) && stateA.body.orders.length === 0, 'account A starts without orders');
    safeCheck(Array.isArray(stateA.body.payments) && stateA.body.payments.length === 0, 'account A starts without payments');

    const stateB = await invoke(config, second.token, { path: '/api/state', method: 'GET' });
    checkApiResponse(stateB, 200, undefined, 'account B initial state');
    safeCheck(Number.isSafeInteger(Number(stateB.revision)), 'account B has a numeric revision');
    safeCheck(Array.isArray(stateB.body.orders) && stateB.body.orders.length === 0, 'account B starts without orders');
    safeCheck(Array.isArray(stateB.body.payments) && stateB.body.payments.length === 0, 'account B starts without payments');

    const revA0 = Number(stateA.revision);
    const created = await invoke(config, first.token, {
      path: '/api/orders', method: 'POST', expectedRevision: revA0,
      body: { client: 'Cloud integration test', product: 'Synthetic verification order', total: 23.45, status: 'Orçamento' },
    });
    checkApiResponse(created, 201, revA0 + 1, 'account A creates an order');
    safeCheck(typeof created.body.id === 'string' && created.body.id.length > 0, 'created order has an id');
    const orderId = created.body.id;
    const revA1 = Number(created.revision);

    const crossOwnerPut = await invoke(config, second.token, {
      path: `/api/orders/${encodeURIComponent(orderId)}`, method: 'PUT', expectedRevision: Number(stateB.revision),
      body: { status: 'Cancelado' },
    });
    checkApiResponse(crossOwnerPut, 404, Number(stateB.revision), 'account B cannot update account A order');

    const staleWrite = await invoke(config, first.token, {
      path: `/api/orders/${encodeURIComponent(orderId)}`, method: 'PUT', expectedRevision: revA0,
      body: { status: 'Confirmado', dueAt: '2099-06-18T16:00' },
    });
    checkApiResponse(staleWrite, 409, revA1, 'stale revision is rejected');

    const payment = await invoke(config, first.token, {
      path: `/api/orders/${encodeURIComponent(orderId)}/payments`, method: 'POST', expectedRevision: revA1,
      body: { amount: 10, status: 'Informado', note: 'Synthetic API check' },
    });
    checkApiResponse(payment, 200, revA1 + 1, 'payment is recorded');
    safeCheck(typeof payment.body.id === 'string', 'payment has an id');
    const paymentId = payment.body.id;
    const revA2 = Number(payment.revision);

    const confirmed = await invoke(config, first.token, {
      path: `/api/payments/${encodeURIComponent(paymentId)}`, method: 'PUT', expectedRevision: revA2,
      body: { status: 'Conferido' },
    });
    checkApiResponse(confirmed, 200, revA2 + 1, 'payment is confirmed');
    safeCheck(confirmed.body.status === 'Conferido' && typeof confirmed.body.confirmedAt === 'string', 'payment confirmation is recorded');

    const repeated = await invoke(config, first.token, {
      path: `/api/payments/${encodeURIComponent(paymentId)}`, method: 'PUT', expectedRevision: Number(confirmed.revision),
      body: { status: 'Conferido' },
    });
    checkApiResponse(repeated, 200, confirmed.revision, 'repeated confirmation is idempotent');
    safeCheck(repeated.body.confirmedAt === confirmed.body.confirmedAt, 'idempotent confirmation preserves its timestamp');

    const finalState = await invoke(config, first.token, { path: '/api/state', method: 'GET' });
    checkApiResponse(finalState, 200, undefined, 'account A state after writes');
    const order = finalState.body.orders.find(item => item.id === orderId);
    safeCheck(!!order, 'account A state contains its order');
    safeCheck(order.history.filter(item => item.text?.startsWith('Recebimento conferido:')).length === 1, 'confirmation history contains one event');

    const imported = await invoke(config, first.token, {
      path: '/api/import', method: 'POST', expectedRevision: Number(finalState.revision),
      body: {
        version: 1,
        orders: finalState.body.orders,
        payments: finalState.body.payments,
        availability: finalState.body.availability,
        orderTemplate: finalState.body.orderTemplate,
      },
    });
    checkApiResponse(imported, 200, Number(finalState.revision) + 1, 'backup import succeeds');
    safeCheck(imported.body.ok === true && imported.body.orders === 1 && imported.body.payments === 1, 'backup import reports the synthetic records');

    const stateBAfter = await invoke(config, second.token, { path: '/api/state', method: 'GET' });
    safeCheck(stateBAfter.status === 200, 'account B remains accessible');
    safeCheck(stateBAfter.body.orders.length === 0 && stateBAfter.body.payments.length === 0, 'account B remains isolated');

    for (const label of [
      'unauthenticated rejection', 'anon bearer rejection', 'empty initial states', 'order creation',
      'cross-owner isolation', 'stale revision conflict', 'idempotent payment confirmation', 'backup import',
    ]) console.log(`PASS ${label}`);
  } finally {
    await Promise.allSettled(sessions.map(({ client }) => client.auth.signOut({ scope: 'global' })));
  }
}

main().catch(error => {
  // Assert messages are intentionally labels only; never print SDK errors or request data.
  const message = typeof error?.message === 'string' && /^(FAILED:|Missing environment variable:)/.test(error.message)
    ? error.message : 'FAILED: cloud integration check';
  console.error(message);
  process.exitCode = 1;
});
