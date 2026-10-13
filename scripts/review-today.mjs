import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Local-only Today QA. Run scripts/build-deploy.mjs first, then:
//   node scripts/review-today.mjs
// This review serves deploy-demo/public on loopback and uses isolated browser
// contexts with fictitious localStorage data. It never targets a live origin.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(webRoot, "deploy-demo", "public");
const reviewDir = path.join(webRoot, "design", "today-refinement");
const mimeTypes = {
  ".avif": "image/avif", ".css": "text/css; charset=utf-8", ".gif": "image/gif",
  ".html": "text/html; charset=utf-8", ".ico": "image/x-icon", ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

let server;
let origin;
server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(publicRoot, relative);
    if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await mkdir(reviewDir, { recursive: true });
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const pageErrors = [];
const externalRequests = [];
const contexts = [];
const fixedTime = "2026-10-08T10:00:00-03:00";

function watchPage(page) {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin) externalRequests.push(request.url());
  });
}

async function createPage({ width = 390, height = 844 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    timezoneId: "America/Sao_Paulo",
    isMobile: width <= 760,
    hasTouch: width <= 760,
  });
  contexts.push(context);
  const page = await context.newPage();
  await page.clock.install({ time: new Date(fixedTime) });
  watchPage(page);
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#view-today.today-redesign h1").waitFor();
  return page;
}

async function storeCall(page, route, method = "GET", body) {
  const result = await page.evaluate(async ({ route, method, body }) => {
    const response = await window.DoceStore.fetch(route, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, payload: await response.json() };
  }, { route, method, body });
  assert.ok(result.status < 400, `${method} ${route} failed: ${JSON.stringify(result.payload)}`);
  return result.payload;
}

async function importBackup(page, backup) {
  await storeCall(page, "/api/import", "POST", backup);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#view-today.today-redesign h1").waitFor();
}

async function checkFontsAndAssets(page) {
  assert.equal(await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check("12px Lora") && document.fonts.check("12px Manrope");
  }), true, "Local Lora and Manrope fonts must load.");
  const logo = await page.locator(".brand img").evaluate((image) => ({ width: image.naturalWidth, height: image.naturalHeight }));
  assert.ok(logo.width > 0 && logo.height > 0, "The local brand image must load.");
}

async function checkNoOverflow(page, width) {
  await page.setViewportSize({ width, height: 900 });
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
    `Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`,
  );
}

async function screenshot(page, name, width, height = 844) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(reviewDir, name), fullPage: false });
}

