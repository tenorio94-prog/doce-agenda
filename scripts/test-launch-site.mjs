import assert from "node:assert/strict";
import { createServer } from "node:http";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Review the launch bundle locally with `node scripts/test-launch-site.mjs`.
// Set LAUNCH_TEST_ORIGIN to review a deployed site; screenshots are named LOCAL
// or LIVE accordingly. Each run uses fresh browser contexts and fictitious data.
// The local server serves only deploy-launch/public and binds to loopback.
// Browser plugin was not available in this environment; the parent task will add CUA review.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const publicRoot = path.join(webRoot, "deploy-launch", "public");
const reviewDir = path.join(webRoot, "design", "launch-review");
const liveOrigin = process.env.LAUNCH_TEST_ORIGIN;
const capturePrefix = liveOrigin ? "LIVE" : "LOCAL";
const exists = (filePath) => access(filePath).then(() => true, () => false);

if (!liveOrigin && !(await exists(path.join(publicRoot, "index.html")))) {
  throw new Error(`Build do lançamento não encontrado: ${publicRoot}. Rode scripts/build-launch-site.mjs primeiro.`);
}

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      const relative = pathname === "/"
        ? "index.html"
        : pathname === "/app/" || pathname === "/app"
          ? "app/index.html"
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
const jsErrors = [];
const apiRequests = [];
const failedResponses = [];
const pageErrors = (page) => page.on("pageerror", (error) => jsErrors.push(error.message));
const watchRequests = (page) => page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) apiRequests.push(request.url());
});
const watchNetworkFailures = (page) => {
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    failedResponses.push(`requestfailed ${request.url()} (${request.failure()?.errorText || "unknown error"})`);
  });
};
const screenshotFromTop = async (page, screenshotPath, fullPage = false) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
  await page.screenshot({ path: screenshotPath, fullPage });
};

