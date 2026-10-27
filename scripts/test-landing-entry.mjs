// Cartão de pedido novo e entrada pela landing: node scripts/build-cloudflare.mjs && node scripts/test-landing-entry.mjs [pasta-de-capturas]
// Um pedido pelo link: o cartão diz quem pediu, o quê e quando, e abre direto a revisão.
// Vários: o cartão resume os nomes e leva para Para decidir. O ?de=landing sai do endereço.
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

  // Topo da landing: experimentar (cheio) e criar conta (contorno) à vista sem rolar; nada do app antigo.
  for (const [width, height] of [[360, 740], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${origin}/`);
    await page.waitForFunction(() => customElements.get('wa-button'));
    const actions = page.locator('.hero-actions');
    const demo = actions.locator('.btn-cta'), account = actions.locator('.btn-conta');
    assert.equal(await account.getAttribute('href'), '/cadastro/');
    assert.equal(await account.getAttribute('appearance'), 'outlined', 'criar conta é de contorno: um só botão cheio no topo');
    for (const [name, button] of [['experimentar', demo], ['criar conta', account]]) {
      const box = await button.boundingBox();
      assert.ok(box && box.y + box.height <= height, `${name} à vista sem rolar em ${width}px`);
    }
    assert.equal(await account.innerText(), 'Criar conta grátis');
    const text = await page.locator('body').innerText();
    for (const old of [/Solicitação DA-/, /3 entregas hoje/, /Em produção/, /[Pp]iloto/, /Pedem sua atenção/]) assert.doesNotMatch(text, old, `sem "${old.source}" na landing`);
    // O carimbo animado da foto passa da borda durante a entrada (cerca de 1 s): espera a animação terminar.
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth, null, { timeout: 5000 }).catch(() => {});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `landing sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `landing-topo-${width}.png`) });
    await page.close();
    results.push(`${width}px: landing com experimentar e criar conta à vista, sem palavras antigas`);
  }

  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    // Vindo da landing: cartão do pedido da Camila, endereço limpo.
    await page.goto(`${origin}/demo/completa/?de=landing`);
    await page.locator('#today-title').waitFor();
    const card = page.locator('#view-today .request-banner');
    await card.waitFor();
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

    // Vários pedidos (demo com um segundo pedido do link): nomes resumidos e ida para Para decidir.
    const many = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const manyPage = await many.newPage();
    manyPage.on('pageerror', (error) => errors.push(String(error)));
    await manyPage.goto(`${origin}/demo/completa/`);
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


    assert.deepEqual(errors, []);
    results.push(`${width}px: cartão de um pedido abre a revisão, vários levam a Para decidir`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
