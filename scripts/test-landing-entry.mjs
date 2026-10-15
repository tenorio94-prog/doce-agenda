// Entrada na demo pela landing: node scripts/build-cloudflare.mjs && node scripts/test-landing-entry.mjs [pasta-de-capturas]
// Quem chega por /demo/?de=landing não vê os stories e recebe o convite para revisar a solicitação de exemplo.
// Quem abre /demo/ direto continua vendo os stories na primeira visita.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite(root);
const { origin } = server;
const browser = await chromium.launch();
const results = [];
try {
  // A landing aponta para a entrada com o aviso.
  {
    const page = await browser.newPage();
    await page.goto(`${origin}/`);
    const hrefs = await page.locator('.btn-cta').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
    assert.ok(hrefs.length >= 2 && hrefs.every((href) => href === '/demo/?de=landing'), `botões da landing: ${hrefs}`);
    await page.close();
    results.push('landing aponta para /demo/?de=landing');
  }

  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    // Vindo da landing: sem stories, com convite, endereço limpo.
    await page.goto(`${origin}/demo/?de=landing`);
    await page.locator('#today-title').waitFor();
    const invite = page.locator('#view-today .landing-invite');
    await invite.waitFor();
    assert.equal(await page.locator('.story-overlay').count(), 0, 'stories não abrem vindo da landing');
    assert.match(await invite.innerText(), /Camila pediu Bolo de aniversário pelo seu link/);
    assert.equal(new URL(page.url()).search, '', 'o aviso sai do endereço');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `convite-${width}.png`), fullPage: false });

    // Revisar abre a solicitação com os botões de decisão; o convite dá lugar à faixa normal.
    await invite.locator('[data-action="review-request"]').click();
    await page.locator('#detail-dialog[open] [data-action="accept-request"]').first().waitFor();
    if (shots) await page.screenshot({ path: path.join(shots, `revisao-${width}.png`), fullPage: false });
    assert.equal(await page.locator('#view-today .landing-invite').count(), 0, 'convite some depois de usado');
    assert.equal(await page.locator('#view-today .request-banner').count(), 1, 'faixa normal da solicitação volta');
    await context.close();

    // Entrada direta (mesmo aparelho novo): os stories continuam abrindo.
    const direct = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const directPage = await direct.newPage();
    directPage.on('pageerror', (error) => errors.push(String(error)));
    await directPage.goto(`${origin}/demo/`);
    await directPage.locator('.story-overlay').waitFor();
    assert.equal(await directPage.locator('.landing-invite').count(), 0, 'sem convite na entrada direta');
    await direct.close();

    assert.deepEqual(errors, []);
    results.push(`${width}px: convite sem stories, revisão abre, entrada direta com stories`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
