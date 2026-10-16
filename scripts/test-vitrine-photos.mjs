// Fotos da vitrine de ponta a ponta, sem conta real: node scripts/test-vitrine-photos.mjs
// O navegador prepara a foto (public/photo-prep.js) e o resultado passa pela mesma conferência do servidor
// (cloud/vitrine-photos.js). Também confere a foto com localização (EXIF) perdendo esses dados.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from './lib/browser-test.mjs';
import { decodePhoto } from '../cloud/vitrine-photos.js';

const bundle = await build({ entryPoints: ['public/photo-prep.js'], bundle: true, format: 'iife', globalName: 'PhotoPrep', write: false });
const browser = await chromium.launch();
const results = [];
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><body></body>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const out = await page.evaluate(async () => {
    const make = async (w, h, color, type = 'image/jpeg') => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = color; x.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
      const blob = await new Promise((r) => c.toBlob(r, type, 0.95));
      return new File([blob], 'foto', { type });
    };
    // JPEG com bloco EXIF/GPS inserido logo após o início: precisa sumir na regravação.
    const plain = await make(3000, 2000, '#b8325a'), raw = new Uint8Array(await plain.arrayBuffer());
    const exif = new TextEncoder().encode('Exif\0\0GPSLatitude-22.9 GPSLongitude-47.0');
    const app1 = new Uint8Array([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 255, ...exif]);
    const withGps = new File([raw.slice(0, 2), app1, raw.slice(2)], 'gps.jpg', { type: 'image/jpeg' });
    const toB64 = (blob) => PhotoPrep.blobToBase64(blob);
    const product = await PhotoPrep.preparePhoto(withGps, 'product');
    const cover = await PhotoPrep.preparePhoto(await make(4000, 1500, '#3f7a4a'), 'cover');
    const logo = await PhotoPrep.preparePhoto(await make(800, 600, '#6e54a6', 'image/png'), 'logo');
    const share = await PhotoPrep.shareImage({ cover: cover.canvas, logo: null });
    const shareLogo = await PhotoPrep.shareImage({ cover: null, logo: logo.canvas, tint: '#f8e7ec' });
    const productBytes = new Uint8Array(await product.blob.arrayBuffer());
    let error = ''; try { await PhotoPrep.preparePhoto(new File(['nada'], 'x.txt', { type: 'text/plain' }), 'product'); } catch (e) { error = e.message; }
    return {
      product: { type: product.blob.type, w: product.width, h: product.height, before: product.before, after: product.blob.size, data: await toB64(product.blob), hasGps: new TextDecoder('latin1').decode(productBytes).includes('GPS') },
      cover: { w: cover.width, h: cover.height, data: await toB64(cover.blob), type: cover.blob.type },
      logo: { w: logo.width, h: logo.height, color: PhotoPrep.dominantColor(logo.canvas), data: await toB64(logo.blob), type: logo.blob.type },
      share: { type: share.type, data: await toB64(share) }, shareLogo: { type: shareLogo.type, data: await toB64(shareLogo) }, error,
    };
  });
  assert.equal(out.product.w, 1200); assert.equal(out.product.h, 800); assert.ok(out.product.after < out.product.before / 3, 'foto fica bem menor');
  assert.equal(out.product.hasGps, false, 'localização some'); results.push('foto de doce reduzida, sem localização');
  assert.deepEqual([out.cover.w, out.cover.h], [1800, 675]); assert.deepEqual([out.logo.w, out.logo.h], [400, 400]); results.push('capa e logo nos tamanhos certos');
  assert.match(out.logo.color, /^#[0-9a-f]{6}$/); const [r, g, b] = [1, 3, 5].map((i) => parseInt(out.logo.color.slice(i, i + 2), 16));
  assert.ok(b > g && r > g, `cor do logo puxa para o lilás (${out.logo.color})`); results.push('cor sugerida do logo');
  for (const [name, item] of Object.entries({ product: out.product, cover: out.cover, logo: out.logo, share: out.share, shareLogo: out.shareLogo })) {
    const type = item.type; const checked = decodePhoto({ type, data: item.data });
    if (name.startsWith('share')) assert.deepEqual([type, checked.width, checked.height], ['image/jpeg', 1200, 630]);
    else assert.ok(checked.width === item.w && checked.height === item.h, `${name}: servidor lê as mesmas dimensões`);
  }
  results.push('servidor aceita o que o navegador prepara; prévia do WhatsApp em JPEG 1200×630');
  assert.match(out.error, /Escolha uma foto/); results.push('arquivo que não é foto recebe aviso claro');
} finally { await browser.close(); }
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
