// Tela nova na conta (/app/, também em /app/nova/): node scripts/build-cloudflare.mjs && node scripts/test-nova-conta.mjs
// Sem conta real: a sessão é simulada no navegador e o servidor é simulado aqui, com as mesmas regras do
// doce-api (transactState, revisão otimista e canRebaseWrite). Prova o caminho cloud-bootstrap → /nova/nova.js,
// não a integração com o Supabase de verdade.
import assert from 'node:assert/strict';
import { canRebaseWrite, transactState } from '../cloud/state-engine.js';
import { demoSeedState } from '../cloud/demo-seed.js';
import { chromium, serveSite } from './lib/browser-test.mjs';

const NOW = new Date('2026-10-27T12:00:00-03:00');
// O servidor simulado roda aqui no Node e confere a antecedência com Date.now(); enquanto ele decide, o relógio
// fica no mesmo dia fixado na página. Sem isso o teste envelhece: depois de 31/10 o pedido do teste vira passado.
const atTestTime = (decide) => { const real = Date.now; Date.now = () => NOW.getTime(); try { return decide(); } finally { Date.now = real; } };
const API = 'https://doce-teste.invalid';
const FORBIDDEN = ['vaga', 'informado', 'solicitação', 'carimbo', 'etapa', 'fazendo', 'em produção', 'aguardando confirmação'];
const config = `window.DoceCloudConfig = Object.freeze({ url: '${API}', publishableKey: 'chave-publica-de-teste', emailReady: true, emailDeliveryReady: false });`;
const session = {
  access_token: 'token-de-teste', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(NOW.getTime() / 1000) + 86400,
  refresh_token: 'refresh-de-teste', user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'conta-nova@teste.invalid' },
};
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Expose-Headers': 'X-Agenda-Revision' };

const server = await serveSite();
const browser = await chromium.launch();
const results = [];

