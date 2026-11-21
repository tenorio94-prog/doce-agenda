// Caderninho visual de Clientes e busca rápida na tela nova.
// Consulta GET /api/clientes (com fallback local de cloud/clients.js), mostra datas que se repetem,
// busca por nome ou WhatsApp, filtro de 90+ dias, ficha com doces favoritos e exclusão LGPD na própria janela.
import { anonymizeClient, clientKeyFor, clientsSummary } from '../../cloud/clients.js';
import { openFicha } from './ficha.js';
import { openMenu } from './menu.js';
import * as M from './model.js';
import { $, api, app, esc, findOrder, openSheet, orderPhotoHtml, reload, toast } from './ui.js';

let refresh = async () => {};
export const setRefresh = (fn) => { refresh = fn; };

let clientsData = null;
let filter = 'all';
let query = '';
let backToCaller = null;

const formatPhone = (digits) => {
  const clean = String(digits || '').replace(/\D/g, '');
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return String(digits || '');
};
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

async function loadClientsData() {
  try {
    return await api('/clientes');
  } catch {
    return clientsSummary(app.state || { orders: [], payments: [] }, new Date(`${app.today}T12:00:00-03:00`));
  }
}

function clientStatusLine(client) {
  if (client.nextOrderDay) return `Próximo pedido: ${M.shortDayLabel(client.nextOrderDay)}`;
  if (client.away) return `Faz ${client.daysSinceLast} dias que não pede`;
  if (client.lastPurchaseDay) return `Último pedido: ${M.pastDayLabel(client.lastPurchaseDay, app.today)}`;
  return 'Ainda sem pedido confirmado';
}

function favChipsHtml(topProducts, size = '22px') {
  if (!Array.isArray(topProducts) || !topProducts.length) return '';
  const items = topProducts.map(({ product, count }) => {
    const thumb = orderPhotoHtml({ product }, 'c-photo', size);
    return `<span class="fav-chip">${thumb}<span>${esc(product)}${count > 1 ? ` (${count})` : ''}</span></span>`;
  }).join('');
  return `<span class="client-favs">${items}</span>`;
}

function renderClientCards() {
  if (!clientsData?.clients?.length) {
    return '<p class="muted">Cada pedido anotado entra na ficha da cliente. Com o WhatsApp no pedido, os pedidos da mesma pessoa ficam juntos.</p>';
  }
  const search = query.trim().toLocaleLowerCase('pt-BR');
  const digits = search.replace(/\D/g, '');
  const list = clientsData.clients.filter((client) => {
    if (filter === 'away' && !client.away) return false;
    if (!search) return true;
    return client.name.toLocaleLowerCase('pt-BR').includes(search) || (digits.length >= 2 && String(client.phone || '').includes(digits));
  });
  if (!list.length) return '<p class="muted">Nenhuma cliente encontrada com esse filtro.</p>';
  return `<div class="client-cards">${list.map((client) => {
    const phoneText = client.phone ? formatPhone(client.phone) : 'Sem WhatsApp';
    const countText = `${client.purchases} ${client.purchases === 1 ? 'pedido' : 'pedidos'}`;
    const totalText = client.totalCents ? ` · ${M.brl(client.totalCents)}` : '';
    return `<button class="client-card${client.away ? ' is-away' : ''}" type="button" data-act="open-client" data-key="${esc(client.key)}">
      <span class="cc-top"><strong>${esc(client.name)}</strong><span class="cc-status">${esc(clientStatusLine(client))}</span></span>
      <span class="cc-meta">${esc(phoneText)} · ${esc(countText)}${esc(totalText)}</span>
      ${favChipsHtml(client.topProducts, '22px')}
      ${client.sameNameAs?.length && !client.phone ? '<span class="tag tag-open cc-same">Mesmo nome de outra cliente</span>' : ''}
    </button>`;
  }).join('')}</div>`;
}

