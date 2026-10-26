// Um número só (simplificação, etapa 1): node scripts/build-cloudflare.mjs && node scripts/test-um-numero.mjs [pasta-de-capturas]
// O selo da Agenda, o aviso do topo e "Pedem sua atenção" contam a mesma coisa e mudam juntos.
// Pedidos não tem mais selo próprio; o topo não repete "sem sinal". Só a demo local.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite();
const browser = await chromium.launch();
const results = [];

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/`);
    await page.locator('#today-title').waitFor();

    const badge = page.locator('.nav-item[data-view="today"]:visible #nav-attention-count');
    const heading = () => page.locator('#attention-title .vn-count').innerText();
    const chip = page.locator('#view-today .vn-att-jump');
    const check = async () => {
      const n = await heading();
      assert.equal(await badge.innerText(), n, 'selo da Agenda = lista');
      assert.equal(await badge.getAttribute('aria-label'), `${n} ${n === '1' ? 'pede' : 'pedem'} sua atenção`);
      if (width < 1001) assert.equal(await chip.innerText(), `${n} ${n === '1' ? 'pede' : 'pedem'} sua atenção`, 'aviso do topo = lista');
      else assert.equal(await chip.count(), 0, 'no computador a lista já está ao lado: sem aviso no topo');
      return Number(n);
    };
    const before = await check();
    assert.ok(before > 0, 'a demo começa com pendências');
    assert.equal(await page.locator('.nav-item[data-view="orders"] .nav-count').count(), 0, 'Pedidos sem selo próprio');
    // O bundle anterior ainda escreve neste elemento. Mesmo desocultando o filho, o selo legado não aparece.
    await page.evaluate(() => {
      const legacy = document.querySelector('#nav-order-count');
      legacy.textContent = '2'; legacy.hidden = false; legacy.setAttribute('aria-label', '2 pedidos precisam de você');
    });
    assert.equal(await page.locator('#nav-order-count').isVisible(), false, 'selo legado continua invisível para JavaScript em cache');
    assert.doesNotMatch(await page.locator('#view-today .vn-heading').innerText(), /sem sinal/, 'o topo não repete "sem sinal"');
    if (shots) await page.screenshot({ path: path.join(shots, `um-numero-${width}.png`) });

    // Conferir o Pix informado tira uma pendência: os três números caem juntos.
    await page.locator('#view-today .vn-att-row.is-pix [data-open-order]').first().click();
    await page.locator('#detail-dialog[open] [data-action="confirm-payment"]').click();
    await page.locator('#toast').filter({ hasText: 'conferido' }).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#detail-dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
    assert.equal(await check(), before - 1, 'conferir o Pix diminui o número em todo lugar');

    // Fora da Agenda, o selo continua à vista na barra.
    await page.locator('.nav-item[data-view="month"]:visible').first().click();
    await page.locator('#month-title').waitFor();
    assert.equal(await badge.innerText(), String(before - 1));

    assert.deepEqual(errors, []);
    results.push(`${width}px: selo da Agenda, aviso e lista com o mesmo número, caem juntos ao conferir o Pix`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
