// Pix (em teste, ligado por ?pix=teste): node scripts/build-cloudflare.mjs && node scripts/test-pix.mjs [pasta-de-capturas]
// Cadastrar a chave em Ajustes, cobrar sinal/total/outro valor num pedido, copiar código e mensagem.
// Sem o aviso de teste nada de Pix aparece. O código gerado tem CRC válido e o valor certo.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { crc16 } from '../cloud/pix-code.js';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite(root);
const { origin } = server;
const browser = await chromium.launch();
const results = [];
const validCode = (code) => crc16(code.slice(0, -4)) === code.slice(-4);

try {
  // Sem o aviso de teste: nenhum Pix na tela.
  {
    const page = await browser.newPage();
    await page.goto(`${origin}/demo/completa/`);
    await page.locator('#today-title').waitFor();
    await page.locator('.settings-button, [data-view="settings"]').first().click();
    await page.locator('#settings-title').waitFor();
    assert.equal(await page.locator('.settings-card[data-settings="pix"]').count(), 0, 'Pix escondido sem o aviso de teste');
    await page.locator('#view-today .vn-order').first().click().catch(() => {});
    await page.close();
    results.push('Pix escondido sem ?pix=teste');
  }

  for (const [width, height] of [[360, 800], [1280, 900]]) {
    const errors = [];
    const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await context.addInitScript(() => localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] })));
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`${origin}/demo/completa/?pix=teste`);
    await page.locator('#today-title').waitFor();
    assert.equal(new URL(page.url()).search, '', 'o aviso sai do endereço');

    // Sem chave: o botão do pedido leva ao cadastro do Pix.
    const marcos = page.locator('#view-today .vn-order', { hasText: 'Marcos' });
    await marcos.click();
    await page.locator('#detail-dialog[open] [data-action="pix-charge"]').click();
    const card = page.locator('.settings-card[data-settings="pix"][open]');
    await card.waitFor();

    // Erro de chave aparece em português e não salva.
    await card.locator('[name="keyType"]').selectOption('cpf');
    await card.locator('[name="key"]').fill('111.111.111-11');
    await card.locator('[name="city"]').fill('São Paulo');
    await card.locator('[type="submit"]').click();
    await page.locator('#toast').filter({ hasText: 'CPF inválido' }).waitFor();

    await card.locator('[name="keyType"]').selectOption('celular');
    await card.locator('[name="key"]').fill('(11) 99999-8888');
    await card.locator('[name="name"]').fill('Doces da Lú');
    await card.locator('[type="submit"]').click();
    await page.locator('#toast').filter({ hasText: 'Pix salvo' }).waitFor();
    assert.match(await page.locator('.settings-card[data-settings="pix"] .settings-card-summary').innerText(), /Celular · sinal sugerido 30%/);
    assert.equal(await page.locator('.settings-card[data-settings="pix"] [name="key"]').inputValue(), '+5511999998888');
    if (shots) await page.locator('.settings-card[data-settings="pix"]').screenshot({ path: path.join(shots, `ajustes-pix-${width}.png`) });

    // Cobrar o sinal de 30% do pedido de R$ 95,00 do Marcos.
    await page.locator('.nav-item[data-view="today"]').click();
    await page.locator('#view-today .vn-order', { hasText: 'Marcos' }).click();
    await page.locator('#detail-dialog[open] [data-action="pix-charge"]').click();
    const dialog = page.locator('#pix-dialog[open]');
    await dialog.waitFor();
    assert.match(await dialog.locator('.pix-amounts').innerText(), /Sinal \(30%\) · R\$\s28,50[\s\S]*Valor total · R\$\s95,00[\s\S]*Outro valor/);
    let code = await dialog.locator('.pix-code textarea').inputValue();
    assert.ok(validCode(code), 'CRC do código');
    assert.match(code, /br\.gov\.bcb\.pix0114\+5511999998888/);
    assert.match(code, /540528\.50/);
    assert.match(code, /5911Doces da Lu6009Sao Paulo/);
    assert.equal(await dialog.locator('.pix-qr svg').count(), 1);
    assert.equal(await dialog.locator('.pix-amount').innerText(), 'R$ 28,50'.replace(' ', ' '));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${width}px`);
    if (shots) await page.screenshot({ path: path.join(shots, `cobrar-${width}.png`) });

    await dialog.locator('[data-pix="message"]').click();
    await page.locator('#toast').filter({ hasText: 'Mensagem copiada' }).waitFor();
    const message = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(message, /^Oi, Marcos! Segue o Pix do sinal de Brigadeiro \(cento\): R\$\s28,50\./);
    assert.ok(message.includes(code), 'mensagem leva o código');

    // Valor total e outro valor.
    await dialog.locator('label', { hasText: 'Valor total' }).click();
    code = await dialog.locator('.pix-code textarea').inputValue();
    assert.match(code, /540595\.00/); assert.ok(validCode(code));
    await dialog.locator('label', { hasText: 'Outro valor' }).click();
    await dialog.locator('[name="pix-other"]').fill('12,30');
    code = await dialog.locator('.pix-code textarea').inputValue();
    assert.match(code, /540512\.30/); assert.ok(validCode(code));
    await dialog.locator('[data-pix="code"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), code);
    await dialog.locator('[data-pix="close"]').click();
    assert.equal(await page.locator('#pix-dialog[open]').count(), 0);
    assert.equal(await page.locator('#detail-dialog[open]').count(), 1, 'volta ao pedido');

    // Nada é registrado sozinho.
    assert.match(await page.locator('#detail-dialog[open] .payment-section').innerText(), /Nenhum pagamento registrado/);
    assert.deepEqual(errors, []);
    await context.close();
    results.push(`${width}px: cadastro da chave, sinal 30%, total, outro valor, copiar código e mensagem`);
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