export async function openClients({ keepFilter = false } = {}) {
  if (!keepFilter) { filter = 'all'; query = ''; }
  clientsData = await loadClientsData();
  const reminders = (clientsData.reminders || []).length
    ? `<section class="f-block client-reminders" aria-labelledby="reminders-title">
        <h3 id="reminders-title">Datas que se repetem</h3>
        <ul class="reminder-list">${clientsData.reminders.map((item) => `<li class="reminder-item">
          <p><strong>${esc(item.name)}</strong> pediu ${esc(item.product || 'uma encomenda')} em ${esc(M.pastDayLabel(item.originalDay, app.today))}. Pode ter festa de novo: ${item.daysUntil === 0 ? 'é hoje' : `faltam ${item.daysUntil} ${item.daysUntil === 1 ? 'dia' : 'dias'}`}.</p>
          <button class="btn btn-outline btn-small" type="button" data-act="open-client" data-key="${esc(item.key)}">Ver cliente</button>
        </li>`).join('')}</ul>
      </section>`
    : '';
  openSheet(`<h2 id="sheet-title" tabindex="-1">Clientes</h2>
    ${reminders}
    <label class="field"><span>Buscar cliente</span><input id="clients-search" type="search" autocomplete="off" placeholder="Buscar por nome ou WhatsApp" value="${esc(query)}"></label>
    <div class="quick client-filters" role="group" aria-label="Filtrar clientes">
      <button class="chip" type="button" data-act="filter-clients" data-filter="all" aria-pressed="${filter === 'all'}">Todas (${clientsData.clients.length})</button>
      <button class="chip" type="button" data-act="filter-clients" data-filter="away" aria-pressed="${filter === 'away'}">Faz tempo que não pedem (${clientsData.away || 0})</button>
    </div>
    <div id="clients-results">${renderClientCards()}</div>`, openMenu);
}

export function onClientsSearch(input) {
  query = input.value;
  const box = $('#clients-results');
  if (box) box.innerHTML = renderClientCards();
}

export function filterClients(nextFilter) {
  filter = nextFilter === 'away' ? 'away' : 'all';
  for (const chip of document.querySelectorAll('[data-act="filter-clients"]')) {
    chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
  }
  const box = $('#clients-results');
  if (box) box.innerHTML = renderClientCards();
}

