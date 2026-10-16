// Vitrine do link: node scripts/build-cloudflare.mjs && node scripts/test-vitrine.mjs [pasta-de-capturas]
// Página da cliente com o servidor simulado (respostas interceptadas, nada é enviado de verdade): identidade,
// ficha do produto, pedido em 3 passos com validação, itens extras, data que fica lotada no envio, link pausado,
// endereço inexistente, vitrine pequena sem fotos (prévia) e os Ajustes da demonstração.
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
const check = (name) => results.push(name);

const products = [
  ['Bolo de aniversário', 'Bolos', 15000, true, 'exemplo/bolo.svg'], ['Brigadeiro (cento)', 'Docinhos', 17000, true, 'exemplo/brigadeiro.svg'],
  ['Naked cake', 'Bolos', 18000], ['Bolo de pote', 'Bolos', 1400, false, 'exemplo/bolo-de-pote.svg'], ['Beijinho (cento)', 'Docinhos', 16000],
  ['Bombom de uva (cento)', 'Docinhos'], ['Torta de limão', 'Tortas', 9000], ['Pudim', 'Tortas', 7000], ['Torta holandesa', 'Tortas'],
  ['Cookies', 'Presentes', 4800], ['Brownies', 'Presentes'],
].map(([name, category, priceFromCents, featured, photo]) => ({ name, description: `Descrição de ${name}.`, category, ...(priceFromCents ? { priceFromCents } : {}), ...(featured ? { featured } : {}), ...(photo ? { photo } : {}) }));
const pageConfig = { active: true, displayName: 'Doces da Lu', welcome: 'Feito em casa.', whatsapp: '+5511999999999', products, style: 'caseira', color: '#f2c94c', instagram: 'docesdalu', logo: '', cover: 'exemplo/capa.svg', share: '', noticeHours: 48,
  orderTemplate: { version: 1, fields: [{ key: 'flavor', label: 'Sabor', enabled: true, required: true, options: ['Chocolate', 'Ninho'] }, { key: 'inscription', label: 'Inscrição', enabled: true, required: false, options: [] }] } };
const spToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const day = (offset) => { const d = new Date(`${spToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

async function mockServer(context, { config = pageConfig, status = 200 } = {}) {
  const full = new Set(), sent = [];
  await context.route('**/functions/v1/doce-public/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/availability')) {
      const dates = Array.from({ length: 90 }, (_, i) => ({ date: day(i), available: i >= 2 && !full.has(day(i)) }));
      return route.fulfill({ json: dates });
    }
    if (url.pathname.endsWith('/requests')) {
      const body = JSON.parse(route.request().postData()); sent.push(body);
      if (sent.length === 1) { full.add(body.date); return route.fulfill({ status: 409, json: { error: 'Esta data ficou indisponível. Escolha outra data.', code: 'DATE_UNAVAILABLE' } }); }
      return route.fulfill({ status: 201, json: { code: 'DA-TESTE2', summary: `Solicitação DA-TESTE2 — Doces da Lu\n${body.product}`, whatsapp: '+5511999999999' } });
    }
    return route.fulfill({ status, json: status === 200 ? config : { error: 'Página não encontrada.' } });
  });
  return sent;
}

try {
  for (const [width, height] of [[360, 780], [1280, 900]]) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const sent = await mockServer(context);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/encomenda/`);
    await page.locator('#vitrine:not([hidden])').waitFor();

    // Identidade da confeitaria.
    assert.equal(await page.locator('h1.name').innerText(), 'Doces da Lu');
    assert.equal(await page.evaluate(() => document.body.className), 'st-caseira');
    assert.equal(await page.title(), 'Doces da Lu · encomendas');
    const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--a-ink').trim());
    assert.notEqual(ink, '#f2c94c', 'amarelo claro escurece nos botões');
    assert.match(await page.locator('.facts').innerText(), /Próxima data livre[\s\S]*2 dias de antecedência[\s\S]*@docesdalu/);
    assert.equal(await page.locator('.feat .card').count(), 2, 'mais pedidos');
    assert.equal(await page.locator('.chips button').count(), 4, 'atalhos com 4 categorias');
    assert.match(await page.locator('.feat .card').first().innerText(), /a partir de R\$\s150/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `vitrine-${width}.png`), fullPage: true });
    check(`identidade e vitrine ${width}`);

    // Ficha: abre, Esc/voltar fecha.
    await page.locator('.feat .card').first().click();
    await page.locator('#product-sheet[open]').waitFor();
    assert.equal(await page.locator('#sheet-title').innerText(), 'Bolo de aniversário');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#product-sheet').open);
    check(`ficha abre e fecha ${width}`);

    // Pedido em 3 passos.
    await page.locator('.feat .card').first().click();
    await page.locator('#sheet-order').click();
    await page.locator('.step[data-step="1"]:not([hidden])').waitFor();
    assert.match(await page.locator('#chosen').innerText(), /Bolo de aniversário/);
    await page.locator('[data-next="2"]').click();
    assert.ok(await page.locator('.step[data-step="1"]').isVisible(), 'sabor obrigatório segura no passo 1');
    await page.locator('#cake-flavor').selectOption('Ninho');
    await page.locator('[data-extra="Brigadeiro (cento)"]').click();
    await page.locator('[data-next="2"]').click();
    await page.locator('.step[data-step="2"]:not([hidden])').waitFor();
    await page.locator('[data-next="3"]').click();
    assert.match(await page.locator('#step2-error').innerText(), /Escolha uma data/);
    await page.locator('#quick-dates button').nth(1).click();
    assert.equal(await page.locator(`#calendar-days [data-date="${day(3)}"][aria-pressed="true"]`).count(), 1, 'atalho marca o calendário');
    await page.locator('#time').fill('15:00');
    await page.locator('.seg span', { hasText: 'Entrega' }).click();
    await page.locator('[data-next="3"]').click();
    assert.ok(await page.locator('.step[data-step="2"]').isVisible(), 'endereço obrigatório na entrega');
    await page.locator('#location').fill('Rua de teste, 10');
    await page.locator('[data-next="3"]').click();
    await page.locator('#client').fill('Cliente Fictícia');
    await page.locator('#contact').fill('11988887777');
    await page.locator('#consent').check();
    if (shots) await page.screenshot({ path: path.join(shots, `pedido-passo3-${width}.png`), fullPage: true });
    await page.locator('#send').click();
    // A data lotou no envio: volta ao passo 2 com o aviso e a data riscada.
    await page.locator('.step[data-step="2"]:not([hidden])').waitFor();
    assert.match(await page.locator('#step2-error').innerText(), /indisponível/);
    assert.ok(await page.locator(`#calendar-days [data-date="${day(3)}"]`).isDisabled());
    await page.locator('#quick-dates button').first().click();
    await page.locator('[data-next="3"]').click();
    await page.locator('#send').click();
    await page.locator('#confirmation:not([hidden])').waitFor();
    assert.match(await page.locator('#done-title').innerText(), /Pedido enviado para Doces da Lu/);
    assert.equal(await page.locator('#code').innerText(), 'DA-TESTE2');
    assert.match(await page.locator('#whatsapp-link').getAttribute('href'), /^https:\/\/wa\.me\/5511999999999\?text=/);
    const body = sent.at(-1);
    assert.deepEqual({ product: body.product, other: body.other, extras: body.extras, mode: body.mode, location: body.location, flavor: body.cake.flavor, consent: body.consent },
      { product: 'Bolo de aniversário', other: false, extras: ['Brigadeiro (cento)'], mode: 'Entrega', location: 'Rua de teste, 10', flavor: 'Ninho', consent: true });
    assert.equal(sent.length, 2);
    check(`pedido em 3 passos, data lotada no envio e confirmação ${width}`);

    // Voltar depois de enviar leva à vitrine, nunca ao formulário já enviado.
    await page.goBack();
    await page.locator('#vitrine:not([hidden])').waitFor();
    assert.ok(await page.locator('#request-page').isHidden());
    // Pedido de algo fora da lista.
    await page.locator('[data-other]').click();
    await page.locator('[data-next="2"]').click();
    assert.ok(await page.locator('#other-product').isVisible(), 'descrever é obrigatório');
    check(`voltar após envio e pedido fora da lista ${width}`);
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Link pausado e endereço inexistente.
  for (const [options, expected] of [[{ config: { active: false, message: 'Esta confeitaria não está recebendo pedidos pelo link no momento' } }, /não está recebendo pedidos/], [{ status: 404 }, /Não encontramos esta página/]]) {
    const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await mockServer(context, options);
    const page = await context.newPage();
    await page.goto(`${origin}/encomenda/`);
    await page.locator('#unavailable:not([hidden])').waitFor();
    assert.match(await page.locator('#unavailable-message').innerText(), expected);
    await context.close();
  }
  check('link pausado e endereço inexistente');

  // Prévia com 3 produtos sem fotos: cartões só de texto (sem letra no lugar da foto), nada é buscado.
  {
    const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
    let fetched = false;
    await context.route('**/functions/v1/**', (route) => { fetched = true; return route.abort(); });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.link-preview', JSON.stringify({ displayName: 'Bolos da Ana', welcome: '', style: 'moderna', color: '', products: [{ name: 'Bolo', description: '' }, { name: 'Torta', description: '' }, { name: 'Pudim', description: '' }], orderTemplate: { fields: [] }, availability: { closedWeekdays: [0], minimumNoticeHours: 0 } })));
    const page = await context.newPage();
    await page.goto(`${origin}/encomenda/?preview=1`);
    await page.locator('#vitrine:not([hidden])').waitFor();
    assert.equal(await page.locator('.grid.one .card').count(), 3);
    assert.equal(await page.locator('.card.is-text').count(), 3);
    assert.equal(await page.locator('.card .mono').count(), 0);
    assert.equal(await page.locator('.chips').count(), 0);
    assert.match(await page.locator('.preview-banner').innerText(), /Prévia/);
    assert.equal(fetched, false);
    if (shots) await page.screenshot({ path: path.join(shots, 'previa-sem-fotos-360.png'), fullPage: true });
    await context.close();
  }
  check('prévia pequena sem fotos');

  // Ajustes da demonstração: estilo, preço inválido, limite de mais pedidos e prévia dentro do app.
  for (const width of [360, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'pt-BR' });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/demo/`);
    await page.locator('#today-title').waitFor();
    await page.locator('[data-view="settings"]:visible').first().click();
    await page.locator('#settings-title').waitFor();
    const card = page.locator('details:has(#order-page-form)').first();
    if (!(await card.evaluate((e) => e.open))) await card.locator('summary').first().click();
    const form = page.locator('#order-page-form');
    assert.equal(await form.locator('.product-item').count(), 16);
    assert.ok(await form.locator('[data-photo="logo"]').isDisabled(), 'na demonstração não há envio de fotos');
    assert.match(await form.innerText(), /Na demonstração, as fotos são exemplos/);
    await form.locator('.style-card', { hasText: 'Moderna' }).click();
    await form.locator('.product-item').nth(3).locator('summary').click();
    await form.locator('.product-item').nth(3).locator('[name=productFeatured]').click();
    assert.equal(await form.locator('[name=productFeatured]:checked').count(), 3, 'quarto destaque é recusado');
    await form.locator('.product-item').nth(3).locator('[name=productPrice]').fill('abc');
    await form.locator('[data-action="preview-link"]').click();
    assert.match(await page.locator('#toast').innerText(), /Confira o valor/);
    await form.locator('.product-item').nth(3).locator('[name=productPrice]').fill('19,90');
    assert.match(await form.locator('.product-item').nth(3).locator('summary').innerText(), /a partir de R\$\s19,90/);
    await form.locator('[data-action="preview-link"]').click();
    const frame = page.frameLocator('#link-preview-dialog iframe');
    await frame.locator('#vitrine:not([hidden])').waitFor();
    assert.equal(await frame.locator('body').getAttribute('class'), 'st-moderna');
    assert.equal(await frame.locator('.preview-banner').count(), 0, 'sem aviso repetido dentro do app');
    if (shots) await page.screenshot({ path: path.join(shots, `ajustes-previa-${width}.png`) });
    await page.locator('[data-close-preview]').click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    await context.close();
  }
  check('Ajustes da vitrine na demonstração');
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
