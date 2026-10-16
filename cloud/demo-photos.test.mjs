import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSeedState } from './demo-seed.js';
import { DEMO_COVER_PHOTO, DEMO_PHOTO_CATALOG, demoOrderPhoto } from './demo-photos.js';
import { createEmptyState, transactState } from './state-engine.js';

const transact = (state, url, method = 'GET', body) => transactState(state, url, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});

test('demo catalog uses the requested bundled WebP set and keeps featured items within the limit', () => {
  const expected = ['brigadeiros-gourmet', 'bolo-pistache', 'bolo-chocolate-morango', 'bento-cake', 'caixa-docinhos', 'kit-festa', 'bolo-infantil', 'bolo-aniversario-frutas', 'brownies', 'sobremesas-individuais', 'cupcakes', 'bolo-cenoura-chocolate'];
  assert.deepEqual(DEMO_PHOTO_CATALOG.map(({ photo }) => photo), expected.map((slug) => `exemplo/${slug}-960.webp`));
  assert.equal(DEMO_COVER_PHOTO, 'exemplo/bastidores-confeitaria-960.webp');
  assert.equal(DEMO_PHOTO_CATALOG.filter((product) => product.featured).length, 3);
  const seed = demoSeedState(new Date(2026, 9, 14, 9));
  assert.equal(seed.orderPage.products.filter((product) => product.featured).length, 3);
  for (const name of ['Beijinho (cento)', 'Torta de limão', 'Pudim de leite']) {
    assert.ok(seed.orderPage.products.some((product) => product.name === name), `${name} remains in the catalog`);
  }
  assert.ok(seed.orderPage.products.find((product) => product.name === 'Bolo de pote')?.photo === undefined);
});

test('photo resolution prefers exact product names and applies only verified demo aliases', () => {
  const products = demoSeedState(new Date(2026, 9, 14, 9)).orderPage.products;
  const order = (id, product) => ({ id, product });
  const photo = (id, product, isDemo = true) => demoOrderPhoto(order(id, product), products, isDemo);
  assert.equal(photo('DEMO-07', 'Bolo de pistache'), 'exemplo/bolo-pistache-960.webp');
  for (const id of ['DEMO-02', 'DEMO-08', 'DEMO-13', 'DEMO-H2', 'DEMO-H4']) {
    assert.equal(photo(id, 'Brigadeiro (cento)'), 'exemplo/brigadeiros-gourmet-960.webp');
  }
  assert.equal(photo('DEMO-03', 'Naked cake de morango'), 'exemplo/bolo-aniversario-frutas-960.webp');
  assert.equal(photo('DEMO-04', 'Bolo de cenoura'), 'exemplo/bolo-cenoura-chocolate-960.webp');
  assert.equal(photo('DEMO-H5', 'Bolo de cenoura'), 'exemplo/bolo-cenoura-chocolate-960.webp');
  assert.equal(photo('DEMO-09', 'Docinhos sortidos (50 un.)'), 'exemplo/caixa-docinhos-960.webp');
  assert.equal(photo('DEMO-11', 'Kit festa (bolo + 50 doces)'), 'exemplo/kit-festa-960.webp');

  for (const [id, name] of [
    ['DEMO-01', 'Bolo de chocolate (1,5 kg)'], ['DEMO-10', 'Bolo de chocolate 3 andares'],
    ['DEMO-05', 'Bolo de pote (10 un.)'], ['DEMO-09', 'Docinhos sortidos (50 un.)'],
  ]) assert.equal(photo(id, name, false), '', `${id} must not get a demo-only association`);
  assert.equal(photo('DEMO-10', 'Bolo de chocolate 3 andares'), '');
  assert.equal(demoOrderPhoto(order('real-123', 'Bolo de pistache'), products, false), 'exemplo/bolo-pistache-960.webp', 'exact catalog match works outside demo');
  assert.equal(demoOrderPhoto(order('DEMO-04', 'Bolo de cenoura editado'), products, true), '');
  assert.equal(demoOrderPhoto(order('DEMO-04', 'Bolo de cenoura'), products.filter((p) => p.name !== 'Bolo de cenoura'), true), '', 'removed target disables alias');
});

test('WebP catalog photos survive orderPage save, export and old backup import', () => {
  const seed = demoSeedState(new Date(2026, 9, 14, 9));
  const stored = transact(createEmptyState(), '/api/order-page', 'PUT', seed.orderPage);
  assert.equal(stored.status, 200);
  assert.equal(stored.body.cover, DEMO_COVER_PHOTO);
  assert.equal(stored.body.products[0].photo, 'exemplo/brigadeiros-gourmet-960.webp');
  const exportResult = transact(stored.state, '/api/export');
  assert.equal(exportResult.body.orderPage.products[0].photo, stored.body.products[0].photo);

  const oldBackup = { ...createEmptyState(), orderPage: { ...seed.orderPage, products: [{ name: 'Beijinho (cento)', description: '', photo: 'exemplo/beijinho.svg' }] } };
  const imported = transact(createEmptyState(), '/api/import', 'POST', oldBackup);
  assert.equal(imported.status, 200);
  assert.deepEqual(imported.state.orderPage.products[0], { name: 'Beijinho (cento)', description: '', photo: 'exemplo/beijinho.svg' });
});
