// Boas-vindas: node scripts/build-cloudflare.mjs && node scripts/test-onboarding.mjs [pasta-de-capturas]
// Demonstração: "Experimente em 1 minuto" com 4 tarefas feitas na tela de verdade, Pular e "Como funciona".
// Conta nova: "Primeiros passos" com 3 tarefas. Dicas de uma frase nas abas, que somem ao fechar.
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
const count = (page) => page.locator('#view-today .onboarding-count').innerText();
const closeDetail = async (page) => { await page.keyboard.press('Escape'); await page.locator('#detail-dialog[open]').waitFor({ state: 'detached' }).catch(() => {}); };

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/demo/`);
    const card = page.locator('#view-today .onboarding');
    await card.waitFor();
    assert.equal(await page.locator('.story-overlay').count(), 0, 'sem stories');
    assert.match(await card.innerText(), /Experimente em 1 minuto/);
    assert.equal(await count(page), '0 de 4 feitas');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `demo-inicio-${width}.png`) });

    // 1. Pedido do link: o botão leva ao cartão do pedido e realça "Revisar pedido".
    await card.locator('[data-task="request"]').click();
    await page.locator('#view-today .request-banner .button.coach-target').waitFor();
    if (shots) await page.screenshot({ path: path.join(shots, `demo-realce-${width}.png`) });
    await page.locator('#view-today .request-banner .button').click();
    await page.locator('#detail-dialog[open] [data-action="accept-request"][data-status="Confirmado"]').click();
    await page.locator('#toast').filter({ hasText: 'aceita' }).waitFor();
    await closeDetail(page);
    assert.equal(await count(page), '1 de 4 feitas');

    // 2. Pix informado: abre o pedido e realça "conferido".
    await card.locator('[data-task="pix"]').click();
    const confirm = page.locator('#detail-dialog[open] [data-action="confirm-payment"]');
    await confirm.and(page.locator('.coach-target')).waitFor();
    await confirm.click();
    await page.locator('#toast').filter({ hasText: 'conferido' }).waitFor();
    await closeDetail(page);
    assert.equal(await count(page), '2 de 4 feitas');

    // 3. Avançar etapa: realça o próximo passo de um pedido de hoje.
    await card.locator('[data-task="advance"]').click();
    const step = page.locator('#view-today [data-action="advance-order"].coach-target');
    await step.waitFor();
    await step.click();
    await page.locator('#toast').filter({ hasText: 'Desfazer' }).waitFor();
    assert.equal(await count(page), '3 de 4 feitas');

    // 4. Meu mês: abrir a aba conta.
    await card.locator('[data-task="month"]').click();
    await page.locator('#month-title').waitFor();
    await page.locator('.nav-item[data-view="today"]').click();
    const done = page.locator('#view-today .onboarding.is-complete');
    await done.waitFor();
    assert.match(await done.innerText(), /Pronto, você já sabe usar\.[\s\S]*Criar conta grátis/);
    if (shots) await page.screenshot({ path: path.join(shots, `demo-fim-${width}.png`) });

    // Fechar some de vez; "Como funciona" traz de volta.
    await done.locator('[data-action="onboarding-skip"]').click();
    assert.equal(await page.locator('#view-today .onboarding').count(), 0);
    await page.reload(); await page.locator('#today-title').waitFor();
    assert.equal(await page.locator('#view-today .onboarding').count(), 0, 'continua fechado depois de recarregar');
    await page.locator('#demo-bar [data-action="open-onboarding"]').click();
    await page.locator('#view-today .onboarding').waitFor();
    await context.close();

    // Pular logo de cara.
    const skip = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const skipPage = await skip.newPage();
    skipPage.on('pageerror', (error) => errors.push(String(error)));
    await skipPage.goto(`${origin}/demo/`);
    await skipPage.locator('#view-today .onboarding [data-action="onboarding-skip"]').click();
    await skipPage.locator('#toast').filter({ hasText: 'Como funciona' }).waitFor();
    assert.equal(await skipPage.locator('#view-today .onboarding').count(), 0);

    // Dicas: aparecem nas abas e somem para sempre ao fechar.
    for (const [view, title] of [['orders', '#orders-title'], ['month', '#month-title']]) {
      await skipPage.locator(`.nav-item[data-view="${view}"]`).click();
      await skipPage.locator(title).waitFor();
      const tip = skipPage.locator(`#view-${view} .tab-tip`);
      await tip.waitFor();
      if (shots && view === 'orders') await skipPage.screenshot({ path: path.join(shots, `dica-${width}.png`) });
      await tip.locator('[data-action="close-tip"]').click();
      assert.equal(await skipPage.locator(`#view-${view} .tab-tip`).count(), 0);
    }
    await skipPage.reload(); await skipPage.locator('#today-title').waitFor();
    await skipPage.locator('.nav-item[data-view="orders"]').click();
    await skipPage.locator('#orders-title').waitFor();
    assert.equal(await skipPage.locator('#view-orders .tab-tip').count(), 0, 'dica fechada não volta');
    await skip.close();

    // Conta nova (simulada sobre os dados da demo): "Primeiros passos" com 3 tarefas.
    const account = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await account.addInitScript(() => {
      let store;
      Object.defineProperty(window, 'DoceStore', { configurable: true, get: () => store, set: (value) => { store = { ...value, isDemo: false }; } });
    });
    const accountPage = await account.newPage();
    accountPage.on('pageerror', (error) => errors.push(String(error)));
    await accountPage.goto(`${origin}/demo/`);
    const steps = accountPage.locator('#view-today .onboarding');
    await steps.waitFor();
    const stepsText = await steps.innerText();
    assert.match(stepsText, /Primeiros passos/);
    assert.match(stepsText, /Ative seu link de encomenda/);
    assert.match(stepsText, /2 de 3 feitas/, 'demo já tem pedidos e limite; falta o link');
    if (shots) await accountPage.screenshot({ path: path.join(shots, `conta-${width}.png`) });
    await steps.locator('[data-task="link"]').click();
    await accountPage.locator('.settings-card[data-settings="link"][open].coach-target').waitFor();
    await account.close();

    assert.deepEqual(errors, []);
    results.push(`${width}px: 4 tarefas da demo, fim com convite, Pular, Como funciona, dicas e Primeiros passos`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
