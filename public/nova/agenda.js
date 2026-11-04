// Agenda: avisos (só quando há o que decidir ou o que ficou para trás), faixa da semana e a lista por dia.
import * as M from './model.js';
import { $, app, esc } from './ui.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
export const CHEVRON_LEFT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>';
export const CHEVRON_RIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>';
const firstName = (name) => String(name || '').trim().split(/\s+/)[0];

function notices() {
  const decide = M.decideOrders(app.state), late = M.lateOrders(app.state, app.today);
  let html = '';
  if (decide.length === 1) html += `<div class="notice" id="notice-decide"><p>${esc(M.decideSummary(decide[0], app.today))}</p><button class="link-btn" type="button" data-act="open" data-id="${esc(decide[0].id)}">Ver</button></div>`;
  else if (decide.length) html += `<div class="notice" id="notice-decide"><p>${decide.length} pedidos para decidir</p><button class="link-btn" type="button" data-act="list" data-list="decide">Ver</button></div>`;
  // Pix que a cliente avisou: aparece fora da ficha para não cobrar de novo nem contar em dobro. Os de hoje já mostram
  // o selo "Pix a conferir" na lista logo abaixo; o aviso fica para os outros dias.
  const pix = M.reportedOrders(app.state).filter((order) => M.orderDay(order) !== app.today);
  if (pix.length === 1) html += `<div class="notice notice-pix" id="notice-pix"><p>${esc(firstName(pix[0].client))} avisou um Pix de ${esc(M.brl(M.reportedCents(app.state, pix[0])))}. Confira na conta.</p><button class="link-btn" type="button" data-act="open" data-id="${esc(pix[0].id)}">Ver</button></div>`;
  else if (pix.length) html += `<div class="notice notice-pix" id="notice-pix"><p>${pix.length} Pix avisados para conferir</p><button class="link-btn" type="button" data-act="list" data-list="pix">Ver</button></div>`;
  if (late.length === 1) {
    const order = late[0];
    html += `<div class="notice notice-late" id="notice-late"><p>Ficou para trás: ${esc(order.product)} de ${esc(order.client)}, ${esc(M.shortDayLabel(M.orderDay(order)))}</p><button class="link-btn" type="button" data-act="open" data-id="${esc(order.id)}">Ver</button></div>`;
  } else if (late.length) html += `<div class="notice notice-late" id="notice-late"><p>${late.length} pedidos ficaram para trás</p><button class="link-btn" type="button" data-act="list" data-list="late">Ver</button></div>`;
  return html;
}

const countText = (count) => (count === 1 ? '1 pedido' : `${count} pedidos`);

function weekStrip() {
  const start = app.week, current = start === M.weekStart(app.today);
  const title = current ? 'Esta semana' : `${M.shortDate(start)} a ${M.shortDate(M.addDays(start, 6))}`;
  const days = Array.from({ length: 7 }, (_, index) => M.addDays(start, index)).map((day) => {
    const count = M.dayOrders(app.state, day).length, mark = day < app.today ? '' : M.dayMark(app.state, day);
    const label = `${M.weekdayName(day)}, ${M.shortDate(day)}: ${count ? countText(count) : 'nada marcado'}${mark ? `, ${mark}` : ''}`;
    return `<li><button class="wk-day${day === app.today ? ' is-today' : ''}${mark ? ` is-${mark}` : ''}" type="button" data-act="day" data-day="${day}" aria-label="${esc(label)}"${day === app.today ? ' aria-current="date"' : ''}>
      <span class="wk-name">${M.weekdayShort(day)}</span><span class="wk-num">${Number(day.slice(8))}</span>
      <span class="wk-count">${count || ''}</span><span class="wk-mark">${mark}</span></button></li>`;
  }).join('');
  return `<section class="week" aria-label="Semana"><div class="week-head"><button class="icon-btn" type="button" data-act="week" data-step="-7" aria-label="Semana anterior">${CHEVRON_LEFT}</button>
    <p class="week-title">${title}</p><button class="icon-btn" type="button" data-act="week" data-step="7" aria-label="Próxima semana">${CHEVRON_RIGHT}</button></div>
    <ul class="week-days" id="week">${days}</ul></section>`;
}

