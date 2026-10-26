// Prévia da tela Hoje: node scripts/build-cloudflare.mjs && node scripts/test-previa-hoje.mjs [pasta-de-capturas]
// Um número só (título = selo), um botão cheio por tela, as quatro tarefas resolvem na hora, as entregas
// avançam de etapa pela ficha, "Recomeçar" volta ao início. Roda com a CSP publicada da rota.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const csp = (await readFile(path.join(root, '_headers'), 'utf8')).match(/\/previa-hoje\/\*\n {2}Content-Security-Policy: (.*)/)?.[1];
assert.ok(csp, 'a rota da prévia tem CSP própria');
const server = await serveSite(root);
const browser = await chromium.launch();
const results = [];

try {
  for (const [width, height] of [[320, 640], [360, 800], [1280, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', permissions: ['clipboard-read', 'clipboard-write'] });
    await context.route('**/previa-hoje/**', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${server.origin}/previa-hoje/`);
    await page.locator('.todo-item').first().waitFor();

    const title = () => page.locator('#hoje-title').innerText();
    const badge = () => page.locator('#tab-badge').evaluate((el) => el.hidden ? '' : el.textContent);
    const filled = () => page.locator('main .btn-primary:visible').count();
    const same = async (n) => {
      assert.match(await title(), new RegExp(`^${n} coisas? pedem? você$`));
      assert.equal(await badge(), String(n), 'selo da barra = número do título');
      assert.equal(await page.locator('.todo-item').count(), n);
      assert.equal(await filled(), 1, 'um botão cheio só');
    };
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    await same(4);
    assert.equal(await page.locator('.todo-item').first().locator('.btn-primary').count(), 1, 'o botão cheio é o da primeira tarefa');
    assert.equal(await page.locator('#todo-clear').isVisible(), false);
    assert.match(await page.locator('#deliveries-note').innerText(), /3 de 3 vagas · dia cheio/);
    if (shots) await page.screenshot({ path: path.join(shots, `previa-hoje-${width}.png`), fullPage: true });

    // 1. Pix: "Ainda não" mantém; "Caiu na conta" resolve e a entrega da Juliana passa a sinal pago.
    await page.locator('[data-action="pix-no"]').click();
    await page.locator('#toast').filter({ hasText: 'até cair' }).waitFor();
    await same(4);
    await page.locator('[data-action="pix-yes"]').click();
    await same(3);
    assert.match(await page.locator('[data-delivery="juliana"]').innerText(), /Sinal pago/);

    // 2. Pedido pelo link: aceitar aparece nos próximos dias.
    await page.locator('[data-action="open-camila"]').click();
    await page.locator('#sheet[open] [data-action="camila-accept"]').click();
    await page.locator('#sheet').evaluate((dialog) => dialog.open).then((open) => assert.equal(open, false));
    await same(2);
    assert.match(await page.locator('#upcoming-list').innerText(), /Camila, 11h/);

    // 3 e 4. Cobrar e orçamento: mensagem pronta para copiar, nada é enviado.
    for (const [open, copy, left] of [['open-roberta', 'roberta-copy', 1], ['open-renata', 'renata-copy', 0]]) {
      await page.locator(`[data-action="${open}"]`).click();
      assert.match(await page.locator('#sheet .sheet-message').innerText(), /Oi, /);
      await page.locator(`#sheet[open] [data-action="${copy}"]`).click();
      if (left) await same(left);
    }
    assert.equal(await title(), 'Tudo em dia');
    assert.equal(await badge(), '', 'sem pendência, sem selo');
    assert.equal(await page.locator('#todo-clear').isVisible(), true);

    // Entregas: a linha abre a ficha; o próximo passo é o único botão cheio dela.
    await page.locator('[data-delivery="ana"]').click();
    assert.equal(await page.locator('#sheet[open] .btn-primary').count(), 1);
    await page.locator('#sheet[open] [data-action="advance"]').click();
    assert.match(await page.locator('[data-delivery="ana"]').innerText(), /Entregue/);
    assert.match(await page.locator('#deliveries-note').innerText(), /1 entregue/);
    await page.locator('[data-delivery="marcos"]').click();
    assert.equal(await page.locator('#sheet[open] [data-action="advance"]').innerText(), 'Ficou pronto');
    await page.keyboard.press('Escape');

    // Outras abas avisam que só Hoje funciona; "O que mudou?" abre no celular; Recomeçar volta ao início.
    await page.locator('.tab[data-tab="pedidos"]').click();
    await page.locator('#toast').filter({ hasText: 'só a tela Hoje' }).waitFor();
    if (width < 1000) {
      await page.locator('[data-about-open]').click();
      await page.locator('#about-dialog[open] h2', { hasText: 'O que mudou' }).waitFor();
      await page.keyboard.press('Escape');
    } else assert.equal(await page.locator('#about-panel').isVisible(), true, 'no computador a explicação fica ao lado');
    await page.locator('[data-reset]').click();
    await same(4);

    assert.deepEqual(errors, [], 'sem erro nem bloqueio da CSP');
    results.push(`${width}px: número único, um botão cheio, quatro tarefas, entregas, abas e recomeçar`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
