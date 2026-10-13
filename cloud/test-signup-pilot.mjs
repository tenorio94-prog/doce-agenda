import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createClient } from '@supabase/supabase-js';
const sandbox = { window: {} };
runInNewContext(await readFile(new URL('../public/account/config.js', import.meta.url),'utf8'), sandbox);
const config = sandbox.window.DoceCloudConfig;
const settings = await fetch(`${config.url}/auth/v1/settings`, {headers:{apikey:config.publishableKey}}).then(r=>r.json());
if (!settings.mailer_autoconfirm) throw new Error('Confirmation still enabled');
console.log('PASS email confirmation disabled on server');
const ids = [];
const cleanupFile = new URL('./.test-users.json',import.meta.url);
for (const label of ['A','B']) {
  const client = createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const email = `doce-signup-test-${Date.now()}-${label.toLowerCase()}@example.invalid`;
  const password = randomBytes(32).toString('hex');
  const result = await client.auth.signUp({email,password,options:{data:{business_name:'Teste temporário'}}});
  if (result.error || !result.data.session || !result.data.user) throw new Error(`Signup ${label} failed (${result.error?.status || 'no session'})`);
  ids.push(result.data.user.id); await writeFile(cleanupFile,JSON.stringify(ids));
  await client.auth.signOut({scope:'global'});
  process.env[`CLOUD_TEST_EMAIL_${label}`] = email;
  process.env[`CLOUD_TEST_PASSWORD_${label}`] = password;
}
console.log('PASS two real signups return immediate sessions without email');
await import('./test-live-cloud.mjs');
