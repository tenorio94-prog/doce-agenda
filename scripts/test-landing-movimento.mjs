import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

// Movimento da landing (Fase 1): letreiro, sexta-feira da Lu parada e celular do Como funciona.
// Também confere que, sem JavaScript ou com movimento reduzido, tudo continua à vista e parado.
const server = await serveSite();
const browser = await chromium.launch();
const wait = (page, ms = 900) => page.waitForTimeout(ms);
const goTo = (page, y) => page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), Math.round(y));
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
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

    // Letreiro corre, pausa no botão e no toque, e a cópia que fecha o laço fica escondida do leitor de tela.
    assert.equal(await page.locator('.ticker-list[aria-hidden="true"]').count(), 1);
    const state = () => page.locator('.ticker-move').evaluate((e) => e.getAnimations()[0]?.playState);
    assert.equal(await state(), 'running', `${width}: letreiro correndo`);
    await page.locator('.ticker-pause').click();
    assert.equal(await page.locator('.ticker-pause').getAttribute('aria-pressed'), 'true');
    assert.equal(await state(), 'paused', `${width}: letreiro pausado pelo botão`);
    await page.locator('.ticker-track').click({ position: { x: 20, y: 10 } });
    assert.equal(await page.locator('.ticker-pause').getAttribute('aria-pressed'), 'false', `${width}: toque no letreiro retoma`);

    // Sexta-feira da Lu: a cena fica parada e troca 01 → 02 → 03.
    const story = await page.locator('.story-track').evaluate((e) => ({ top: e.getBoundingClientRect().top + scrollY, height: e.offsetHeight }));
    const range = story.height - height;
    for (const [part, count] of [[0.05, '01/03'], [0.5, '02/03'], [0.95, '03/03']]) {
      await goTo(page, story.top + range * part); await wait(page);
      assert.equal(await page.locator('.story-count').innerText(), count, `${width}: contador ${count}`);
      const active = await page.locator('.story figure').evaluateAll((list) => list.map((f) => f.classList.contains('is-active')));
      assert.deepEqual(active, [0, 1, 2].map((i) => i === Number(count[1]) - 1), `${width}: cena ${count} em destaque`);
      assert.equal(await page.locator('.story-stage').evaluate((e) => Math.round(e.getBoundingClientRect().top)), 0, `${width}: cena parada no topo`);
      assert.equal(await page.locator('.story figure.is-active').evaluate((e) => getComputedStyle(e).opacity), '1');
      assert.equal(await noSideScroll(page), true, `${width}: sem rolagem lateral na cena ${count}`);
    }
    await goTo(page, story.top + story.height); await wait(page, 200);
    assert.equal(await page.locator('.video-open').isVisible(), true, `${width}: Ver o vídeo continua lá`);

    // Como funciona: o celular fica parado e a tela acompanha o passo.
    const howTop = await page.locator('.how-stage').evaluate((e) => e.getBoundingClientRect().top + scrollY);
    const steps = await page.locator('.how-grid article').evaluateAll((list) => list.map((a) => ({ top: a.getBoundingClientRect().top + scrollY, height: a.offsetHeight })));
    const files = ['tela-anotar.webp', 'tela-semana.webp', 'tela-dinheiro.webp'];
    const phoneTops = [];
    for (const [i, file] of files.entries()) {
      // Coloca o passo um pouco acima da linha que o ativa (topo a 70% no celular, meio a 60% no computador).
      const mark = width > 700 ? steps[i].top + steps[i].height / 2 - height * 0.5 : steps[i].top - height * 0.62;
      await goTo(page, Math.max(howTop, mark)); await wait(page);
      assert.equal(await page.locator('.how-screen img.is-active').evaluate((img) => img.src.split('/').pop()), file, `${width}: tela do passo ${i + 1}`);
      assert.equal(await page.locator('.how-grid article').nth(i).evaluate((a) => a.classList.contains('is-active')), true);
      assert.equal(await page.locator('.how-screen img.is-active').evaluate((img) => img.complete && img.naturalWidth > 0), true, `${width}: tela ${file} carregada`);
      if (i) phoneTops.push(await page.locator('.how-phone').evaluate((e) => Math.round(e.getBoundingClientRect().top)));
      assert.equal(await noSideScroll(page), true, `${width}: sem rolagem lateral no passo ${i + 1}`);
    }
    assert.equal(phoneTops[0], phoneTops[1], `${width}: celular parado entre os passos`);
    // No celular, o último passo aparece por inteiro logo abaixo do aparelho antes de ele soltar.
    if (width <= 700) {
      const last = await page.evaluate(() => {
        const phone = document.querySelector('.how-phone').getBoundingClientRect();
        const step = document.querySelector('.how-grid article:last-child').getBoundingClientRect();
        return { phoneBottom: phone.bottom, stepTop: step.top, stepBottom: step.bottom };
      });
      assert.ok(last.stepTop >= last.phoneBottom - 2 && last.stepBottom <= height, `${width}: último passo visível abaixo do celular`);
    }
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
      assert.match(await figure.locator('figcaption').innerText(), /^Sexta, 23h: |^Ela anota/);
    }
    assert.equal(await page.locator('.story-meta').isVisible(), false);
    assert.equal(await page.locator('.how-rail').isVisible(), false, `${label}: celular animado fora`);
    for (const shot of await page.locator('.how-grid .screen-shot').all()) assert.equal(await shot.isVisible(), true, `${label}: imagens dos passos à vista`);
    assert.equal(await page.locator('.ticker-list').count(), options.javaScriptEnabled === false ? 1 : 2);
    assert.equal(await page.locator('.ticker-list').first().locator('li').count(), 6);
    assert.equal(await page.locator('.ticker-list[aria-hidden]').isVisible(), false, `${label}: sem cópia do letreiro`);
    assert.equal(await page.locator('.ticker-pause').isVisible(), false);
    assert.equal(await noSideScroll(page), true, `${label}: sem rolagem lateral`);
    await page.close();
  }
  console.log('Movimento da landing conferido em 360, 390 e 1280 px; movimento reduzido e sem JavaScript ficam parados e completos.');
} finally {
  await browser.close(); server.close();
}