try {
  if (!(await readFile(path.join(publicRoot, "index.html"), "utf8"))) {
    throw new Error(`Updated deploy demo bundle not found at ${publicRoot}`);
  }

  // Empty first-use account: import a valid empty local base backup, then check
  // the welcome and small empty state without any demo orders.
  const firstUse = await createPage();
  let emptyState = await storeCall(firstUse, "/api/state");
  emptyState = { ...emptyState, orders: [], payments: [] };
  await storeCall(firstUse, "/api/import", "POST", emptyState);
  await firstUse.reload({ waitUntil: "networkidle" });
  await firstUse.locator("#view-today h1").waitFor();
  await checkFontsAndAssets(firstUse);
  assert.equal((await firstUse.locator("#view-today h1").innerText()).trim(), "Hoje");
  assert.equal(await firstUse.locator("#view-today .today-empty").count(), 1, "First-use should show the compact Today empty state.");
  assert.equal(await firstUse.locator("#view-today .next-action-card").count(), 0, "Next action stays hidden when there are no orders.");
  assert.equal(await firstUse.locator("#view-today .finance-summary").count(), 0, "Finance summary stays hidden when there are no orders.");
  const emptyDecoration = await firstUse.locator("#view-today .today-empty").evaluate((node) => ({
    content: node.innerText,
    illustrations: node.querySelectorAll("svg, img, [class*=calendar i], [aria-hidden=true]").length,
  }));
  assert.ok(!emptyDecoration.content.includes("✿"), "Empty state must not contain a decorative flower.");
  assert.equal(emptyDecoration.illustrations, 0, "Empty state must not contain an icon or calendar illustration.");
  assert.equal(await firstUse.locator("#view-today .welcome-actions [data-action=new-order]").count(), 1);
  await screenshot(firstUse, "today-first-use-390.png", 390);
  await firstUse.locator("#view-today .welcome-actions [data-action=new-order]").click();
  await firstUse.waitForFunction(() => document.querySelector("#order-dialog")?.open === true);
  await firstUse.locator("#order-dialog [data-close]").first().click();
  await firstUse.waitForFunction(() => document.querySelector("#order-dialog")?.open === false);
  await firstUse.locator('#view-today [data-view="week"]').click();
  await firstUse.waitForFunction(() => !document.querySelector("#view-week")?.hidden);
  assert.match(await firstUse.locator("#view-week h1").innerText(), /Sua semana/);
  await firstUse.locator('[data-view="today"].nav-item').click();

  // Demo state: use the bundle's built-in fictitious order, which is scheduled
  // for tomorrow and already carries the sample marker and payment.
  const demo = await createPage();
  await checkFontsAndAssets(demo);
  assert.equal(await demo.locator("#view-today .today-empty").count(), 1);
  assert.equal(await demo.locator("#view-today .coming-soon").count(), 1, "Future sample order should appear under Logo mais.");
  assert.match(await demo.locator("#view-today .coming-soon").innerText(), /Exemplo fictício/);
  assert.equal(await demo.locator("#view-today .finance-summary").count(), 1, "Finance summary can appear for the demo order.");
  await screenshot(demo, "today-demo-390.png", 390);

  // Active local fixtures: one undated draft and one confirmed Today order at
  // 10:00 with a 16:00 follow-up and R$50 confirmed toward a R$150 total.
  const active = await createPage();
  const activeBase = await storeCall(active, "/api/state");
  await importBackup(active, { ...activeBase, orders: [], payments: [] });
  const draft = await storeCall(active, "/api/orders", "POST", {
    client: "Rascunho de QA", product: "Bolo de teste", total: 45, status: "Orçamento",
  });
  const confirmed = await storeCall(active, "/api/orders", "POST", {
    client: "Pedido de QA", product: "Bolo de chocolate", dueAt: "2026-10-08T10:00",
    total: 150, status: "Confirmado", nextAction: "Confirmar retirada", nextAt: "2026-10-08T16:00",
    capacityOverride: { allowed: true, reason: "Fixture fictícia para QA local" },
  });
  await storeCall(active, `/api/orders/${confirmed.id}/payments`, "POST", {
    amount: 50, status: "Conferido", note: "Conferido no QA local",
  });
  await active.reload({ waitUntil: "networkidle" });
  await active.locator("#view-today h1").waitFor();
  await checkFontsAndAssets(active);
  const activeState = await storeCall(active, "/api/state");
  assert.equal(activeState.orders.length, 2, "Active state should contain exactly two local fixtures.");
  assert.ok(activeState.orders.some((order) => order.id === draft.id && order.status === "Orçamento"), "The local draft fixture should persist.");
  assert.ok(activeState.payments.some((payment) => payment.orderId === confirmed.id && payment.amount === 50 && payment.status === "Conferido"), "The R$50 local receipt should be confirmed.");
  assert.equal(await active.locator(`#view-today .today-agenda [data-open-order="${confirmed.id}"]`).count(), 1, "Confirmed order should be in today's agenda.");
  assert.equal(await active.locator("#view-today .next-action-card").count(), 1, "The confirmed order should produce a next action.");
  assert.match(await active.locator("#view-today .next-action-card").innerText(), /Confirmar retirada/);
  assert.equal(await active.locator("#view-today .finance-summary").count(), 1);
  assert.match(await active.locator("#view-today .finance-summary").innerText(), /R\$\s*150,00/);
  assert.match(await active.locator("#view-today .finance-summary").innerText(), /R\$\s*100,00/);
  await active.locator(`#view-today .today-agenda [data-open-order="${confirmed.id}"]`).click();
  await active.waitForFunction(() => document.querySelector("#detail-dialog")?.open === true);
  assert.match(await active.locator("#detail-content").innerText(), /Pedido de QA/);
  await active.locator("#detail-dialog [data-close]").first().click();
  await active.waitForFunction(() => document.querySelector("#detail-dialog")?.open === false);
  const nextActionButton = active.locator(`#view-today .next-action-card button[data-open-order="${confirmed.id}"]`);
  assert.equal(await nextActionButton.evaluate((button) => button.tagName), "BUTTON", "Next action should remain a native button.");
  assert.equal(await nextActionButton.getAttribute("aria-label"), "Ver pedido de Pedido de QA");
  await nextActionButton.click();
  await active.waitForFunction(() => document.querySelector("#detail-dialog")?.open === true);
  assert.match(await active.locator("#detail-content").innerText(), /Pedido de QA/);
  await active.locator("#detail-dialog [data-close]").first().click();
  await active.waitForFunction(() => document.querySelector("#detail-dialog")?.open === false);

  for (const width of [320, 390, 768, 1440]) {
    await checkNoOverflow(firstUse, width);
    await checkNoOverflow(demo, width);
    await checkNoOverflow(active, width);
  }
  await screenshot(active, "today-active-390.png", 390);
  await screenshot(active, "today-active-1440.png", 1440, 1000);

  assert.deepEqual(pageErrors, [], `Unexpected JavaScript errors: ${JSON.stringify(pageErrors)}`);
  assert.deepEqual(externalRequests, [], `Unexpected requests outside the local server: ${JSON.stringify(externalRequests)}`);
  console.log(`OK: Today QA passed at 320/390/768/1440px with fixed local time ${fixedTime}; first-use, future demo, and active two-order states; fonts/assets; no overflow or browser errors; local-only data. Screenshots: ${reviewDir}`);
} finally {
  await Promise.all(contexts.map((context) => context.close()));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
