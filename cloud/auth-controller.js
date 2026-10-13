import { createClient } from '@supabase/supabase-js';

const config = window.DoceCloudConfig || {};
const configured = Boolean(config.url && config.publishableKey);
const client = configured ? createClient(config.url, config.publishableKey, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;
const unavailable = () => ({ data: null, error: { message: 'O cadastro ainda está sendo preparado.' } });
const callback = `${location.origin}/cadastro/?mode=login`;

window.DoceAuth = Object.freeze({
  async getCapabilities() {
    if (!client) return { configured: false, email: false, google: false };
    const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.publishableKey } });
    if (!response.ok) throw new Error('Não foi possível verificar as formas de acesso. Tente novamente.');
    const settings = await response.json();
    // Pilot explicitly permits signup without verification; otherwise SMTP must be ready.
    return { configured: true, email: Boolean(config.emailReady && settings.external?.email && (config.emailDeliveryReady || settings.mailer_autoconfirm)),
      recoveryEmail: Boolean(config.emailDeliveryReady), google: Boolean(settings.external?.google) };
  },
  async signUp({ email, password, businessName }) {
    if (!client || !config.emailReady) return unavailable();
    return client.auth.signUp({ email: email.trim(), password, options: {
      emailRedirectTo: callback, data: { business_name: businessName.trim().slice(0, 120) },
    } });
  },
  signIn({ email, password }) { return client ? client.auth.signInWithPassword({ email: email.trim(), password }) : unavailable(); },
  signInWithGoogle() { return client ? client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback } }) : unavailable(); },
  sendPasswordReset(email) { return client && config.emailDeliveryReady ? client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/cadastro/?mode=update` }) : unavailable(); },
  updatePassword(password) { return client ? client.auth.updateUser({ password }) : unavailable(); },
  getSession() { return client ? client.auth.getSession() : unavailable(); },
  signOut() { return client ? client.auth.signOut() : unavailable(); },
  onAuthStateChange(callback) { return client ? client.auth.onAuthStateChange(callback) : { data: { subscription: { unsubscribe() {} } } }; },
});
