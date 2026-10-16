// Refaz as telas do app que aparecem nos celulares da landing, a partir da demonstração:
//   node scripts/build-cloudflare.mjs && node scripts/capture-landing-phones.mjs
// Relógio fixo em 15/10/2026 (semana de 12 a 18), 375 px com densidade 2 (750×1624), sem a faixa da
// demonstração nem avisos. Rodar de novo sempre que a Agenda ou o formulário mudarem de visual.
import path from 'node:path';
import { chromium, serveSite, siteRoot } from './lib/browser-test.mjs';

const out = path.resolve(path.dirname(siteRoot), '..', 'public', 'landing', 'assets');
const server = await serveSite();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
await context.addInitScript(() => {
  localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] }));
  localStorage.setItem('doce-agenda.tips.v1', JSON.stringify({ orders: true, month: true, settings: true, clients: true }));
});
const page = await context.newPage();
await page.clock.install({ time: new Date('2026-10-15T09:00:00-03:00') });
const clean = () => page.addStyleTag({ content: '#demo-bar,#view-today .request-banner,.main-nav{display:none!important}' });

await page.goto(server.origin + '/demo/');
await page.locator('#today-title').waitFor();
await clean();
await page.evaluate(() => document.fonts.ready);
// Começa no mês: semana, resumo do dia e o primeiro pedido cabem na tela do celular.
await page.evaluate(() => window.scrollTo(0, document.querySelector('.vn-month-row').getBoundingClientRect().top + window.scrollY - 16));
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(out, 'app-agenda.jpg'), type: 'jpeg', quality: 82 });

await page.evaluate(() => document.querySelector('.nav-new-order').click());
await page.locator('#order-dialog[open]').waitFor();
const field = (name) => page.locator(`#order-form [name="${name}"]`);
await field('client').locator('input').fill('Juliana');
await field('product').locator('input').fill('Bolo de morango 2 kg');
await page.locator('#order-form .optional-fields > summary').click();
await field('details').locator('textarea').fill('Recheio de ninho com morango, topo com "Feliz aniversário, Bia".');
await field('dueDate').locator('input').fill('2026-10-16');
await field('dueTime').locator('input').fill('15:00');
await page.evaluate(() => document.activeElement?.blur());
await page.locator('#order-dialog').evaluate((dialog) => { dialog.scrollTop = 0; });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, 'passo-1-novo.jpg'), type: 'jpeg', quality: 82 });

await browser.close();
server.close();
console.log('Telas da landing refeitas em public/landing/assets/ (app-agenda.jpg, passo-1-novo.jpg).');
