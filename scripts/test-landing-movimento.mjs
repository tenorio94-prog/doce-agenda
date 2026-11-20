import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

// Demonstrações interativas da nova landing (Dia cheio, Recebi e Link Cliente/Você),
// prévia fiel do app, 3 momentos fotográficos, movimento reduzido e sem JavaScript.
const server = await serveSite();
const browser = await chromium.launch();
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const sumIs = (page, text) => page.waitForFunction((value) => document.querySelector('.money-sum').textContent === value, text, { timeout: 3000 });

async function checkDemos(page, label) {
  const day = (name) => page.locator(`.wk-day[data-day="${name}"]`);
  const weekStatus = page.locator('.week-demo .try-status');
  await page.locator('.week-demo').scrollIntoViewIfNeeded();
  // Arrastar o primeiro doce até a sexta, que tinha 2 de 3.
  const from = await page.locator('.sweet').first().boundingBox();
  const to = await day('Sexta').boundingBox();
  const [x0, y0, x1, y1] = [from.x + from.width / 2, from.y + from.height / 2, to.x + to.width / 2, to.y + to.height / 2];
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10);
  await page.mouse.up();
  assert.equal(await day('Sexta').locator('.wk-state').innerText(), 'Dia cheio', `${label}: arrastar enche a sexta`);
  assert.equal(await page.locator('.sweet:visible').count(), 3);
  assert.equal(await page.locator('.sweet-ghost').count(), 0, `${label}: cópia do arraste some`);

  // Tocar no doce e depois no dia; dia cheio não aceita mais.
  await page.locator('.sweet', { hasText: 'Brigadeiro' }).click();
  assert.equal(await page.locator('.sweet', { hasText: 'Brigadeiro' }).getAttribute('aria-pressed'), 'true');
  await day('Quinta').click();
  assert.match(await weekStatus.innerText(), /Dia cheio na quinta/, `${label}: dia cheio recusa`);
  assert.equal(await day('Quinta').getAttribute('data-count'), '3');
  await day('Terça').click();
  assert.equal(await day('Terça').locator('.wk-state').innerText(), '1/3', `${label}: tocar põe na terça`);
  assert.equal(await day('Terça').getAttribute('aria-label'), 'Terça: 1 de 3 pedidos');
  await page.locator('.week-demo .try-reset').click();
  assert.equal(await day('Sexta').locator('.wk-state').innerText(), '2/3', `${label}: recomeçar`);
  assert.equal(await page.locator('.sweet:visible').count(), 4);

  // Recebi: o cartão vira Pago e o total desce até o valor exato.
  await page.locator('.money-demo').scrollIntoViewIfNeeded();
  await page.locator('.mc-btn').nth(1).click();
  await sumIs(page, 'R$ 175');
  const marcos = page.locator('.money-card').nth(1);
  assert.equal(await marcos.locator('.mc-stamp').isVisible(), true, `${label}: Marcos pago`);
  assert.equal(await marcos.locator('.t-tag').isVisible(), false, `${label}: sem "Pago" em dobro`);
  const [text, stamp] = await Promise.all([marcos.locator('.mc-info small').boundingBox(), marcos.locator('.mc-stamp').boundingBox()]);
  assert.ok(text.x + text.width <= stamp.x + 4, `${label}: carimbo não cobre o texto (${Math.round(text.x + text.width)} ≤ ${Math.round(stamp.x)})`);
  await page.locator('.mc-btn').nth(0).click();
  await page.locator('.mc-btn').nth(2).click();
  await sumIs(page, 'Tudo recebido');
  assert.equal(await page.locator('.money-status').innerText(), 'Tudo recebido.');
  await page.locator('.money-demo .try-reset').click();
  await sumIs(page, 'R$ 270');

  // Link da cliente: Enviar pedido chega em Para decidir; Ver abre a ficha; Ver de novo recomeça.
  await page.locator('.link-visual').scrollIntoViewIfNeeded();
  await page.locator('.m-send').click();
  await page.locator('.ld-stage[data-side="baker"] .m-banner').waitFor({ timeout: 3000 });
  assert.match(await page.locator('.m-banner').innerText(), /para decidir[\s\S]*Camila pediu pelo link/i, `${label}: pedido em Para decidir`);
  assert.equal(await page.locator('.ld-flyer').isVisible(), false);
  await page.locator('.m-see').click();
  assert.equal(await page.locator('.m-review').isVisible(), true, `${label}: ficha aberta`);
  await page.locator('.m-zap').click();
  assert.match(await page.locator('.m-feedback').innerText(), /WhatsApp/, `${label}: responder explica`);
  await page.locator('.m-accept').click();
  assert.match(await page.locator('.m-ok').innerText(), /Aceito: entrou no sábado/, `${label}: aceitar funciona`);
  assert.equal(await page.locator('.m-review').isVisible(), false);
  await page.locator('.ld-replay').click();
  assert.equal(await page.locator('.ld-client .m-form').isVisible(), true, `${label}: recomeça na cliente`);
  assert.equal(await noSideScroll(page), true, `${label}: sem rolagem lateral nas demonstrações`);
}

