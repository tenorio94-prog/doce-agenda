import assert from 'node:assert/strict';

const origin = process.env.DOCE_TEST_ORIGIN || 'https://doce-agenda.doce-agenda-local.workers.dev';
const checks = [
  ['/p/qa-routing-check', 'id="request-page"'],
  ['/app/', '/cloud-bootstrap.js'],
  ['/cadastro/', 'id="login-submit"'],
  ['/demo/', '/data-client.js'],
  ['/privacidade/', 'Cloudflare para hospedar'],
];
for (const [route, expected] of checks) {
  const response = await fetch(origin + route, { redirect: 'manual' });
  assert.equal(response.status, 200, `${route} must be served without losing its URL through a redirect`);
  assert.equal(response.headers.get('Location'), null, `${route} must not redirect`);
  assert.ok((await response.text()).includes(expected), `${route} must contain the intended page`);
}
console.log(JSON.stringify({ origin, passed: checks.length, publicSlugPreserved: true }));
