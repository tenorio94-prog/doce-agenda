import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(webRoot, "deploy-cloud", "public");
const screenshotRoot = path.join(webRoot, "design", "ux-improvements");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".ttf": "font/ttf" };

const ids = { informed: "QA-INFORMED", paid: "QA-PAID", zero: "QA-ZERO", excess: "QA-EXCESS", future: "QA-FUTURE", cake: "QA-CAKE", sample: "EXEMPLO-001" };
const fixtures = {
  version: 1,
  orders: [
    { id: ids.informed, client: "Marina • cliente fictícia", product: "Bolo de aniversário • fictício", dueAt: "2026-10-01T15:00", total: 100, status: "Confirmado", mode: "Retirada", history: [{ at: "2026-10-01T12:00:00.000Z", text: "Pedido de exemplo fictício." }] },
    { id: ids.paid, client: "Ana • cliente fictícia", product: "Torta de limão • fictícia", dueAt: "2026-10-01T16:00", total: 100, status: "Confirmado", mode: "Entrega", history: [] },
    { id: ids.zero, client: "Lia • cliente fictícia", product: "Caixa de doces • fictícia", dueAt: "2026-10-01T17:00", total: 40, status: "Confirmado", mode: "Retirada", history: [] },
    { id: ids.excess, client: "Bia • cliente fictícia", product: "Bolo de festa • fictício", dueAt: "2026-10-01T18:00", total: 20, status: "Confirmado", mode: "Retirada", history: [] },
    { id: ids.future, client: "Joana • cliente fictícia", product: "Pedido futuro • fictício", dueAt: "2026-10-10T16:00", total: 75, status: "Confirmado", mode: "Retirada", history: [] },
    { id: ids.cake, client: "Nanda • cliente fictícia", product: "Bolo personalizado • fictício", dueAt: "2026-10-02T16:00", total: 90, status: "Em produção", mode: "Retirada", cake: { templateVersion: 1, values: { size: "20 cm" }, labels: { size: "Tamanho original" } }, history: [] },
    { id: ids.sample, client: "Marina • exemplo fictício", product: "Bolo de chocolate • exemplo", dueAt: "2026-10-01T14:00", total: 150, status: "Confirmado", mode: "Retirada", isSample: true, history: [{ at: "2026-10-01T12:00:00.000Z", text: "Exemplo fictício." }] },
  ],
  payments: [
    { id: "QA-PAY-INFORMED", orderId: ids.informed, amount: 40, status: "Informado", note: "Valor fictício informado, ainda não conferido", createdAt: "2026-10-01T12:00:00.000Z" },
    { id: "QA-PAY-PAID", orderId: ids.paid, amount: 20, status: "Conferido", note: "Entrada fictícia conferida", createdAt: "2026-10-01T12:00:00.000Z" },
    { id: "QA-PAY-ZERO", orderId: ids.zero, amount: 0, status: "Conferido", note: "Conferido sem recebimento", createdAt: "2026-10-01T12:00:00.000Z" },
    { id: "QA-PAY-EXCESS", orderId: ids.excess, amount: 200, status: "Conferido", note: "Valor fictício acima do combinado", createdAt: "2026-10-01T12:00:00.000Z" },
    { id: "QA-PAY-SAMPLE", orderId: ids.sample, amount: 50, status: "Conferido", note: "Dado de demonstração", createdAt: "2026-10-01T12:00:00.000Z" },
  ],
  availability: { closedWeekdays: [], minimumNoticeHours: 0, dailyOrderLimit: null, dateOverrides: {} },
  orderTemplate: { version: 1, fields: [
    { key: "size", label: "Tamanho", enabled: true, required: false, options: [] },
    { key: "flavor", label: "Sabor", enabled: true, required: false, options: [] },
    { key: "filling", label: "Recheio", enabled: true, required: false, options: [] },
    { key: "decoration", label: "Decoração", enabled: true, required: false, options: [] },
    { key: "inscription", label: "Inscrição", enabled: true, required: false, options: [] },
    { key: "foodNotes", label: "Observações alimentares", enabled: true, required: false, options: [] },
  ] },
};

