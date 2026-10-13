import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  lstat,
  mkdir,
  readdir,
  rm,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Build the public launch bundle. Run with `node scripts/build-launch-site.mjs`
// after public/landing/index.html and its public assets are ready. The existing
// build-deploy script prepares the pilot; this script then places its absolute-
// URL assets at the site root, serves the pilot at /app/ and /agenda.html, and
// puts the future landing page at / with its other assets under /landing/.
// Only files from public/ and deploy-demo/public are included; private data/
// and local state are deliberately excluded. This script does not publish.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const landingSource = path.join(webRoot, "public", "landing");
const landingIndex = path.join(landingSource, "index.html");
const pilotSource = path.join(webRoot, "deploy-demo", "public");
const launchRoot = path.join(webRoot, "deploy-launch");
const launchPublic = path.join(launchRoot, "public");

const exists = async (filePath) => access(filePath).then(() => true, () => false);

if (!(await exists(landingIndex))) {
  throw new Error(
    `Landing ainda não pronta: esperado ${landingIndex}. ` +
      "Crie public/landing/index.html e os assets públicos antes do build.",
  );
}

const build = spawnSync(process.execPath, [path.join(scriptDir, "build-deploy.mjs")], {
  cwd: webRoot,
  stdio: "inherit",
});
if (build.error) throw build.error;
if (build.status !== 0) {
  throw new Error(`build-deploy.mjs terminou com código ${build.status ?? "desconhecido"}.`);
}

// Preserve deploy-launch/public itself (a local preview may have it as cwd), but
// remove only its descendants so stale generated assets cannot reach deploy.
const fixedLaunchPublic = path.resolve(webRoot, "deploy-launch", "public");
if (path.resolve(launchPublic) !== fixedLaunchPublic) {
  throw new Error(`Destino de build inesperado: ${launchPublic}`);
}
await mkdir(launchPublic, { recursive: true });
const publicStat = await lstat(launchPublic);
if (!publicStat.isDirectory() || publicStat.isSymbolicLink()) {
  throw new Error(`A pasta de saída precisa ser um diretório real: ${launchPublic}`);
}
const assertInsideLaunchPublic = (target) => {
  const absoluteTarget = path.resolve(target);
  if (
    absoluteTarget === fixedLaunchPublic ||
    !absoluteTarget.startsWith(`${fixedLaunchPublic}${path.sep}`)
  ) {
    throw new Error(`Recusa de limpeza fora dos filhos de deploy-launch/public: ${absoluteTarget}`);
  }
  return absoluteTarget;
};
const clearLaunchChildren = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = assertInsideLaunchPublic(path.join(directory, entry.name));
    const info = await lstat(target);
    if (info.isSymbolicLink()) {
      throw new Error(`Recusa de limpeza de link simbólico: ${target}`);
    }
    if (info.isDirectory()) await clearLaunchChildren(target);
    assertInsideLaunchPublic(target);
    await rm(target, { recursive: info.isDirectory(), force: false });
  }
};
await clearLaunchChildren(launchPublic);

// These are the pilot's public runtime files; keep them at the site root because
// its HTML, CSS, JS, logo and fonts use absolute URLs such as /app.js.
const pilotFiles = [
  "app.js",
  "browser-store.js",
  "data-client.js",
  "favicon.svg",
  "logo.svg",
  "tokens.css",
  "style.css",
];
for (const fileName of pilotFiles) {
  const source = path.join(pilotSource, fileName);
  if (await exists(source)) await copyFile(source, path.join(launchPublic, fileName));
}
await cp(path.join(pilotSource, "fonts"), path.join(launchPublic, "fonts"), {
  recursive: true,
  errorOnExist: false,
});

// The manifest and installed-app icons come straight from public/ (build-deploy
// does not stage them) and sit at the site root: /manifest.webmanifest, /icons/.
const manifestSource = path.join(webRoot, "public", "manifest.webmanifest");
const iconsSource = path.join(webRoot, "public", "icons");
for (const required of [manifestSource, iconsSource]) {
  if (!(await exists(required))) throw new Error(`Arquivo de instalação não encontrado: ${required}`);
}
await copyFile(manifestSource, path.join(launchPublic, "manifest.webmanifest"));
await cp(iconsSource, path.join(launchPublic, "icons"), { recursive: true, errorOnExist: false });

const pilotHtml = path.join(pilotSource, "index.html");
if (!(await exists(pilotHtml))) throw new Error(`Build do piloto sem index.html: ${pilotHtml}`);
await mkdir(path.join(launchPublic, "app"), { recursive: true });
await copyFile(pilotHtml, path.join(launchPublic, "app", "index.html"));
await copyFile(pilotHtml, path.join(launchPublic, "agenda.html"));

// Refuse symlinks in landing assets so the output can only contain files rooted
// in public/landing. Its index is promoted to /; the remaining tree stays /landing/.
const copyLandingAssets = async (sourceDir, targetDir) => {
  await mkdir(targetDir, { recursive: true });
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (sourceDir === landingSource && entry.name === "index.html") continue;
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Asset de landing não pode ser link simbólico: ${source}`);
    }
    if (entry.isDirectory()) {
      await copyLandingAssets(source, target);
    } else if (entry.isFile()) {
      await copyFile(source, target);
    } else {
      throw new Error(`Tipo de arquivo de landing não suportado: ${source}`);
    }
  }
};

await copyFile(landingIndex, path.join(launchPublic, "index.html"));
await copyLandingAssets(landingSource, path.join(launchPublic, "landing"));

console.log(`Site de lançamento preparado em: ${launchPublic}`);
console.log("Rotas incluídas: /, /app/, /agenda.html e /landing/ (sem regra SPA wildcard).");
