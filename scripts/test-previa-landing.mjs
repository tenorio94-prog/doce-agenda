import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 640], [360, 800], [390, 844], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto(`${server.origin}/previa-landing/`, { waitUntil: 'networkidle' });
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
    await page.goto(`${server.origin}/demo/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#demo-line').innerText(), 'Exemplo: a semana da Lu, da Doces da Lu.');
    await page.close();
  }
  console.log('Prévia: foto inteira, altura, tela do celular e texto da demo conferidos em 320, 360, 390 e 1280 px.');
} finally {
  await browser.close(); server.close();
}
