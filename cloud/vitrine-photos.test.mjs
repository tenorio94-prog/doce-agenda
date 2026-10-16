import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPageOwnership, decodePhoto, photoFolder, photosToDelete, PHOTO_ORPHAN_MS } from './vitrine-photos.js';

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
// Cabeçalhos mínimos, do jeito que o navegador grava (JPEG baseline e WebP VP8X).
function jpeg(width, height, size = 200) {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03], 20);
  return bytes;
}
function webp(width, height, size = 200) {
  const bytes = new Uint8Array(size), w = width - 1, h = height - 1;
  bytes.set([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8X'), 10, 0, 0, 0, 0, 0, 0, 0, w & 255, (w >> 8) & 255, w >> 16, h & 255, (h >> 8) & 255, h >> 16]);
  return bytes;
}
const folder = 'a'.repeat(32), key = (n) => `${folder}/${String(n).repeat(8)}-1111-1111-1111-${String(n).repeat(12)}.webp`;

test('photo bytes are checked, not trusted from the type the browser sends', () => {
  assert.deepEqual((({ ext, width, height }) => ({ ext, width, height }))(decodePhoto({ type: 'image/jpeg', data: b64(jpeg(900, 1125)) })), { ext: 'jpg', width: 900, height: 1125 });
  assert.deepEqual((({ ext, width, height }) => ({ ext, width, height }))(decodePhoto({ type: 'image/webp', data: b64(webp(1600, 800)) })), { ext: 'webp', width: 1600, height: 800 });
  assert.throws(() => decodePhoto({ type: 'image/webp', data: b64(jpeg(900, 900)) }), /não é uma foto/);
  assert.throws(() => decodePhoto({ type: 'image/png', data: b64(jpeg(900, 900)) }), /WebP ou JPEG/);
  assert.throws(() => decodePhoto({ type: 'image/jpeg', data: b64(new TextEncoder().encode('<svg onload=alert(1)>'.repeat(10))) }), /não é uma foto/);
  assert.throws(() => decodePhoto({ type: 'image/jpeg', data: b64(jpeg(5000, 900)) }), /grande demais/);
  assert.throws(() => decodePhoto({ type: 'image/jpeg', data: b64(jpeg(900, 900, 1024 * 1024 + 10)) }), (e) => e.status === 413);
  assert.throws(() => decodePhoto({ type: 'image/jpeg', data: '%%%' }), /inválida/);
});

test('each account gets its own unguessable folder', async () => {
  const one = await photoFolder('secret', 'user-1'), two = await photoFolder('secret', 'user-2');
  assert.match(one, /^[a-f0-9]{32}$/); assert.notEqual(one, two); assert.ok(!one.includes('user'));
  assert.equal(one, await photoFolder('secret', 'user-1')); assert.notEqual(one, await photoFolder('other', 'user-1'));
});

test('a page may only use its own photos or bundled examples', () => {
  const page = { logo: key(1), cover: 'exemplo/capa.svg', share: '', products: [{ name: 'Bolo', photo: key(2) }] };
  assert.deepEqual(checkPageOwnership(page, folder), page);
  const foreign = { ...page, products: [{ name: 'Bolo', photo: `${'b'.repeat(32)}/${key(3).split('/')[1]}` }] };
  assert.throws(() => checkPageOwnership(foreign, folder), /não pertence/);
  assert.deepEqual(checkPageOwnership(foreign, folder, { strip: true }).products, [{ name: 'Bolo' }]);
});

test('cleanup removes only old photos the page no longer uses', () => {
  const now = Date.parse('2026-10-16T12:00:00Z'), old = new Date(now - PHOTO_ORPHAN_MS - 1000).toISOString(), fresh = new Date(now - 60000).toISOString();
  const files = [1, 2, 3, 4].map((n) => ({ name: key(n).split('/')[1], created_at: n === 4 ? fresh : old }));
  const page = { logo: key(1), cover: '', share: '', products: [{ name: 'Bolo', photo: key(2) }] };
  assert.deepEqual(photosToDelete(files, page, folder, now), [key(3)]);
});
