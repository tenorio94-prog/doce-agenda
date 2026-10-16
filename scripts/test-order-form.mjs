// Formulário de encomenda (campos Web Awesome): node scripts/build-cloudflare.mjs && node scripts/test-order-form.mjs [pasta-de-capturas]
// Roda na demonstração (dados só no navegador do teste): criar, editar, erros de data, bolo,
// exceção de dia lotado, aceitar solicitação do link e confirmar orçamento.
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

const state = (page) => page.evaluate(async () => (await window.DoceStore.fetch('/api/state')).json());
const dialogOpen = (page) => page.evaluate(() => document.querySelector('#order-dialog').open);
const field = (page, name) => page.evaluate((n) => document.querySelector('#order-form').elements.namedItem(n).value, name);
async function pick(page, name, value) {
  await page.locator(`#order-form wa-select[name="${name}"]`).click();
  await page.locator(`#order-form wa-select[name="${name}"] wa-option[value="${value}"]`).click();
  await page.waitForTimeout(150);
}
async function openNew(page) {
  await page.locator('[data-action="new-order"]:visible').first().click();
  await page.locator('#order-dialog[open]').waitFor();
  await page.waitForTimeout(150);
}
async function save(page) {
  await page.locator('#save-order-button').click();
  await page.waitForTimeout(500);
}
const localKey = (page, plus) => page.evaluate((d) => { const t = new Date(); t.setDate(t.getDate() + d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }, plus);

try {
  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/demo/`);
    await page.locator('#view-today h1').waitFor();
    await page.waitForFunction(() => customElements.get('wa-input') && customElements.get('wa-select'));

    // 1. Criar: todos os tipos de campo chegam ao pedido salvo.
    await openNew(page);
    assert.equal(await page.locator('#order-dialog-title').innerText(), 'Nova encomenda');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `form-${width}.png`) });
    await page.locator('wa-input[name="client"] input').fill('Cliente Teste');
    await page.locator('wa-input[name="product"] input').fill('Torta de teste');
    await page.locator('#order-form .optional-fields > summary').click();
    await page.locator('wa-textarea[name="details"] textarea').fill('Massa branca, sem lactose.');
    await page.locator('[data-due-shortcut="1"]').click();
    const tomorrow = await localKey(page, 1);
    assert.equal(await field(page, 'dueDate'), tomorrow, 'atalho Amanhã preenche a data');
    await page.locator('wa-input[name="dueTime"] input').fill('14:30');
    await pick(page, 'mode', 'Entrega');
    await page.locator('wa-input[name="total"] input').fill('150,50');
    await pick(page, 'status', 'Confirmado');
    await save(page);
    assert.equal(await dialogOpen(page), false, 'salvar fecha o formulário');
    let saved = (await state(page)).orders.find((o) => o.client === 'Cliente Teste');
    assert.ok(saved, 'pedido criado');
    assert.equal(saved.product, 'Torta de teste');
    assert.equal(saved.details, 'Massa branca, sem lactose.');
    assert.equal(saved.mode, 'Entrega');
    assert.equal(saved.total, 150.5);
    assert.equal(saved.totalKnown, true);
    assert.equal(saved.status, 'Confirmado');
    assert.ok(String(saved.dueAt).startsWith(`${tomorrow}T14:30`), `data salva: ${saved.dueAt}`);
    results.push({ width, case: 'criar' });

    // 2. Editar: os valores voltam para os campos e a alteração é gravada.
    await page.evaluate((id) => document.querySelector(`[data-open-order="${id}"]`)?.click(), saved.id);
    await page.locator('#detail-dialog[open] [data-action="edit-order"]').click();
    await page.locator('#order-dialog[open]').waitFor(); await page.waitForTimeout(200);
    assert.equal(await page.locator('#order-dialog-title').innerText(), 'Editar encomenda');
    assert.equal(await field(page, 'client'), 'Cliente Teste');
    assert.equal(await field(page, 'mode'), 'Entrega');
    assert.equal(await field(page, 'total'), '150,50');
    assert.equal(await field(page, 'status'), 'Confirmado');
    assert.equal(await field(page, 'dueDate'), tomorrow);
    assert.equal(await field(page, 'dueTime'), '14:30');
    await page.locator('wa-input[name="product"] input').fill('Torta de teste grande');
    await save(page);
    saved = (await state(page)).orders.find((o) => o.id === saved.id);
    assert.equal(saved.product, 'Torta de teste grande');
    assert.equal(saved.total, 150.5, 'valor não muda ao editar outro campo');
    results.push({ width, case: 'editar' });

    // 3. Erros: confirmado sem data; data sem horário.
    await openNew(page);
    await page.locator('wa-input[name="client"] input').fill('Sem Data');
    await page.locator('wa-input[name="product"] input').fill('Brigadeiro');
    await pick(page, 'status', 'Confirmado');
    await save(page);
    assert.equal(await dialogOpen(page), true, 'confirmado sem data não salva');
    assert.equal(await page.locator('#order-form').evaluate((f) => f.checkValidity()), false, 'data e horário viram obrigatórios ao confirmar');
    await pick(page, 'status', 'Orçamento');
    assert.equal(await page.locator('#order-form').evaluate((f) => f.checkValidity()), true, 'orçamento pode ficar sem data');
    await page.locator('[data-due-shortcut="0"]').click();
    await save(page);
    assert.match(await page.locator('#order-form .field-error').first().innerText(), /horário/, 'pede o horário');
    assert.equal(await page.locator('wa-input[name="dueTime"]').getAttribute('aria-invalid'), 'true');
    if (shots) await page.screenshot({ path: path.join(shots, `form-erro-${width}.png`) });
    await page.locator('#order-dialog [data-close="order-dialog"]').first().click();
    assert.equal((await state(page)).orders.some((o) => o.client === 'Sem Data'), false);
    results.push({ width, case: 'erros de data' });

    // 4. Bolo: marcar mostra os campos do modelo.
    await openNew(page);
    await page.locator('#order-form .optional-fields > summary').click();
    assert.equal(await page.locator('#cake-order-fields').isHidden(), true);
    await page.locator('wa-checkbox[name="hasCake"]').click();
    assert.equal(await page.locator('#cake-order-fields').isVisible(), true, 'campos do bolo aparecem');
    await page.locator('#order-dialog [data-close="order-dialog"]').first().click();
    results.push({ width, case: 'bolo' });

    // 5. Dia lotado (hoje tem 3 de 3): pede motivo e salva com a exceção.
    await openNew(page);
    await page.locator('wa-input[name="client"] input').fill('Exceção Teste');
    await page.locator('wa-input[name="product"] input').fill('Docinhos');
    await page.locator('[data-due-shortcut="0"]').click();
    await page.locator('wa-input[name="dueTime"] input').fill('20:00');
    await pick(page, 'status', 'Confirmado');
    await save(page);
    assert.equal(await page.locator('#capacity-override-box').isVisible(), true, 'avisa a lotação');
    await save(page);
    assert.match(await page.locator('#order-form-error').innerText(), /4 caracteres/);
    await page.locator('wa-textarea[name="overrideReason"] textarea').fill('Combinei outro horário');
    await save(page);
    assert.equal(await dialogOpen(page), false, 'salva com o motivo');
    assert.ok((await state(page)).orders.some((o) => o.client === 'Exceção Teste'));
    results.push({ width, case: 'exceção de lotação' });

    // 6. Solicitação do link: editar e aceitar oferece só Orçamento/Confirmado.
    const request = (await state(page)).orders.find((o) => o.status === 'Solicitação');
    assert.ok(request, 'demo tem uma solicitação');
    await page.evaluate((id) => window.showOrderDetail ? window.showOrderDetail(id) : document.querySelector(`[data-open-order="${id}"]`)?.click(), request.id);
    if (!(await page.locator('#detail-dialog[open]').count())) { await page.locator('[data-action="show-requests"]').first().click(); await page.locator(`[data-open-order="${request.id}"]`).first().click(); }
    await page.locator('#detail-dialog[open] [data-action="edit-order"]').click();
    await page.locator('#order-dialog[open]').waitFor(); await page.waitForTimeout(200);
    assert.equal(await page.locator('#order-dialog-title').innerText(), 'Editar e aceitar solicitação');
    assert.deepEqual(await page.locator('#order-status wa-option').evaluateAll((o) => o.map((x) => x.value)), ['Orçamento', 'Confirmado']);
    assert.equal(await field(page, 'status'), 'Orçamento');
    await save(page);
    assert.equal((await state(page)).orders.find((o) => o.id === request.id).status, 'Orçamento', 'solicitação aceita como orçamento');
    await page.keyboard.press('Escape');
    results.push({ width, case: 'aceitar solicitação' });

    // 7. Confirmar orçamento: o formulário abre já em Confirmado.
    const quote = (await state(page)).orders.find((o) => o.status === 'Orçamento' && o.dueAt);
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    await page.locator('.nav-item[data-view="orders"]:visible, [data-view="orders"]:visible').first().click();
    await page.locator(`#view-orders [data-open-order="${quote.id}"]`).first().click();
    await page.locator('#detail-dialog[open] [data-action="confirm-order"]').click();
    await page.locator('#order-dialog[open]').waitFor(); await page.waitForTimeout(200);
    assert.equal(await page.locator('#order-dialog-title').innerText(), 'Confirmar pedido');
    assert.equal(await field(page, 'status'), 'Confirmado');
    assert.equal(await page.locator('#save-order-button').innerText(), 'Confirmar pedido');
    await page.locator('#order-dialog [data-close="order-dialog"]').first().click();
    results.push({ width, case: 'confirmar orçamento' });

    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
  server.close();
}
