import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const script of ['build-launch-site.mjs', 'build-account.mjs']) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', script)], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Build falhou: ${script}`);
}
const output = path.join(root, 'deploy-cloud', 'public');
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
await cp(path.join(root, 'deploy-launch', 'public'), output, { recursive: true });
await mkdir(path.join(output, 'demo'), { recursive: true });
await cp(path.join(output, 'app', 'index.html'), path.join(output, 'demo', 'index.html'));
let html = await readFile(path.join(root, 'public', 'index.html'), 'utf8');
html = html.replace(/\s*<script src="\/(?:browser-store|data-client|app)\.js" defer><\/script>/g, '');
html = html.replace('</head>', '<script src="/account/config.js" defer></script>\n<script src="/cloud-bootstrap.js" defer></script>\n</head>');
html = html.replace('dados deste dispositivo', 'dados da sua conta');
await writeFile(path.join(output, 'app', 'index.html'), html);
await writeFile(path.join(output, 'agenda.html'), html);
await cp(path.join(root, 'public', 'app.js'), path.join(output, 'cloud-app.js'));
await mkdir(path.join(output, 'account'), { recursive: true });
await mkdir(path.join(output, 'cadastro'), { recursive: true });
for (const name of ['account.css', 'account-ui.js', 'account-controller.js', 'config.js']) {
  await cp(path.join(root, 'public', 'account', name), path.join(output, 'account', name));
}
await cp(path.join(root, 'public', 'account', 'index.html'), path.join(output, 'cadastro', 'index.html'));
await build({ entryPoints: [path.join(root, 'cloud', 'app-bootstrap.js')], outfile: path.join(output, 'cloud-bootstrap.js'),
  bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true });
// Publishable cloud landing; demonstration remains separately accessible.
let landing = await readFile(path.join(output, 'index.html'), 'utf8');
landing = landing.replace('href="/app/">Abrir minha agenda', 'href="/cadastro/?mode=login">Entrar')
  .replaceAll('href="/app/">Experimentar o piloto', 'href="/cadastro/">Criar minha conta')
  .replaceAll('href="/app/">Experimentar sem cadastro', 'href="/demo/">Experimentar sem cadastro')
  .replace('class="text-link" href="/app/">Abrir minha agenda', 'class="text-link" href="/cadastro/">Criar minha conta')
  .replace('href="/app/">Experimentar a demonstração sem cadastro', 'href="/demo/">Experimentar a demonstração sem cadastro')
  .replace('<a class="text-link" href="#como-funciona">Como funciona</a>', '<a class="text-link" href="/demo/">Ver demonstração</a>')
  .replace('Piloto em desenvolvimento. Sem sincronização entre aparelhos.', 'Piloto em desenvolvimento. Seus dados ficam na sua conta.')
  .replace('A agenda fica salva no navegador usado naquele aparelho.', 'Entre com sua conta para acessar a agenda. Os dados são salvos no banco de dados.')
  .replace('Não. O piloto atual salva os dados localmente neste navegador, sem conta ou sincronização entre dispositivos. Limpar os dados do navegador pode apagá-los. Use Backup para baixar uma cópia JSON.', 'Sim. Entre com a mesma conta em outro aparelho. Recarregue a agenda para ver as alterações mais recentes. Use Backup para guardar também uma cópia JSON.');
await writeFile(path.join(output, 'index.html'), landing);
await cp(path.join(root,'public','encomenda'),path.join(output,'encomenda'),{recursive:true});
await cp(path.join(root,'public','privacidade'),path.join(output,'privacidade'),{recursive:true});
await writeFile(path.join(output,'_redirects'),'/p/:slug /encomenda/index.html 200\n');
console.log('Prévia com conta em deploy-cloud/public. Não publica nem ativa provedores de login.');
