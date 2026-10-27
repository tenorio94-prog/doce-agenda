import { cp, copyFile, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Builds the whole published site into deploy-cloud/public; it does not publish.
// /          landing, /landing/ its assets
// /demo/     new screens saved only in this browser (browser-store.js + /nova/nova.js); also /demo/nova/
// /app/, /agenda.html  account version of the new screens (cloud-bootstrap.js + /nova/nova.js); also /app/nova/
// /demo/completa/, /app/completa/  the full previous app (app.js, cloud-app.js), kept for a while; /cadastro/
// app.js and cloud-app.js are the same bundle of public/app.js; it reads DoceApi.mode at run time.
// /encomenda/, /p/<slug>  public order link; /privacidade/
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public');
const output = path.join(root, 'deploy-cloud', 'public');
const bundle = (entry, outfile) => build({
  entryPoints: [path.join(root, entry)], outfile, bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true,
});

// Every text swap must still find its text: a silent miss would publish the wrong wording.
function swap(text, from, to, all = false) {
  const found = typeof from === 'string' ? text.includes(from) : from.test(text);
  if (!found) throw new Error(`Build: texto não encontrado para trocar: ${String(from).slice(0, 80)}`);
  return all ? text.replaceAll(from, to) : text.replace(from, to);
}

// Generated files kept in public/ (versioned, LF via .gitattributes).
await bundle('cloud/browser-adapter.js', path.join(source, 'browser-store.js'));
await bundle('cloud/auth-controller.js', path.join(source, 'account', 'account-controller.js'));

await mkdir(output, { recursive: true });
if ((await lstat(output)).isSymbolicLink()) throw new Error('Destino não pode ser um link.');
async function clear(directory) {
  for (const item of await readdir(directory)) {
    const target = path.resolve(directory, item);
    if (!target.startsWith(output + path.sep)) throw new Error('Limpeza fora do destino.');
    const stat = await lstat(target);
    if (stat.isSymbolicLink()) throw new Error('Link no destino de build.');
    if (stat.isDirectory()) await clear(target);
    await rm(target, { recursive: stat.isDirectory() });
  }
}
await clear(output);
const copy = (from, to = from) => cp(path.join(source, from), path.join(output, to), { recursive: true, errorOnExist: true });

for (const name of ['browser-store.js', 'data-client.js', 'favicon.svg', 'logo.svg', 'tokens.css', 'manifest.webmanifest', 'aviso-sw.js']) await copy(name);
for (const name of ['fonts', 'icons', 'encomenda', 'privacidade']) await copy(name);
await copy('landing/index.html', 'index.html');
await copy('previa-landing');
await cp(path.join(source, 'landing'), path.join(output, 'landing'), {
  recursive: true, filter: (file) => !['index.html', 'main.js'].some((name) => path.resolve(file) === path.join(source, 'landing', name)),
});
// Vitrine of the order link: plain JS bundled with the shared theme rules; only the chosen style's font is downloaded.
await bundle('public/encomenda/order.js', path.join(output, 'encomenda', 'order.js'));
await mkdir(path.join(output, 'fonts', 'vitrine'), { recursive: true });
for (const [name, file] of [['young-serif', 'young-serif/files/young-serif-latin-400-normal'], ['baloo-2', 'baloo-2/files/baloo-2-latin-800-normal'],
  ['caprasimo', 'caprasimo/files/caprasimo-latin-400-normal'], ['bricolage-grotesque', 'bricolage-grotesque/files/bricolage-grotesque-latin-800-normal']]) {
  await copyFile(path.join(root, 'node_modules', '@fontsource', `${file}.woff2`), path.join(output, 'fonts', 'vitrine', `${name}.woff2`));
  await copyFile(path.join(root, 'node_modules', '@fontsource', name, 'LICENSE'), path.join(output, 'fonts', 'vitrine', `${name}-OFL.txt`));
}
// Landing script (Web Awesome + Motion) and the Web Awesome theme in our colors, both served from our own domain.
await bundle('public/landing/main.js', path.join(output, 'landing', 'landing.js'));
await build({ entryPoints: [path.join(source, 'ui', 'doce-wa.css')], outfile: path.join(output, 'ui', 'doce-wa.css'), bundle: true, minify: true });
await bundle('public/ui/app-wa.js', path.join(output, 'ui', 'app-wa.js'));
// Nova identidade (laboratório visual): folha escopada e fontes Outfit/Plus Jakarta Sans (OFL, @fontsource, versão fixa).
await build({ entryPoints: [path.join(source, 'ui', 'vnext.css')], outfile: path.join(output, 'ui', 'vnext.css'), bundle: true, minify: true, external: ['/fonts/*'] });
await mkdir(path.join(output, 'fonts', 'vnext'), { recursive: true });
for (const [name, pkg] of [['outfit', 'outfit'], ['plus-jakarta-sans', 'plus-jakarta-sans']]) {
  await copyFile(path.join(root, 'node_modules', '@fontsource-variable', pkg, 'files', `${pkg}-latin-wght-normal.woff2`), path.join(output, 'fonts', 'vnext', `${name}.woff2`));
  await copyFile(path.join(root, 'node_modules', '@fontsource-variable', pkg, 'LICENSE'), path.join(output, 'fonts', 'vnext', `${name}-OFL.txt`));
}
// Direção Comanda (16/10): Bricolage Grotesque para títulos, horários e valores (OFL, @fontsource 5.3.0).
for (const weight of [600, 700]) await copyFile(path.join(root, 'node_modules', '@fontsource', 'bricolage-grotesque', 'files', `bricolage-grotesque-latin-${weight}-normal.woff2`), path.join(output, 'fonts', 'vnext', `bricolage-${weight}.woff2`));
await copyFile(path.join(root, 'node_modules', '@fontsource', 'bricolage-grotesque', 'LICENSE'), path.join(output, 'fonts', 'vnext', 'bricolage-grotesque-OFL.txt'));
await mkdir(path.join(output, 'account'), { recursive: true });
for (const name of ['account.css', 'account-ui.js', 'account-controller.js', 'config.js']) await copy(path.join('account', name));
await copy('account/index.html', 'cadastro/index.html');

const html = await readFile(path.join(source, 'index.html'), 'utf8');

// Demonstration: data stays in this browser, so the page loads the local store before the app.
let demoHtml = swap(html, '<script src="/data-client.js" defer></script>', '<script src="/browser-store.js" defer></script>\n    <script src="/data-client.js" defer></script>');
demoHtml = swap(demoHtml, 'Não foi possível atualizar seus pedidos.', 'Não deu para guardar os dados da demonstração.');
// A faixa da demonstração já nasce visível: sem ela aparecer depois e empurrar a tela (CLS).
demoHtml = swap(demoHtml, '<div class="demo-bar" id="demo-bar" role="note" hidden>', '<div class="demo-bar" id="demo-bar" role="note">');
demoHtml = swap(demoHtml, 'data-action="reset-demo" hidden>', 'data-action="reset-demo">');
// Etapa 3: a versão completa (antiga) fica por um tempo em /demo/completa/ e /app/completa/, sem índice.
const noindex = (page) => swap(page, '<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="viewport" content="width=device-width, initial-scale=1">\n    <meta name="robots" content="noindex, nofollow">');
await mkdir(path.join(output, 'demo', 'completa'), { recursive: true });
await writeFile(path.join(output, 'demo', 'completa', 'index.html'), noindex(demoHtml));
await bundle('public/app.js', path.join(output, 'app.js'));
// Tela nova das confeiteiras, o padrão desde a Etapa 3: arquivos em /nova/; /demo/ (armazenamento do navegador) e
// /app/ (conta: o mesmo cloud-bootstrap abre /nova/nova.js depois do login). /demo/nova/ e /app/nova/ seguem como
// endereços antigos da prévia, sem índice.
await mkdir(path.join(output, 'nova'), { recursive: true });
await copyFile(path.join(source, 'nova', 'nova.css'), path.join(output, 'nova', 'nova.css'));
await bundle('public/nova/main.js', path.join(output, 'nova', 'nova.js'));
const novaHtml = await readFile(path.join(source, 'nova', 'index.html'), 'utf8');
const indexed = (page) => swap(page, '<meta name="robots" content="noindex, nofollow">\n', '');
let novaCloudHtml = swap(novaHtml, '<script src="/browser-store.js" defer></script>\n<script src="/data-client.js" defer></script>\n', '');
novaCloudHtml = swap(novaCloudHtml, '<script src="/nova/nova.js" defer></script>', '<script src="/account/config.js" defer></script>\n<script src="/cloud-bootstrap.js" data-app="/nova/nova.js" defer></script>');
for (const [dir, page] of [['demo', novaHtml], ['app', novaCloudHtml]]) {
  await mkdir(path.join(output, dir, 'nova'), { recursive: true });
  await writeFile(path.join(output, dir, 'index.html'), indexed(page));
  await writeFile(path.join(output, dir, 'nova', 'index.html'), page);
}
await writeFile(path.join(output, 'agenda.html'), indexed(novaCloudHtml));

// Account version: the bootstrap checks the session, then loads cloud-app.js.
let cloudHtml = swap(html, /\s*<script src="\/data-client\.js" defer><\/script>/, '');
cloudHtml = swap(cloudHtml, /\s*<script src="\/app\.js" defer><\/script>/, '');
cloudHtml = swap(cloudHtml, '</head>', '<script src="/account/config.js" defer></script>\n<script src="/cloud-bootstrap.js" defer></script>\n</head>');
cloudHtml = swap(cloudHtml, 'dados deste dispositivo', 'dados da sua conta');
await mkdir(path.join(output, 'app', 'completa'), { recursive: true });
await writeFile(path.join(output, 'app', 'completa', 'index.html'), noindex(cloudHtml));
await copyFile(path.join(output, 'app.js'), path.join(output, 'cloud-app.js'));
await bundle('cloud/app-bootstrap.js', path.join(output, 'cloud-bootstrap.js'));

// Previews (growth G02, tela Hoje): publish only their three public assets, isolated by route headers.
const previews = ['previa-g02', 'previa-hoje'];
for (const preview of previews) {
  await mkdir(path.join(output, preview), { recursive: true });
  for (const name of ['index.html', 'style.css', 'prototype.js']) {
    await copyFile(path.join(source, preview, name), path.join(output, preview, name));
  }
}

// Target the directory URL: /index.html triggers HTML canonicalization in Workers
// and would redirect /p/<slug> to /encomenda/, losing the original bakery slug.
await writeFile(path.join(output, '_redirects'), '/p/:slug /encomenda/ 200\n');
await writeFile(path.join(output, '_headers'), previews.flatMap((preview) => [
  `/${preview}/*`,
  '  Content-Security-Policy: default-src \'none\'; script-src \'self\'; style-src \'self\'; font-src \'self\'; img-src \'self\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; frame-ancestors \'none\'',
  '  X-Robots-Tag: noindex, nofollow',
  '',
]).concat(['/previa-landing/*', '/demo/nova/*', '/app/nova/*', '/demo/completa/*', '/app/completa/*'].flatMap((route) => [route, '  X-Robots-Tag: noindex, nofollow', ''])).join('\n'));
console.log('Site pronto em deploy-cloud/public (não publica). Rota /p/<slug> preservada.');
