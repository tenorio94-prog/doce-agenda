import assert from "node:assert/strict";
import { createServer } from "node:http";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Capture the pilot's current visual states with:
//   node scripts/review-app-visual.mjs
// For a deployed pilot, set APP_REVIEW_ORIGIN; captures use LOCAL/LIVE prefixes.
// Each run creates a fresh browser context and installs only fictitious records.
// The local static server is temporary, loopback-only, and serves deploy-launch/public.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(webRoot, "deploy-launch", "public");
const reviewDir = path.join(webRoot, "design", "app-polish-review");
const liveOrigin = process.env.APP_REVIEW_ORIGIN;
const prefix = liveOrigin ? "LIVE" : "LOCAL";
const exists = (filePath) => access(filePath).then(() => true, () => false);

if (!liveOrigin && !(await exists(path.join(publicRoot, "app", "index.html"))) && !(await exists(path.join(publicRoot, "index.html")))) {
  throw new Error(`Pilot build not found in ${publicRoot}. Build the launch site before running this visual review.`);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let server;
let origin = liveOrigin;
if (!origin) {
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const relative = pathname === "/"
        ? "index.html"
        : pathname === "/app" || pathname === "/app/"
          ? "app/index.html"
          : pathname.replace(/^\/+/, "");
      const filePath = path.resolve(publicRoot, relative);
      if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
}

await mkdir(reviewDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const pageErrors = [];
const apiNetworkRequests = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) apiNetworkRequests.push(request.url());
});

const capture = async (name, fullPage = false) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
  await page.screenshot({ path: path.join(reviewDir, `${prefix}-${name}.png`), fullPage });
};
const openView = async (view) => {
  await page.locator(`.nav-item[data-view="${view}"]`).click();
  const panel = page.locator(`#view-${view}`);
  await panel.locator("h1").waitFor({ state: "visible" });
  return panel;
};
const dimensions = async () => page.evaluate(() => ({
  viewport: document.documentElement.clientWidth,
  document: document.documentElement.scrollWidth,
  body: document.body.scrollWidth,
}));
const assertNoOverflow = async (width, view) => {
  const size = await dimensions();
  assert.ok(size.document <= size.viewport && size.body <= size.viewport,
    `Horizontal overflow in ${view} at ${width}px: ${JSON.stringify(size)}`);
};

try {
  // A deliberately empty browser-local store prevents real or prior data from
  // entering this run. The only records below are explicitly fictitious.
  await context.addInitScript(() => {
    const key = "doce-agenda.pilot.v1";
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify({ version: 1, orders: [], payments: [] }));
    }
  });
  await page.clock.install({ time: new Date("2026-10-01T12:00:00-03:00") });
  await page.goto(new URL("/app/", origin).href, { waitUntil: "networkidle" });
  await page.locator("#view-today h1").waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => window.DoceApi?.mode), "browser", "Pilot must use browser-local storage.");
  assert.match(await page.locator("body").innerText(), /Hoje|Seus pedidos/, "Pilot should render meaningful content.");

  const fictitiousOrders = [
    {
      client: "Camila • cliente fictícia",
      product: "Bolo de chocolate • orçamento fictício",
      details: "Exemplo visual. Sem contato ou endereço.",
      dueAt: "2026-10-01T15:00",
      total: 150,
      status: "Orçamento",
    },
    {
      client: "Camila • cliente fictícia",
      product: "Bolo de baunilha • confirmado fictício",
      details: "Exemplo visual. Sem contato ou endereço.",
      dueAt: "2026-10-02T16:00",
      total: 280,
      status: "Confirmado",
    },
    {
      client: "Camila • cliente fictícia",
      product: "Caixa de doces • produção fictícia",
      details: "Exemplo visual. Sem contato ou endereço.",
      dueAt: "2026-10-01T15:00",
      total: 90,
      status: "Em produção",
    },
  ];
  const orders = [];
  for (const order of fictitiousOrders) {
    const response = await page.evaluate(async (payload) => {
      const result = await window.DoceStore.fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { status: result.status, body: await result.json() };
    }, order);
    assert.equal(response.status, 201, `Could not create fictional order ${order.product}: ${JSON.stringify(response.body)}`);
    orders.push(response.body);
  }
  for (const payment of [
    { orderId: orders[1].id, amount: 80, status: "Informado", note: "Entrada fictícia" },
    { orderId: orders[2].id, amount: 30, status: "Conferido", note: "Pagamento fictício conferido" },
  ]) {
    const result = await page.evaluate(async (payload) => {
      const response = await window.DoceStore.fetch(`/api/orders/${payload.orderId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: payload.amount, status: payload.status, note: payload.note }),
      });
      return { status: response.status, body: await response.json() };
    }, payment);
    assert.equal(result.status, 200, `Could not create fictional payment: ${JSON.stringify(result.body)}`);
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#view-today h1").waitFor({ state: "visible" });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await openView("today");
  await capture("today-desktop-1440x1000");
  await page.setViewportSize({ width: 390, height: 844 });
  await openView("today");
  await capture("today-mobile-390x844");

  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const view of ["today", "orders", "week"]) {
      await openView(view);
      await assertNoOverflow(width, view);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await openView("orders");
  await capture("orders-mobile-390x844");
  await openView("week");
  await capture("week-mobile-390x844");

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await openView("today");
    await page.locator(".nav-new-order").click();
    await page.locator("#order-dialog").waitFor({ state: "visible" });
    await capture(`form-mobile-${width}`);
    await page.locator('#order-dialog .close-dialog').click();
    await page.locator("#order-dialog").waitFor({ state: "hidden" });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await openView("orders");
  await page.locator(`#view-orders [data-open-order="${orders[1].id}"]`).first().click();
  await page.locator("#detail-dialog").waitFor({ state: "visible" });
  assert.match(await page.locator("#detail-content").innerText(), /Camila|confirmado fictício/i);
  await capture("detail-mobile-390x844");
  await page.locator('#detail-dialog [data-action="add-payment"]').click();
  await page.locator("#payment-dialog").waitFor({ state: "visible" });
  assert.match(await page.locator("#payment-dialog").innerText(), /pagamento/i);
  await capture("payment-mobile-390x844");

  assert.deepEqual(apiNetworkRequests, [], `Unexpected real /api network requests: ${apiNetworkRequests.join(", ")}`);
  assert.deepEqual(pageErrors, [], `Unexpected JavaScript errors: ${pageErrors.join("; ")}`);
  console.log(`Visual review ready: ${reviewDir} (${prefix}); 3 fictitious orders, 2 fictitious payments, no /api network requests, no JS errors.`);
} finally {
  await context.close();
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
