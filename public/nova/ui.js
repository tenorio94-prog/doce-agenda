// Peças comuns da tela nova: estado em memória, acesso às rotas /api, a janela (ficha) e o aviso de baixo.
import { CAPACITY_CODES, friendlyError, todayKey } from './model.js';

export const app = {
  state: null, today: todayKey(), week: '', from: '', month: '', tab: 'agenda',
  demo: window.DoceApi?.mode === 'browser', back: null, previousStatus: {},
};
export const $ = (selector, root = document) => root.querySelector(selector);
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const findOrder = (id) => app.state?.orders.find((order) => order.id === id);
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Só DoceApi.fetch e as rotas que já existem.
export async function api(path, { method = 'GET', body } = {}) {
  const response = await window.DoceApi.fetch(`/api${path}`, {
    method,
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch { /* resposta sem corpo */ }
  if (!response.ok) {
    const code = data?.code || '';
    // Conta: outra sessão ou o link gravou antes. A agenda é recarregada já, e ela confere antes de repetir.
    if (code === 'REVISION_CONFLICT') window.dispatchEvent(new Event('doce:stale'));
    const message = code === 'DAILY_LIMIT' ? 'O limite de pedidos para esta data foi atingido.'
      : code === 'REVISION_CONFLICT' ? 'Isto mudou em outro aparelho ou chegou pedido pelo link. A agenda foi atualizada: confira e tente de novo.'
        : friendlyError(data?.error);
    throw Object.assign(new Error(message), { status: response.status, code, capacity: CAPACITY_CODES.includes(code) });
  }
  return data;
}
export async function reload() {
  app.state = await api('/state');
  return app.state;
}

// Uma janela só: a ficha e os passos dela trocam o conteúdo. `back` volta ao passo anterior.
export function openSheet(html, back = null) {
  const dialog = $('#sheet');
  app.back = back;
  $('#sheet-body').innerHTML = html;
  $('#sheet-back').hidden = !back;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  $('#sheet-body').scrollTop = 0;
  const focus = $('#sheet-body [autofocus]') || $('#sheet-title');
  focus?.focus({ preventScroll: true });
}
export const closeSheet = () => { const dialog = $('#sheet'); if (dialog.open) dialog.close(); app.back = null; };
export const sheetOpen = () => $('#sheet').open;

let toastTimer = 0;
// O aviso fica na camada de cima (popover) para aparecer também com a janela aberta.
export function toast(text, undo = null) {
  const box = $('#toast');
  $('#toast-text').textContent = text;
  const button = $('#toast-undo');
  button.hidden = !undo;
  button.onclick = undo ? async () => { hideToast(); await undo(); } : null;
  box.hidden = false;
  try { if (!box.matches(':popover-open')) box.showPopover(); } catch { /* sem popover: fica no fluxo */ }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 7000 : 4000);
}
export function hideToast() {
  const box = $('#toast');
  clearTimeout(toastTimer);
  try { if (box.matches(':popover-open')) box.hidePopover(); } catch { /* sem popover */ }
  box.hidden = true;
}
export function showError(selector, message) {
  const box = $(selector);
  if (!box) return;
  box.textContent = message;
  box.hidden = !message;
}
export async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
