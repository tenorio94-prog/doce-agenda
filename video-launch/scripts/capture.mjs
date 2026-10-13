import { chromium } from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../server.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const launchDir = resolve(scriptDir, '..');
const dataDir = join(launchDir, 'demo-data');
const outputDir = join(launchDir, 'public', 'ui');
const baseUrl = 'http://localhost:4174';
const dueAt = '2026-10-01T16:00';
const fixture = { version: 1, orders: [], payments: [] };

await mkdir(dataDir, { recursive: true });
await mkdir(outputDir, { recursive: true });
await writeFile(join(dataDir, 'state.json'), JSON.stringify(fixture, null, 2), 'utf8');

const server = await createApp({ dataDir });
await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(4174, '127.0.0.1', resolveListen);
});

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});
const metrics = {
  capturedAt: new Date().toISOString(),
  app: baseUrl,
  viewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
  screenshots: {},
};

async function boxFor(locator) {
  if (await locator.count() === 0) return null;
  const box = await locator.first().boundingBox();
  if (!box) return null;
  return {
    x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height),
    centerX: round(box.x + box.width / 2), centerY: round(box.y + box.height / 2),
  };
}

function round(value) { return Math.round(value * 100) / 100; }

async function imageDimensions(path) {
  const png = await readFile(path);
  if (png.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Arquivo não é PNG: ${path}`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length };
}

async function capturePage(name, selectors) {
  const path = join(outputDir, name);
  await page.screenshot({ path, animations: 'disabled', caret: 'hide' });
  const elements = {};
  for (const [key, selector] of Object.entries(selectors)) elements[key] = await boxFor(page.locator(selector));
  metrics.screenshots[name] = {
    dimensions: await imageDimensions(path),
    cssDimensions: { width: 1280, height: 900 },
    crop: { type: 'viewport', x: 0, y: 0 },
    elements,
  };
}

async function captureDialog(name, dialogSelector, selectors) {
  const path = join(outputDir, name);
  const dialog = page.locator(dialogSelector);
  await dialog.waitFor({ state: 'visible' });
  const origin = await dialog.boundingBox();
  if (!origin) throw new Error(`Não encontrei a caixa do diálogo ${dialogSelector}`);
  await dialog.screenshot({ path, animations: 'disabled', caret: 'hide' });
  const elements = {};
  for (const [key, selector] of Object.entries(selectors)) {
    const screenBox = await boxFor(page.locator(selector));
    elements[key] = screenBox ? {
      ...screenBox,
      screenshotX: round(screenBox.x - origin.x),
      screenshotY: round(screenBox.y - origin.y),
    } : null;
  }
  metrics.screenshots[name] = {
    dimensions: await imageDimensions(path),
    cssDimensions: { width: round(origin.width), height: round(origin.height) },
    crop: { type: 'dialog', selector: dialogSelector, x: round(origin.x), y: round(origin.y) },
    elements,
  };
}

async function captureFormTop() {
  const dialog = page.locator('#order-dialog');
  const dialogBox = await dialog.boundingBox();
  const totalBox = await page.locator('#order-form [name="total"]').boundingBox();
  if (!dialogBox || !totalBox) throw new Error('Não encontrei os campos da captura inicial do formulário.');
  const clip = {
    x: Math.round(dialogBox.x), y: Math.round(dialogBox.y), width: Math.round(dialogBox.width),
    height: Math.round(totalBox.y + totalBox.height - dialogBox.y + 20),
  };
  const path = join(outputDir, 'form-top.png');
  await page.screenshot({ path, clip, animations: 'disabled', caret: 'hide' });
  const elements = {};
  for (const [key, selector] of Object.entries({
    title: '#order-dialog-title', client: '#order-form [name="client"]', product: '#order-form [name="product"]',
    dueAt: '#order-form [name="dueAt"]', total: '#order-form [name="total"]',
  })) {
    const screenBox = await boxFor(page.locator(selector));
    elements[key] = screenBox ? {
      ...screenBox, screenshotX: round(screenBox.x - clip.x), screenshotY: round(screenBox.y - clip.y),
    } : null;
  }
  metrics.screenshots['form-top.png'] = {
    dimensions: await imageDimensions(path),
    cssDimensions: { width: clip.width, height: clip.height },
    crop: { type: 'dialog-top-region', selector: '#order-dialog', x: clip.x, y: clip.y },
    elements,
  };
}

async function waitForApp() {
  await page.locator('#connection.is-online').waitFor({ state: 'visible', timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
}

try {
  const response = await page.request.get(`${baseUrl}/api/state`);
  if (!response.ok()) throw new Error(`A API isolada respondeu ${response.status()}.`);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForApp();

  await page.locator('[data-action="new-order"]').first().click();
  await page.locator('#order-dialog[open]').waitFor({ state: 'visible' });
  await page.locator('#order-form [name="client"]').fill('Marina · exemplo fictício');
  await page.locator('#order-form [name="product"]').fill('Bolo de chocolate · 1,5 kg');
  await page.locator('#order-form [name="details"]').fill('Cobertura rosa e nome na decoração. Dados fictícios para conhecer a aplicação.');
  await page.locator('#order-form [name="dueAt"]').fill(dueAt);
  await page.locator('#order-form [name="mode"]').selectOption('Retirada');
  await page.locator('#order-form [name="total"]').fill('150');
  await page.locator('#order-form [name="status"]').selectOption('Confirmado');
  await page.locator('#order-form [name="nextAction"]').fill('Confirmar detalhes da decoração');
  await page.locator('#order-form [name="nextAction"]').evaluate((element) => element.blur());
  await page.waitForTimeout(250);
  await captureDialog('form.png', '#order-dialog', {
    title: '#order-dialog-title', client: '#order-form [name="client"]', product: '#order-form [name="product"]',
    details: '#order-form [name="details"]', dueAt: '#order-form [name="dueAt"]', total: '#order-form [name="total"]',
    status: '#order-form [name="status"]', save: '#save-order-button',
  });
  await captureFormTop();
  await page.locator('#order-dialog').evaluate((dialog) => { dialog.scrollTop = dialog.scrollHeight; });
  await page.waitForTimeout(150);
  await captureDialog('form-bottom.png', '#order-dialog', {
    dueAt: '#order-form [name="nextAt"]', contact: '#order-form [name="contact"]',
    pendingChange: '#order-form [name="pendingChange"]', cancel: '#order-dialog .dialog-actions .button-quiet', save: '#save-order-button',
  });

  await page.locator('#save-order-button').click();
  await page.locator('#order-dialog').waitFor({ state: 'hidden' });
  await page.locator('#view-today .coming-soon .order-row').waitFor({ state: 'visible' });
  const order = (await (await page.request.get(`${baseUrl}/api/state`)).json()).orders[0];
  if (!order || order.dueAt !== dueAt || order.status !== 'Confirmado') throw new Error('O pedido de demonstração não foi salvo com a data/status esperados.');
  const rowSelector = '#view-today .coming-soon .order-row';
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await page.waitForTimeout(150);
  await capturePage('order.png', {
    heading: '#view-today h1', upcomingHeading: '#view-today .coming-soon h2', orderCard: '#view-today .coming-soon .order-row',
    orderClient: '#view-today .coming-soon .row-client', orderStatus: '#view-today .coming-soon .status-pill',
  });

  await page.locator(rowSelector).click();
  await page.locator('#detail-dialog[open]').waitFor({ state: 'visible' });
  await page.locator('#detail-dialog').getByText('Nenhum pagamento registrado.').waitFor({ state: 'visible' });
  await captureDialog('detail-empty.png', '#detail-dialog', {
    title: '#detail-title', status: '#detail-dialog .status-pill', date: '#detail-dialog .detail-meta-line',
    agreedDetails: '#detail-dialog .detail-summary', total: '#detail-dialog .detail-split .detail-tile:first-child',
    noPayments: '#detail-dialog .detail-empty', history: '#detail-dialog .history-list',
  });

  await page.locator('#detail-dialog [data-action="add-payment"]').click();
  await page.locator('#payment-dialog[open]').waitFor({ state: 'visible' });
  await page.locator('#payment-form [name="amount"]').fill('50');
  await page.locator('#payment-form [name="status"]').selectOption('Informado');
  await page.locator('#payment-form [name="note"]').fill('Sinal via Pix · exemplo fictício');
  await page.locator('#save-payment-button').click();
  await page.locator('#payment-dialog').waitFor({ state: 'hidden' });
  await page.locator('#detail-dialog .payment-item').waitFor({ state: 'visible' });
  await page.locator('#detail-dialog').getByText('Informado', { exact: true }).waitFor({ state: 'visible' });
  await captureDialog('detail-informed.png', '#detail-dialog', {
    title: '#detail-title', total: '#detail-dialog .detail-split .detail-tile:first-child',
    balance: '#detail-dialog .detail-split .detail-tile:nth-child(2)', payment: '#detail-dialog .payment-item',
    paymentStatus: '#detail-dialog .payment-status', history: '#detail-dialog .history-list',
  });

  await page.locator('#detail-dialog [data-action="confirm-payment"]').click();
  await page.locator('#detail-dialog .payment-status').getByText('Conferido', { exact: true }).waitFor({ state: 'visible' });
  await page.locator('#detail-dialog .detail-split .detail-tile:nth-child(2)').getByText('R$ 100,00').waitFor({ state: 'visible' });
  await captureDialog('detail-confirmed.png', '#detail-dialog', {
    title: '#detail-title', status: '#detail-dialog .status-pill', balance: '#detail-dialog .detail-split .detail-tile:nth-child(2)',
    payment: '#detail-dialog .payment-item', paymentStatus: '#detail-dialog .payment-status', history: '#detail-dialog .history-list',
  });

  await page.locator('#detail-dialog [data-close]').click();
  await page.locator('.nav-item[data-view="week"]').click();
  await page.locator('#view-week h1').waitFor({ state: 'visible' });
  for (let i = 0; i < 54 && !(await page.locator(`#view-week [data-select-day="${dueAt.slice(0, 10)}"]`).count()); i++) {
    const firstDay = await page.locator('#view-week .day-button').first().getAttribute('data-select-day');
    const targetIsLater = firstDay < dueAt.slice(0, 10);
    await page.locator(`[data-week-shift="${targetIsLater ? '1' : '-1'}"]`).click();
  }
  const targetDay = page.locator(`#view-week [data-select-day="${dueAt.slice(0, 10)}"]`);
  await targetDay.waitFor({ state: 'visible' });
  await targetDay.click();
  await page.locator(`#view-week [data-open-order="${order.id}"]`).waitFor({ state: 'visible' });
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await page.waitForTimeout(150);
  await capturePage('week.png', {
    heading: '#view-week h1', weekRange: '#view-week .week-range', selectedDay: `#view-week [data-select-day="${dueAt.slice(0, 10)}"]`,
    agendaDate: '#view-week .agenda-date', orderCard: '#view-week .order-row', orderStatus: '#view-week .status-pill',
  });

  await writeFile(join(outputDir, 'metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(metrics.screenshots).map(([name, info]) => [name, info.dimensions])), null, 2));
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  await rm(join(dataDir, 'state.json'), { force: true });
}
