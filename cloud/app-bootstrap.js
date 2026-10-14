import { createClient } from '@supabase/supabase-js';

const config = window.DoceCloudConfig || {};
const login = '/cadastro/?mode=login';
const errorResponse = (message, status = 503) => new Response(JSON.stringify({ error: message }), {
  status, headers: { 'Content-Type': 'application/json' },
});
function showFailure(message) {
  document.getElementById('loading-state').hidden = true;
  document.getElementById('error-notice').hidden = false;
  document.getElementById('error-message').textContent = message;
  document.getElementById('retry-button').onclick = () => location.reload();
}

async function start() {
  if (!config.url || !config.publishableKey) throw new Error('O acesso com conta ainda está sendo preparado.');
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
  });
  const initial = await client.auth.getSession();
  if (initial.error) throw new Error('Não foi possível verificar seu acesso. Tente novamente.');
  if (!initial.data.session) { location.replace(login); return; }
  let revision = null;
  let conflict = false;
  let signingOut = false;
  window.DoceApi = Object.freeze({
    mode: 'cloud',
    async fetch(path, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      const write = method !== 'GET';
      if (write && (conflict || revision === null)) return errorResponse('Recarregue a agenda antes de salvar. Ela mudou em outra sessão.', 409);
      const { data, error } = await client.auth.getSession();
      if (error || !data.session || signingOut) return errorResponse('Seu acesso expirou. Entre novamente para continuar.', 401);
      let body;
      try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; }
      catch { return errorResponse('Dados inválidos.', 400); }
      const response = await fetch(`${config.url}/functions/v1/doce-api`, {
        method: 'POST', headers: {
          'Content-Type': 'application/json', apikey: config.publishableKey,
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ path, method, body, ...(write ? { expectedRevision: revision } : {}) }),
      });
      if (response.status === 409) {
        const errorBody=await response.clone().json().catch(()=>({}));
        if(!['DATE_CLOSED','DAILY_LIMIT','NOTICE','SLUG_TAKEN'].includes(errorBody.code))conflict=true;
      }
      // Never adopt a new revision without its full state, or a successful own write.
      if (response.ok && (path === '/api/state' || write)) {
        const header = response.headers.get('X-Agenda-Revision');
        const next = header !== null ? Number(header) : NaN;
        if (!Number.isSafeInteger(next) || next < 0) throw new Error('Resposta inválida. Recarregue a agenda.');
        revision = next;
        if (path === '/api/state') conflict = false;
      }
      return response;
    },
  });
  const logout = document.createElement('button');
  logout.type = 'button'; logout.className = 'button button-small button-quiet'; logout.textContent = 'Sair';
  logout.addEventListener('click', async () => {
    logout.disabled = true; signingOut = true;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) { signingOut = false; logout.disabled = false; showFailure('Não foi possível sair. Tente novamente.'); return; }
    location.replace(login);
  });
  document.querySelector('.topbar-actions').append(logout);
  client.auth.onAuthStateChange((event) => {
    // SDK callbacks must not await other Auth calls within the internal lock.
    if (event === 'SIGNED_OUT') setTimeout(() => location.replace(login), 0);
  });
  const script = document.createElement('script'); script.src = '/cloud-app.js';
  script.onerror = () => showFailure('Não foi possível abrir a agenda. Recarregue a página.');
  document.body.append(script);
}
start().catch(error => showFailure(error.message || 'Não foi possível abrir sua agenda.'));
