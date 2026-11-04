import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 640], [360, 560], [360, 640], [360, 800], [390, 844], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    for (const route of ['/', '/previa-landing/']) {
      let videoRequests = 0;
      page.on('request', (request) => { if (request.url().endsWith('/previa-landing/a-semana-da-lu.mp4')) videoRequests++; });
      await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').innerText(), 'Sua semana de encomendas, sem susto.');
      assert.equal(await page.locator('meta[name="robots"]').count(), route === '/' ? 0 : 1);
      // Topo (03/11/2026): ilustração da Lu no mesmo traço da história, sem texto miúdo por cima.
      assert.equal(await page.locator('.hero-image img').evaluate((img) => img.complete && img.naturalWidth > 0 && /topo-lu\.svg$/.test(img.src)), true, `${route}: ilustração carregada`);
      const photo = await page.locator('.hero-image > img').evaluate((img) => { const r = img.getBoundingClientRect(); return { width: r.width, height: r.height, ratio: img.naturalWidth / img.naturalHeight }; });
      assert.ok(Math.abs(photo.width / photo.height - photo.ratio) < 0.01, `${width}: ilustração inteira, sem recorte`);
      if (width < 700) assert.ok(photo.height <= height * 0.75, `${width}: ilustração não pode exceder 75% da altura`);
      assert.equal(await page.locator('.agenda-card').count(), 0, 'sem cartão de texto miúdo sobre a ilustração');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: sem rolagem lateral`);
      if (width < 700 && height <= 760) {
        const intro = await page.evaluate(() => ({
          titleHeight: document.querySelector('h1').getBoundingClientRect().height,
          photoBottom: document.querySelector('.hero-image').getBoundingClientRect().bottom,
          actionBottom: document.querySelector('.hero-end .primary').getBoundingClientRect().bottom,
        }));
        assert.ok(intro.titleHeight < 150, 'título sem linha isolada em celular estreito');
        // Celular baixo (até 600 px úteis): a foto fica no lugar e a barra fixa traz os botões já na primeira tela.
        if (height <= 600) assert.equal(await page.locator('.float-cta.is-shown').isVisible(), true, `barra com a ação principal à vista em ${width} × ${height}`);
        else assert.ok(intro.photoBottom <= height && intro.actionBottom <= height, `foto inteira e ação principal à vista em ${width} × ${height}`);
      }
      if (width < 700) {
        const inView = await page.locator('.hero-image').evaluate((e) => { const r = e.getBoundingClientRect(); return Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height; });
        assert.ok(inView >= 0.5, `${width}: ao menos metade da foto aparece na primeira tela`);
      }
      // "Como funciona" saiu (repetia "Mexa na agenda" com telas antigas do app).
      assert.equal(await page.locator('.how, img[src*="tela-"], img[src*="passo-"]').count(), 0, 'sem telas antigas do app');
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

      if (width === 360) {
        assert.equal(videoRequests, 0, `${route}: vídeo não carrega antes do toque`);
        // Aguarda a requisição iniciada pelo clique antes de abrir a próxima rota.
        // Assim uma requisição tardia da primeira página não contamina a contagem da segunda.
        await Promise.all([
          page.waitForRequest((request) => request.url().endsWith('/previa-landing/a-semana-da-lu.mp4')),
          page.locator('.video-open').click(),
        ]);
        assert.equal(await page.locator('video source').getAttribute('src'), '/previa-landing/a-semana-da-lu.mp4');
        // O texto do vídeo já está na imagem; para leitor de tela, o roteiro fica em texto ligado ao vídeo.
        assert.equal(await page.locator('video track').count(), 0);
        assert.equal(await page.locator('video').getAttribute('aria-describedby'), 'video-roteiro');
        assert.match(await page.locator('#video-roteiro').textContent(), /Segunda de manhã[\s\S]*Camila veio buscar[\s\S]*sem susto/);
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
