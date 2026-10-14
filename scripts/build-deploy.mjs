import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const sourcePublic = path.join(webRoot, "public");
const deployPublic = path.join(webRoot, "deploy-demo", "public");

const requiredAssets = ["index.html", "app.js", "data-client.js", "tokens.css", "style.css", "logo.svg", "favicon.svg"];
const requiredFonts = ["Fredoka.ttf", "Figtree.ttf", "Fredoka-OFL.txt", "Figtree-OFL.txt"];
const adapterName = "browser-store.js";
await build({entryPoints:[path.join(webRoot,'cloud/browser-adapter.js')],outfile:path.join(sourcePublic,adapterName),bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true});
const exists = async (filePath) => access(filePath).then(() => true, () => false);

await mkdir(deployPublic, { recursive: true });

for (const fileName of requiredAssets) {
  const source = path.join(sourcePublic, fileName);
  if (!(await exists(source))) {
    throw new Error(`Arquivo público obrigatório não encontrado: ${source}`);
  }
  await copyFile(source, path.join(deployPublic, fileName));
}

const sourceFonts = path.join(sourcePublic, "fonts");
const deployFonts = path.join(deployPublic, "fonts");
await mkdir(deployFonts, { recursive: true });
for (const fileName of requiredFonts) {
  const source = path.join(sourceFonts, fileName);
  if (!(await exists(source))) {
    throw new Error(`Fonte ou licença obrigatória não encontrada: ${source}`);
  }
  await copyFile(source, path.join(deployFonts, fileName));
}

const hasBrowserStore = await exists(path.join(sourcePublic, adapterName));
if (hasBrowserStore) {
  await copyFile(
    path.join(sourcePublic, adapterName),
    path.join(deployPublic, adapterName),
  );
}

const htmlPath = path.join(deployPublic, "index.html");
let html = await readFile(htmlPath, "utf8");
const appScript = '<script src="/data-client.js" defer></script>';
const adapterScript = '<script src="/browser-store.js" defer></script>';

if (hasBrowserStore) {
  if (!html.includes(appScript)) {
    throw new Error("Não encontrei a tag defer de /data-client.js no index.html copiado.");
  }
  if (!html.includes(adapterScript)) {
    html = html.replace(appScript, `${adapterScript}\n    ${appScript}`);
  }
}

await writeFile(htmlPath, html, "utf8");

if (hasBrowserStore) {
  const appPath = path.join(deployPublic, "app.js");
  let app = await readFile(appPath, "utf8");
  app = app.replaceAll("neste computador", "neste navegador");
  app = app.replace('Os pedidos desta demonstração são exemplos fictícios. Novos pedidos ficam salvos neste navegador.', 'Piloto: comece pelo exemplo fictício. Seus pedidos ficam apenas neste navegador, sem sincronização entre aparelhos. Baixe um backup para guardar uma cópia.');
  app = app.replace('window.addEventListener("offline", () => setError("O navegador está sem conexão. Verifique sua rede e tente novamente."));', 'window.addEventListener("offline", () => showToast("Sem internet. Os pedidos continuam salvos neste navegador."));');
  app = app.replace(
    "Confira se o serviço está aberto. Seus dados anteriores continuam na tela.",
    "Não foi possível acessar o armazenamento local. Seus dados anteriores continuam na tela.",
  );
  app = app.replace('setConnection("error", "Sem conexão")', 'setConnection("error", "Armazenamento indisponível")');
  await writeFile(appPath, app, "utf8");

  html = html.replace(
    "Não foi possível atualizar seus pedidos.",
    "Não foi possível acessar o armazenamento local.",
  );
  await writeFile(htmlPath, html, "utf8");
}

console.log(`Estágio preparado em: ${deployPublic}`);
console.log(
  hasBrowserStore
    ? "Adapter browser-store.js incluído; os dados desta versão ficam neste navegador."
    : "Sem adapter browser-store.js; a decisão de armazenamento ainda está pendente.",
);
