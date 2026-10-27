// Clientes: node scripts/build-cloudflare.mjs && node scripts/test-clients.mjs [pasta-de-capturas]
// Na demonstração: lista com datas que se repetem, busca, filtro "Faz tempo", ficha com pedidos,
// sugestão de mesmo nome sem juntar, e apagar dados de uma cliente mantendo valores.
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
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`${origin}/demo/completa/`);
    await page.locator('#today-title').waitFor();
    await page.locator('.nav-item[data-view="clients"]').click();
    await page.locator('#clients-title').waitFor();
    const panel = page.locator('#view-clients');
    await panel.locator('.client-row').first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);

    // Data que se repete: o aniversário da Ana Clara volta em 20 dias.
    assert.match(await panel.locator('.client-reminders').innerText(), /Ana Clara[\s\S]*Bolo de aniversário \(2 kg\)[\s\S]*faltam 20 dias/);
    assert.match(await panel.locator('.client-row', { hasText: 'Paula' }).first().innerText(), /\(11\) 90000-0102 · 3 pedidos · R\$\s250,00/);
    if (shots) await page.screenshot({ path: path.join(shots, `clientes-${width}.png`), fullPage: true });

    // Busca por nome e por WhatsApp.
    await panel.locator('#clients-search').fill('paula');
    assert.equal(await panel.locator('.client-row').count(), 2, 'Paula com e sem WhatsApp, separadas');
    await panel.locator('#clients-search').fill('0115');
    assert.match(await panel.locator('.client-row').innerText(), /Helena/);
    await panel.locator('#clients-search').fill('');

    // Filtro: quem faz tempo que não pede.
    await panel.locator('[data-clients-filter="away"]').click();
    const away = await panel.locator('.client-row').allInnerTexts();
    assert.ok(away.length >= 1 && away.every((text) => /Faz \d+ dias que não pede/.test(text)), away.join(' | '));
    assert.ok(away.some((text) => /Helena/.test(text)));

    // Ficha da Helena: números, aviso e pedidos que abrem o detalhe.
    await panel.locator('.client-row', { hasText: 'Helena' }).click();
    const ficha = page.locator('#client-dialog[open]');
    await ficha.waitFor();
    assert.match(await ficha.locator('.client-tiles').innerText(), /Pedidos\s+2[\s\S]*Total\s+R\$\s200,00/);
    assert.match(await ficha.innerText(), /Faz 120 dias que ela não pede/);
    assert.equal(await ficha.locator('a[href^="https://wa.me/"]').count(), 0, 'demo nunca abre WhatsApp de telefone inventado');
    assert.equal(await ficha.locator('.client-demo-note').count(), 1);
    if (shots) await page.screenshot({ path: path.join(shots, `ficha-${width}.png`) });
    await ficha.locator('.vn-line').first().click();
    await page.locator('#detail-dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    await ficha.waitFor();

    // Apagar dados: a ficha some, os pedidos ficam com valores.
    await ficha.locator('[data-action="erase-client"]').click();
    await page.locator('#toast').filter({ hasText: 'Dados apagados de 2 pedidos' }).waitFor();
    await panel.locator('[data-clients-filter="all"]').click();
    await panel.locator('.client-row').first().waitFor();
    assert.equal(await panel.locator('.client-row', { hasText: 'Helena' }).count(), 0);
    assert.match(await panel.locator('.client-row', { hasText: 'Cliente removida' }).innerText(), /Sem WhatsApp · 2 pedidos · R\$\s200,00/);

    // Mesmo nome sem WhatsApp: sugestão, sem juntar.
    await panel.locator('.client-row', { hasText: 'Sem WhatsApp' }).filter({ hasText: 'Paula' }).click();
    assert.match(await ficha.innerText(), /Pode ser a mesma pessoa que Paula · \(11\) 90000-0102/);
    await ficha.locator('[data-close="client-dialog"]').click();

    // A barra de baixo do celular cabe as 5 abas.
    if (width === 360) {
      const labels = await page.locator('.main-nav .nav-item').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
      assert.equal(labels.length, 5);
      assert.ok(labels.every((size) => size >= 60), `abas com largura de toque: ${labels}`);
    }
    assert.deepEqual(errors, []);
    await context.close();
    results.push(`${width}px: lista, data que se repete, busca, filtro, ficha, apagar dados e sugestão de mesmo nome`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
