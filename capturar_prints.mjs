import { chromium } from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = join(dirname(fileURLToPath(import.meta.url)), 'prints');
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page = await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:1,isMobile:true,hasTouch:true});
try {
  const order = (await (await page.request.get('http://localhost:4173/api/state')).json()).orders.find(o=>o.client.includes('exemplo fictício'));
  await page.goto('http://localhost:4173', {waitUntil:'networkidle'});
  await page.locator('#view-today h1').waitFor({state:'visible',timeout:10000});
  await page.waitForTimeout(350);
  await page.screenshot({path:join(out,'01-hoje.png'),fullPage:true});
  await page.locator('[data-view="week"].nav-item').click();
  await page.locator('#view-week h1').waitFor({state:'visible'});
  await page.locator(`[data-select-day="${order.dueAt.slice(0,10)}"]`).click();
  await page.waitForTimeout(350);
  await page.screenshot({path:join(out,'02-semana.png'),fullPage:true});
  await page.locator(`#view-week [data-open-order="${order.id}"]`).waitFor({state:'visible'});
  await page.locator(`#view-week [data-open-order="${order.id}"]`).click();
  await page.locator('#detail-dialog[open]').waitFor({state:'visible'});
  await page.screenshot({path:join(out,'03-detalhes-pedido.png')});
  await page.locator('#detail-dialog [data-close]').click();
  await page.locator('[data-action="new-order"]').first().click();
  await page.locator('#order-dialog[open]').waitFor({state:'visible'});
  await page.screenshot({path:join(out,'04-novo-pedido.png')});
  console.log('Capturas salvas: 01-hoje.png, 02-semana.png, 03-detalhes-pedido.png, 04-novo-pedido.png');
} finally { await browser.close(); }



