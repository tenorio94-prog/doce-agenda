import assert from "node:assert/strict";
import { createServer } from "node:http";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Review the finished cloud brand build locally with `node scripts/review-brand-refresh.mjs`.
// This review uses only public GETs and deliberately never submits an account form.
// The static server binds to loopback and serves deploy-cloud/public only.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(webRoot, "deploy-cloud", "public");
const brandDir = path.join(webRoot, "design", "brand-refresh");
const requiredFiles = [
  path.join(publicRoot, "index.html"),
  path.join(publicRoot, "cadastro", "index.html"),
  path.join(publicRoot, "demo", "index.html"),
  path.join(publicRoot, "logo.svg"),
  path.join(brandDir, "wordmark.svg"),
  path.join(brandDir, "wordmark-mono.svg"),
  path.join(brandDir, "wordmark-white.svg"),
  path.join(brandDir, "app-icon.svg"),
  path.join(brandDir, "before-logo.svg"),
  path.join(brandDir, "before-favicon.svg"),
];

for (const filePath of requiredFiles) {
  await access(filePath).catch(() => {
    throw new Error(`Build or brand asset not found: ${filePath}`);
  });
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

let server;
let browser;
const origin = await new Promise((resolve, reject) => {
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      const relative = pathname === "/"
        ? "index.html"
        : pathname === "/cadastro" || pathname === "/cadastro/"
          ? "cadastro/index.html"
          : pathname === "/demo" || pathname === "/demo/"
            ? "demo/index.html"
            : pathname.replace(/^\/+/, "");
      const filePath = path.resolve(publicRoot, relative);
      if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
});

const browserErrors = [];
const failedResponses = [];
const writeRequests = [];
const watchPage = (page) => {
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (request) => {
    if (!(["GET", "HEAD", "OPTIONS"].includes(request.method().toUpperCase()))) {
      writeRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    failedResponses.push(`requestfailed ${request.url()} (${request.failure()?.errorText || "unknown error"})`);
  });
};

const waitForAssets = async (page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
};

const waitForSignupEnabled = async (page) => {
  await page.locator("#signup-submit").waitFor();
  await page.waitForFunction(() => {
    const button = document.querySelector("#signup-submit");
    return button && !button.disabled;
  }, null, { timeout: 20000 });
};

const assertNoHorizontalOverflow = async (page, width, route) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
    `Horizontal overflow at ${width}px on ${route}: ${JSON.stringify(dimensions)}`,
  );
};

const assertLocalDemoSample = async (page) => {
  await page.waitForFunction(() => {
    return Boolean(document.querySelector("#view-today h1") || !document.querySelector("#error-notice")?.hidden);
  }, null, { timeout: 15000 });
  const appError = await page.locator("#error-notice").innerText().catch(() => "");
  assert.equal(await page.locator("#error-notice").isVisible(), false, `The demo app should load its local sample: ${appError}`);
  await page.locator("#view-today h1").waitFor({ state: "visible" });
  await page.getByText("Exemplo fictício", { exact: false }).first().waitFor();
  assert.equal(await page.evaluate(() => window.DoceApi?.mode), "browser", "The demo must use local browser storage.");
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("doce-agenda.pilot.v1")));
  assert.ok(state && Array.isArray(state.orders) && Array.isArray(state.payments), "The demo sample should exist in browser storage.");
  assert.ok(state.orders.length > 0 && state.orders.every((order) => order.isSample === true), "The demo must contain only fictional sample orders.");
  assert.ok(state.payments.every((payment) => state.orders.some((order) => order.id === payment.orderId)), "Sample payments must belong to a sample order.");
};

