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

// Records whether the amber "being prepared" notice and the red error were ever visible together.
const watchExclusive = (page) => page.addInitScript(() => {
  window.__bothVisible = false;
  setInterval(() => {
    const notice = document.getElementById("service-notice");
    const error = document.getElementById("error-message");
    if (notice && error && !notice.hidden && !error.hidden) window.__bothVisible = true;
  }, 10);
});

const installTestProvider = async (page, options = {}) => {
  const google = options.google === true;
  const recoveryError = options.recoveryError || null;
  // Scripted failures/delays; tests adjust them at runtime through window.__stub.
  const stub = JSON.stringify({ delay: 0, capabilityFailures: 0, signUpFailures: 0, signUpError: null, signInError: null, ...(options.stub || {}) });
  await page.route("**/account/account-controller.js", async (route) => {
    const source = `
      (() => {
        const calls = [];
        window.__doceAuthCalls = calls;
        window.__stub = ${stub};
        window.DoceAuth = {
          async getCapabilities() {
            calls.push({ method: "getCapabilities" });
            if (window.__stub.delay) await new Promise((resolve) => setTimeout(resolve, window.__stub.delay));
            if (window.__stub.capabilityFailures-- > 0) throw new TypeError("Failed to fetch");
            return { configured: true, email: true, recoveryEmail: ${options.recoveryEmail !== false}, google: ${google} };
          },
          async signUp(payload) {
            calls.push({ method: "signUp", payload });
            if (window.__stub.signUpFailures-- > 0) throw new TypeError("Failed to fetch");
            if (window.__stub.signUpError) return { data: null, error: window.__stub.signUpError };
            return { data: { user: { id: "fixture-user", email: payload.email }, session: null }, error: null };
          },
          async signIn(payload) {
            calls.push({ method: "signIn", payload });
            if (window.__stub.signInError) return { data: null, error: window.__stub.signInError };
            return { data: { user: { id: "fixture-user", email: payload.email }, session: null }, error: null };
          },
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
  await watchExclusive(emptyPage);
  await waitForReady(emptyPage);
  await assert.doesNotReject(async () => emptyPage.locator("#service-notice").getByText("O cadastro está sendo preparado").waitFor());
  assert.equal(await emptyPage.locator("#error-message").isVisible(), false, "Unconfigured service shows the amber notice only, without a red error.");
  assert.equal(await emptyPage.locator("#retry-button").isVisible(), false);
  assert.equal((await emptyPage.locator("#signup-submit").innerText()).trim(), "Criar conta", "Loading label must be restored after the check.");
  assert.equal(await emptyPage.evaluate(() => window.__bothVisible), false, "Amber notice and error must never be visible together.");
  const demoLink = emptyPage.locator("#service-notice a");
  assert.equal(await demoLink.getAttribute("href"), "/demo/", "Demo link destination must not change.");
  assert.ok(await demoLink.evaluate((node) => node.getBoundingClientRect().height) >= 44, "Demo link must be a target of at least 44px.");
  assert.equal(await emptyPage.locator("#signup-submit").isDisabled(), true, "Registration must be disabled while auth configuration is empty.");
  assert.equal(await emptyPage.locator("#google-button").isVisible(), false, "Google should be absent unless a provider is enabled.");
  assert.deepEqual(authRequests, [], `Configuration-empty account page must not call auth/API endpoints: ${authRequests.join(", ")}`);
  await emptyContext.close();

  // Same amber notice on a 320px phone: the demo link stays a 44px target and nothing overflows.
  const narrowContext = await browser.newContext({ viewport: { width: 320, height: 700 } });
  const narrowPage = await narrowContext.newPage();
  await narrowPage.route("**/account/config.js", (route) => route.fulfill({ contentType: "text/javascript", body: "window.DoceCloudConfig=Object.freeze({});" }));
  watchPage(narrowPage);
  await waitForReady(narrowPage);
  await narrowPage.locator("#service-notice").waitFor({ state: "visible" });
  assert.ok(await narrowPage.locator("#service-notice a").evaluate((node) => node.getBoundingClientRect().height) >= 44, "Demo link must be a 44px target at 320px.");
  assert.ok(await narrowPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "No horizontal overflow at 320px with the amber notice.");
  await narrowContext.close();

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

  // The amber notice and the retry button start hidden in the markup, so nothing flashes before the check answers.
  const markup = await readFile(path.join(publicRoot, "account", "index.html"), "utf8");
  assert.match(markup, /<div id="service-notice"[^>]*\shidden>/, "Amber notice must start hidden in the HTML.");
  assert.match(markup, /<button id="retry-button"[^>]*\shidden>/, "Retry button must start hidden in the HTML.");

  // While the availability check runs: amber notice hidden, submit in loading state; afterwards the form is usable.
  const loadingContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const loadingPage = await loadingContext.newPage();
  watchPage(loadingPage);
  await watchExclusive(loadingPage);
  await installTestProvider(loadingPage, { stub: { delay: 1200 } });
  await loadingPage.goto(`${origin}/cadastro/`, { waitUntil: "domcontentloaded" });
  assert.equal(await loadingPage.locator("#service-notice").isVisible(), false, "Amber notice must stay hidden while the check runs.");
  assert.equal(await loadingPage.locator("#error-message").isVisible(), false);
  assert.equal((await loadingPage.locator("#signup-submit").innerText()).trim(), "Verificando…");
  assert.equal(await loadingPage.locator("#signup-submit").isDisabled(), true, "Submit must be disabled while the check runs.");
  assert.equal(await loadingPage.locator("#signup-submit").getAttribute("aria-busy"), "true");
  await loadingPage.waitForFunction(() => document.getElementById("signup-submit").textContent === "Criar conta");
  assert.equal(await loadingPage.locator("#signup-submit").isDisabled(), false, "Submit must be enabled once the check says the service is ready.");
  assert.equal(await loadingPage.locator("#signup-submit").getAttribute("aria-busy"), null);
  assert.equal(await loadingPage.locator("#service-notice").isVisible(), false, "Amber notice must not appear when the service is configured.");
  assert.equal(await loadingPage.evaluate(() => window.__bothVisible), false, "Amber notice and error must never be visible together.");
  await loadingContext.close();

  // Network failure of the availability check: Portuguese message, no raw text, retry button, no amber notice.
  const netContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const netPage = await netContext.newPage();
  const netWarnings = [];
  netPage.on("console", (message) => { if (message.type() === "warning") netWarnings.push(message.text()); });
  watchPage(netPage);
  await watchExclusive(netPage);
  await installTestProvider(netPage, { stub: { capabilityFailures: 1 } });
  await netPage.goto(`${origin}/cadastro/`, { waitUntil: "networkidle" });
  await netPage.locator("#error-message").waitFor({ state: "visible" });
  const networkText = await netPage.locator("#error-message").innerText();
  assert.match(networkText, /Não conseguimos falar com o servidor/);
  assert.doesNotMatch(networkText, /failed to fetch|typeerror|networkerror/i, "Raw network error text must never be shown.");
  assert.ok(netWarnings.some((text) => /Failed to fetch/.test(text)), "The raw error must go to the console for support.");
  assert.equal(await netPage.locator("#service-notice").isVisible(), false, "Amber notice must not show next to the error.");
  assert.equal(await netPage.locator("#retry-button").isVisible(), true, "A network error must offer a retry button.");
  assert.equal((await netPage.locator("#retry-button").innerText()).trim(), "Tentar de novo");
  assert.ok(await netPage.locator("#retry-button").evaluate((node) => node.getBoundingClientRect().height) >= 48, "Retry button must be at least 48px tall.");
  assert.equal(await netPage.locator("#signup-submit").isDisabled(), true);
  await netPage.locator("#retry-button").click();
  await netPage.locator("#retry-button").waitFor({ state: "hidden" });
  assert.equal(await netPage.locator("#error-message").isVisible(), false, "Retry must clear the error.");
  await netPage.waitForFunction(() => document.getElementById("signup-submit").textContent === "Criar conta");
  assert.equal(await netPage.locator("#signup-submit").isDisabled(), false, "A successful retry must enable the form.");
  assert.equal(await netPage.evaluate(() => window.__doceAuthCalls.filter((call) => call.method === "getCapabilities").length), 2, "Retry must repeat the availability check.");

  // Network failure on submit: same Portuguese message, and the retry button repeats the submission.
  await netPage.evaluate(() => { window.__stub.signUpFailures = 1; });
  await netPage.locator("#signup-business-name").fill("Ateliê de Teste");
  await netPage.locator("#signup-email").fill("confeiteira@example.test");
  await netPage.locator("#signup-password").fill("senha-segura-123");
  await netPage.locator("#signup-password-confirm").fill("senha-segura-123");
  await netPage.locator("#signup-submit").click();
  await netPage.locator("#error-message").waitFor({ state: "visible" });
  assert.match(await netPage.locator("#error-message").innerText(), /Não conseguimos falar com o servidor/);
  assert.equal(await netPage.locator("#retry-button").isVisible(), true);
  await netPage.locator("#retry-button").click();
  await netPage.locator("#status-message").getByText("Confira seu e-mail para confirmar o cadastro").waitFor();
  assert.equal(await netPage.locator("#error-message").isVisible(), false);
  assert.equal(await netPage.locator("#retry-button").isVisible(), false);
  assert.equal(await netPage.evaluate(() => window.__doceAuthCalls.filter((call) => call.method === "signUp").length), 2, "Retry must submit again.");
  assert.equal(await netPage.evaluate(() => window.__bothVisible), false, "Amber notice and error must never be visible together.");
  await netContext.close();

  // Known library errors become Portuguese; unknown ones get the fallback. The raw text is never on screen.
  const errorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const errorPage = await errorContext.newPage();
  watchPage(errorPage);
  await installTestProvider(errorPage);
  await waitForReady(errorPage);
  await errorPage.locator("#signup-business-name").fill("Ateliê de Teste");
  await errorPage.locator("#signup-email").fill("confeiteira@example.test");
  await errorPage.locator("#signup-password").fill("senha-segura-123");
  await errorPage.locator("#signup-password-confirm").fill("senha-segura-123");
  const signupErrors = [
    [{ message: "User already registered", status: 422, code: "user_already_exists" }, /Já existe uma conta com esse e-mail/, false],
    [{ message: "Password should be at least 6 characters.", status: 422, code: "weak_password" }, /senha mais forte/, false],
    [{ message: "email rate limit exceeded", status: 429, code: "over_email_send_rate_limit" }, /Muitas tentativas/, false],
    [{ message: "Signups not allowed for this instance", status: 422, code: "signup_disabled" }, /cadastro por e-mail não está disponível/, false],
    [{ message: "Unable to validate email address: invalid format", status: 422, code: "email_address_invalid" }, /Confira o e-mail digitado/, false],
    [{ message: "O cadastro ainda está sendo preparado." }, /ainda está sendo preparado/, false],
    [{ name: "AuthRetryableFetchError", message: "Failed to fetch", status: 0 }, /Não conseguimos falar com o servidor/, true],
    [{ message: "Database error saving new user", status: 500, code: "unexpected_failure" }, /Não foi possível criar a conta/, false],
    [{ message: "Some brand new English error nobody planned for" }, /Não foi possível criar a conta/, false],
  ];
  for (const [error, expected, offersRetry] of signupErrors) {
    await errorPage.evaluate((value) => { window.__stub.signUpError = value; }, error);
    await errorPage.locator("#signup-submit").click();
    await errorPage.locator("#error-message").waitFor({ state: "visible" });
    const text = await errorPage.locator("#error-message").innerText();
    assert.match(text, expected, `Unexpected translation for "${error.message}": ${text}`);
    assert.ok(!text.includes(error.message) || error.message === "O cadastro ainda está sendo preparado.", `Raw error must not reach the screen: ${text}`);
    assert.equal(await errorPage.locator("#retry-button").isVisible(), offersRetry, `Retry visibility for "${error.message}"`);
    assert.equal(await errorPage.locator("#service-notice").isVisible(), false);
  }
  await errorPage.goto(`${origin}/cadastro/?mode=login`, { waitUntil: "networkidle" });
  await errorPage.evaluate(() => { window.__stub.signInError = { message: "Invalid login credentials", status: 400, code: "invalid_credentials" }; });
  await errorPage.locator("#login-email").fill("confeiteira@example.test");
  await errorPage.locator("#login-password").fill("senha-errada-123");
  await errorPage.locator("#login-submit").click();
  await errorPage.locator("#error-message").waitFor({ state: "visible" });
  assert.equal((await errorPage.locator("#error-message").innerText()).trim(), "E-mail ou senha não conferem.");
  assert.equal(await errorPage.locator("#retry-button").isVisible(), false, "Non-network errors do not offer retry.");

  // Visible keyboard focus and field borders (WCAG 2.4.7 / 1.4.11).
  await errorPage.goto(`${origin}/cadastro/`, { waitUntil: "networkidle" });
  const fieldBorder = await errorPage.locator("#signup-email").evaluate((node) => getComputedStyle(node).borderTopColor);
  assert.equal(fieldBorder, "rgb(156, 130, 144)", "Field border must be #9c8290.");
  await errorPage.locator("#signup-email").focus();
  await errorPage.waitForFunction(() => getComputedStyle(document.getElementById("signup-email")).borderTopColor === "rgb(46, 106, 70)"); // border transition (.15s)
  const focusStyle = await errorPage.locator("#signup-email").evaluate((node) => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, offset: style.outlineOffset, shadow: style.boxShadow, border: style.borderTopColor };
  });
  assert.deepEqual(focusStyle, { style: "solid", width: "3px", color: "rgb(46, 106, 70)", offset: "2px", shadow: "none", border: "rgb(46, 106, 70)" }, "Focused field must show a 3px sage ring.");
  // Type scale for the signup card: hint and terms at 13px, eyebrows at 12px with .08em tracking.
  const metrics = await errorPage.evaluate(() => {
    const read = (selector) => { const style = getComputedStyle(document.querySelector(selector)); return { size: style.fontSize, spacing: style.letterSpacing }; };
    return { hint: read(".field-hint"), terms: read("#terms-note"), cardEyebrow: read("#mode-eyebrow"), eyebrow: read(".intro .eyebrow") };
  });
  assert.equal(metrics.hint.size, "13px");
  assert.equal(metrics.terms.size, "13px");
  assert.equal(metrics.cardEyebrow.size, "12px");
  assert.equal(metrics.cardEyebrow.spacing, "0.96px");
  assert.equal(metrics.eyebrow.size, "12px");
  assert.equal(metrics.eyebrow.spacing, "0.96px");
  await errorContext.close();

  // Real controller with the network blocked (Playwright route, nothing leaves the machine):
  // the genuine library error is translated, and Retry works once the service answers.
  const realContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const realPage = await realContext.newPage();
  const realErrors = [];
  realPage.on("pageerror", (error) => realErrors.push(error.message));
  await watchExclusive(realPage);
  let serviceReachable = false;
  await realPage.route("https://khvhnbopdluthpcduhqm.supabase.co/**", async (route) => {
    if (!serviceReachable) return route.abort("failed");
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ external: { email: true, google: false }, mailer_autoconfirm: true }) });
  });
  await realPage.goto(`${origin}/cadastro/`, { waitUntil: "networkidle" });
  await realPage.locator("#error-message").waitFor({ state: "visible" });
  assert.match(await realPage.locator("#error-message").innerText(), /Não conseguimos falar com o servidor/);
  assert.doesNotMatch(await realPage.locator("#error-message").innerText(), /failed to fetch|typeerror/i);
  assert.equal(await realPage.locator("#service-notice").isVisible(), false);
  assert.equal(await realPage.locator("#retry-button").isVisible(), true);
  serviceReachable = true;
  await realPage.locator("#retry-button").click();
  await realPage.locator("#retry-button").waitFor({ state: "hidden" });
  await realPage.waitForFunction(() => !document.getElementById("signup-submit").disabled);
  assert.equal(await realPage.locator("#error-message").isVisible(), false);
  assert.equal(await realPage.locator("#service-notice").isVisible(), false);
  serviceReachable = false;
  await realPage.locator("#signup-business-name").fill("Ateliê de Teste");
  await realPage.locator("#signup-email").fill("confeiteira@example.test");
  await realPage.locator("#signup-password").fill("senha-segura-123");
  await realPage.locator("#signup-password-confirm").fill("senha-segura-123");
  await realPage.locator("#signup-submit").click();
  await realPage.locator("#error-message").waitFor({ state: "visible" });
  assert.match(await realPage.locator("#error-message").innerText(), /Não conseguimos falar com o servidor/);
  assert.equal(await realPage.locator("#retry-button").isVisible(), true);
  assert.equal(await realPage.evaluate(() => window.__bothVisible), false);
  assert.deepEqual(realErrors, [], `Unexpected JavaScript errors: ${realErrors.join("; ")}`);
  await realContext.close();

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
      assert.equal(await page.evaluate(async () => (await Promise.all([document.fonts.load("16px Fredoka"), document.fonts.load("16px Figtree")])).every((faces) => faces.length > 0)), true, `Local fonts must load at ${width}px in ${mode}.`);
      const form = page.locator(`#${mode}-form`);
      assert.equal(await form.isVisible(), true, `Expected ${mode} form at ${width}px.`);
      assert.equal(await page.locator("#signup-business-name").count(), 1, "Business name control should be in shared markup.");
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
      assert.ok(dimensions.page <= dimensions.viewport, `Horizontal overflow at ${width}px in ${mode}: ${JSON.stringify(dimensions)}`);
      const smallText = await page.evaluate(() => [...document.querySelectorAll("body *")]
        .filter((node) => node.checkVisibility() && [...node.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim()))
        .map((node) => ({ node: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}.${node.className}`, size: parseFloat(getComputedStyle(node).fontSize) }))
        .filter((item) => item.size < 12));
      assert.deepEqual(smallText, [], `Text below 12px at ${width}px in ${mode}.`);
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
