// Lembrete da véspera: node scripts/build-cloudflare.mjs && node scripts/test-vespera.mjs [pasta-de-capturas]
// A partir das 14h, Hoje lista quem retira ou recebe amanhã (combinado, fazendo ou pronto), com uma mensagem pronta
// por cliente. Na demo abre a janela de exemplo; lembrado some e continua sumido depois de recarregar.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, serveSite } from './lib/browser-test.mjs';
import { demoSeedState } from '../cloud/demo-seed.js';

const shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shots) await mkdir(shots, { recursive: true });
const server = await serveSite();
const browser = await chromium.launch();
const results = [];
const afternoon = new Date('2026-10-15T15:00:00-03:00'), morning = new Date('2026-10-15T11:00:00-03:00');
// Demo do dia 15 sem pedidos para amanhã, mais quatro conhecidos: três entram, um entregue e um orçamento não.
const seed = demoSeedState(afternoon);
seed.orders = seed.orders.filter((order) => !order.dueAt?.startsWith('2026-10-16'));
const base = { details: '', total: 120, location: '', nextAction: '', nextAt: '', pendingChange: '', origin: 'manual', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', history: [] };
seed.orders.push(
  { ...base, id: 'V1', client: 'Helena', product: 'Bolo de nozes', dueAt: '2026-10-16T09:30', status: 'Confirmado', mode: 'Retirada', location: 'Portaria do prédio', contact: '11 98888-0001' },
  { ...base, id: 'V2', client: 'Igor', product: 'Torta de limão', dueAt: '2026-10-16T16:00', status: 'Pronto', mode: 'Entrega', location: 'Rua das Flores, 10', contact: '11 98888-0002' },
  { ...base, id: 'V3', client: 'Júlia', product: 'Brigadeiros', dueAt: '2026-10-16T11:00', status: 'Em produção', mode: 'Retirada', contact: '' },
  { ...base, id: 'V4', client: 'Kátia', product: 'Pão de mel', dueAt: '2026-10-16T10:00', status: 'Entregue', mode: 'Retirada', contact: '11 98888-0004' },
  { ...base, id: 'V5', client: 'Lia', product: 'Cookies', dueAt: '2026-10-16T12:00', status: 'Orçamento', mode: 'Retirada', contact: '11 98888-0005' },
);
// Helena já pagou tudo (conferido); Igor tem sinal conferido; Júlia não pagou nada.
seed.payments.push(
  { id: 'VP1', orderId: 'V1', amount: 120, status: 'Conferido', note: '', createdAt: '2026-10-02T10:00:00.000Z' },
  { id: 'VP2', orderId: 'V2', amount: 40, status: 'Conferido', note: '', createdAt: '2026-10-02T10:00:00.000Z' },
);
const stored = JSON.stringify(seed);

async function open(viewport, when) {
  const context = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await context.addInitScript((state) => {
    if (!localStorage.getItem('doce-agenda.demo.v2')) localStorage.setItem('doce-agenda.demo.v2', state);
    localStorage.setItem('doce-agenda.onboarding.demo.v1', JSON.stringify({ dismissed: true, done: [] }));
  }, stored);
  const page = await context.newPage();
  await page.clock.setFixedTime(when);
  await page.goto(`${server.origin}/demo/completa/`);
  await page.locator('#today-title').waitFor();
  return { context, page };
}

try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 900 }]) {
    const errors = [];
    // Antes das 14h, nada de lembrete.
    const early = await open(viewport, morning);
    assert.equal(await early.page.locator('#view-today .vn-reminders').count(), 0, 'de manhã não aparece');
    await early.context.close();

    const { context, page } = await open(viewport, afternoon);
    page.on('pageerror', (error) => errors.push(String(error)));
    const card = page.locator('#view-today .vn-reminders');
    await card.waitFor();
    const rows = () => card.locator('.vn-remind').allInnerTexts();
    const listed = await rows();
    assert.equal(listed.length, 3, 'combinado, fazendo e pronto; entregue e orçamento não');
    assert.match(listed[0], /9h30 · Helena/, 'na ordem do relógio');
    assert.match(listed.join('\n'), /Igor[\s\S]*entrega/);
    assert.doesNotMatch(listed.join('\n'), /Kátia|Lia/);
    assert.equal(await card.locator('.vn-btn.primary').count(), 0, 'botões de contorno: o cheio continua sendo um só');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sem rolagem lateral em ${viewport.width}px`);
    if (shots) await card.screenshot({ path: path.join(shots, `vespera-${viewport.width}.png`) });

    // Na demo, "Lembrar" mostra a mensagem que seria escrita; nada abre o WhatsApp.
    const textOf = async (name) => {
      await card.locator(`[data-action="remind"][aria-label="Lembrar ${name}"]`).click();
      const dialog = page.locator('#zap-demo-dialog[open]');
      await dialog.waitFor();
      const text = await dialog.locator('#zap-demo-text').innerText();
      await dialog.locator('button[type="submit"]').click();
      return text;
    };
    const helena = await textOf('Helena');
    assert.match(helena, /^Oi, Helena! Passando para lembrar: amanhã, às 9h30, é dia de retirar Bolo de nozes\./);
    assert.match(helena, /Local: Portaria do prédio/);
    assert.doesNotMatch(helena, /Fica faltando/, 'pago e conferido: sem cobrança');
    const igor = await textOf('Igor');
    assert.match(igor, /é dia de entregar Torta de limão/);
    assert.match(igor, /Endereço: Rua das Flores, 10/);
    assert.match(igor, /Fica faltando R\$\s?80,00/, 'saldo pelo que foi conferido');
    const julia = await textOf('Júlia');
    assert.match(julia, /Fica faltando R\$\s?120,00/, 'nada conferido: falta o total');
    assert.equal(await page.locator('#view-today .vn-reminders').count(), 0, 'todos lembrados: o cartão some');

    await page.reload();
    await page.locator('#today-title').waitFor();
    assert.equal(await page.locator('#view-today .vn-reminders').count(), 0, 'lembrado continua lembrado neste aparelho');
    assert.deepEqual(errors, []);
    results.push(`${viewport.width}px: só depois das 14h, 3 de 5 pedidos, textos com local, endereço e saldo conferido, some ao lembrar`);
    await context.close();
  }
  results.forEach((line) => console.log(`ok - ${line}`));
} finally {
  await browser.close();
  server.close();
}
