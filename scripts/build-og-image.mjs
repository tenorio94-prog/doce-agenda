import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Generate the link-preview image with `node scripts/build-og-image.mjs`.
// It renders scripts/og-image.html (local fonts, logo and a real app capture)
// at 1200x630 and writes public/landing/assets/og.jpg. No network is used and
// nothing is published; rerun it whenever the capture or the headline changes.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const source = path.join(scriptDir, "og-image.html");
const output = path.join(webRoot, "public", "landing", "assets", "og.jpg");
const maxBytes = 300 * 1024;

await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate(() => document.fonts.check("60px Lora") && document.fonts.check("16px Manrope"));
  if (!fontsOk) throw new Error("Lora e Manrope precisam carregar de public/fonts/.");
  await page.screenshot({ path: output, type: "jpeg", quality: 88 });
} finally {
  await browser.close();
}

const { size } = await stat(output);
if (size > maxBytes) throw new Error(`og.jpg com ${size} bytes passa de ${maxBytes}.`);
console.log(`og.jpg gerada: ${output} (${(size / 1024).toFixed(1)} KB, 1200x630).`);
