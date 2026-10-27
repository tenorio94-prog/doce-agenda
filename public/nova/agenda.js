// Agenda: avisos (só quando há o que decidir ou o que ficou para trás), faixa da semana e a lista por dia.
import * as M from './model.js';
import { $, app, esc } from './ui.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

function notices() {
  const decide = M.decideOrders(app.state), late = M.lateOrders(app.state, app.today);
  let html = '';
  if (decide.length === 1) html += `<div class="notice" id="notice-decide"><p>${esc(M.decideSummary(decide[0], app.today))}</p><button class="link-btn" type="button" data-act="open" data-id="${esc(decide[0].id)}">Ver</button></div>`;
  else if (decide.length) html += `<div class="notice" id="notice-decide"><p>${decide.length} pedidos para decidir</p><button class="link-btn" type="button" data-act="list" data-list="decide">Ver</button></div>`;
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
    const count = M.dayOrders(app.state, day).length, mark = M.dayMark(app.state, day);
    const label = `${M.weekdayName(day)}, ${M.shortDate(day)}: ${count ? countText(count) : 'nada marcado'}${mark ? `, ${mark}` : ''}`;
    return `<li><button class="wk-day${day === app.today ? ' is-today' : ''}${mark ? ` is-${mark}` : ''}" type="button" data-act="day" data-day="${day}" aria-label="${esc(label)}"${day === app.today ? ' aria-current="date"' : ''}>
      <span class="wk-name">${M.weekdayShort(day)}</span><span class="wk-num">${Number(day.slice(8))}</span>
      <span class="wk-count">${count || ''}</span><span class="wk-mark">${mark}</span></button></li>`;
  }).join('');
  return `<section class="week" aria-label="Semana"><div class="week-head"><button class="icon-btn" type="button" data-act="week" data-step="-7" aria-label="Semana anterior">‹</button>
    <p class="week-title">${title}</p><button class="icon-btn" type="button" data-act="week" data-step="7" aria-label="Próxima semana">›</button></div>
    <ul class="week-days" id="week">${days}</ul></section>`;
}

function orderRow(order) {
  const tag = M.moneyTag(app.state, order), done = order.status === 'Entregue';
  const who = `${order.client} · ${order.mode === 'Entrega' ? 'Entrega' : 'Retirada'}`;
  return `<li class="order${done ? ' is-done' : ''}" data-id="${esc(order.id)}">
    <button class="order-open" type="button" data-act="open" data-id="${esc(order.id)}">
      <span class="o-time">${esc(M.hourLabel(order))}</span>
      <span class="o-main"><span class="o-what">${esc(order.product)}</span><span class="o-line"><span class="o-who">${esc(who)}</span><span class="tag tag-${tag.kind}">${esc(tag.text)}</span></span></span>
    </button>
    <button class="order-done" type="button" data-act="done" data-id="${esc(order.id)}" aria-pressed="${done}" aria-label="${esc(done ? `Entregue: ${order.product} de ${order.client}. Tocar para desfazer` : `Marcar entregue: ${order.product} de ${order.client}`)}">${CHECK}</button>
  </li>`;
}

// A lista começa hoje (ou no dia passado que ela abriu pela faixa) e vai até o fim da semana seguinte, no mínimo.
function dayList() {
  const start = app.from < app.today ? app.from : app.today;
  const nextWeekEnd = M.addDays(M.weekStart(app.today), 13), weekEnd = M.addDays(app.week, 6);
  const end = weekEnd > nextWeekEnd ? weekEnd : nextWeekEnd;
  let html = '';
  for (let day = start; day <= end; day = M.addDays(day, 1)) {
    const orders = M.dayOrders(app.state, day), mark = M.dayMark(app.state, day), label = M.dayLabel(day, app.today);
    if (!orders.length) {
      html += `<section class="day day-empty" id="d-${day}" data-day="${day}"><p><strong>${esc(label)}</strong> · ${mark || 'nada marcado'}</p></section>`;
      continue;
    }
    html += `<section class="day" id="d-${day}" data-day="${day}" aria-labelledby="h-${day}">
      <div class="day-head"><h2 id="h-${day}">${esc(label)}</h2><p class="day-meta">${countText(orders.length)}${mark ? ` · <span class="mark mark-${mark === 'cheio' ? 'full' : 'closed'}">${mark}</span>` : ''}</p></div>
      <ul class="orders">${orders.map(orderRow).join('')}</ul></section>`;
  }
  return html;
}

export function renderAgenda() {
  const view = $('#view-agenda');
  view.innerHTML = `${notices()}${weekStrip()}<div class="days" id="days">${dayList()}</div>`;
}

export function scrollToDay(day) {
  if (!document.getElementById(`d-${day}`)) {
    if (day < app.from) app.from = day; else app.week = M.weekStart(day);
    renderAgenda();
  }
  const target = document.getElementById(`d-${day}`);
  if (!target) return;
  target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  target.classList.remove('is-flash');
  void target.offsetWidth;
  target.classList.add('is-flash');
}
