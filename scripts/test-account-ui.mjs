import assert from "node:assert/strict";
import { createServer } from "node:http";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Review the live account UI locally with `node scripts/test-account-ui.mjs`.
// Do not run until the real account controller bundle is present in public/account.
// Provider stubs below are fulfilled only by Playwright routes and are never served by the app.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(webRoot, "public");
const controllerPath = path.join(publicRoot, "account", "account-controller.js");
const reviewDir = path.join(webRoot, "design", "account-review");
const exists = (filePath) => access(filePath).then(() => true, () => false);

if (!(await exists(path.join(publicRoot, "account", "index.html")))) {
  throw new Error(`UI de conta não encontrada em ${publicRoot}.`);
}
if (!(await exists(controllerPath))) {
  throw new Error(`Controlador real ainda não está pronto: ${controllerPath}. Aguarde o bundle antes de executar este review.`);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

let server;
const origin = await new Promise((resolve, reject) => {
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      const relative = pathname === "/cadastro" || pathname === "/cadastro/"
        ? "account/index.html"
        : pathname === "/demo" || pathname === "/demo/"
          ? "index.html"
          : pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
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

await mkdir(reviewDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const pageErrors = [];
const failedResponses = [];
const authRequests = [];
const watchPage = (page) => {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/\/auth\/v1(?:\/|$)|\/rest\/v1(?:\/|$)|\/api(?:\/|$)/i.test(url.pathname)) authRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    failedResponses.push(`requestfailed ${request.url()} (${request.failure()?.errorText || "unknown error"})`);
  });
};

const installTestProvider = async (page, options = {}) => {
  const google = options.google === true;
  const recoveryError = options.recoveryError || null;
  await page.route("**/account/account-controller.js", async (route) => {
    const source = `
      (() => {
        const calls = [];
        window.__doceAuthCalls = calls;
        window.DoceAuth = {
          async getCapabilities() { return { configured: true, email: true, recoveryEmail: ${options.recoveryEmail !== false}, google: ${google} }; },
          async signUp(payload) { calls.push({ method: "signUp", payload }); return { data: { user: { id: "fixture-user", email: payload.email }, session: null }, error: null }; },
          async signIn(payload) { calls.push({ method: "signIn", payload }); return { data: { user: { id: "fixture-user", email: payload.email }, session: null }, error: null }; },
          async signInWithGoogle() { calls.push({ method: "signInWithGoogle" }); return { data: { url: "https://accounts.google.com/fixture" }, error: null }; },
          async sendPasswordReset(email) { calls.push({ method: "sendPasswordReset", email }); return ${JSON.stringify(recoveryError)} ? { data: null, error: ${JSON.stringify(recoveryError)} } : { data: {}, error: null }; },
          async updatePassword(password) { calls.push({ method: "updatePassword", password }); return { data: { user: { id: "fixture-user" } }, error: null }; },
          async getSession() { calls.push({ method: "getSession" }); return { data: { session: null }, error: null }; },
          onAuthStateChange(callback) { window.__doceAuthCallback = callback; return () => {}; },
        };
      })();
    `;
    await route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: source });
  });
};

const waitForReady = async (page) => {
  await page.goto(`${origin}/cadastro/`, { waitUntil: "networkidle" });
  await page.locator("#form-title").waitFor();
  await page.evaluate(() => document.fonts.ready);
};

