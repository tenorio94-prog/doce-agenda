// Real static assets locally or on the published site; never mocks image files or writes an account.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite } from './lib/browser-test.mjs';
import { demoSeedState } from '../cloud/demo-seed.js';
import { demoOrderPhoto } from '../cloud/demo-photos.js';

const output = path.resolve(process.env.DOCE_PHOTO_SHOTS || 'docs/fotografias-demo/depois');
await mkdir(output, { recursive: true });
const server = process.env.DOCE_PHOTO_ORIGIN ? null : await serveSite();
const origin = process.env.DOCE_PHOTO_ORIGIN || server.origin;
const browser = await chromium.launch();
const results = [], errors = [];
const overflow = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow: ${page.url()}`);
const images = async (page, selector) => {
  const items = page.locator(selector);
  for (const item of await items.all()) {
    await item.scrollIntoViewIfNeeded();
    await item.evaluate((img) => img.decode());
    assert.ok(await item.evaluate((img) => img.naturalWidth > 0 && img.complete), 'image decoded');
  }
};
try {
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 860 }, deviceScaleFactor: width === 390 ? 2 : 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.photoCLS = 0;
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.photoCLS += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    page.on('pageerror', (e) => errors.push(`${width}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('cloudflareinsights')) errors.push(`${width}: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/encomenda/exemplos/')) errors.push(`${width}: ${r.status()} ${r.url()}`); });
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00-03:00'));
    await page.goto(`${origin}/demo/`, { waitUntil: 'networkidle' });
    await page.locator('#today-title').waitFor();
    const agendaCLS = await page.evaluate(() => window.photoCLS);
    assert.match(await page.title(), /Doce Agenda/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')));
    assert.equal(saved.orderPage.products.filter((p) => p.photo?.endsWith('.webp')).length, 16);
    assert.equal(saved.orderPage.logo, 'exemplo/logo-doces-da-lu-960.webp');
    await images(page, '#view-today .vn-thumb');
    const pistache = page.locator('[data-open-order="DEMO-07"]').first();
    assert.match(await pistache.locator('img').getAttribute('src'), /bolo-pistache/);
    await overflow(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `agenda-${width}.png`), fullPage: true });
    await pistache.click();
    await page.locator('#detail-dialog[open]').waitFor();
    await images(page, '#detail-dialog .detail-photo');
    assert.match(await page.locator('#detail-dialog .detail-photo').getAttribute('src'), /bolo-pistache/);
    await page.screenshot({ path: path.join(output, `ficha-${width}.png`) });
    await page.keyboard.press('Escape');
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2'))), saved, 'reload preserves all demo state');

    await page.locator('[data-view="settings"]:visible').first().click();
    const section = page.locator('details:has(#order-page-form)').first();
    if (!(await section.evaluate((el) => el.open))) await section.locator('summary').first().click();
    await page.locator('#order-page-form [data-action="preview-link"]').click();
    const frame = await (await page.locator('#link-preview-dialog iframe').elementHandle()).contentFrame();
    assert.ok(frame, 'preview opened');
    await frame.waitForURL(/\/encomenda\//);
    await frame.locator('.card').first().waitFor();
    await images(frame, '.card img, .cover img, .logo img');
    assert.equal(await frame.locator('.card.is-text').count(), 0, 'every demo product has its own photo');
    assert.match(await frame.locator('.logo img').getAttribute('src'), /logo-doces-da-lu-960\.webp$/);
    for (const product of saved.orderPage.products.filter((p) => p.photo?.endsWith('.webp'))) {
      const card = frame.locator('.card', { has: frame.locator('h3', { hasText: product.name }) }).first();
      assert.ok((await card.locator('img').getAttribute('src')).endsWith(product.photo.slice(8)), product.name);
    }
    await overflow(frame);
    await frame.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `vitrine-${width}.png`), fullPage: false });
    for (const name of ['Bolo de pote', 'Beijinho (cento)', 'Torta de limão', 'Pudim de leite']) {
      const card = frame.locator('.card', { has: frame.getByRole('heading', { name, exact: true }) });
      await card.click();
      await frame.locator('#product-sheet[open]').waitFor();
      assert.equal(await frame.locator('#sheet-title').innerText(), name);
      await images(frame, '#sheet-photo img');
      if (width === 360) await page.screenshot({ path: path.join(output, `produto-${name.split(' ')[0].toLowerCase()}-${width}.png`) });
      await page.keyboard.press('Escape');
      await frame.waitForFunction(() => !document.querySelector('#product-sheet').open);
    }
    await frame.locator('.card').filter({ hasText: 'Bolo de pistache' }).click();
    await frame.locator('#product-sheet[open]').waitFor();
    await images(frame, '#product-sheet img');
    if (width === 390) assert.match(await frame.locator('#sheet-photo img').evaluate((img) => img.currentSrc), /-960\.webp$/, 'retina sheet chooses a sufficiently large image');
    await frame.locator('#sheet-order').click();
    await frame.locator('[data-next="2"]').click();
    await frame.locator('.step[data-step="2"]:not([hidden])').waitFor();
    await frame.locator('#quick-dates button').first().click();
    await frame.locator('#time').fill('15:00');
    await frame.locator('[data-next="3"]').click();
    await frame.locator('#client').fill('Pessoa fictícia');
    await frame.locator('#contact').fill('11900000000');
    await frame.locator('#consent').check();
    await frame.locator('#send').click();
    await frame.locator('#confirmation:not([hidden])').waitFor();
    assert.match(await frame.locator('#summary').innerText(), /prévia|não foi enviado/i);
    await page.locator('[data-close-preview]').click();
    if (width === 360) {
      // Round trip through the same browser store used by the UI, without network account access.
      const restored = await page.evaluate(async () => {
        const backup = await (await window.DoceStore.fetch('/api/export')).json();
        const response = await window.DoceStore.fetch('/api/import', { method: 'POST', body: JSON.stringify(backup) });
        return { status: response.status, backup, restored: JSON.parse(localStorage.getItem('doce-agenda.demo.v2')) };
      });
      assert.equal(restored.status, 200);
      assert.deepEqual(restored.restored.orderPage, restored.backup.orderPage);
      await page.evaluate(() => { const key = 'doce-agenda.demo.v2', s = JSON.parse(localStorage.getItem(key)); s.orderPage.displayName = 'Teste persistente'; localStorage.setItem(key, JSON.stringify(s)); });
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).orderPage.displayName), 'Teste persistente');
      page.once('dialog', (dialog) => dialog.accept());
      await page.locator('#demo-reset').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2'))?.orderPage.displayName === 'Doces da Lu');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).orderPage.logo), 'exemplo/logo-doces-da-lu-960.webp');
    }
    await page.goto(origin, { waitUntil: 'networkidle' });
    await overflow(page);
    assert.ok(await page.locator('main').innerText());
    results.push({ width, agenda: 'pass', detail: 'pass', catalogPhotos: 16, logo: 'pass', additionalProductSheets: 4, previewJourney: 'pass', persistence: 'pass', landing: 'pass', agendaCLS });
    await context.close();
  }
  const manifest = JSON.parse(await readFile('assets/demo-fotografias/manifest.json', 'utf8'));
  let assetResponses = 0;
  const request = await browser.newContext();
  for (const item of manifest.filter((x) => x.application !== 'reserva-editorial-ficticia')) {
    for (const variant of item.variants) {
      const response = await request.request.get(origin + '/encomenda/exemplos/' + path.basename(variant.file));
      assert.equal(response.status(), 200, variant.file);
      assert.match(response.headers()['content-type'], /image\/webp/);
      assert.equal((await response.body()).length, variant.bytes);
      assetResponses++;
    }
  }
  await request.close();
  // A real catalog fixture never inherits seed photos, even for names and IDs matching the demo.
  const real = [{ name: 'Bolo de pistache', photo: 'a'.repeat(32) + '/12345678-1234-1234-1234-123456789abc.webp' }];
  const order = demoSeedState().orders.find((o) => o.id === 'DEMO-07');
  assert.equal(demoOrderPhoto(order, [], false), '');
  assert.equal(demoOrderPhoto(order, real, false), real[0].photo);
  assert.deepEqual(errors, []);
  assert.equal(assetResponses, 54);
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ origin, results, assetResponses, errors, accountIsolation: 'fixture only; no real account accessed' }, null, 2));
  console.log(JSON.stringify({ origin, results, assetResponses, errors }, null, 2));
} finally { await browser.close(); server?.close(); }
