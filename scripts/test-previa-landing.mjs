import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 640], [360, 800], [390, 844], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    for (const route of ['/', '/previa-landing/']) {
      let videoRequests = 0;
      page.on('request', (request) => { if (request.url().endsWith('/previa-landing/historia.mp4')) videoRequests++; });
      await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').innerText(), 'Sua semana de encomendas, sem susto.');
      assert.equal(await page.locator('meta[name="robots"]').count(), route === '/' ? 0 : 1);
      assert.equal(await page.locator('.hero-image img').evaluate((img) => img.complete && img.naturalWidth > 0), true, `${route}: foto carregada`);
      const photo = await page.locator('.hero-image > img').evaluate((img) => {
        const image = img.getBoundingClientRect();
        const card = img.parentElement.querySelector('.agenda-card').getBoundingClientRect();
        return { width: image.width, height: image.height, naturalRatio: img.naturalWidth / img.naturalHeight,
          cardLeft: (card.left - image.left) / image.width, cardRight: (card.right - image.left) / image.width,
          cardTop: (card.top - image.top) / image.height, cardBottom: (card.bottom - image.top) / image.height };
      });
      assert.ok(Math.abs(photo.width / photo.height - photo.naturalRatio) < 0.01, `${width}: foto inteira, sem recorte`);
      if (width < 700) assert.ok(photo.height <= height * 0.75, `${width}: foto não pode exceder 75% da altura`);
      // Coordinates of the phone's black screen in the approved photograph, measured against the whole image.
      assert.ok(photo.cardLeft >= 0.605 && photo.cardRight <= 0.84 && photo.cardTop >= 0.145 && photo.cardBottom <= 0.93, `${width}: agenda deve caber na tela do celular`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: sem rolagem lateral`);
      if (width === 320 && height === 640) {
        const intro = await page.evaluate(() => ({
          titleHeight: document.querySelector('h1').getBoundingClientRect().height,
          photoBottom: document.querySelector('.hero-image').getBoundingClientRect().bottom,
          actionBottom: document.querySelector('.hero-end .primary').getBoundingClientRect().bottom,
        }));
        assert.ok(intro.titleHeight < 150, 'título sem linha isolada em celular estreito');
        assert.ok(intro.photoBottom <= height && intro.actionBottom <= height, 'foto inteira e ação principal à vista em 320 × 640');
      }
      if (width < 700) {
        const inView = await page.locator('.hero-image').evaluate((e) => { const r = e.getBoundingClientRect(); return Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height; });
        assert.ok(inView >= 0.5, `${width}: ao menos metade da foto aparece na primeira tela`);
      }
      assert.equal(await page.locator('.example-label').count(), 3, 'as três imagens são identificadas como exemplos');
      for (const img of await page.locator('.screen-shot').all()) {
        assert.ok((await img.boundingBox()).height <= 260, 'os exemplos de tela são curtos');
      }
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

      if (width === 360) {
        assert.equal(videoRequests, 0, `${route}: vídeo não carrega antes do toque`);
        await page.locator('.video-open').click();
        assert.equal(await page.locator('video source').getAttribute('src'), '/previa-landing/historia.mp4');
        assert.equal(await page.locator('video track').getAttribute('src'), '/previa-landing/legendas.vtt');
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