try {
  // Configuration-empty path must use the real controller and make no auth/API calls.
  const emptyContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const emptyPage = await emptyContext.newPage();
  await emptyPage.route('**/account/config.js', route => route.fulfill({
    contentType: 'text/javascript', body: 'window.DoceCloudConfig=Object.freeze({});',
  }));
  watchPage(emptyPage);
  await waitForReady(emptyPage);
  await assert.doesNotReject(async () => emptyPage.locator("#service-notice").getByText("O cadastro está sendo preparado").waitFor());
  assert.equal(await emptyPage.locator("#signup-submit").isDisabled(), true, "Registration must be disabled while auth configuration is empty.");
  assert.equal(await emptyPage.locator("#google-button").isVisible(), false, "Google should be absent unless a provider is enabled.");
  assert.deepEqual(authRequests, [], `Configuration-empty account page must not call auth/API endpoints: ${authRequests.join(", ")}`);
  await emptyContext.close();

  // Use a test-only provider for deterministic interface states. This stub never ships with public files.
  const fixtureContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const fixturePage = await fixtureContext.newPage();
  watchPage(fixturePage);
  await installTestProvider(fixturePage);
  await waitForReady(fixturePage);
  assert.equal(await fixturePage.locator("#google-button").isVisible(), false, "Google button must stay hidden when its capability is false.");
  assert.equal(await fixturePage.locator("#signup-business-name").getAttribute("autocomplete"), "organization");
  assert.equal(await fixturePage.locator("#signup-email").getAttribute("type"), "email");
  assert.equal(await fixturePage.locator("#signup-password").getAttribute("minlength"), "8");

  // Short and mismatched passwords must fail before the auth provider is called.
  await fixturePage.locator("#signup-business-name").fill("Ateliê de Teste");
  await fixturePage.locator("#signup-email").fill("confeiteira@example.test");
  await fixturePage.locator("#signup-password").fill("curta");
  await fixturePage.locator("#signup-password-confirm").fill("curta");
  await fixturePage.locator("#signup-submit").click();
  assert.deepEqual(await fixturePage.evaluate(() => window.__doceAuthCalls.filter((call) => call.method === "signUp")), [], "Short passwords must not call signUp.");
  await fixturePage.locator("#signup-password").fill("senha-segura-123");
  await fixturePage.locator("#signup-password-confirm").fill("senha-diferente-123");
  await fixturePage.locator("#signup-submit").click();
  assert.deepEqual(await fixturePage.evaluate(() => window.__doceAuthCalls.filter((call) => call.method === "signUp")), [], "Password mismatch must not call signUp.");

  // Signup without an active session must display email confirmation without opening the app.
  await fixturePage.locator("#signup-password-confirm").fill("senha-segura-123");
  await fixturePage.locator("#signup-submit").click();
  await fixturePage.locator("#status-message").getByText("Confira seu e-mail para confirmar o cadastro").waitFor();
  assert.match(fixturePage.url(), /\/cadastro\//, "An email-confirmation signup must not be treated as an active account session.");
  assert.equal(await fixturePage.evaluate(() => {
    const entries = Object.entries(localStorage);
    return entries.some(([key, value]) => /password|senha-segura-123/i.test(`${key} ${value}`));
  }), false, "The UI must not save passwords in browser storage.");

  // Recovery must use the same privacy-preserving success text for any submitted address.
  await fixturePage.goto(`${origin}/cadastro/?mode=recovery`, { waitUntil: "networkidle" });
  await fixturePage.locator("#recovery-email").fill("existe@example.test");
  await fixturePage.locator("#recovery-submit").click();
  const existingMessage = await fixturePage.locator("#status-message").innerText();
  await fixturePage.locator("#recovery-email").fill("nao-existe@example.test");
  await fixturePage.locator("#recovery-submit").click();
  const unknownMessage = await fixturePage.locator("#status-message").innerText();
  assert.equal(existingMessage, unknownMessage, "Password recovery must not reveal whether an email has an account.");
  assert.match(existingMessage, /Se houver uma conta com esse e-mail/i);
  assert.doesNotMatch(existingMessage, /existe@example|nao-existe@example/i);
  assert.deepEqual(await fixturePage.evaluate(() => window.__doceAuthCalls.filter((call) => call.method === "sendPasswordReset").map((call) => call.email)), ["existe@example.test", "nao-existe@example.test"]);
  await fixtureContext.close();

  // Pilot without email delivery must offer support guidance, not a fake reset send.
  const supportContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const supportPage = await supportContext.newPage();
  watchPage(supportPage);
  await installTestProvider(supportPage, { recoveryEmail: false });
  await supportPage.goto(`${origin}/cadastro/?mode=recovery`, { waitUntil: 'networkidle' });
  assert.equal(await supportPage.locator('#recovery-form').isVisible(), false);
  assert.match(await supportPage.locator('#form-intro').innerText(), /quem te convidou/);
  assert.deepEqual(await supportPage.evaluate(() => window.__doceAuthCalls.filter(call => call.method === 'sendPasswordReset')), []);
  await supportContext.close();

  // Optional providers are rendered only when the controller reports them enabled.
  const googleContext = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const googlePage = await googleContext.newPage();
  watchPage(googlePage);
  await installTestProvider(googlePage, { google: true });
  await waitForReady(googlePage);
  assert.equal(await googlePage.locator("#google-button").isVisible(), true, "Google should appear when its capability is enabled.");
  await googlePage.goto(`${origin}/cadastro/?mode=recovery`, { waitUntil: "networkidle" });
  assert.equal(await googlePage.locator("#google-button").isVisible(), false, "Google should not appear in password recovery mode.");
  await googleContext.close();

  // Capture the three accessible states at the requested mobile and desktop widths.
  for (const mode of ["signup", "login", "recovery"]) {
    const query = mode === "signup" ? "" : `?mode=${mode}`;
    for (const width of [320, 390, 430, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 930 } });
      const page = await context.newPage();
      watchPage(page);
      await installTestProvider(page);
      await page.goto(`${origin}/cadastro/${query}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.fonts.check("16px Lora") && document.fonts.check("16px Manrope")), true, `Local fonts must load at ${width}px in ${mode}.`);
      const form = page.locator(`#${mode}-form`);
      assert.equal(await form.isVisible(), true, `Expected ${mode} form at ${width}px.`);
      assert.equal(await page.locator("#signup-business-name").count(), 1, "Business name control should be in shared markup.");
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
      assert.ok(dimensions.page <= dimensions.viewport, `Horizontal overflow at ${width}px in ${mode}: ${JSON.stringify(dimensions)}`);
      const screenshot = path.join(reviewDir, `${mode}-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      await context.close();
    }
  }

  assert.deepEqual(authRequests, [], `No real auth/API requests expected during this isolated UI review: ${authRequests.join(", ")}`);
  assert.deepEqual(pageErrors, [], `Unexpected JavaScript errors: ${pageErrors.join("; ")}`);
  assert.deepEqual(failedResponses, [], `Account page assets failed: ${failedResponses.join("; ")}`);
  console.log(`OK: empty auth configuration, registration validation/confirmation, private password recovery, Google capability, password storage, local fonts, responsive widths. Screenshots: ${reviewDir}.`);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
