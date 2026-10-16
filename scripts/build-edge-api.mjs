// Monta as funções do Supabase em deploy-supabase/ (ignorado pelo Git), no formato que a CLI publica.
// Publicar (com login feito):
//   npx supabase functions deploy doce-api --project-ref khvhnbopdluthpcduhqm --use-api --workdir deploy-supabase
//   npx supabase functions deploy doce-public --project-ref khvhnbopdluthpcduhqm --use-api --workdir deploy-supabase --no-verify-jwt
// doce-api exige JWT (padrão da CLI); doce-public é a página pública do link e não tem login (rotas estritas no código).
// Não envia nenhuma chave: as secrets ficam no painel do Supabase.
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rules = ['state-engine.js', 'order-link-model.js', 'monthly-summary.js', 'pix-code.js', 'clients.js'];
const functions = {
  'doce-api': { entry: 'edge-entry.ts', files: ['doce-api.ts', 'vitrine-photos.js', ...rules] },
  'doce-public': { entry: 'public-entry.ts', files: ['public-api.ts', 'public-orders.js', ...rules] },
};

await rm(path.join(root, 'deploy-supabase'), { recursive: true, force: true });
for (const [name, { entry, files }] of Object.entries(functions)) {
  const output = path.join(root, 'deploy-supabase', 'supabase', 'functions', name);
  await mkdir(output, { recursive: true });
  await copyFile(path.join(root, 'cloud', entry), path.join(output, 'index.ts'));
  for (const file of files) await copyFile(path.join(root, 'cloud', file), path.join(output, file));
  console.log(`${name} pronta em ${path.relative(root, output)} (${files.length + 1} arquivos).`);
}