try {
  // Landing review: identity, real local assets, FAQ behavior, CTA destination,
  // responsive widths, and both requested review captures.
  const landingContext = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const landing = await landingContext.newPage();
  pageErrors(landing);
  watchRequests(landing);
  watchNetworkFailures(landing);
  await landing.goto(origin, { waitUntil: "networkidle" });
  assert.match(await landing.title(), /Doce Agenda/i, "Landing title should identify Doce Agenda.");
  assert.match(await landing.locator("body").innerText(), /Doce Agenda/i, "Landing body should identify Doce Agenda.");
  const brandLink = landing.locator("header a.brand, header a:has(img)").first();
  assert.equal(await brandLink.getAttribute("href"), "/", "Brand logo should link to the landing root.");
  const authLinks = await landing.locator("a").evaluateAll((links) => links
    .map((link) => ({ href: link.getAttribute("href") || "", text: link.innerText.trim() }))
    .filter(({ href, text }) => /\/(login|signin|signup|auth)(\/|$|\?)/i.test(href) || /^(entrar|login|sign in)$/i.test(text)));
  assert.deepEqual(authLinks, [], "Landing must not present simulated authentication links.");
  const images = await landing.locator("img").evaluateAll((items) => items.map((img) => ({
    src: img.currentSrc || img.src,
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
  })));
  assert.ok(images.some((image) => image.width > 0 && image.height > 0), "Landing logo or photo must load.");
  assert.equal(await landing.evaluate(async () => {
    await document.fonts.ready;
    return (await Promise.all([document.fonts.load("16px Fredoka"), document.fonts.load("16px Figtree")])).every((faces) => faces.length > 0);
  }), true, "Fredoka and Figtree must load.");

  // Resolve same-origin anchor targets with GETs, including the legacy pilot route.
  const linkedTargets = await landing.locator("a[href]").evaluateAll((links) =>
    links.map((link) => link.href).filter((href) => {
      const url = new URL(href);
      return url.origin === location.origin && !(url.pathname === location.pathname && url.hash);
    }),
  );
  const localTargets = [...new Set([...linkedTargets, new URL("/agenda.html", origin).href])];
  for (const href of localTargets) {
    const response = await landingContext.request.get(href);
    assert.ok(response.status() < 400, `Local link should load: ${response.status()} ${href}`);
  }

  // Link preview (LP-2) and installed-app metadata (MA-5): tags, image and manifest.
  const metaContent = (selector) => landing.locator(selector).first().getAttribute("content");
  assert.equal(await landing.locator('link[rel="canonical"]').getAttribute("href"), "https://doce-agenda-piloto.netlify.app/");
  assert.equal(await metaContent('meta[property="og:type"]'), "website");
  assert.equal(await metaContent('meta[property="og:locale"]'), "pt_BR");
  assert.equal(await metaContent('meta[property="og:site_name"]'), "Doce Agenda");
  assert.match(await metaContent('meta[property="og:title"]'), /^Doce Agenda: pedidos, prazos e sinal no mesmo lugar$/);
  assert.ok(await metaContent('meta[property="og:description"]'), "og:description must be present.");
  assert.equal(await metaContent('meta[name="twitter:card"]'), "summary_large_image");
  assert.equal(await metaContent('meta[property="og:image"]'), "https://doce-agenda-piloto.netlify.app/landing/assets/og.jpg");
  assert.equal(await metaContent('meta[property="og:image:width"]'), "1200");
  assert.equal(await metaContent('meta[property="og:image:height"]'), "630");
  assert.equal(await metaContent('meta[name="theme-color"]'), "#f7c5d0");
  const ogImage = await landingContext.request.get(new URL("/landing/assets/og.jpg", origin).href);
  assert.equal(ogImage.status(), 200, "og.jpg must be served.");
  assert.equal(ogImage.headers()["content-type"], "image/jpeg");
  const ogBytes = await ogImage.body();
  assert.ok(ogBytes.length > 0 && ogBytes.length < 300 * 1024, `og.jpg must be under 300 KB, got ${ogBytes.length}.`);
  assert.equal(await landing.locator('link[rel="apple-touch-icon"]').getAttribute("href"), "/icons/apple-touch-icon.png");
  const manifestHref = await landing.locator('link[rel="manifest"]').getAttribute("href");
  assert.equal(manifestHref, "/manifest.webmanifest");
  const manifestResponse = await landingContext.request.get(new URL(manifestHref, origin).href);
  assert.equal(manifestResponse.status(), 200, "The web manifest must be served.");
  const manifest = JSON.parse(await manifestResponse.text());
  assert.equal(manifest.name, "Doce Agenda");
  assert.equal(manifest.lang, "pt-BR");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#f7c5d0");
  assert.equal(manifest.background_color, "#fffaf2");
  assert.equal(manifest.start_url, "/app/");
  assert.equal(manifest.scope, "/app/");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((item) => item.sizes === `${size}x${size}`);
    assert.ok(icon, `Manifest must list a ${size}x${size} icon.`);
    const iconResponse = await landingContext.request.get(new URL(icon.src, origin).href);
    assert.equal(iconResponse.status(), 200, `Manifest icon should load: ${icon.src}`);
    assert.equal(iconResponse.headers()["content-type"], "image/png");
  }
  const touchIcon = await landingContext.request.get(new URL("/icons/apple-touch-icon.png", origin).href);
  assert.equal(touchIcon.status(), 200, "apple-touch-icon must be served.");

  // Hero note (LP-3) and the demo-storage FAQ question (LP-1).
  const heroNote = landing.locator(".hero-note");
  assert.equal(await heroNote.count(), 1, "Hero should have a single note line.");
  assert.match(await heroNote.innerText(), /Grátis no piloto · Sem cartão · Funciona no celular.*Estamos construindo junto com confeiteiras/s);
  assert.equal(await heroNote.evaluate((element) => getComputedStyle(element).fontSize), "14px");
  const demoFaq = landing.locator("details", { hasText: "E a demonstração, guarda meus pedidos?" });
  assert.equal(await demoFaq.count(), 1, "FAQ must include the demo storage question.");
  assert.match(await demoFaq.locator("p").textContent(), /Só neste navegador\. Se você limpar os dados do navegador, eles somem\. No próprio demo dá para baixar uma cópia de segurança\./);

  const cta = landing.locator('a[href="/app/"], a[href="/app"], a[href^="/app/?"]').first();
  assert.equal(await cta.count(), 1, "A landing CTA must link to /app/.");
  const faqItems = landing.locator("details");
  assert.ok(await faqItems.count(), "Landing should include an FAQ disclosure.");
  const faq = faqItems.first();
  await faq.locator("summary").click();
  assert.equal(await faq.evaluate((element) => element.open), true, "FAQ should open when activated.");
  await landing.setViewportSize({ width: 1440, height: 1024 });
  await screenshotFromTop(landing, path.join(reviewDir, `${capturePrefix}-desktop-1440x1024.png`));
  await screenshotFromTop(landing, path.join(reviewDir, `${capturePrefix}-desktop-1440x1024-full.png`), true);
  await landing.setViewportSize({ width: 1536, height: 1024 });
  await screenshotFromTop(landing, path.join(reviewDir, `${capturePrefix}-hero-1536x1024.png`));
  for (const width of [320, 390, 430, 1440]) {
    await landing.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const dimensions = await landing.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    assert.ok(
      dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
      `Landing horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`,
    );
  }
  await landing.setViewportSize({ width: 390, height: 844 });
  await screenshotFromTop(landing, path.join(reviewDir, `${capturePrefix}-mobile-390x844.png`));
  await screenshotFromTop(landing, path.join(reviewDir, `${capturePrefix}-mobile-390x844-full.png`), true);
  await cta.click();
  await landing.waitForURL((url) => url.pathname === "/app/" || url.pathname === "/app/index.html");
  assert.match(await landing.locator("body").innerText(), /Hoje|Seus pedidos/);
  await landingContext.close();

  // A new isolated profile exercises browser-only storage without real customer
  // data. The draft has a fictitious name/product and intentionally no due date.
  const appContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const app = await appContext.newPage();
  pageErrors(app);
  watchRequests(app);
  watchNetworkFailures(app);
  await app.goto(new URL("/app/", origin).href, { waitUntil: "networkidle" });
  await app.locator("#view-today h1").waitFor();
  assert.equal(await app.evaluate(() => window.DoceApi?.mode), "browser", "The app must use browser storage.");
  assert.ok(await app.evaluate(() => Boolean(window.DoceStore)), "Browser storage adapter must be loaded.");
  await app.locator(".nav-new-order").click();
  await app.locator("#order-form [name=client]").fill("Orçamento fictício");
  await app.locator("#order-form [name=product]").fill("Bolo teste de chocolate");
  await app.locator("#order-form [name=dueDate]").fill("");
  await app.locator("#order-form [name=dueTime]").fill("");
  await app.locator("#order-form [name=status]").selectOption("Orçamento");
  await app.locator("#save-order-button").click();
  await app.waitForFunction(() => !document.querySelector("#order-dialog").open);
  const saved = await app.evaluate(async () => (await (await window.DoceStore.fetch("/api/state")).json()).orders);
  const order = saved.find((item) => item.client === "Orçamento fictício");
  assert.ok(order, "Fictitious draft should be saved.");
  assert.equal(order.product, "Bolo teste de chocolate");
  assert.equal(order.dueAt, "", "Budget draft should have no due date.");
  await app.reload({ waitUntil: "networkidle" });
  await app.locator("#view-today h1").waitFor();
  const afterReload = await app.evaluate(async () => (await (await window.DoceStore.fetch("/api/state")).json()).orders);
  assert.ok(afterReload.some((item) => item.id === order.id), "Draft should persist after reload.");
  await app.goto(origin, { waitUntil: "networkidle" });
  assert.match(await app.locator("body").innerText(), /Doce Agenda/i, "Returning to / should show the landing.");
  await app.goto(new URL("/app/", origin).href, { waitUntil: "networkidle" });
  const afterReturn = await app.evaluate(async () => (await (await window.DoceStore.fetch("/api/state")).json()).orders);
  assert.ok(afterReturn.some((item) => item.id === order.id), "Draft should remain after visiting / and returning to /app/.");
  for (const width of [320, 390, 430, 1440]) {
    await app.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const dimensions = await app.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    assert.ok(
      dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
      `App horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`,
    );
  }
  await appContext.close();

  assert.deepEqual(apiRequests, [], `No real /api network calls expected: ${apiRequests.join(", ")}`);
  assert.deepEqual(jsErrors, [], `Unexpected JavaScript errors: ${jsErrors.join("; ")}`);
  assert.deepEqual(failedResponses, [], `Launch assets returned errors: ${failedResponses.join("; ")}`);
  console.log(`OK: landing identity/photo/fonts, FAQ, CTA to /app/, responsive widths, browser-only draft persistence, no /api network calls or JS errors. Screenshots: ${reviewDir} (${capturePrefix}).`);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
