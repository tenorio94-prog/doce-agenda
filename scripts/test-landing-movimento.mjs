import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

// Movimento da landing: bolo em camadas, semana da Lu parada e demonstrações (o "Como funciona" saiu em 03/11/2026).
// Também confere que, sem JavaScript ou com movimento reduzido, tudo continua à vista e parado.
const server = await serveSite();
const browser = await chromium.launch();
const wait = (page, ms = 900) => page.waitForTimeout(ms);
const goTo = (page, y) => page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), Math.round(y));
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const sumIs = (page, text) => page.waitForFunction((value) => document.querySelector('.money-sum').textContent === value, text, { timeout: 3000 });

// Fase 2: as três demonstrações para tocar. Com movimento reduzido o resultado é o mesmo, sem animação.
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
  assert.equal(await marcos.locator('.mc-stamp').isVisible(), true, `${label}: Marcos pago (carimbo)`);
  assert.equal(await marcos.locator('.t-tag').isVisible(), false, `${label}: sem "Pago" em dobro`);
  // O carimbo fica no lugar do botão, sem passar por cima de "seg 15h".
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
  // Na ficha: responder diz o que o app faz; Aceitar leva o pedido para o sábado.
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
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('anima')), true, `${width}: movimento ligado`);

    // O topo aparece de cara, sem esperar animação.
    for (const selector of ['h1', '.hero-end .primary', '.hero-end .outline']) {
      const shown = await page.locator(selector).evaluate((e) => getComputedStyle(e).opacity === '1' && getComputedStyle(e).transform === 'none' && e.getAnimations().length === 0);
      assert.equal(shown, true, `${width}: ${selector} visível sem animação`);
    }

    // Bolo (Fase 3): começa montado, sem legendas, e abre em camadas com a rolagem, parado no topo da tela.
    const cake = await page.locator('.cake-track').evaluate((e) => ({ top: e.getBoundingClientRect().top + scrollY, height: e.offsetHeight }));
    const cakeAt = async (part) => {
      await goTo(page, cake.top + (cake.height - height) * part); await wait(page, 300);
      return page.evaluate(() => {
        const images = [...document.querySelectorAll('.cake-layer img')].map((img) => img.getBoundingClientRect());
        return { spread: images.at(-1).bottom - images[0].top, labels: [...document.querySelectorAll('.cake-label')].map((label) => Number(getComputedStyle(label).opacity)),
          stageTop: Math.round(document.querySelector('.cake-stage').getBoundingClientRect().top) };
      });
    };
    const shut = await cakeAt(0.02), open = await cakeAt(0.9);
    assert.ok(shut.labels.every((o) => o < 0.05), `${width}: bolo montado sem legendas`);
    assert.ok(open.labels.every((o) => o > 0.95), `${width}: bolo aberto com as 5 legendas`);
    assert.ok(open.spread > shut.spread * 1.3, `${width}: bolo abre em camadas (${Math.round(shut.spread)} → ${Math.round(open.spread)} px)`);
    assert.equal(open.stageTop, 0, `${width}: bolo parado no topo enquanto abre`);
    assert.equal(await noSideScroll(page), true, `${width}: sem rolagem lateral no bolo`);

    // Semana da Lu: a cena fica parada e troca 01 → 02 → 03; o dia gigante vai de segunda a sábado e anoitece no fim.
    const story = await page.locator('.story-track').evaluate((e) => ({ top: e.getBoundingClientRect().top + scrollY, height: e.offsetHeight }));
    const range = story.height - height;
    for (const [part, count, today, moment] of [[0.05, '01/03', 'seg', 'de manhã'], [0.5, '02/03', 'sáb', '11h'], [0.95, '03/03', 'sáb', 'à noite']]) {
      await goTo(page, story.top + range * part); await wait(page);
      assert.equal(await page.locator('.story-count').innerText(), count, `${width}: contador ${count}`);
      assert.equal(await page.locator('.story-day').getAttribute('data-day'), today, `${width}: dia ${today}`);
      assert.equal(await page.locator('.story-when').innerText(), moment);
      assert.equal(await page.locator('.story-sky').evaluate((e) => Number(getComputedStyle(e).opacity) > 0.95), count === '03/03', `${width}: anoitece só na última cena`);
      const active = await page.locator('.story figure').evaluateAll((list) => list.map((f) => f.classList.contains('is-active')));
      assert.deepEqual(active, [0, 1, 2].map((i) => i === Number(count[1]) - 1), `${width}: cena ${count} em destaque`);
      assert.equal(await page.locator('.story-stage').evaluate((e) => Math.round(e.getBoundingClientRect().top)), 0, `${width}: cena parada no topo`);
      assert.equal(await page.locator('.story figure.is-active').evaluate((e) => getComputedStyle(e).opacity), '1');
      assert.equal(await noSideScroll(page), true, `${width}: sem rolagem lateral na cena ${count}`);
    }
    await goTo(page, story.top + story.height); await wait(page, 200);
    assert.equal(await page.locator('.video-open').isVisible(), true, `${width}: Ver o vídeo continua lá`);

    await checkDemos(page, String(width));

    // Barra fixa (só no celular): escondida no topo, nas cenas paradas e no convite do fim; aparece entre elas.
    const ctaShown = () => page.locator('.float-cta').evaluate((e) => getComputedStyle(e).display !== 'none' && e.classList.contains('is-shown') && !e.inert);
    const at = async (selector, offset = 0) => { await goTo(page, await page.locator(selector).evaluate((e) => e.getBoundingClientRect().top + scrollY) + offset); await wait(page, 500); };
    await goTo(page, 0); await wait(page, 300);
    assert.equal(await ctaShown(), false, `${width}: barra escondida no topo`);
    await at('.try', height * 0.3);
    assert.equal(await ctaShown(), false, `${width}: barra some nas demonstrações (não cobre Recebi nem os doces)`);
    await at('#link-cliente', height * 0.3);
    assert.equal(await ctaShown(), false, `${width}: barra some na demonstração do link`);
    await at('.trust', height * 0.2);
    assert.equal(await ctaShown(), width <= 700, `${width}: barra ${width <= 700 ? 'aparece' : 'não existe'} entre as demonstrações e o fim`);
    await at('.story-track', height * 0.5);
    assert.equal(await ctaShown(), false, `${width}: barra some na semana da Lu`);
    await at('.story', -height * 0.2);
    assert.equal(await ctaShown(), false, `${width}: barra some já na entrada da semana (não cobre "Ver o vídeo")`);
    await at('.closing-new', -height * 0.4);
    assert.equal(await ctaShown(), false, `${width}: barra some no convite do fim`);

    // Vídeo numa janela do tamanho da tela; Esc fecha e pausa.
    await page.locator('.video-open').evaluate((e) => e.click());
    await page.locator('.video-dialog[open] video').waitFor({ timeout: 3000 });
    assert.equal(await page.locator('.video-dialog video source').getAttribute('src'), '/previa-landing/a-semana-da-lu.mp4');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'video-close', `${width}: foco no Fechar`);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.video-dialog').evaluate((d) => d.open), false, `${width}: Esc fecha o vídeo`);
    // O evento "close" do diálogo chega numa tarefa seguinte; espera a pausa em vez de olhar no mesmo instante.
    await page.waitForFunction(() => document.querySelector('.video-dialog video').paused, null, { timeout: 2000 });
    assert.deepEqual(errors, [], `${width}: sem erros`);
    await page.close();
  }

  // Movimento reduzido e sem JavaScript: tudo parado e à vista, como antes.
  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const label = options.reducedMotion ? 'movimento reduzido' : 'sem JavaScript';
    const page = await browser.newPage({ viewport: { width: 360, height: 740 }, ...options });
    await page.goto(`${server.origin}/`, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('anima')), false, label);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, `${label}: nada se mexe`);
    for (const figure of await page.locator('.story figure').all()) {
      await figure.scrollIntoViewIfNeeded();
      assert.equal(await figure.evaluate((e) => getComputedStyle(e).opacity), '1', `${label}: cenas à vista`);
      assert.match(await figure.locator('figcaption').innerText(), /^(Segunda de manhã|Sábado, 11h|Sábado à noite): /);
    }
    assert.equal(await page.locator('.story-meta').isVisible(), false);
    // Bolo parado: aberto, as 5 legendas à vista e as 6 camadas como imagens com tamanho e carregamento adiado.
    for (const caption of await page.locator('.cake-label').all()) {
      await caption.scrollIntoViewIfNeeded();
      assert.equal(await caption.evaluate((e) => getComputedStyle(e).opacity), '1', `${label}: legendas do bolo à vista`);
    }
    assert.equal(await page.locator('.cake-label').count(), 5);
    assert.equal(await page.locator('.cake-layer img[loading="lazy"][width="240"][height]').count(), 6);
    assert.equal(await noSideScroll(page), true, `${label}: sem rolagem lateral`);
    if (options.reducedMotion) {
      await checkDemos(page, label);
      assert.equal(await page.evaluate(() => document.getAnimations().length), 0, `${label}: demonstrações sem animação`);
    } else {
      // Sem JavaScript: o retrato parado da semana, do dinheiro e dos dois lados do link, sem botões que não respondem.
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
  console.log('Movimento e demonstrações da landing conferidos em 360, 390 e 1280 px; movimento reduzido funciona sem animar e sem JavaScript tudo fica à vista.');
} finally {
  await browser.close(); server.close();
}
