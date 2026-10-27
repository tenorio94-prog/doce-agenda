import { createClient } from '@supabase/supabase-js';

const config = window.DoceCloudConfig || {};
const login = '/cadastro/?mode=login';
// A página escolhe a tela que abre depois do login (data-app no próprio script); sem isso, a versão atual.
const appScript = document.currentScript?.dataset?.app || '/cloud-app.js';
const errorResponse = (message, status = 503, code) => new Response(JSON.stringify({ error: message, ...(code ? { code } : {}) }), {
  status, headers: { 'Content-Type': 'application/json' },
});
// O que o app viu de cada pedido e de cada ajuste. Vai junto da gravação: se outra sessão ou o link gravou
// antes, o servidor reaplica a ação sobre o estado novo quando isto não mudou (canRebaseWrite em state-engine).
const SECTIONS = { '/api/availability': 'availability', '/api/order-template': 'orderTemplate', '/api/order-page': 'orderPage', '/api/pix': 'pix' };
const seen = { orders: new Map(), payments: new Map(), sections: {} };
const stampOf = order => (order && (order.updatedAt || order.createdAt)) || '';
function rememberState(data) {
  seen.orders = new Map((data.orders || []).map(order => [order.id, stampOf(order)]));
  seen.payments = new Map((data.payments || []).map(payment => [payment.id, payment.orderId]));
  seen.sections = Object.fromEntries(Object.values(SECTIONS).map(key => [key, JSON.stringify(data[key])]));
}
function rememberWrite(path, data) {
  if (!data || typeof data !== 'object') return;
  if (SECTIONS[path]) { seen.sections[SECTIONS[path]] = JSON.stringify(data); return; }
  if (data.orderId) {
    // Pagamento: o pedido ganhou o mesmo carimbo do lançamento ou da conferência.
    seen.payments.set(data.id, data.orderId);
    const at = data.confirmedAt || data.createdAt;
    if (at && seen.orders.has(data.orderId)) seen.orders.set(data.orderId, at);
  } else if (data.id) seen.orders.set(data.id, stampOf(data));
}
function baseFor(path) {
  if (SECTIONS[path]) return seen.sections[SECTIONS[path]] !== undefined ? { section: seen.sections[SECTIONS[path]] } : {};
  const order = path.match(/^\/api\/orders\/([^/]+)/), payment = path.match(/^\/api\/payments\/([^/]+)$/);
  const id = order ? decodeURIComponent(order[1]) : payment ? seen.payments.get(decodeURIComponent(payment[1])) : null;
  const stamp = id && seen.orders.get(id);
  return stamp ? { order: stamp } : {};
}
function showFailure(message) {
  // Tela nova: um só aviso de carregamento, sem a caixa de erro da versão atual.
  if (!document.getElementById('error-notice')) {
    const box = document.getElementById('load-state');
    if (box) box.textContent = `${message} Recarregue a página para tentar de novo.`;
    return;
  }
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
      if (write && (conflict || revision === null)) return errorResponse('Recarregue a agenda antes de salvar. Ela mudou em outra sessão.', 409, 'REVISION_CONFLICT');
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
        body: JSON.stringify({ path, method, body, ...(write ? { expectedRevision: revision, base: baseFor(path.split('?')[0]) } : {}) }),
      });
      if (response.status === 409) {
        const errorBody=await response.clone().json().catch(()=>({}));
        if(!['DATE_CLOSED','DAILY_LIMIT','NOTICE','PRODUCT_LIMIT','SLUG_TAKEN'].includes(errorBody.code))conflict=true;
      }
      // Never adopt a new revision without its full state, or a successful own write.
      if (response.ok && (path === '/api/state' || write)) {
        const header = response.headers.get('X-Agenda-Revision');
        const next = header !== null ? Number(header) : NaN;
        if (!Number.isSafeInteger(next) || next < 0) throw new Error('Resposta inválida. Recarregue a agenda.');
        // Gravação que pulou versões: outra sessão ou o link gravou no meio. O app recarrega em silêncio.
        const othersWrote = write && revision !== null && next > revision + 1;
        revision = next;
        if (path === '/api/state') {
          conflict = false;
          rememberState(await response.clone().json().catch(() => ({})));
        } else rememberWrite(path, await response.clone().json().catch(() => null));
        if (othersWrote) window.dispatchEvent(new Event('doce:stale'));
      }
      if (conflict) window.dispatchEvent(new Event('doce:stale'));
      return response;
    },
  });
  // Sair: botão no topo da versão atual; a tela nova chama DoceAccount.signOut pelo menu.
  async function signOut() {
    signingOut = true;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) { signingOut = false; return false; }
    location.replace(login);
    return true;
  }
  window.DoceAccount = Object.freeze({ signOut });
  const actions = document.querySelector('.topbar-actions');
  if (actions) {
    const logout = document.createElement('button');
    logout.type = 'button'; logout.className = 'button button-small button-quiet'; logout.textContent = 'Sair';
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      if (!await signOut()) { logout.disabled = false; showFailure('Não foi possível sair. Tente novamente.'); }
    });
    actions.append(logout);
  }
  client.auth.onAuthStateChange((event) => {
    // SDK callbacks must not await other Auth calls within the internal lock.
    if (event === 'SIGNED_OUT') setTimeout(() => location.replace(login), 0);
  });
  const script = document.createElement('script'); script.src = appScript;
  script.onerror = () => showFailure('Não foi possível abrir a agenda. Recarregue a página.');
  document.body.append(script);
}
start().catch(error => showFailure(error.message || 'Não foi possível abrir sua agenda.'));
