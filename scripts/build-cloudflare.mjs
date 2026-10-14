import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = spawnSync(process.execPath, [path.join(root, 'scripts/build-cloud-preview.mjs')], { cwd: root, stdio: 'inherit' });
if (build.error) throw build.error;
if (build.status !== 0) throw new Error('Não foi possível preparar o site para Cloudflare.');

// Target the directory URL: /index.html triggers HTML canonicalization in Workers
// and would redirect /p/<slug> to /encomenda/, losing the original bakery slug.
await writeFile(path.join(root, 'deploy-cloud/public/_redirects'), '/p/:slug /encomenda/ 200\n');
console.log('Cloudflare: rota pública preserva o endereço /p/<slug>.');
