// Link no ar em 3 passos: node scripts/build-cloudflare.mjs && node scripts/test-link-3-passos.mjs [pasta-de-capturas]
// Conta (simulada sobre a demo): "Ative seu link" abre 3 telas curtas e termina com o link ativo e copiado.
// Demonstração: o mesmo caminho termina na prévia, sem gravar nada.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite } from './lib/browser-test.mjs';
import { demoSeedState } from '../cloud/demo-seed.js';
import { createEmptyState } from '../cloud/state-engine.js';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const KEY = 'doce-agenda.demo.v2';
const seed = demoSeedState(new Date());
// Conta nova com um doce já cadastrado (com foto) e o link fora do ar.
const fresh = JSON.stringify({ ...seed, orders: [], payments: [], availability: createEmptyState().availability,
  orderPage: { active: false, slug: '', displayName: '', welcome: '', whatsapp: '', products: [{ name: 'Bolo de pote', description: 'Vários sabores', priceFromCents: 1500, photo: 'exemplo/bolo-chocolate.webp' }], style: 'atelie', color: '', instagram: '', logo: '', cover: '', share: '' } });
const cloudClient = `"use strict"; window.DoceApi = Object.freeze({ mode: "cloud", fetch: window.DoceStore.fetch.bind(window.DoceStore) });`;
const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).orderPage, KEY);
// Cada passo cabe na tela: o botão principal à vista e a janela sem rolagem interna.
const fits = (page) => page.evaluate(() => {
  const dialog = document.querySelector('#link-wizard'), next = dialog.querySelector('button[value="next"]').getBoundingClientRect();
  return next.bottom <= window.innerHeight && dialog.scrollHeight <= dialog.clientHeight + 1 && document.documentElement.scrollWidth <= window.innerWidth;
});

try {
  for (const [width, height] of [[360, 740], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.origin });
    await context.route('**/data-client.js', (route) => route.fulfill({ contentType: 'text/javascript', body: cloudClient }));
    await context.addInitScript((state) => {
      if (!localStorage.getItem('doce-agenda.demo.v2')) localStorage.setItem('doce-agenda.demo.v2', state);
      localStorage.setItem('doce-agenda.onboarding.conta.v1', JSON.stringify({ dismissed: false, done: [], intent: 'sem-pedido' }));
      let store; Object.defineProperty(window, 'DoceStore', { configurable: true, get: () => store, set: (value) => { store = { ...value, isDemo: false }; } });
    }, fresh);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#view-today .onboarding [data-task="link"]').click();
    const dialog = page.locator('#link-wizard[open]');
    await dialog.waitFor();
    const next = dialog.locator('button[value="next"]'), error = dialog.locator('#link-wizard-error');

    // Passo 1: nome obrigatório, endereço preenche sozinho, WhatsApp conferido.
    assert.match(await dialog.innerText(), /Passo 1 de 3/);
    assert.ok(await fits(page), `passo 1 cabe em ${width}px`);
    await next.click();
    assert.match(await error.innerText(), /nome da confeitaria/);
    await dialog.locator('[name=displayName]').fill('Doces da Ana Teste');
    assert.equal(await dialog.locator('[name=slug]').inputValue(), 'doces-da-ana-teste');
    await dialog.locator('[name=whatsapp]').fill('11 9999');
    await next.click();
    assert.match(await error.innerText(), /WhatsApp/);
    await dialog.locator('[name=whatsapp]').fill('(11) 98888-7777');
    if (shots) await page.screenshot({ path: path.join(shots, `link-passo1-${width}.png`) });
    await next.click();

    // Passo 2: o doce que já existia vem preenchido; valor conferido.
    assert.match(await dialog.innerText(), /Passo 2 de 3/);
    assert.ok(await fits(page), `passo 2 cabe em ${width}px`);
    const names = dialog.locator('[data-product="name"]'), prices = dialog.locator('[data-product="price"]');
    assert.equal(await names.nth(0).inputValue(), 'Bolo de pote');
    assert.equal(await prices.nth(0).inputValue(), '15');
    await names.nth(1).fill('Torta de limão');
    await prices.nth(1).fill('abc');
    await next.click();
    assert.match(await error.innerText(), /Torta de limão/);
    await prices.nth(1).fill('89,90');
    if (shots) await page.screenshot({ path: path.join(shots, `link-passo2-${width}.png`) });
    await next.click();

    // Passo 3: resumo, voltar preserva o que foi digitado, ativar grava e copia.
    assert.match(await dialog.innerText(), /lucast\.app\/p\/doces-da-ana-teste/);
    await dialog.locator('button[value="back"]').click();
    assert.equal(await names.nth(1).inputValue(), 'Torta de limão', 'voltar não apaga');
    await next.click();
    assert.ok(await fits(page), `passo 3 cabe em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `link-passo3-${width}.png`) });
    assert.equal(await next.innerText(), 'Ativar e copiar link');
    await next.click();
    await page.locator('#toast').filter({ hasText: 'Seu link está no ar' }).waitFor();
    assert.equal(await page.locator('#link-wizard[open]').count(), 0);
    const saved = await stored(page);
    assert.equal(saved.active, true);
    assert.equal(saved.slug, 'doces-da-ana-teste');
    assert.equal(saved.displayName, 'Doces da Ana Teste');
    assert.equal(saved.whatsapp, '+5511988887777');
    assert.deepEqual(saved.products.map((product) => [product.name, product.priceFromCents ?? null]), [['Bolo de pote', 1500], ['Torta de limão', 8990]]);
    assert.equal(saved.products[0].photo, 'exemplo/bolo-chocolate.webp', 'foto e descrição do doce que já existia continuam');
    assert.equal(saved.style, 'atelie', 'o resto da vitrine continua igual');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://lucast.app/p/doces-da-ana-teste');
    assert.equal(await page.locator('#view-today .onboarding [data-task="link"]').count(), 0, 'tarefa do link feita');
    assert.deepEqual(errors, []);
    results.push(`${width}px: conta ativa o link em 3 passos, cada um sem rolar; dados conferidos, doce antigo preservado, link copiado`);
    await context.close();
  }

  // Demonstração: "Montar em 3 passos" termina na prévia e não grava.
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
  const page = await context.newPage();
  await page.goto(`${server.origin}/demo/`);
  await page.locator('#today-title').waitFor();
  const before = JSON.stringify(await stored(page));
  await page.locator('.settings-button:visible, [data-view="settings"]:visible').first().click();
  await page.locator('.settings-card[data-settings="link"] > summary').click();
  await page.locator('[data-action="link-wizard"]').click();
  const dialog = page.locator('#link-wizard[open]');
  await dialog.locator('button[value="next"]').click();
  await dialog.locator('button[value="next"]').click();
  assert.match(await dialog.innerText(), /Na demonstração o link não vai ao ar/);
  assert.equal(await dialog.locator('button[value="next"]').innerText(), 'Ver como a cliente vê');
  await dialog.locator('button[value="next"]').click();
  await page.locator('#link-preview-dialog[open]').waitFor();
  assert.equal(JSON.stringify(await stored(page)), before, 'demonstração não grava');
  await context.close();
  results.push('360px: demonstração monta em 3 passos e abre a prévia, sem gravar');
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
