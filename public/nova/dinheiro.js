// Dinheiro: o Recebido do mês (só o conferido, pelo dia em que foi conferido, calculado pelo servidor; as setas ficam no
// cartão dele e mudam só ele), quem já levou e ainda deve, e o que ainda vai entrar, estes dois de todos os meses.
// Os números grandes são a soma das listas.
import * as M from './model.js';
import { CHEVRON_LEFT, CHEVRON_RIGHT } from './agenda.js';
import { $, api, app, esc, openSheet } from './ui.js';

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function row(order, withCharge) {
  const day = M.orderDay(order), { due } = M.balance(app.state, order), reported = M.reportedCents(app.state, order);
  const late = order.status === 'Entregue';
  // Pix avisado: primeiro conferir na conta (pela ficha); Recebi e Cobrar voltam depois.
  const actions = reported
    ? `<button class="btn btn-outline btn-small" type="button" data-act="open" data-id="${esc(order.id)}">Conferir Pix</button>`
    : `<button class="btn btn-outline btn-small" type="button" data-act="received-money" data-id="${esc(order.id)}">Recebi</button>${withCharge && order.contact ? `<button class="btn btn-outline btn-small" type="button" data-act="charge-money" data-id="${esc(order.id)}">Cobrar</button>` : ''}`;
  return `<li class="due-row" data-day="${esc(day)}"><button class="due-open" type="button" data-act="open" data-id="${esc(order.id)}">
      <span class="due-top"><strong>${esc(order.client)}</strong><span class="tag due-amount ${late ? 'tag-late' : 'tag-due'}">Falta ${esc(M.brl(due))}</span></span>
      <span class="muted">${esc(M.shortDayLabel(day))} · ${esc(order.product)}</span>
      ${reported ? `<span class="tag tag-check due-pix">Pix ${esc(M.brl(reported))} a conferir</span>` : ''}</button>
    <span class="due-actions">${actions}</span></li>`;
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
  const monthName = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  const head = `<div class="month-head"><button class="icon-btn" type="button" data-act="month" data-step="-1" aria-label="Mês anterior">${CHEVRON_LEFT}</button>
    <h2 id="month-title">${esc(M.monthLabel(month))}</h2>
    <button class="icon-btn" type="button" data-act="month" data-step="1" aria-label="Próximo mês"${month >= current ? ' disabled' : ''}>${CHEVRON_RIGHT}</button></div>`;
  if (!keep || !view.querySelector('#money-received')) view.innerHTML = `<section class="money-month">${head}<p class="muted" role="status">Somando…</p></section>`;
  updateMoneyBadge();
  let received = '—', error = '';
  try { received = M.brl((await api(`/resumo-mensal?mes=${encodeURIComponent(month)}`)).receivedCents); } catch (failure) { error = failure.message; }
  if (app.month !== month || app.tab !== 'dinheiro') return;
  const owed = M.owedOrders(app.state), coming = M.comingOrders(app.state);
  view.innerHTML = `<section class="money-month" aria-describedby="money-month-note">${head}
      <p class="mm-label">Recebido em ${esc(monthName)}</p><strong id="money-received">${esc(received)}</strong>
      <p class="mm-note" id="money-month-note">O que você conferiu na conta neste mês, de qualquer pedido.</p>
      <button class="link-btn" type="button" data-act="month-payments">Ver os pagamentos</button></section>
    ${error ? `<p class="form-error" role="alert">${esc(error)}</p>` : ''}
    <h2 class="section-title" id="owed-title">Já entregue, falta receber · <span id="money-delivered-due">${esc(M.brl(M.sumDue(app.state, owed)))}</span></h2>
    <p class="muted section-note">Quem já levou e ainda deve, de todos os meses.</p>
    ${owed.length ? `<ul class="due-list" id="owed-list">${owed.map((order) => row(order, true)).join('')}</ul>` : '<p class="muted" id="owed-empty">Ninguém que já levou está devendo.</p>'}
    <h2 class="section-title" id="coming-title">Ainda vai entrar · ${esc(M.brl(M.sumDue(app.state, coming)))}</h2>
    <p class="muted section-note">Pedidos combinados que ainda não foram entregues, de todos os meses.</p>
    ${coming.length ? `<ul class="due-list" id="coming-list">${coming.map((order) => row(order, false)).join('')}</ul>` : '<p class="muted" id="coming-list">Nada combinado com saldo.</p>'}`;
}

// Os pagamentos que formam o Recebido do mês: dia em que foram conferidos, cliente e valor. Cancelado aparece marcado
// (o dinheiro dele continua contando). Tocar abre a ficha, com Voltar para esta lista.
export function openMonthPayments(month) {
  const items = M.monthPayments(app.state, month), total = items.reduce((sum, item) => sum + item.cents, 0);
  const monthName = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  const rows = items.map(({ order, day, cents }) => `<li><button class="list-row" type="button" data-act="open" data-id="${esc(order.id)}" data-back="month">
    <strong>${esc(M.brl(cents))} · ${esc(order.client)}</strong><span>${esc(M.shortDayLabel(day))} · ${esc(order.product)}${order.status === 'Cancelado' ? ' · cancelado' : ''}</span></button></li>`).join('');
  openSheet(`<h2 id="sheet-title" tabindex="-1">Recebido em ${esc(monthName)}</h2>
    ${items.length ? `<p class="muted">${esc(M.brl(total))} em ${items.length === 1 ? '1 pagamento conferido' : `${items.length} pagamentos conferidos`}, do mais recente ao mais antigo.</p><ul class="list" id="month-payments">${rows}</ul>`
      : `<p class="muted">Nenhum pagamento conferido em ${esc(monthName)}.</p>`}`);
}