try {
  for (const [width, height] of [[360, 740], [390, 844], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${server.origin}/`, { waitUntil: 'networkidle' });

    for (const selector of ['h1', '.hero-end .primary', '.hero-end .outline']) {
      const shown = await page.locator(selector).evaluate((e) => getComputedStyle(e).opacity === '1');
      assert.equal(shown, true, `${width}: ${selector} visível de imediato`);
    }

    // Prévia fiel do app e os 3 cartões fotográficos visíveis sem truques de rolagem.
    assert.equal(await page.locator('.preview-points li').count(), 4);
    assert.equal(await page.locator('.pa-order').count(), 3);
    assert.equal(await page.locator('.story-card').count(), 3);
    for (const badge of ['Segunda de manhã', 'Sábado, 11h', 'Sábado à noite']) {
      await page.locator('.story-badge', { hasText: badge }).waitFor();
    }

    await checkDemos(page, String(width));
    assert.deepEqual(errors, [], `${width}: sem erros`);
    await page.close();
  }

  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const label = options.reducedMotion ? 'movimento reduzido' : 'sem JavaScript';
    const page = await browser.newPage({ viewport: { width: 360, height: 740 }, ...options });
    await page.goto(`${server.origin}/`, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, `${label}: nada se mexe`);
    for (const card of await page.locator('.story-card').all()) {
      await card.scrollIntoViewIfNeeded();
      assert.equal(await card.evaluate((e) => getComputedStyle(e).opacity), '1', `${label}: cenas à vista`);
    }
    assert.equal(await noSideScroll(page), true, `${label}: sem rolagem lateral`);
    if (options.reducedMotion) {
      await checkDemos(page, label);
      assert.equal(await page.evaluate(() => document.getAnimations().length), 0, `${label}: demonstrações sem animação`);
    } else {
      assert.equal(await page.locator('.week-tray').isVisible(), false);
      assert.equal(await page.locator('.wk-day:visible').count(), 6);
      assert.equal(await page.locator('.wk-day:disabled').count(), 6);
      assert.equal(await page.locator('.mc-btn:visible').count(), 0);
      assert.equal(await page.locator('.money-card:visible').count(), 3);
      assert.equal(await page.locator('.try-reset:visible').count(), 0);
      assert.equal(await page.locator('.ld-switch').isVisible(), false);
      assert.equal(await page.locator('.ld-client .mock-phone').isVisible(), true, `${label}: lado da cliente`);
      assert.equal(await page.locator('.ld-baker .mock-phone').isVisible(), true, `${label}: lado da confeiteira`);
      assert.equal(await page.locator('.m-send').isDisabled(), true);
    }
    await page.close();
  }
  console.log('Landing e demonstrações conferidas em 360, 390 e 1280 px; movimento reduzido e sem JavaScript funcionam.');
} finally {
  await browser.close(); server.close();
}