function orderRow(order) {
  const tag = M.moneyTag(app.state, order), done = order.status === 'Entregue', owing = done && tag.kind === 'late';
  // Retirada é o normal e não aparece; Entrega, sim.
  const who = order.mode === 'Entrega' ? `${order.client} · Entrega` : order.client;
  return `<li class="order${done ? ' is-done' : ''}${owing ? ' has-due' : ''}" data-id="${esc(order.id)}">
    <button class="order-open" type="button" data-act="open" data-id="${esc(order.id)}">
      <span class="o-time">${esc(M.hourLabel(order))}</span>
      <span class="o-main"><span class="o-what">${esc(order.product)}</span><span class="o-line"><span class="o-who">${esc(who)}</span><span class="tag tag-${tag.kind}">${esc(tag.text)}</span></span></span>
    </button>
    <button class="order-done" type="button" data-act="done" data-id="${esc(order.id)}" aria-pressed="${done}" aria-label="${esc(done ? `Entregue: ${order.product} de ${order.client}. Tocar para desfazer` : `Marcar entregue: ${order.product} de ${order.client}`)}">${CHECK}</button>
  </li>`;
}

// A lista começa hoje (ou no dia passado que ela abriu pela faixa) e vai até o fim da semana seguinte, no mínimo.
// Dias seguidos sem nada viram uma linha só ("Qua 5/11 a sex 7/11 · nada marcado"); cada dia guarda sua âncora para a faixa.
function dayList() {
  const start = app.from < app.today ? app.from : app.today;
  const nextWeekEnd = M.addDays(M.weekStart(app.today), 13), weekEnd = M.addDays(app.week, 6);
  const end = weekEnd > nextWeekEnd ? weekEnd : nextWeekEnd;
  let html = '', run = [];
  const name = (day) => { const label = M.dayLabel(day, app.today); return ['Hoje', 'Amanhã', 'Ontem'].includes(label) ? label : M.shortDayLabel(day); };
  const flush = () => {
    if (!run.length) return;
    const first = run[0], label = run.length === 1 ? M.dayLabel(first, app.today) : `${name(first)} a ${M.shortDayLabel(run.at(-1))}`;
    html += `<section class="day day-empty" id="d-${first}" data-day="${first}"><p><strong>${esc(label.replace(/^./, (c) => c.toUpperCase()))}</strong> · nada marcado</p>${run.slice(1).map((day) => `<span class="day-anchor" id="d-${day}" data-day="${day}"></span>`).join('')}</section>`;
    run = [];
  };
  for (let day = start; day <= end; day = M.addDays(day, 1)) {
    const orders = M.dayOrders(app.state, day, app.hold), mark = day < app.today ? '' : M.dayMark(app.state, day), label = M.dayLabel(day, app.today);
    if (!orders.length && !mark) { run.push(day); continue; }
    flush();
    if (!orders.length) {
      html += `<section class="day day-empty" id="d-${day}" data-day="${day}"><p><strong>${esc(label)}</strong> · ${mark}</p></section>`;
      continue;
    }
    html += `<section class="day" id="d-${day}" data-day="${day}" aria-labelledby="h-${day}">
      <div class="day-head"><h2 id="h-${day}">${esc(label)}</h2><p class="day-meta">${countText(orders.length)}${mark ? ` · <span class="mark mark-${mark === 'cheio' ? 'full' : 'closed'}">${mark}</span>` : ''}</p></div>
      <ul class="orders">${orders.map(orderRow).join('')}</ul></section>`;
  }
  flush();
  return html;
}

// Conta nova (ou só cancelados e recusados): um convite no lugar da faixa e de duas semanas de "nada marcado".
const emptyStart = (fresh) => `<section class="empty-start" id="empty-start" aria-labelledby="empty-title">
  <h2 id="empty-title">${fresh ? 'Anote sua primeira encomenda' : 'Nada na agenda agora'}</h2><p>${fresh ? 'Quem pediu, o quê, quando e o valor. Leva um minuto.' : 'Os pedidos cancelados e recusados ficam no histórico de cada cliente. Anote a próxima encomenda: leva um minuto.'}</p>
  <button class="btn btn-outline" type="button" data-act="new">Anotar encomenda</button>
  <button class="link-btn" type="button" data-act="link">Ou monte seu link para as clientes pedirem sozinhas</button></section>`;

export function renderAgenda() {
  const view = $('#view-agenda');
  if (!app.state.orders.some((order) => M.group(order.status) !== 'out')) { view.innerHTML = emptyStart(!app.state.orders.length); return; }
  view.innerHTML = `${notices()}${weekStrip()}<div class="days" id="days">${dayList()}</div>`;
}

export function scrollToDay(day) {
  if (!document.getElementById(`d-${day}`)) {
    if (day < app.from) app.from = day; else app.week = M.weekStart(day);
    renderAgenda();
  }
  // Um dia vazio dentro de uma linha de vários dias rola até essa linha.
  const target = document.getElementById(`d-${day}`)?.closest('.day');
  if (!target) return;
  target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  target.classList.remove('is-flash');
  void target.offsetWidth;
  target.classList.add('is-flash');
}
