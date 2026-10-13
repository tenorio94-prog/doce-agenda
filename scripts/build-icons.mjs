import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

// Generate the installed-app icons with `node scripts/build-icons.mjs`.
// The source is design/brand-refresh/app-icon.svg. The PNGs are full-bleed
// squares (the SVG's rounded corners are dropped) because iOS and Android apply
// their own mask; the "D" stays inside the maskable safe zone. Nothing is published.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const source = path.join(webRoot, "design", "brand-refresh", "app-icon.svg");
const outDir = path.join(webRoot, "public", "icons");
const targets = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
];

const svg = (await readFile(source, "utf8")).replace(/(<rect[^>]*?)\srx="[^"]*"/, "$1");
if (!svg.includes("<rect") || /<rect[^>]*\srx=/.test(svg)) {
  throw new Error("Não consegui remover o raio do ícone em app-icon.svg.");
}
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
try {
  for (const { file, size } of targets) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}img{display:block;width:${size}px;height:${size}px}</style><img src="${dataUrl}" alt="">`,
    );
    await page.evaluate(() => document.images[0].decode());
    const target = path.join(outDir, file);
    await page.screenshot({ path: target, type: "png", clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    const { size: bytes } = await stat(target);
    console.log(`${file}: ${size}x${size}, ${bytes} bytes`);
  }
} finally {
  await browser.close();
}
