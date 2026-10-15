// Monta a função doce-api do Supabase em deploy-supabase/ (ignorado pelo Git), no formato que a CLI publica.
// Publicar (com login feito): npx supabase functions deploy doce-api --project-ref khvhnbopdluthpcduhqm --use-api --workdir deploy-supabase
// A função continua exigindo JWT (padrão da CLI). Não envia nenhuma chave: as secrets ficam no painel do Supabase.
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'deploy-supabase', 'supabase', 'functions', 'doce-api');
const files = ['doce-api.ts', 'state-engine.js', 'order-link-model.js', 'monthly-summary.js', 'pix-code.js', 'clients.js'];

await rm(path.join(root, 'deploy-supabase'), { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyFile(path.join(root, 'cloud', 'edge-entry.ts'), path.join(output, 'index.ts'));
for (const file of files) await copyFile(path.join(root, 'cloud', file), path.join(output, file));
console.log(`doce-api pronta em ${path.relative(root, output)} (${files.length + 1} arquivos).`);
