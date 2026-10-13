// Checks the demo build (browser mode): demo bar, visible sample, storage note, save indicator,
// toast action and detail actions. Run `node scripts/build-deploy.mjs` first.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(web, process.argv[2] || "deploy-demo/public");
const shots = path.join(web, "design/melhorias-2026-10-13");
const tag = process.argv[3] || "demo";
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".ttf": "font/ttf", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  try { const body = await readFile(path.join(root, p)); res.writeHead(200, { "content-type": mime[path.extname(p)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const out = {};
try {
  for (const width of [390, 320]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 700 }, isMobile: true, hasTouch: true, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/");
    await page.locator("#view-today h1").waitFor();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(await overflow(), 0, `overflow first visit ${width}`);
    // Demo bar
    assert.equal(await page.locator("#demo-bar").isVisible(), true);
    assert.match(await page.locator("#demo-bar").innerText(), /Demonstração\. O que você cadastrar fica só neste navegador\./);
    assert.equal(await page.locator("#demo-bar a").getAttribute("href"), "/cadastro/");
    // Sample card: visible, real card, outside today's list and counts
    assert.equal(await page.locator(".sample-card .order-row").count(), 1);
    assert.equal(await page.locator(".today-agenda .order-row").count(), 0);
    const sampleText = await page.locator(".sample-card").innerText();
    assert.match(sampleText, /Marina/); assert.match(sampleText, /Exemplo/); assert.doesNotMatch(sampleText, /fictício/i);
    assert.equal(await page.locator("#nav-order-count").innerText(), "0");
    assert.equal(await page.locator(".finance-summary").count(), 0);
    // Storage note
    const note = page.locator(".storage-note");
    assert.match(await note.innerText(), /Seus pedidos ficam só neste navegador\. Se limpar os dados do navegador, eles somem\./);
    assert.equal(await note.getByRole("button", { name: "Baixar cópia de segurança" }).count(), 1);
    // Save indicator
    if (width === 390) { assert.equal(await page.locator("#connection-short").isVisible(), true); assert.equal(await page.locator("#connection-short").innerText(), "Salvo"); }
    assert.equal(await page.locator(".connection-dot").isVisible(), true);
    await page.screenshot({ path: path.join(shots, `${tag}-demo-vazio-${width}.png`), fullPage: true });
    // Sample detail
    await page.locator(".sample-card .order-row").click();
    await page.locator("#detail-dialog[open]").waitFor();
    assert.equal((await page.locator("#detail-title").innerText()).trim(), "Marina");
    const inView = async (sel) => page.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    assert.equal(await inView('#detail-dialog [data-action="copy-summary"]'), true, "copy visible without scrolling");
    assert.equal(await inView('#detail-dialog [data-action="edit-order"]'), true, "edit visible without scrolling");
    await page.screenshot({ path: path.join(shots, `${tag}-detalhe-${width}.png`) });
    await page.keyboard.press("Escape");
    // Create an order: toast with action
    await page.locator(".main-nav [data-action=new-order]").click();
    await page.locator("#order-form [name=client]").fill("Paula Teste");
    await page.locator("#order-form [name=product]").fill("Torta de morango");
    await page.locator("#save-order-button").click();
    const toast = page.locator("#toast");
    await toast.locator(".toast-action").waitFor();
    assert.match(await toast.innerText(), /Pedido salvo\./);
    assert.equal(await toast.locator(".toast-action").innerText(), "Copiar resumo");
    assert.equal(await overflow(), 0, `overflow after save ${width}`);
    await page.screenshot({ path: path.join(shots, `${tag}-toast-${width}.png`) });
    await toast.locator(".toast-action").click();
    await page.waitForFunction(() => /Resumo copiado/.test(document.querySelector("#toast").textContent));
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /Paula Teste/); assert.match(clip, /Torta de morango/);
    assert.equal(await page.locator("#toast .toast-action").count(), 0);
    // After first real order: sample collapses back, nav pill only on the active item
    assert.equal(await page.locator(".sample-card").count(), 0);
    for (const view of ["orders", "week", "today"]) {
      await page.locator(`.main-nav [data-view=${view}]`).click();
      const pills = await page.locator(".main-nav .nav-item:not(.nav-new-order) .nav-icon").evaluateAll((els) => els.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length);
      assert.equal(pills, 1, `one pill on ${view}`);
      assert.equal(await overflow(), 0, `overflow ${view} ${width}`);
    }
    await page.screenshot({ path: path.join(shots, `${tag}-demo-com-pedido-${width}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    out[width] = "ok";
    await ctx.close();
  }
  console.log("OK: demo bar, visible sample outside counts, storage note, save indicator, toast action, detail actions, single nav pill.", JSON.stringify(out));
} finally { await browser.close(); server.close(); }