async function open(width, height, url = '/app/') {
  const backend = { state: demoSeedState(new Date(2026, 9, 27, 12)), revision: 1, calls: [] };
  const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  await context.route('**/account/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: config }));
  await context.route('**/fotos/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  await context.addInitScript((value) => { if (!localStorage.getItem('sb-doce-teste-auth-token')) localStorage.setItem('sb-doce-teste-auth-token', value); }, JSON.stringify(session));
  await context.route(`${API}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (new URL(request.url()).pathname.startsWith('/auth/')) return route.fulfill({ status: 204, headers: cors });
    const envelope = JSON.parse(request.postData() || '{}');
    const write = envelope.method !== 'GET';
    backend.calls.push({ ...envelope, auth: request.headers().authorization });
    const reply = (body, status) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json', 'X-Agenda-Revision': String(backend.revision) }, body: JSON.stringify(body) });
    if (envelope.path === '/api/vitrine/fotos' && envelope.method === 'POST') {
      backend.photoCount = (backend.photoCount || 0) + 1;
      const ext = envelope.body?.type === 'image/jpeg' ? 'jpg' : 'webp';
      const uuid = `00000000-0000-4000-8000-${String(backend.photoCount).padStart(12, '0')}`;
      return reply({ key: `${'a'.repeat(32)}/${uuid}.${ext}` }, 201);
    }
    if (write && envelope.expectedRevision !== backend.revision && !atTestTime(() => canRebaseWrite(backend.state, envelope.path, envelope.method, envelope.base || {}))) {
      return reply({ error: 'O estado mudou em outra sessão. Atualize e tente novamente.', code: 'REVISION_CONFLICT' }, 409);
    }
    const transaction = atTestTime(() => transactState(backend.state, envelope.path, { method: envelope.method, body: envelope.body === undefined ? undefined : JSON.stringify(envelope.body) }));
    if (write && transaction.mutated) { backend.state = transaction.state; backend.revision += 1; }
    return reply(transaction.body, transaction.status);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error' && !/409/.test(message.text())) errors.push(message.text()); });
  await page.clock.setFixedTime(NOW);
  await page.goto(server.origin + url);
  return { context, page, backend, errors };
}
const sheet = (page) => page.locator('#sheet[open]');
// Sair navega duas vezes para a entrada (o botão e o aviso de saída do SDK): espera o endereço, não a navegação.
const LOGIN = /\/cadastro\/\?mode=login/;
const landsOnLogin = async (page) => {
  for (let i = 0; i < 50 && !LOGIN.test(page.url()); i++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.match(page.url(), LOGIN);
};
const wide = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
// Um pedido chega pelo link direto no "servidor", como a função pública grava.
function arrive(backend, id, client) {
  backend.state.orders.push({ id, client, product: 'Bolo de cenoura', details: 'Para 10 pessoas', dueAt: '2026-11-02T15:00', mode: 'Retirada', location: '', total: 0, totalKnown: false,
    status: 'Solicitação', origin: 'link', contact: '(11) 90000-0199', nextAction: '', nextAt: '', pendingChange: '', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), history: [] });
  backend.revision += 1;
}

try {
  for (const [width, height] of [[360, 740], [1280, 800]]) {
    const { context, page, backend, errors } = await open(width, height);
    await page.locator('#days .order').first().waitFor();
    assert.equal(await page.locator('#demo-line').isVisible(), false, 'na conta não há linha de exemplo');
    assert.equal(await page.evaluate(() => window.DoceApi.mode), 'cloud');
    assert.equal(await page.evaluate(() => localStorage.getItem('doce-agenda.demo.v2')), null, 'nada no armazenamento da demonstração');
    assert.ok(backend.calls.every((call) => call.auth === 'Bearer token-de-teste'), 'toda chamada leva o login');
    assert.equal(await page.locator(`#d-2026-10-27 .order`).count(), 3);
    assert.equal(await wide(page), false);

    // Anotar e receber gravam no servidor, com a revisão que o app viu.
    await page.locator('[data-act="new"]:visible').first().click();
    const form = page.locator('#order-form');
    await form.locator('[name=client]').fill('Ana Conta');
    await form.locator('[name=product]').fill('Bolo de cenoura');
    await form.locator('[name=date]').fill('2026-10-31');
    await form.locator('[name=time]').fill('15:00');
    await form.locator('[name=total]').fill('120');
    await form.locator('[type=submit]').click();
    const ana = page.locator('#d-2026-10-31 .order', { hasText: 'Ana Conta' });
    await ana.waitFor();
    const saved = backend.state.orders.find((order) => order.client === 'Ana Conta');
    assert.equal(saved.status, 'Confirmado');
    assert.equal(backend.calls.findLast((call) => call.method === 'POST').expectedRevision, 1);
    await ana.locator('.order-open').click();
    await sheet(page).locator('[data-act="received"]').click();
    await page.locator('#pay-form [name=amount]').fill('50');
    await page.locator('#pay-form [type=submit]').click();
    await page.locator('#money-line', { hasText: 'Falta R$ 70' }).waitFor();
    assert.equal(backend.state.payments.filter((payment) => payment.orderId === saved.id && payment.status === 'Conferido').length, 1);
    await page.locator('#sheet [data-act="close"]').click();

    // Pedido novo pelo link: ao voltar para a aba, aparece com aviso.
    arrive(backend, 'LINK-CONTA-1', 'Rafaela');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.locator('#toast', { hasText: 'Chegou 1 pedido novo pelo link.' }).waitFor();
    assert.match(await page.locator('#notice-decide').innerText(), /3 pedidos para decidir/);

    // Gravação sobre versão antiga do mesmo pedido: conflito real, aviso e agenda recarregada; repetir funciona.
    backend.state.orders.find((order) => order.id === saved.id).details = 'Mudou em outro aparelho';
    backend.state.orders.find((order) => order.id === saved.id).updatedAt = new Date(NOW.getTime() + 1000).toISOString();
    backend.revision += 1;
    await ana.locator('.order-open').click();
    await sheet(page).locator('[data-act="deliver"]').click();
    await page.locator('#toast', { hasText: 'Isto mudou em outro aparelho' }).waitFor();
    await page.locator('.order-open', { hasText: 'Ana Conta' }).click();
    assert.match(await sheet(page).innerText(), /Mudou em outro aparelho/, 'a ficha mostra o que mudou');
    await sheet(page).locator('[data-act="deliver"]').click();
    await page.waitForFunction(() => document.querySelector('.order.is-done')?.textContent.includes('Ana Conta'));
    assert.equal(backend.state.orders.find((order) => order.id === saved.id).status, 'Entregue');

    // Dinheiro do mês pelo servidor; editor completo da vitrine na conta (upload de logo/doce, estilo, 4º+ doce, ativar e pausar); menu limpo e Sair.
    await page.locator('[data-tab="dinheiro"]:visible').first().click();
    await page.locator('#money-received').waitFor();
    assert.ok(backend.calls.some((call) => call.path.startsWith('/api/resumo-mensal?mes=2026-10')));
    await page.locator('[data-tab="agenda"]:visible').first().click();

    await page.locator('.top [data-act="link"]').click();
    await sheet(page).locator('[data-act="open-vitrine"]').click();
    const vForm = page.locator('#vitrine-form');
    await vForm.waitFor();
    assert.equal(await vForm.locator('[data-photo="logo"]').isDisabled(), false, 'na conta o envio de fotos fica habilitado');
    // Simula seleção de uma foto PNG para o logo e uma foto para um novo doce (17º doce).
    const pngBytes = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 240;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#6e54a6'; ctx.fillRect(0, 0, 240, 240);
      const b = await new Promise((r) => c.toBlob(r, 'image/png'));
      return [...new Uint8Array(await b.arrayBuffer())];
    });
    await vForm.locator('[data-photo="logo"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(pngBytes) });
    await vForm.locator('.media-logo .photo-status', { hasText: 'Foto pronta' }).waitFor();
    assert.equal(await vForm.locator('.logo-swatch input').isChecked(), true, 'cor dominante do logo é sugerida e selecionada');
    assert.match(await vForm.locator('[name=logo]').inputValue(), /^[a-f0-9]{32}\/[a-f0-9-]{36}\.webp$/);
    assert.match(await vForm.locator('[name=share]').inputValue(), /^[a-f0-9]{32}\/[a-f0-9-]{36}\.jpg$/, 'imagem de compartilhamento 1200x630 gerada');
    await vForm.locator('.style-card', { hasText: 'Caseira' }).click();
    await vForm.locator('[name=welcome]').fill('Bolos artesanais sob encomenda.');
    await vForm.locator('[name=instagram]').fill('@docesdalu.oficial');
    await vForm.locator('[data-act="add-product"]').click();
    const newRow = vForm.locator('.product-item').last();
    await newRow.locator('[name=productName]').fill('Quindim de festa (cento)');
    await newRow.locator('[name=productPrice]').fill('140');
    await newRow.locator('[data-photo="product"]').setInputFiles({ name: 'quindim.png', mimeType: 'image/png', buffer: Buffer.from(pngBytes) });
    await newRow.locator('.photo-status', { hasText: 'Foto pronta' }).waitFor();
    await vForm.locator('button[value="activate"]').click();
    await page.locator('#toast', { hasText: 'Seu link está no ar!' }).waitFor();
    assert.equal(backend.state.orderPage.active, true);
    assert.equal(backend.state.orderPage.style, 'caseira');
    assert.equal(backend.state.orderPage.instagram, 'docesdalu.oficial');
    assert.equal(backend.state.orderPage.products.length, 17);
    assert.equal(backend.state.orderPage.products.at(-1).name, 'Quindim de festa (cento)');
    assert.match(backend.state.orderPage.products.at(-1).photo, /^[a-f0-9]{32}\/[a-f0-9-]{36}\.webp$/);
    // Com o link ativo, abrir o editor completo permite pausar o link.
    await sheet(page).locator('[data-act="open-vitrine"]').click();
    await page.locator('#vitrine-form button[value="pause"]').click();
    await page.locator('#toast', { hasText: 'Link pausado' }).waitFor();
    assert.equal(backend.state.orderPage.active, false);

    await page.locator('[data-act="menu"]').click();
    assert.equal(await sheet(page).locator('[data-act="reset"]').count(), 0);
    assert.equal(await sheet(page).locator('a.menu-item').count(), 0, 'sem atalho para /completa/ no menu');
    assert.equal(await sheet(page).locator('[data-act="days"]').count(), 1);
    assert.equal(await sheet(page).locator('[data-act="special"]').count(), 1);
    assert.equal(await sheet(page).locator('[data-act="cake-template"]').count(), 1);
    assert.equal(await sheet(page).locator('[data-act="backup"]').count(), 1);
    // Cópia de segurança na conta: exportar (/api/export) e restaurar (/api/import).
    await sheet(page).locator('[data-act="backup"]').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      sheet(page).locator('[data-act="export-backup"]').click(),
    ]);
    assert.match(download.suggestedFilename(), /^fornada-backup-\d{4}-\d{2}-\d{2}\.json$/);
    assert.ok(backend.calls.some((call) => call.path === '/api/export' && call.method === 'GET'));
    const backupPayload = structuredClone(backend.state);
    backupPayload.orders = backupPayload.orders.slice(0, 2);
    backupPayload.payments = backupPayload.payments.filter((p) => backupPayload.orders.some((o) => o.id === p.orderId));
    await sheet(page).locator('#restore-file').setInputFiles({
      name: 'fornada-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backupPayload)),
    });
    await sheet(page).locator('#restore-preview', { hasText: 'Arquivo reconhecido: 2 pedidos' }).waitFor();
    assert.equal(await sheet(page).locator('#restore-confirm').isDisabled(), false);
    await sheet(page).locator('#restore-confirm').click();
    await page.locator('#toast', { hasText: 'Cópia restaurada. A cópia anterior foi preservada.' }).waitFor();
    assert.equal(backend.state.orders.length, 2);
    await page.locator('[data-act="menu"]').click();
    assert.equal(await sheet(page).locator('a.menu-item').count(), 0, 'nenhum <a class="menu-item"> na conta');
    const text = (await page.evaluate(() => document.body.innerText)).toLocaleLowerCase('pt-BR');
    assert.deepEqual(FORBIDDEN.filter((word) => text.includes(word)), []);
    await sheet(page).locator('[data-act="sign-out"]').click();
    await landsOnLogin(page);
    assert.deepEqual(errors, [], 'sem erro na página');
    await context.close();
    results.push(`${width}: conta abre a tela nova, grava, recebe pedido do link, conflito, vitrine completa (fotos/estilo/17º doce/ativar/pausar), Dinheiro e Sair`);
  }

  // Sem login, vai para a entrada; a versão completa (/app/completa/) abre a tela anterior com "Sair" no topo.
  {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    await context.route('**/account/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: config }));
    const page = await context.newPage();
    await page.goto(`${server.origin}/app/nova/`);
    await landsOnLogin(page);
    await context.close();
    const old = await open(360, 740, '/app/completa/');
    await old.page.locator('#today-title').waitFor();
    assert.equal(await old.page.locator('.topbar-actions button', { hasText: 'Sair' }).count(), 1);
    assert.equal(await old.page.evaluate(() => !!document.querySelector('script[src="/cloud-app.js"]')), true);
    await old.context.close();
    results.push('sem login vai para a entrada; /app/completa/ abre a versão anterior');
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