let server;
const origin = await new Promise((resolve, reject) => {
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!relative) relative = "index.html";
      if (["app", "app/"].includes(relative)) relative = "app/index.html";
      if (["demo", "demo/"].includes(relative)) relative = "demo/index.html";
      if (["cadastro", "cadastro/"].includes(relative)) relative = "cadastro/index.html";
      let file = path.resolve(publicRoot, relative);
      if (!file.startsWith(`${publicRoot}${path.sep}`) && file !== publicRoot) { res.writeHead(403).end("Forbidden"); return; }
      try { await readFile(file); } catch { file = path.join(file, "index.html"); }
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      res.end(body);
    } catch { res.writeHead(404).end("Not found"); }
  });
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
});

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const errors = [];
const externalRequests = [];
const failedResponses = [];
const watch = (page) => {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (new URL(request.url()).origin !== origin) externalRequests.push(request.url()); });
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
};

const installStoreFixture = async (page) => {
  await page.addInitScript((seed) => {
    const storageKey = "qa-doce-agenda-state";
    const saveState = (state) => localStorage.setItem(storageKey, JSON.stringify(state));
    const readState = () => {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
      const initial = structuredClone(seed); saveState(initial); return initial;
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    window.DoceStore = { fetch: async (url, options = {}) => {
      const route = new URL(url, location.origin).pathname;
      const method = (options.method || "GET").toUpperCase();
      const state = readState();
      if (method === "GET" && ["/api/state", "/api/export"].includes(route)) return reply(state);
      if (method === "GET" && route === "/api/availability") return reply(state.availability);
      if (method === "GET" && route === "/api/order-template") return reply(state.orderTemplate);
      let body = {}; try { body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : (options.body || {}); } catch { return reply({ error: "JSON inválido." }, 400); }
      if (route === "/api/availability" && method === "PUT") { state.availability = body; saveState(state); return reply(state.availability); }
      if (route === "/api/order-template" && method === "PUT") {
        const changed = JSON.stringify(state.orderTemplate.fields) !== JSON.stringify(body.fields);
        state.orderTemplate = { ...body, version: changed ? state.orderTemplate.version + 1 : state.orderTemplate.version };
        saveState(state); return reply(state.orderTemplate);
      }
      if (route === "/api/orders" && method === "POST") {
        const order = { ...body, id: `QA-CREATED-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [{ at: new Date().toISOString(), text: "Pedido fictício de teste." }] };
        state.orders.push(order); saveState(state); return reply(order, 201);
      }
      const paymentMatch = route.match(/^\/api\/orders\/([^/]+)\/payments$/);
      if (paymentMatch && method === "POST") {
        const payment = { ...body, id: `QA-NEW-PAY-${Date.now()}`, orderId: decodeURIComponent(paymentMatch[1]), createdAt: new Date().toISOString() };
        state.payments.push(payment); saveState(state); return reply(payment, 201);
      }
      const confirmMatch = route.match(/^\/api\/payments\/([^/]+)$/);
      if (confirmMatch && method === "PUT") {
        const payment = state.payments.find((item) => item.id === decodeURIComponent(confirmMatch[1]));
        if (!payment) return reply({ error: "Pagamento não encontrado." }, 404);
        payment.status = "Conferido"; saveState(state); return reply(payment);
      }
      if (route === "/api/import" && method === "POST") { saveState(body); return reply({ ok: true }); }
      return reply({ error: `Rota de fixture não reconhecida: ${method} ${route}` }, 404);
    } };
  }, fixtures);
};

const installCloudShellFixture = async (page) => {
  await page.route("**/cloud-bootstrap.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: `(() => {
    window.DoceApi = Object.freeze({ mode: "browser", fetch: window.DoceStore.fetch.bind(window.DoceStore) });
    const logout = document.createElement("button"); logout.type = "button"; logout.className = "button button-small qa-signout"; logout.textContent = "Sair"; logout.setAttribute("aria-label", "Sair (fixture de QA)"); document.querySelector(".topbar-actions").append(logout);
    const app = document.createElement("script"); app.src = "/cloud-app.js"; document.body.append(app);
  })();` }));
};

const installAccountAuthFixture = async (page) => {
  await page.route("**/account/config.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: "window.DoceCloudConfig = Object.freeze({});" }));
  await page.route("**/account/account-controller.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: `window.__resetCalls = []; window.DoceAuth = {
    async getCapabilities() { return { configured: true, email: true, recoveryEmail: false, google: false }; },
    async getSession() { return { data: { session: null } }; }, onAuthStateChange() { return () => {}; },
    async signUp() { return { data: {}, error: null }; }, async signIn() { return { data: {}, error: null }; },
    async sendPasswordReset(...args) { window.__resetCalls.push(args); throw new Error("Não deve chamar SMTP no fixture manual."); }, async updatePassword() { return { data: {}, error: null }; },
  };` }));
};

const newAppPage = async (context) => {
  const page = await context.newPage(); watch(page); await installStoreFixture(page); await installCloudShellFixture(page);
  await page.clock.install({ time: new Date("2026-10-01T12:00:00-03:00") });
  await page.goto(`${origin}/app/`, { waitUntil: "networkidle" });
  await page.locator("#view-today h1").waitFor();
  return page;
};

try {
  await mkdir(screenshotRoot, { recursive: true });

  // The cloud app is fixture-backed; every route, asset, and auth call stays on this local server.
  const appContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await newAppPage(appContext);
  const summary = await page.locator("#view-today .finance-summary").innerText();
  assert.match(summary, /R\$\s*120,00/);
  assert.match(summary, /Saldo parcial conhecido · 3 pedidos ainda sem recebimento conferido/i);
  assert.equal(await page.locator("#nav-order-count").innerText(), "6", "A contagem operacional deve ignorar o pedido de exemplo.");
  await page.locator(".sample-examples > summary").click();
  assert.equal(await page.getByRole("button", { name: /Ver exemplo: Marina/ }).count(), 1);
  await page.locator(".sample-examples").screenshot({ path: path.join(screenshotRoot, "exemplo-operacional.png") });
  await page.locator(".sample-examples [data-open-order]").click();
  assert.match(await page.locator("#detail-content").innerText(), /Exemplo fictício/);
  await page.locator("#detail-dialog [data-close]").click();

  // Use a small, clearly fictitious two-order set for marketing proofs; keep the larger test fixture intact.
  const marketingContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const marketing = await newAppPage(marketingContext);
  await marketing.evaluate((keepIds) => {
    const key = "qa-doce-agenda-state";
    const state = JSON.parse(localStorage.getItem(key));
    state.orders = state.orders.filter((order) => keepIds.includes(order.id));
    const orderIds = new Set(state.orders.map((order) => order.id));
    state.payments = state.payments.filter((payment) => orderIds.has(payment.orderId));
    localStorage.setItem(key, JSON.stringify(state));
  }, [ids.informed, ids.paid, ids.sample]);
  await marketing.reload(); await marketing.locator("#view-today h1").waitFor(); await marketing.evaluate(() => document.fonts.ready);
  await marketing.screenshot({ path: path.join(screenshotRoot, "agenda.png") });
  await marketing.locator(".nav-item[data-view='week']").click(); await marketing.locator("#view-week h1").waitFor();
  await marketing.locator('[data-select-day="2026-10-01"]').waitFor();
  await marketing.screenshot({ path: path.join(screenshotRoot, "semana.png") });
  await marketing.locator(".nav-item[data-view='orders']").click(); await marketing.locator(`#view-orders [data-open-order="${ids.informed}"]`).click();
  await marketing.locator('#detail-content [data-action="add-payment"]').click();
  await marketing.locator("#payment-context").getByText("Marina • cliente fictícia").waitFor();
  await marketing.evaluate(() => document.fonts.ready); await marketing.screenshot({ path: path.join(screenshotRoot, "pagamento.png") });
  await marketingContext.close();

  // All operational views share the cloud header and remain inside the viewport.
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 980 });
    assert.equal(await page.locator(".qa-signout").innerText(), "Sair");
    for (const view of ["today", "orders", "week", "settings"]) {
      if (view === "settings") await page.locator(".settings-button").click();
      else await page.locator(`.nav-item[data-view="${view}"]`).click();
      await page.locator(`#view-${view} h1`).waitFor();
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.width, `Horizontal overflow at ${width}px in ${view}: ${JSON.stringify(dimensions)}`);
    }
    await page.locator(".brand[data-view='today']").click();
    assert.equal(await page.locator(".nav-item[data-view='today']").getAttribute("aria-current"), "page", "Logo navigation should return to Today.");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".nav-item[data-view='orders']").click();
  const filter = page.locator("#status-filter"); await filter.focus(); await filter.selectOption("Confirmado");
  assert.equal(await filter.evaluate((el) => document.activeElement === el), true, "The status filter should retain focus after re-render.");
  assert.equal(await page.locator("#view-orders [data-open-order]").count(), 5);

  // Week shows operational counts, supports day selection and previous/next navigation.
  await page.locator(".nav-item[data-view='week']").click();
  const todayButton = page.locator('[data-select-day="2026-10-01"]');
  assert.match(await todayButton.getAttribute("aria-label"), /4 pedidos/);
  await todayButton.click(); assert.equal(await todayButton.getAttribute("aria-pressed"), "true");
  const initialRange = await page.locator(".week-range").innerText();
  await page.locator('[data-week-shift="1"]').click();
  const nextRange = await page.locator(".week-range").innerText(); assert.notEqual(nextRange, initialRange);
  await page.locator('[data-week-shift="-1"]').click(); assert.equal(await page.locator(".week-range").innerText(), initialRange);

  // Settings persist future-date rules; template edits increment version without relabeling old orders.
  await page.locator(".settings-button").click();
  const settingsDate = page.locator("#settings-date"); await settingsDate.fill("2026-10-10");
  await page.locator('#date-availability-form[data-date="2026-10-10"]').waitFor();
  await page.locator('#date-availability-form [name="closed"]').check();
  await page.locator('#date-availability-form [name="limit"]').fill("2");
  await page.locator("#date-availability-form").evaluate((form) => form.requestSubmit());
  await page.locator("#toast").getByText("Exceção da data salva.").waitFor();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem("qa-doce-agenda-state")));
  assert.deepEqual(stored.availability.dateOverrides["2026-10-10"], { closed: true, limit: 2 });
  await page.reload(); await page.locator("#view-today h1").waitFor(); await page.locator(".settings-button").click();
  await page.locator("#settings-date").fill("2026-10-10");
  const restoredDateForm = page.locator('#date-availability-form[data-date="2026-10-10"]');
  await restoredDateForm.waitFor(); assert.equal(await restoredDateForm.locator('[name="closed"]').isChecked(), true); assert.equal(await restoredDateForm.locator('[name="limit"]').inputValue(), "2");

  await page.locator(".order-template-settings > summary").click();
  const sizeField = page.locator("#order-template-form .template-field").filter({ has: page.locator('input[name="label.size"]') });
  await sizeField.locator("summary").click(); await sizeField.locator('[name="required"][value="size"]').check();
  await sizeField.locator('[name="label.size"]').fill("Diâmetro");
  await page.locator("#order-template-form").evaluate((form) => form.requestSubmit());
  await page.locator("#toast").getByText("Modelo do bolo salvo.").waitFor();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("qa-doce-agenda-state")));
  const sizeConfig = stored.orderTemplate.fields.find((field) => field.key === "size");
  assert.equal(sizeConfig.required, true); assert.equal(sizeConfig.label, "Diâmetro"); assert.equal(stored.orderTemplate.version, 2);
  await page.locator(".nav-item[data-view='orders']").click(); await page.locator(`#view-orders [data-open-order="${ids.cake}"]`).click();
  assert.match(await page.locator("#detail-content").innerText(), /Tamanho original[\s\S]*20 cm/);
  await page.locator("#detail-dialog [data-close]").click();
  await page.locator(".settings-button").click();
  await page.screenshot({ path: path.join(screenshotRoot, "ajustes.png"), fullPage: true });

  // An Informado payment leaves the balance unknown; confirming it adds it, including zero and excess edge cases.
  await page.locator(".nav-item[data-view='orders']").click();
  await page.locator(`#view-orders [data-open-order="${ids.informed}"]`).click();
  assert.match(await page.locator("#detail-content").innerText(), /Ainda não conferido/);
  await page.locator('#detail-content [data-action="add-payment"]').click();
  await page.locator("#payment-context").getByText("Marina • cliente fictícia").waitFor();
  await page.locator('#payment-dialog [name="amount"]').fill("10");
  await page.locator('#payment-dialog [name="status"]').selectOption("Informado");
  await page.locator('#payment-dialog [name="note"]').fill("Pagamento fictício informado");
  await page.locator("#save-payment-button").click(); await page.locator("#toast").getByText("Pagamento registrado.").waitFor();
  assert.match(await page.locator("#detail-content").innerText(), /Ainda não conferido/, "An Informado receipt must not make the balance known.");
  await page.locator('#detail-content [data-action="confirm-payment"][data-id="QA-PAY-INFORMED"]').click();
  await page.locator("#toast").getByText("Pagamento marcado como conferido.").waitFor();
  await page.waitForFunction(() => document.querySelector("#detail-content")?.innerText.replace(/\s/g, " ").includes("Saldo a receber R$ 60,00"));
  assert.match(await page.locator("#detail-content").innerText(), /Saldo a receber[\s\S]*R\$\s*60,00/);
  await page.locator('#detail-content [data-action="confirm-payment"]').first().click();
  await page.locator("#toast").getByText("Pagamento marcado como conferido.").waitFor();
  await page.waitForFunction(() => document.querySelector("#detail-content")?.innerText.replace(/\s/g, " ").includes("Saldo a receber R$ 50,00"));
  assert.match(await page.locator("#detail-content").innerText(), /Saldo a receber[\s\S]*R\$\s*50,00/);
  await page.locator("#detail-dialog [data-close]").click();
  await page.locator(`#view-orders [data-open-order="${ids.zero}"]`).click();
  assert.match(await page.locator("#detail-content").innerText(), /Saldo a receber[\s\S]*R\$\s*40,00/);
  await page.locator("#detail-dialog [data-close]").click();
  await page.locator(`#view-orders [data-open-order="${ids.excess}"]`).click();
  assert.match(await page.locator("#detail-content").innerText(), /Excedente R\$\s*180,00/);
  await page.locator("#detail-dialog [data-close]").click();
  await page.locator(".nav-item[data-view='today']").click();
  const finalSummary = await page.locator("#view-today .finance-summary").innerText();
  assert.match(finalSummary, /R\$\s*170,00/);
  assert.match(finalSummary, /Saldo parcial conhecido · 2 pedidos ainda sem recebimento conferido/i);

  // Login and manual recovery are stubbed; the manual path must not submit a reset request.
  const accountContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const accountPage = await accountContext.newPage(); watch(accountPage); await installAccountAuthFixture(accountPage);
  await accountPage.goto(`${origin}/cadastro/?mode=login`, { waitUntil: "networkidle" });
  await accountPage.locator("#login-form").waitFor();
  const headerBox = await accountPage.locator(".account-card").boundingBox();
  const introBox = await accountPage.locator(".intro").boundingBox();
  assert.ok(headerBox.y < introBox.y, "On mobile the access form must precede the promotional introduction.");
  assert.ok((await accountPage.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await accountPage.screenshot({ path: path.join(screenshotRoot, "acesso.png"), fullPage: true });
  await accountPage.goto(`${origin}/cadastro/?mode=recovery`, { waitUntil: "networkidle" });
  assert.equal(await accountPage.locator("#recovery-form").isVisible(), false);
  assert.match(await accountPage.locator("#recovery-support").innerText(), /convidou/);
  await accountPage.locator("#recovery-support a").click();
  await accountPage.locator("#login-form").waitFor();
  assert.deepEqual(await accountPage.evaluate(() => window.__resetCalls), []);
  await accountContext.close();

  // The landing shows the day preview and keeps its local signup/demo paths.
  const landingContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const landing = await landingContext.newPage(); watch(landing);
  await landing.goto(origin, { waitUntil: "networkidle" });
  const logo = await landing.locator("header .brand img").evaluate(async (image) => { await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight }; });
  assert.ok(logo.width > 0 && logo.height > 0, "Logo must load.");
  assert.equal(await landing.locator(".preview-stack .stamp").count(), 1);
  assert.ok(await landing.locator('a[href="/cadastro/"]').count() >= 1);
  assert.ok(await landing.locator('a[href="/demo/"]').count() >= 1);
  const tour = landing.locator(".preview-stack"); await tour.scrollIntoViewIfNeeded();
  await tour.screenshot({ path: path.join(screenshotRoot, "landing-desktop.png") });
  await landing.setViewportSize({ width: 390, height: 844 }); await tour.scrollIntoViewIfNeeded();
  await tour.screenshot({ path: path.join(screenshotRoot, "landing-mobile.png") });
  await landingContext.close();

  assert.deepEqual(errors, [], `Unexpected JavaScript errors: ${errors.join("; ")}`);
  assert.deepEqual(externalRequests, [], `Off-origin requests: ${externalRequests.join(", ")}`);
  assert.deepEqual(failedResponses, [], `Failed local responses: ${failedResponses.join("; ")}`);
  console.log(`OK: responsive Today/Orders/Week/Settings (320/390/768/1440), fixture auth/recovery, sample exclusion, filters/focus, weekly date navigation, availability persistence, template version and old labels, payment balances, three landing images, zero off-origin requests. Screenshots: ${screenshotRoot}.`);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
