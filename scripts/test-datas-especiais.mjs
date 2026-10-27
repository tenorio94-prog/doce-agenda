// Datas especiais: node scripts/build-cloudflare.mjs && node scripts/test-datas-especiais.mjs
// Em Ajustes, "Datas especiais" cria um período (Páscoa) com limite de pedidos por doce. O formulário de pedido
// mostra o uso do limite; passou dele, confirmar pede o motivo. Remover tem Desfazer; salvar Dias e limites mantém.
import assert from 'node:assert/strict';
import { chromium, serveSite } from './lib/browser-test.mjs';

const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const spToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const day = (offset) => { const d = new Date(`${spToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')));

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${server.origin}/demo/completa/`);
    await page.locator('#today-title').waitFor();

    // 1. Ajustes: Páscoa, de daqui a 30 a 34 dias, ovo de colher até 1 pedido.
    await page.locator('[data-view="settings"]:visible').first().click();
    const card = page.locator('.settings-card[data-settings="special"]');
    await card.locator('summary').first().click();
    const form = card.locator('#special-date-form');
    await form.locator('button[type="submit"]').click();
    assert.match(await card.locator('#special-date-error').innerText(), /nome/);
    await form.locator('[name=name]').fill('Páscoa');
    await form.locator('[name=from]').fill(day(30));
    await form.locator('[name=to]').fill(day(34));
    await form.locator('[name=product]').first().fill('Ovo de colher');
    await form.locator('[name=max]').first().fill('1');
    await form.locator('button[type="submit"]').click();
    await page.locator('#toast').filter({ hasText: 'Páscoa salva' }).waitFor();
    const list = page.locator('.settings-card[data-settings="special"] .special-list');
    assert.match(await list.innerText(), /Páscoa[\s\S]*Ovo de colher: 0 de 1 combinados/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);

    // 2. Pedido: o aviso da data mostra o limite do doce; o segundo pede o motivo.
    const newOrder = async (client) => {
      await page.locator('[data-action="new-order"]:visible').first().click();
      await page.locator('#order-dialog[open]').waitFor();
      await page.waitForTimeout(150);
      await page.locator('wa-input[name="client"] input').fill(client);
      await page.locator('wa-input[name="product"] input').fill('Ovo de colher');
      await page.locator('wa-input[name="dueDate"] input').fill(day(32));
      await page.locator('wa-input[name="dueTime"] input').fill('10:00');
      await page.locator('#status-choice input[value="Confirmado"]').check();
    };
    await newOrder('Primeira Páscoa');
    assert.match(await page.locator('#due-note').innerText(), /Páscoa: 0 de 1 Ovo de colher combinados\./);
    await page.locator('#save-order-button').click();
    await page.locator('#order-dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
    await newOrder('Segunda Páscoa');
    assert.match(await page.locator('#due-note').innerText(), /Páscoa: 1 de 1 Ovo de colher combinados, limite atingido\. Para confirmar, você vai anotar o motivo/);
    await page.locator('#save-order-button').click();
    await page.locator('#capacity-override-box:not([hidden])').waitFor();
    assert.match(await page.locator('#order-form-error').innerText(), /Páscoa: o único pedido de Ovo de colher já foi combinado/);
    await page.locator('#capacity-override-box textarea, #capacity-override-box input, #capacity-override-box wa-textarea textarea, #capacity-override-box wa-input input').first().fill('Cliente de sempre');
    await page.locator('#save-order-button').click();
    await page.locator('#order-dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
    assert.equal((await stored(page)).orders.filter((order) => order.product === 'Ovo de colher').length, 2, 'exceção salva com motivo');

    // 3. Salvar Dias e limites não apaga; remover tem Desfazer.
    await page.locator('[data-view="settings"]:visible').first().click();
    await page.locator('.settings-card[data-settings="days"] > summary').click();
    await page.locator('#availability-form [type="submit"]').first().click();
    await page.waitForTimeout(400);
    assert.equal((await stored(page)).availability.specialDates.length, 1, 'Dias e limites mantém as datas especiais');
    await page.locator('.settings-card[data-settings="special"] [data-action="remove-special"]').click();
    await page.locator('#toast').filter({ hasText: 'Páscoa removida' }).waitFor();
    assert.equal((await stored(page)).availability.specialDates.length, 0);
    await page.locator('#toast button').filter({ hasText: 'Desfazer' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('doce-agenda.demo.v2')).availability.specialDates.length === 1);
    await page.locator('.settings-card[data-settings="special"] .special-use.is-full').waitFor();
    assert.match(await page.locator('.settings-card[data-settings="special"] .special-list').innerText(), /Ovo de colher: 2 de 1 combinados/);
    assert.deepEqual(errors, []);
    results.push(`${width}px: Páscoa criada em Ajustes; limite do doce no aviso da data; exceção com motivo; Dias e limites mantém; remover com Desfazer`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
