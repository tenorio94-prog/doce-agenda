// Cartão de pedido novo e entrada pela landing: node scripts/build-cloudflare.mjs && node scripts/test-landing-entry.mjs [pasta-de-capturas]
// Um pedido pelo link: o cartão diz quem pediu, o quê e quando, e abre direto a revisão.
// Vários: o cartão resume os nomes e leva para Novos. Quem vem de /demo/?de=landing não vê os stories.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite(root);
const { origin } = server;
const browser = await chromium.launch();
const results = [];
try {
  // A landing aponta para a entrada com o aviso.
  {
    const page = await browser.newPage();
    await page.goto(`${origin}/`);
    const hrefs = await page.locator('.btn-cta').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
    assert.ok(hrefs.length >= 2 && hrefs.every((href) => href === '/demo/?de=landing'), `botões da landing: ${hrefs}`);
    await page.close();
    results.push('landing aponta para /demo/?de=landing');
  }

  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    // Vindo da landing: sem stories, cartão do pedido da Camila, endereço limpo.
    await page.goto(`${origin}/demo/?de=landing`);
    await page.locator('#today-title').waitFor();
    const card = page.locator('#view-today .request-banner');
    await card.waitFor();
    assert.equal(await page.locator('.story-overlay').count(), 0, 'stories não abrem vindo da landing');
    const text = await card.innerText();
    assert.match(text, /Pedido novo pelo link/);
    assert.match(text, /Camila quer Bolo de aniversário para \S+ \d+ \S+\. Ainda não ocupa vaga/);
    assert.equal(new URL(page.url()).search, '', 'o aviso sai do endereço');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `cartao-${width}.png`), fullPage: false });

    // Revisar pedido abre a revisão com os botões de decisão.
    await card.locator('[data-action="review-request"]').click();
    await page.locator('#detail-dialog[open] [data-action="accept-request"]').first().waitFor();
    if (shots) await page.screenshot({ path: path.join(shots, `revisao-${width}.png`), fullPage: false });
    await context.close();

    // Vários pedidos (demo com um segundo pedido do link): nomes resumidos e ida para Novos.
    const many = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await many.addInitScript(() => localStorage.setItem('doce-agenda.tour.v1', '1'));
    const manyPage = await many.newPage();
    manyPage.on('pageerror', (error) => errors.push(String(error)));
    await manyPage.goto(`${origin}/demo/`);
    await manyPage.locator('#view-today .request-banner').waitFor();
    await manyPage.evaluate(() => {
      const key = 'doce-agenda.demo.v2';
      const state = JSON.parse(localStorage.getItem(key));
      const request = state.orders.find((order) => order.status === 'Solicitação');
      state.orders.push({ ...request, id: 'DEMO-EXTRA', client: 'Ana', publicCode: 'DA-EXTRA' });
      localStorage.setItem(key, JSON.stringify(state));
    });
    await manyPage.reload();
    const manyCard = manyPage.locator('#view-today .request-banner');
    await manyCard.waitFor();
    assert.match(await manyCard.innerText(), /2 pedidos novos pelo link\s+Camila, Ana\. Ainda não ocupam vaga/);
    if (shots) await manyPage.screenshot({ path: path.join(shots, `varios-${width}.png`), fullPage: false });
    await manyCard.locator('[data-action="show-requests"]').click();
    await manyPage.locator('#orders-title').waitFor();
    await many.close();

    // Entrada direta (aparelho novo): os stories continuam abrindo.
    const direct = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const directPage = await direct.newPage();
    directPage.on('pageerror', (error) => errors.push(String(error)));
    await directPage.goto(`${origin}/demo/`);
    await directPage.locator('.story-overlay').waitFor();
    await direct.close();

    assert.deepEqual(errors, []);
    results.push(`${width}px: cartão de um pedido abre a revisão, vários levam a Novos, landing sem stories`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
