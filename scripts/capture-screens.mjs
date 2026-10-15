// Before/after screenshots to prove a refactor changed nothing visible.
//   node scripts/build-cloudflare.mjs && node scripts/capture-screens.mjs <pasta>   (captura)
//   node scripts/capture-screens.mjs --compare <pasta-antes> <pasta-depois>        (compara)
// Fixed clock, reduced motion and the demonstration's own data: the same build gives the same images.
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite } from './lib/browser-test.mjs';

const [mode, ...args] = process.argv.slice(2);
if (mode === '--compare') {
  const [before, after] = args.map((dir) => path.resolve(dir));
  const names = [...new Set([...await readdir(before), ...await readdir(after)])].sort();
  const changed = [];
  for (const name of names) {
    const [a, b] = await Promise.all([before, after].map((dir) => readFile(path.join(dir, name)).catch(() => null)));
    if (!a || !b || !a.equals(b)) changed.push(name);
  }
  console.log(JSON.stringify({ compared: names.length, changed }, null, 2));
  process.exit(changed.length ? 1 : 0);
}
if (!mode) throw new Error('Informe a pasta das capturas.');

const out = path.resolve(mode);
await mkdir(out, { recursive: true });
const demoView = (view, ready) => async (page) => {
  await page.locator(`[data-view="${view}"]:visible`).first().click();
  await page.locator(ready).waitFor();
};
// [nome, endereço, ação opcional depois de abrir]
const screens = [
  ['landing', '/'], ['cadastro', '/cadastro/'], ['privacidade', '/privacidade/'], ['previa-link', '/encomenda/?preview=1'],
  ['demo-agenda', '/demo/', (page) => page.locator('#today-title').waitFor()],
  ['demo-pedidos', '/demo/', demoView('orders', '#orders-title')],
  ['demo-mes', '/demo/', demoView('month', '#month-title')],
  ['demo-ajustes', '/demo/', demoView('settings', '#settings-title')],
  ['demo-pedido', '/demo/', async (page) => {
    await page.locator('[data-open-order]').first().click();
    await page.locator('dialog[open]').waitFor();
  }],
  ['demo-novo', '/demo/', async (page) => {
    await page.locator('[data-action="new-order"]:visible').first().click();
    await page.locator('#order-dialog[open]').waitFor();
  }],
];

const server = await serveSite();
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [360, 1280]) {
    for (const [name, url, action] of screens) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.addInitScript(() => localStorage.setItem('doce-agenda.tour.v1', '1'));
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`${name}@${width}: ${error.message}`));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}@${width}: ${message.text()}`); });
      await page.clock.setFixedTime(new Date('2026-10-15T12:00:00-03:00'));
      await page.goto(server.origin + url, { waitUntil: 'networkidle' });
      if (action) await action(page);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) errors.push(`${name}@${width}: rolagem lateral`);
      await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true, animations: 'disabled' });
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ folder: out, screens: screens.length * 2, errors }, null, 2));
if (errors.length) process.exit(1);
