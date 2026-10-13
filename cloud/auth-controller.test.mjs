import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
const compiled = await build({ entryPoints: ['cloud/auth-controller.js'], bundle: true, write: false, format: 'iife',
  plugins: [{ name: 'test-only-sdk', setup(b) {
    b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'stub',namespace:'stub'}));
    b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const createClient=()=>({auth:{resetPasswordForEmail(){throw new Error("Email should not be sent");}}});',loader:'js'}));
  }}] });
function controller(autoconfirm) {
  const window = { DoceCloudConfig: { url: 'https://test.invalid', publishableKey: 'public', emailReady: true, emailDeliveryReady: false } };
  vm.runInNewContext(compiled.outputFiles[0].text, { window, location: { origin: 'https://site.invalid' },
    fetch: async () => ({ok:true,json:async()=>({external:{email:true,google:false},mailer_autoconfirm:autoconfirm})}) });
  return window.DoceAuth;
}
test('email signup stays disabled while server still requires confirmation without SMTP', async () => {
  assert.equal((await controller(false).getCapabilities()).email, false);
});
test('explicit pilot autoconfirm enables signup but never offers email password recovery', async () => {
  const auth = controller(true), caps = await auth.getCapabilities();
  assert.equal(caps.email, true); assert.equal(caps.recoveryEmail, false);
  assert.ok((await auth.sendPasswordReset('fake@example.invalid')).error);
});
