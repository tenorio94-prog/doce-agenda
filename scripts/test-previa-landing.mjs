import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 640], [360, 560], [360, 640], [360, 800], [390, 844], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    for (const route of ['/', '/previa-landing/']) {
      await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').innerText(), 'Sua semana de encomendas, sem susto.');
      assert.equal(await page.locator('meta[name="robots"]').count(), route === '/' ? 0 : 1);

      // Topo com fotografia realista (sem SVGs de cartoon nem barra fixa invasiva).
      assert.equal(await page.locator('.hero-image img').evaluate((img) => img.complete && img.naturalWidth > 0 && /assets\/hero-confeitaria\.jpg$/.test(img.src)), true, `${route}: foto principal carregada`);
      const photo = await page.locator('.hero-image > img').evaluate((img) => { const r = img.getBoundingClientRect(); return { width: r.width, height: r.height, ratio: img.naturalWidth / img.naturalHeight }; });
      assert.ok(Math.abs(photo.width / photo.height - photo.ratio) < 0.02, `${width}: foto principal em proporção natural`);
      if (width < 700) assert.ok(photo.height <= height * 0.75, `${width}: foto não excede 75% da altura`);
      assert.equal(await page.locator('.float-cta, img[src*="topo-lu"], img[src*="bolo/"]').count(), 0, 'sem ilustrações SVG nem barra flutuante cobrindo o conteúdo');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: sem rolagem lateral`);

      if (width < 700 && height <= 760) {
        const intro = await page.evaluate(() => ({
          titleHeight: document.querySelector('h1').getBoundingClientRect().height,
        }));
        assert.ok(intro.titleHeight < 160, 'título legível sem estourar em celular estreito');
      }
      if (width < 700 && height >= 640) {
        const inView = await page.locator('.hero-image').evaluate((e) => { const r = e.getBoundingClientRect(); return Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height; });
        assert.ok(inView >= 0.4, `${width}: parte da foto principal aparece na primeira tela`);
      }

      // As 3 fotos da história carregam inteiras.
      const storyImgs = await page.locator('.story-card img').evaluateAll((imgs) => imgs.map((img) => img.complete && img.naturalWidth > 0));
      assert.deepEqual(storyImgs, [true, true, true], `${route}: 3 fotografias da semana carregadas`);

      assert.match(await page.locator('.faq-list').innerText(), /E se o projeto acabar\?/);
      for (const side of ['client', 'baker']) {
        await page.locator(`.ld-switch button[data-side="${side}"]`).click();
        const phone = page.locator(`.ld-${side} .mock-phone`);
        const hasCut = await phone.evaluate((e) => e.scrollHeight > e.clientHeight + 1);
        assert.equal(hasCut, false, `${width}: demonstração de ${side} sem corte`);
        if (side === 'client') {
          const within = await phone.evaluate((e) => { const r = e.getBoundingClientRect(), button = e.querySelector('.m-form .m-btn').getBoundingClientRect(); return button.bottom <= r.bottom && button.top >= r.top; });
          assert.ok(within, `${width}: botão de envio da cliente visível`);
        }
      }
    }

    await page.goto(`${server.origin}/demo/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#demo-line').innerText(), 'Exemplo: a semana da Lu, da Doces da Lu.');
    await page.close();
  }

  const archived = await browser.newPage();
  await archived.goto(`${server.origin}/landing-anterior/`);
  assert.match(await archived.locator('h1').innerText(), /Saiba o que fazer, entregar e cobrar/);
  assert.equal(await archived.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.equal(await archived.locator('link[rel="canonical"]').count(), 0);
  const main = await browser.newPage();
  await main.goto(`${server.origin}/`);
  assert.equal(await main.locator('link[rel="canonical"]').getAttribute('href'), 'https://lucast.app/');
  assert.ok((await main.locator('meta[name="description"]').getAttribute('content')).length > 30);
  await archived.close(); await main.close();
  console.log('Landing principal, prévia, versão anterior e acesso à demo conferidos em 320, 360, 390 e 1280 px.');
} finally {
  await browser.close(); server.close();
}