const makeBrandBoard = async () => {
  const asset = async (name) => `data:image/svg+xml;base64,${(await readFile(path.join(brandDir, name))).toString("base64")}`;
  const publicLogo = `data:image/svg+xml;base64,${(await readFile(path.join(publicRoot, "logo.svg"))).toString("base64")}`;
  const [wordmark, mono, white, icon, beforeLogo, beforeIcon] = await Promise.all([
    asset("wordmark.svg"),
    asset("wordmark-mono.svg"),
    asset("wordmark-white.svg"),
    asset("app-icon.svg"),
    asset("before-logo.svg"),
    asset("before-favicon.svg"),
  ]);
  const board = await browser.newPage({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1 });
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:52px;background:#fbf7f0;color:#392923;font:16px/1.5 Arial,sans-serif}
    h1{margin:0 0 8px;font:600 32px/1.2 Georgia,serif}p{margin:0;color:#6f5b51}h2{margin:0 0 18px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6f5b51}
    .head{margin-bottom:36px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{min-height:205px;padding:24px;border:1px solid #e5d9cd;border-radius:18px;background:#fffefa;display:flex;flex-direction:column;justify-content:space-between}
    .logo{display:block;width:min(100%,420px);height:auto}.logo-small{width:min(100%,340px)}.swatch{justify-content:center;background:#a34432}.swatch h2{color:#fff0e8}.icons{display:flex;align-items:end;gap:32px}.icon{display:grid;justify-items:center;gap:8px}.icon img{display:block}.icon span{font-size:12px;color:#6f5b51}
    .before{grid-column:1/-1;min-height:180px}.before-row{display:flex;align-items:center;gap:30px}.before-row img{width:min(380px,65%);height:auto}.before-row .icon img{width:48px;height:48px}
  </style></head><body><header class="head"><h1>Doce Agenda</h1><p>Revisão da identidade · arquivos entregues no build local</p></header>
    <main class="grid">
      <section class="card"><div><h2>Wordmark · cor</h2><img class="logo" src="${publicLogo}" alt="Wordmark colorido servido pelo build público"></div><p>Logo aplicado em /logo.svg</p></section>
      <section class="card"><div><h2>Wordmark · monocromático</h2><img class="logo logo-small" src="${mono}" alt="Wordmark monocromático"></div><p>Versão para fundos claros</p></section>
      <section class="card swatch"><div><h2>Wordmark · branco</h2><img class="logo logo-small" src="${white}" alt="Wordmark branco"></div><p style="color:#fff0e8">Aplicação em fundo terracota</p></section>
      <section class="card"><div><h2>Ícone da marca</h2><div class="icons"><div class="icon"><img src="${icon}" width="32" height="32" alt="Ícone da Doce Agenda em 32 pixels"><span>32 px</span></div><div class="icon"><img src="${icon}" width="48" height="48" alt="Ícone da Doce Agenda em 48 pixels"><span>48 px</span></div></div></div><p>Ícone quadrado com bordas arredondadas</p></section>
      <section class="card before"><div><h2>Identidade anterior · comparação</h2><div class="before-row"><img src="${beforeLogo}" alt="Wordmark anterior da Doce Agenda"><div class="icon"><img src="${beforeIcon}" width="48" height="48" alt="Favicon anterior da Doce Agenda"><span>Favicon anterior · 32 px</span></div></div></div><p>Arquivo anterior preservado para referência visual</p></section>
    </main></body></html>`;
  try {
    await board.setContent(html, { waitUntil: "load" });
    await waitForAssets(board);
    await board.screenshot({ path: path.join(brandDir, "brand-board.png"), fullPage: true });
  } finally {
    await board.close();
  }

  const before = await browser.newPage({ viewport: { width: 960, height: 420 }, deviceScaleFactor: 1 });
  try {
    await before.setContent(`<!doctype html><html><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf7f0"><img src="${beforeLogo}" alt="Wordmark anterior" style="width:min(74vw,520px);height:auto"></body></html>`, { waitUntil: "load" });
    await waitForAssets(before);
    await before.screenshot({ path: path.join(brandDir, "before-logo.png") });
  } finally {
    await before.close();
  }
};

try {
  await mkdir(brandDir, { recursive: true });
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });

  for (const width of [320, 390, 720, 1440]) {
    const height = width === 390 ? 844 : width === 1440 ? 1000 : 900;
    for (const route of ["/", "/cadastro/", "/demo/"]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      watchPage(page);
      try {
        await page.goto(new URL(route, origin).href, { waitUntil: "networkidle" });
        await waitForAssets(page);
        if (route === "/cadastro/") {
          await waitForSignupEnabled(page);
          assert.equal(await page.locator("#signup-form").isVisible(), true, "The signup form should be visible after real auth settings load.");
          assert.equal(await page.locator("#signup-submit").isDisabled(), false, "Signup should be enabled by the live settings response.");
        }
        if (route === "/demo/") await assertLocalDemoSample(page);
        await assertNoHorizontalOverflow(page, width, route);

        if (width === 390 || width === 1440) {
          const name = route === "/" ? "landing" : route === "/cadastro/" ? "account" : "demo";
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: path.join(brandDir, `${name}-${width}.png`), fullPage: true });
        }
      } finally {
        await context.close();
      }
    }
  }

  // Check the three primary routes as visitors would use them. Each starts in
  // a fresh browser context to keep each navigation check independent.
  const checkNavigation = async (verify) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    watchPage(page);
    try {
      await page.goto(origin, { waitUntil: "networkidle" });
      await verify(page);
    } finally {
      await context.close();
    }
  };
  await checkNavigation(async (page) => {
    const link = page.getByRole("link", { name: "Criar minha conta" }).first();
    assert.equal(await link.getAttribute("href"), "/cadastro/");
    await link.click();
    await waitForSignupEnabled(page);
    assert.match(new URL(page.url()).pathname, /^\/cadastro\/?$/);
  });
  await checkNavigation(async (page) => {
    const link = page.getByRole("link", { name: "Entrar" }).first();
    assert.equal(await link.getAttribute("href"), "/cadastro/?mode=login");
    await link.click();
    await page.locator("#login-form").waitFor({ state: "visible" });
    assert.equal(new URL(page.url()).searchParams.get("mode"), "login");
  });
  await checkNavigation(async (page) => {
    const link = page.getByRole("link", { name: "Ver demonstração" });
    assert.equal(await link.getAttribute("href"), "/demo/");
    await link.click();
    await assertLocalDemoSample(page);
  });

  const recoveryContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const recoveryPage = await recoveryContext.newPage();
  watchPage(recoveryPage);
  try {
    await recoveryPage.goto(new URL("/cadastro/?mode=recovery", origin).href, { waitUntil: "networkidle" });
    assert.equal(await recoveryPage.locator("#recovery-form").isVisible(), false, "Recovery stays hidden when email delivery is disabled.");
    assert.match(await recoveryPage.locator("#form-intro").innerText(), /quem te convidou/i);
    assert.equal(await recoveryPage.locator("#recovery-form").locator("button[type=submit]").isVisible(), false, "No recovery submit action should be exposed while email delivery is disabled.");
  } finally {
    await recoveryContext.close();
  }

  await makeBrandBoard();

  assert.deepEqual(writeRequests, [], `Only public GET navigation is allowed in this review: ${writeRequests.join("; ")}`);
  assert.deepEqual(browserErrors, [], `Unexpected JavaScript errors: ${browserErrors.join("; ")}`);
  assert.deepEqual(failedResponses, [], `Build assets failed to load: ${failedResponses.join("; ")}`);
  console.log(`OK: routes at 320/390/720/1440, live signup settings, login/navigation, local fictional demo, recovery disabled, GET-only network, brand screenshots. Screenshots: ${brandDir}.`);
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
