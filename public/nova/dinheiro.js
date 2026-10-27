// Dinheiro do mês: Recebido (só o conferido, calculado pelo servidor) e o que falta receber, pedido por pedido.
import * as M from './model.js';
import { $, api, app, esc } from './ui.js';

export async function renderMoney() {
  const view = $('#view-dinheiro'), month = app.month, current = app.today.slice(0, 7);
  view.innerHTML = `<div class="month-head"><button class="icon-btn" type="button" data-act="month" data-step="-1" aria-label="Mês anterior">‹</button>
    <h1 id="month-title">${esc(M.monthLabel(month))}</h1>
    <button class="icon-btn" type="button" data-act="month" data-step="1" aria-label="Próximo mês"${month >= current ? ' disabled' : ''}>›</button></div>
    <p class="muted" id="money-loading" role="status">Somando…</p>`;
  let summary;
  try { summary = await api(`/resumo-mensal?mes=${encodeURIComponent(month)}`); } catch (error) {
    $('#money-loading').textContent = error.message;
    return;
  }
  if (app.month !== month || app.tab !== 'dinheiro') return;
  const orders = M.dueOrders(app.state, month);
  const items = orders.map((order) => {
    const day = M.orderDay(order), { due } = M.balance(app.state, order);
    return `<li class="due-row"><button class="due-open" type="button" data-act="open" data-id="${esc(order.id)}">
        <span class="due-top"><strong>${esc(order.client)}</strong><span class="tag tag-due">Falta ${esc(M.brl(due))}</span></span>
        <span class="muted">${esc(M.shortDayLabel(day))} · ${esc(order.product)}</span></button>
      <button class="btn btn-outline btn-small" type="button" data-act="received-money" data-id="${esc(order.id)}">Recebi</button></li>`;
  }).join('');
  $('#money-loading').remove();
  view.insertAdjacentHTML('beforeend', `<div class="money-big">
      <div><span>Recebido</span><strong id="money-received">${esc(M.brl(summary.receivedCents))}</strong></div>
      <div><span>Falta receber</span><strong id="money-due">${esc(M.brl(summary.receivableCents))}</strong></div></div>
    <h2 class="section-title">Falta receber</h2>
    ${items ? `<ul class="due-list" id="money-list">${items}</ul>` : '<p class="muted" id="money-list">Nada para receber neste mês.</p>'}`);
}
