// Dinheiro: o Recebido do mês (só o conferido, calculado pelo servidor; as setas mudam só ele), quem já levou e
// ainda deve, e o que ainda vai entrar. Os números grandes são a soma das listas.
import * as M from './model.js';
import { $, api, app, esc } from './ui.js';

function row(order, withCharge) {
  const day = M.orderDay(order), { due } = M.balance(app.state, order);
  const charge = withCharge && order.contact ? `<button class="btn btn-outline btn-small" type="button" data-act="charge-money" data-id="${esc(order.id)}">Cobrar</button>` : '';
  return `<li class="due-row" data-day="${esc(day)}"><button class="due-open" type="button" data-act="open" data-id="${esc(order.id)}">
      <span class="due-top"><strong>${esc(order.client)}</strong><span class="tag tag-due">Falta ${esc(M.brl(due))}</span></span>
      <span class="muted">${esc(M.shortDayLabel(day))} · ${esc(order.product)}</span></button>
    <span class="due-actions"><button class="btn btn-outline btn-small" type="button" data-act="received-money" data-id="${esc(order.id)}">Recebi</button>${charge}</span></li>`;
}

// Número no botão Dinheiro da barra: quantos já levaram e ainda devem. Some no zero.
export function updateMoneyBadge() {
  const badge = $('#money-badge');
  if (!badge || !app.state) return;
  const count = M.owedOrders(app.state).length;
  badge.textContent = count ? String(count) : '';
  badge.hidden = !count;
  $('.bar [data-tab="dinheiro"]').setAttribute('aria-label', count ? `Dinheiro: ${count === 1 ? '1 pedido entregue' : `${count} pedidos entregues`} com saldo` : 'Dinheiro');
}

// `keep`: as setas do mês deixam a tela como está até o novo Recebido chegar; nos outros casos aparece "Somando…".
export async function renderMoney({ keep = false } = {}) {
  const view = $('#view-dinheiro'), month = app.month, current = app.today.slice(0, 7);
  const head = `<div class="month-head"><button class="icon-btn" type="button" data-act="month" data-step="-1" aria-label="Mês anterior">‹</button>
    <h1 id="month-title">${esc(M.monthLabel(month))}</h1>
    <button class="icon-btn" type="button" data-act="month" data-step="1" aria-label="Próximo mês"${month >= current ? ' disabled' : ''}>›</button></div>`;
  if (!keep || !view.querySelector('#money-received')) view.innerHTML = `${head}<p class="muted" role="status">Somando…</p>`;
  updateMoneyBadge();
  let received = '—', error = '';
  try { received = M.brl((await api(`/resumo-mensal?mes=${encodeURIComponent(month)}`)).receivedCents); } catch (failure) { error = failure.message; }
  if (app.month !== month || app.tab !== 'dinheiro') return;
  const owed = M.owedOrders(app.state), coming = M.comingOrders(app.state);
  view.innerHTML = `${head}
    <div class="money-big">
      <div><span>Recebido no mês</span><strong id="money-received">${esc(received)}</strong></div>
      <div><span>Entregue, falta receber</span><strong id="money-delivered-due">${esc(M.brl(M.sumDue(app.state, owed)))}</strong></div></div>
    ${error ? `<p class="form-error" role="alert">${esc(error)}</p>` : ''}
    <h2 class="section-title" id="owed-title">Já entregue, falta receber</h2>
    ${owed.length ? `<ul class="due-list" id="owed-list">${owed.map((order) => row(order, true)).join('')}</ul>` : '<p class="muted" id="owed-empty">Ninguém que já levou está devendo.</p>'}
    <h2 class="section-title" id="coming-title">Ainda vai entrar · ${esc(M.brl(M.sumDue(app.state, coming)))}</h2>
    ${coming.length ? `<ul class="due-list" id="coming-list">${coming.map((order) => row(order, false)).join('')}</ul>` : '<p class="muted" id="coming-list">Nada combinado com saldo.</p>'}`;
}