export async function openClient(idOrKey, back = null) {
  clientsData = await loadClientsData();
  const fromOrder = findOrder(idOrKey);
  const client = clientsData.clients.find((item) => item.key === idOrKey || item.orderIds.includes(idOrKey) || (fromOrder && item.key === clientKeyFor(fromOrder)));
  if (!client && !fromOrder) { openClients({ keepFilter: true }); return; }
  const backFn = back || (fromOrder ? () => openFicha(fromOrder.id) : () => openClients({ keepFilter: true }));
  backToCaller = backFn;
  const name = client?.name || fromOrder?.client || 'Cliente';
  const phone = client?.phone || fromOrder?.contact || '';
  const orders = (client?.orderIds || (fromOrder ? [fromOrder.id] : [])).map(findOrder).filter(Boolean)
    .sort((a, b) => String(b.dueAt || '').localeCompare(String(a.dueAt || '')));
  const purchases = client ? client.purchases : (fromOrder && M.group(fromOrder.status) !== 'out' ? 1 : 0);
  const totalCents = client ? client.totalCents : (fromOrder ? M.totalCents(fromOrder) || 0 : 0);
  const lastDay = client?.lastPurchaseDay || (fromOrder ? M.orderDay(fromOrder) : '');
  const lastLabel = lastDay ? M.pastDayLabel(lastDay, app.today) : '—';
  const reminder = (clientsData.reminders || []).find((item) => item.key === client?.key);
  const waLink = !app.demo && phone ? M.whatsappLink(phone, `Oi, ${firstName(name)}!`) : '';
  const outText = (item) => (item.status === 'Recusado' ? ' · recusado' : item.status === 'Cancelado' ? ' · cancelado' : '');

  const orderRows = orders.map((item) => {
    const tag = M.moneyTag(app.state, item), done = item.status === 'Entregue', owing = done && tag.kind === 'late';
    const badge = M.group(item.status) === 'out'
      ? `<span class="tag tag-open">${esc(item.status)}</span>`
      : done && !owing
        ? '<span class="tag tag-delivered"><i class="tag-dot" aria-hidden="true"></i>Entregue</span>'
        : `<span class="tag tag-${tag.kind}"><i class="tag-dot" aria-hidden="true"></i>${esc(tag.text)}</span>`;
    const photo = orderPhotoHtml(item, 'c-order-photo', '36px');
    return `<li><button class="list-row client-order-row" type="button" data-act="open" data-id="${esc(item.id)}">
      ${photo}
      <span class="cor-main"><strong>${esc(M.orderDay(item) ? M.pastDayLabel(M.orderDay(item), app.today) : 'Sem dia')}</strong><span>${esc(item.product + outText(item))}</span></span>
      ${badge}
    </button></li>`;
  }).join('');

  const canErase = client?.key && name !== 'Cliente removida';
  openSheet(`<h2 id="sheet-title" tabindex="-1">${esc(name)}</h2>
    <p class="muted">${phone ? `WhatsApp ${esc(formatPhone(phone))}` : 'Sem WhatsApp anotado.'}</p>
    <div class="client-stats">
      <div><small>Pedidos</small><b>${purchases}</b></div>
      <div><small>Total</small><b>${esc(M.brl(totalCents))}</b></div>
      <div><small>Último</small><b>${esc(lastLabel)}</b></div>
    </div>
    ${client?.nextOrderDay ? `<p class="client-note">Próximo pedido: <strong>${esc(M.shortDayLabel(client.nextOrderDay))}</strong>.</p>` : ''}
    ${client?.away ? `<p class="client-note is-away">Faz ${client.daysSinceLast} dias que ela não pede. Que tal mandar um oi?</p>` : ''}
    ${reminder ? `<p class="client-note">Em ${esc(M.pastDayLabel(reminder.originalDay, app.today))} ela pediu ${esc(reminder.product || 'uma encomenda')}. Pode ter festa de novo: faltam ${reminder.daysUntil} ${reminder.daysUntil === 1 ? 'dia' : 'dias'}.</p>` : ''}
    ${client?.sameNameAs?.length ? `<p class="client-note">Pode ser a mesma pessoa que ${client.sameNameAs.map((other) => `<button class="link-btn" type="button" data-act="open-client" data-key="${esc(other.key)}">${esc(other.name)}${other.phone ? ` · ${esc(formatPhone(other.phone))}` : ' (sem WhatsApp)'}</button>`).join(', ')}. As fichas não se juntam sozinhas: coloque o mesmo WhatsApp nos pedidos para juntar.</p>` : ''}
    ${client?.topProducts?.length ? `<section class="f-block client-fav-section"><h3>Doces favoritos</h3>${favChipsHtml(client.topProducts, '26px')}</section>` : ''}
    ${waLink ? `<p><a class="btn btn-outline" href="${esc(waLink)}" target="_blank" rel="noopener">Abrir conversa</a></p>` : ''}
    <h3>Pedidos</h3>
    ${orders.length ? `<ul class="list">${orderRows}</ul>` : '<p class="muted">Este é o primeiro pedido dela aqui.</p>'}
    ${canErase ? `<div class="f-footer"><button class="link-btn pi-remove" type="button" data-act="anon-client-ask" data-key="${esc(client.key)}">Apagar dados desta cliente</button></div>` : ''}`, backFn);
}

export async function askAnonymizeClient(key) {
  if (!clientsData) clientsData = await loadClientsData();
  const client = clientsData.clients.find((item) => item.key === key);
  if (!client) return;
  openSheet(`<h2 id="sheet-title" tabindex="-1">Apagar dados de ${esc(client.name)}?</h2>
    <p>Nome, WhatsApp, endereço e detalhes saem de ${client.orders} ${client.orders === 1 ? 'pedido' : 'pedidos'}. Datas e valores continuam para as suas contas. Esta ação não pode ser desfeita.</p>
    <div class="f-main">
      <button class="btn btn-danger" type="button" data-act="anon-client-confirm" data-key="${esc(client.key)}">Apagar dados</button>
      <button class="btn btn-outline" type="button" data-act="open-client" data-key="${esc(client.key)}">Voltar</button>
    </div>`, () => openClient(client.key, backToCaller));
}

export async function confirmAnonymizeClient(key, button) {
  if (button) button.disabled = true;
  try {
    let count = 0;
    try {
      const res = await api(`/clientes/${encodeURIComponent(key)}/anonimizar`, { method: 'POST', body: {} });
      count = res?.orders || 0;
    } catch {
      count = anonymizeClient(app.state, key);
    }
    await reload();
    await refresh();
    await openClients({ keepFilter: true });
    toast(`Dados apagados de ${count} ${count === 1 ? 'pedido' : 'pedidos'}.`);
  } catch (error) {
    if (button) button.disabled = false;
    toast(error.message || 'Não foi possível apagar os dados.');
  }
}
