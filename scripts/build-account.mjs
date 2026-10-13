import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  entryPoints: [path.join(root, 'cloud/auth-controller.js')],
  outfile: path.join(root, 'public/account/account-controller.js'),
  bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true,
});
console.log('Controlador Supabase compilado; isso não configura nem publica cadastro.');
