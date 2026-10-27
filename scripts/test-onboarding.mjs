// Boas-vindas: node scripts/build-cloudflare.mjs && node scripts/test-onboarding.mjs [pasta-de-capturas]
// Demonstração: "Experimente em 1 minuto" com 4 tarefas feitas na tela de verdade, convite após 2, Pular e "Como funciona".
// Conta nova: "Primeiros passos" com 4 tarefas, a conta criada já feita; sem pedido, pergunta se já tem encomenda. Abas sem caixas de dica.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';
import { demoSeedState } from '../cloud/demo-seed.js';
import { createEmptyState } from '../cloud/state-engine.js';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite(root);
const { origin } = server;
const browser = await chromium.launch();
const results = [];
const count = (page) => page.locator('#view-today .onboarding-count').innerText();
// Conta nova simulada sobre a demo: a loja finge não ser demo; com `empty`, a agenda começa vazia.
async function accountContext(viewport, empty = false) {
  const context = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const seed = demoSeedState(new Date());
  const emptyState = empty ? JSON.stringify({ ...seed, orders: [], payments: [], availability: createEmptyState().availability, orderPage: { ...seed.orderPage, active: false } }) : null;
  await context.addInitScript((seed) => {
    if (seed && !localStorage.getItem('doce-agenda.demo.v2')) localStorage.setItem('doce-agenda.demo.v2', seed);
    let store;
    Object.defineProperty(window, 'DoceStore', { configurable: true, get: () => store, set: (value) => { store = { ...value, isDemo: false }; } });
  }, emptyState);
  return context;
}
const closeDetail = async (page) => { await page.keyboard.press('Escape'); await page.locator('#detail-dialog[open]').waitFor({ state: 'detached' }).catch(() => {}); };

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/demo/completa/`);
    const card = page.locator('#view-today .onboarding');
    await card.waitFor();
    assert.equal(await page.locator('.story-overlay').count(), 0, 'sem stories');
    assert.match(await card.innerText(), /Experimente em 1 minuto/);
    assert.equal(await count(page), '0 de 4 feitas');
    assert.equal(await card.locator('.onboarding-midcta').count(), 0, 'convite só depois de duas tarefas');
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
    const midInvite = card.locator('.onboarding-midcta a[href="/cadastro/"]');
    assert.equal(await midInvite.innerText(), 'Criar minha conta grátis', 'no meio da demo, convite para guardar de verdade');
    if (shots) await card.screenshot({ path: path.join(shots, `demo-meio-${width}.png`) });

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
    await skipPage.goto(`${origin}/demo/completa/`);
    await skipPage.locator('#view-today .onboarding [data-action="onboarding-skip"]').click();
    await skipPage.locator('#toast').filter({ hasText: 'Como funciona' }).waitFor();
    assert.equal(await skipPage.locator('#view-today .onboarding').count(), 0);

    // Simplificação, etapa 4: sem caixas de dica em nenhuma aba; cada tela se explica sozinha.
    for (const [view, title] of [['orders', '#orders-title'], ['month', '#month-title'], ['clients', '#clients-title'], ['settings', '#settings-title']]) {
      await skipPage.locator(`[data-view="${view}"]:visible`).first().click();
      await skipPage.locator(title).waitFor();
      assert.equal(await skipPage.locator(`#view-${view} .tab-tip, #view-${view} [data-action="close-tip"]`).count(), 0, `sem dica em ${view}`);
    }
    await skip.close();

    // Conta nova (simulada sobre os dados da demo): "Primeiros passos" com 4 tarefas; a conta criada já vem feita.
    const account = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await account.addInitScript(() => {
      let store;
      Object.defineProperty(window, 'DoceStore', { configurable: true, get: () => store, set: (value) => { store = { ...value, isDemo: false }; } });
    });
    const accountPage = await account.newPage();
    accountPage.on('pageerror', (error) => errors.push(String(error)));
    await accountPage.goto(`${origin}/demo/completa/`);
    const steps = accountPage.locator('#view-today .onboarding');
    await steps.waitFor();
    const stepsText = await steps.innerText();
    assert.match(stepsText, /Primeiros passos/);
    assert.match(stepsText, /Ative seu link de encomenda/);
    assert.match(stepsText, /Crie sua conta/);
    assert.match(stepsText, /Falta uma coisa para deixar sua agenda pronta/);
    assert.match(stepsText, /3 de 4 feitas/, 'conta criada, demo já tem pedidos e limite; falta o link');
    assert.equal(await steps.locator('.onboarding-task.is-done').first().innerText().then((text) => /Crie sua conta/.test(text)), true, 'conta criada é o primeiro item, já feito');
    if (shots) await accountPage.screenshot({ path: path.join(shots, `conta-${width}.png`) });
    // Link fora do ar: a tarefa abre o caminho curto (3 passos), não o cartão completo de Ajustes.
    await steps.locator('[data-task="link"]').click();
    await accountPage.locator('#link-wizard[open]').waitFor();
    assert.match(await accountPage.locator('#link-wizard').innerText(), /Passo 1 de 3/);
    await account.close();

    // Conta vazia: pergunta "Você já tem encomenda marcada?" antes da lista.
    for (const answer of ['tem-pedido', 'sem-pedido']) {
      const fresh = await accountContext({ width, height }, true);
      const freshPage = await fresh.newPage();
      freshPage.on('pageerror', (error) => errors.push(String(error)));
      await freshPage.goto(`${origin}/demo/completa/`);
      const intent = freshPage.locator('#view-today .onboarding .onboarding-intent');
      await intent.waitFor();
      assert.match(await intent.innerText(), /Você já tem encomenda marcada\?/);
      assert.equal(await freshPage.locator('#view-today .onboarding-list').count(), 0, 'pergunta no lugar da lista');
      assert.equal(await count(freshPage), '1 de 4 feitas');
      // Sem pedido nenhum, a tela abre nos Primeiros passos: sem dia vazio nem "Ajustar esta data" antes deles.
      assert.equal(await freshPage.locator('#view-today .today-agenda, #view-today .agenda-adjust').count(), 0, 'conta vazia sem caixa do dia');
      assert.equal(await freshPage.locator('#view-today .vn-schedule > *').first().evaluate((el) => el.classList.contains('onboarding')), true, 'Primeiros passos em primeiro');
      assert.ok(await intent.locator('[data-intent="tem-pedido"]').evaluate((el) => el.getBoundingClientRect().bottom <= window.innerHeight), `pergunta à vista sem rolar em ${width}px`);
      assert.ok(await freshPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `pergunta sem rolagem lateral em ${width}px`);
      if (shots && answer === 'tem-pedido') await intent.screenshot({ path: path.join(shots, `conta-pergunta-${width}.png`) });
      await intent.locator(`[data-intent="${answer}"]`).click();
      if (answer === 'tem-pedido') {
        // Primeiro pedido de verdade: comemoração no topo da Agenda, com a vaga do dia e o próximo passo.
        await freshPage.locator('#order-dialog[open]').waitFor();
        await freshPage.waitForTimeout(150);
        await freshPage.locator('wa-input[name="client"] input').fill('Bia Teste');
        await freshPage.locator('wa-input[name="product"] input').fill('Bolo de cenoura');
        await freshPage.locator('[data-due-shortcut="1"]').click();
        await freshPage.locator('wa-input[name="dueTime"] input').fill('15:00');
        await freshPage.locator('wa-input[name="total"] input').fill('120');
        await freshPage.locator('#status-choice input[value="Confirmado"]').check();
        await freshPage.locator('#save-order-button').click();
        const party = freshPage.locator('#view-today .first-order');
        await party.waitFor();
        const partyText = await party.innerText();
        assert.match(partyText, /Primeiro pedido na agenda!/);
        assert.match(partyText, /de \d+ vagas? ocupadas?|já tem 1 pedido/, 'mostra a vaga do dia');
        assert.match(partyText, /sinal/, 'sem sinal: o próximo passo é marcar o sinal');
        assert.equal(await freshPage.evaluate(() => document.activeElement?.id), 'first-order-title', 'foco vai para a comemoração');
        assert.ok(await freshPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `comemoração sem rolagem lateral em ${width}px`);
        if (shots) await party.screenshot({ path: path.join(shots, `primeiro-pedido-${width}.png`) });
        await party.locator('[data-open-order]').click();
        await freshPage.locator('#detail-dialog[open]').waitFor();
        await closeDetail(freshPage);
        await party.locator('[data-action="close-first-order"]').click();
        assert.equal(await freshPage.locator('#view-today .first-order').count(), 0, 'fechar some com a comemoração');
        // Segundo pedido não comemora de novo.
        await freshPage.locator('[data-action="new-order"]:visible').first().click();
        await freshPage.locator('#order-dialog[open]').waitFor();
        await freshPage.waitForTimeout(150);
        await freshPage.locator('wa-input[name="client"] input').fill('Caio Teste');
        await freshPage.locator('wa-input[name="product"] input').fill('Brigadeiros');
        await freshPage.locator('#status-choice input[value="Orçamento"]').check();
        await freshPage.locator('#save-order-button').click();
        await freshPage.locator('#order-dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
        await freshPage.waitForTimeout(300);
        assert.equal(await freshPage.locator('#view-today .first-order').count(), 0, 'só o primeiro pedido é comemorado');
      } else {
        await freshPage.locator('#toast').filter({ hasText: 'link' }).waitFor();
        const order = await freshPage.locator('#view-today .onboarding-task').allInnerTexts();
        assert.match(order[0], /Crie sua conta/);
        assert.match(order[1], /Ative seu link/, 'sem encomenda: link vem antes');
        assert.match(order[3], /Anote seu primeiro pedido[\s\S]*Quando a próxima encomenda/);
        if (shots) await freshPage.locator('#view-today .onboarding').screenshot({ path: path.join(shots, `conta-sem-pedido-${width}.png`) });
      }
      await freshPage.reload(); await freshPage.locator('#today-title').waitFor();
      assert.equal(await freshPage.locator('#view-today .onboarding-intent').count(), 0, 'resposta lembrada');
      if (answer === 'sem-pedido') {
        // Pulou os passos e ainda não tem pedido: fica só o convite para o primeiro pedido.
        await freshPage.locator('#view-today [data-action="onboarding-skip"]').click();
        await freshPage.locator('#view-today .welcome-panel').waitFor();
        assert.equal(await freshPage.locator('#view-today .today-agenda').count(), 0, 'sem caixa do dia depois de Pular');
      } else {
        assert.ok(await freshPage.locator('#view-today .today-agenda').count() > 0, 'com pedido, o dia volta');
      }
      await fresh.close();
    }

    assert.deepEqual(errors, []);
    results.push(`${width}px: 4 tarefas da demo, fim com convite, Pular, Como funciona, abas sem dica e Primeiros passos`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
