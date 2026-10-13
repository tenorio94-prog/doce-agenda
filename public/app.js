"use strict";

const ORDER_STATUSES = ["Orçamento", "Aguardando confirmação", "Confirmado", "Em produção", "Pronto", "Entregue", "Cancelado"];
const PAYMENT_STATUSES = ["Informado", "Conferido"];
const DEFAULT_AVAILABILITY = { closedWeekdays: [], minimumNoticeHours: 0, dailyOrderLimit: null, dateOverrides: {} };
const DEFAULT_ORDER_TEMPLATE = { version: 1, fields: [
  { key: "size", label: "Tamanho", enabled: true, required: false, options: [] },
  { key: "flavor", label: "Sabor", enabled: true, required: false, options: [] },
  { key: "filling", label: "Recheio", enabled: true, required: false, options: [] },
  { key: "decoration", label: "Decoração", enabled: true, required: false, options: [] },
  { key: "inscription", label: "Inscrição", enabled: true, required: false, options: [] },
  { key: "foodNotes", label: "Observações alimentares", enabled: true, required: false, options: [] },
] };
const API = "/api";
const apiFetch = window.DoceApi.fetch;
const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const state = {
  orders: [], payments: [], availability: structuredClone(DEFAULT_AVAILABILITY), orderTemplate: structuredClone(DEFAULT_ORDER_TEMPLATE),
  restoreData: null, activeView: "today", search: "", statusFilter: "all",
  weekOffset: 0, selectedDay: localDateKey(new Date()), settingsDate: localDateKey(new Date()), detailOrderId: null,
  paymentOrderId: null, toastTimer: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (amount) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount) || 0);
const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateLabel = (value, options = { day: "2-digit", month: "short" }) => {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("pt-BR", options).format(date).replace(" de ", " ") : "Sem data";
};
const dateTimeLabel = (value) => {
  const date = parseDate(value);
  return date ? `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(date)} às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}` : "Data e horário a combinar";
};
const dateTimeInput = (value) => {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const isCancelled = (order) => order.status === "Cancelado";
const isFinished = (order) => ["Entregue", "Cancelado"].includes(order.status);
const isCommitted = (order) => ["Confirmado", "Em produção", "Pronto", "Entregue"].includes(order.status);
const orderPayments = (orderId) => state.payments.filter((payment) => String(payment.orderId) === String(orderId));
const confirmedPayments = (orderId) => orderPayments(orderId).filter((payment) => payment.status === "Conferido");
const confirmedPaid = (orderId) => confirmedPayments(orderId).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
const balanceFor = (order) => isCommitted(order) && confirmedPayments(order.id).length ? Number(order.total || 0) - confirmedPaid(order.id) : null;
const balanceLabel = (balance) => balance === null ? "Ainda não conferido" : balance < 0 ? `Excedente ${money(Math.abs(balance))}` : money(balance);
const statusSlug = (status) => ({
  "Orçamento": "quote", "Aguardando confirmação": "waiting", "Confirmado": "confirmed",
  "Em produção": "production", "Pronto": "ready", "Entregue": "entregue", "Cancelado": "cancelled",
}[status] || "waiting");
const statusPill = (status) => `<span class="status-pill status-${statusSlug(status)}-pill">${esc(status || "Sem situação")}</span>`;
const timeValue = (value) => parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
const sortOrders = (orders) => [...orders].sort((a, b) => timeValue(a.dueAt) - timeValue(b.dueAt) || timeValue(a.createdAt) - timeValue(b.createdAt));
const orderById = (id) => state.orders.find((order) => String(order.id) === String(id));
const sampleOrder = (order) => !!(order?.isSample || order?.isDemo || order?.sample);
const committedForCapacity = (order) => isCommitted(order) && !sampleOrder(order);
function localWeekday(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}
function availabilityFor(dateKey) {
  const override = state.availability.dateOverrides?.[dateKey] || {};
  const closed = Object.hasOwn(override, "closed") ? override.closed : state.availability.closedWeekdays?.includes(localWeekday(dateKey));
  const limit = Object.hasOwn(override, "limit") && override.limit !== null ? override.limit : state.availability.dailyOrderLimit;
  const count = state.orders.filter((order) => committedForCapacity(order) && order.dueAt?.slice(0, 10) === dateKey).length;
  return { closed, limit, count, full: Number.isInteger(limit) && count >= limit };
}
function calendarDateLabel(dateKey, options) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(year, month - 1, day));
}
function cakeFormMarkup(order = null) {
  const cake = order?.cake?.values || {};
  const fields = state.orderTemplate.fields.filter((field) => field.enabled).map((field) => {
    const label = `${esc(order?.cake?.labels?.[field.key] || field.label)}${field.required ? " <i>*</i>" : ""}`;
    const current = esc(cake[field.key] || "");
    const required = field.required ? ' data-cake-required="true"' : "";
    const options = Array.isArray(field.options) ? field.options : [];
    const retainedOption = cake[field.key] && !options.includes(cake[field.key]) ? `<option value="${current}" selected>${current} (já registrada)</option>` : "";
    const control = options.length
      ? `<select name="cake.${esc(field.key)}" data-cake-key="${esc(field.key)}"${required}><option value="">Selecione…</option>${retainedOption}${options.map((option) => `<option value="${esc(option)}" ${option === cake[field.key] ? "selected" : ""}>${esc(option)}</option>`).join("")}</select>`
      : `<input name="cake.${esc(field.key)}" data-cake-key="${esc(field.key)}" maxlength="300" value="${current}" placeholder="Opcional"${required}>`;
    return `<label class="field"><span>${label}</span>${control}</label>`;
  }).join("");
  return `<fieldset class="cake-template-fields"><legend>Personalização do bolo</legend>${fields}</fieldset>`;
}
function cakeDetailsMarkup(order) {
  const values = order?.cake?.values || {};
  const labels = Object.fromEntries(state.orderTemplate.fields.map((field) => [field.key, order?.cake?.labels?.[field.key] || field.label]));
  const entries = Object.entries(values).filter(([, value]) => String(value || "").trim());
  if (!entries.length) return "";
  return `<div class="cake-details"><h3>Personalização do bolo</h3><dl>${entries.map(([key, value]) => `<div><dt>${esc(labels[key] || key)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl></div>`;
}

function setConnection(mode, message) {
  const element = $("#connection");
  element.classList.toggle("is-online", mode === "online");
  element.classList.toggle("is-error", mode === "error");
  $("#connection-text").textContent = message;
}

function setError(message = "Verifique sua conexão e tente novamente.") {
  $("#error-message").textContent = message;
  $("#error-notice").hidden = false;
  setConnection("error", "Sem conexão");
}

async function loadState({ silent = false } = {}) {
  if (!silent) {
    $("#loading-state").hidden = false;
    $("#error-notice").hidden = true;
    $$(".view-panel").forEach((panel) => { panel.hidden = true; });
  }
  try {
    const response = await apiFetch(`${API}/state`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`);
    const data = await response.json();
    state.orders = Array.isArray(data.orders) ? data.orders : [];
    state.payments = Array.isArray(data.payments) ? data.payments : [];
    state.availability = data.availability || structuredClone(DEFAULT_AVAILABILITY);
    state.orderTemplate = data.orderTemplate || structuredClone(DEFAULT_ORDER_TEMPLATE);
    $("#error-notice").hidden = true;
    $("#loading-state").hidden = true;
    setConnection("online", "Salvo neste computador");
    render();
  } catch (error) {
    $("#loading-state").hidden = true;
    setError("Confira se o serviço está aberto. Seus dados anteriores continuam na tela.");
    if (!state.orders.length) render();
    console.error("Falha ao carregar a agenda:", error);
  }
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await apiFetch(`${API}${path}`, {
    method,
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `Não foi possível salvar (status ${response.status}).`;
    let errorData = {};
    try {
      const data = await response.json();
      errorData = data || {};
      if (data && (data.error || data.message)) message = data.error || data.message;
    } catch { /* A resposta pode não ter corpo JSON. */ }
    throw Object.assign(new Error(message), { status: response.status, code: errorData.code || "", data: errorData });
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function todayOrders() {
  const today = localDateKey(new Date());
  return sortOrders(state.orders.filter((order) => !sampleOrder(order) && !isCancelled(order) && order.dueAt && localDateKey(parseDate(order.dueAt) || new Date(0)) === today));
}

function rowMarkup(order, options = {}) {
  const date = parseDate(order.dueAt);
  const delivery = date ? `${dateLabel(order.dueAt, { weekday: "short", day: "2-digit", month: "short" })} · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}` : "Sem data definida";
  const balance = balanceFor(order);
  const summary = balance === null ? "" : `<span title="Após pagamentos conferidos">${esc(balance < 0 ? balanceLabel(balance) : `Saldo ${money(balance)}`)}</span>`;
  const sample = order.isSample || order.isDemo || order.sample ? `<span class="sample-tag">Exemplo fictício</span>` : "";
  return `<article class="order-row" data-open-order="${esc(order.id)}" tabindex="0" role="button" aria-label="Abrir pedido de ${esc(order.client)}">
    <span class="row-accent status-${statusSlug(order.status)}" aria-hidden="true"></span>
    <div class="row-main">
      <div class="row-title-line"><span class="row-client">${esc(order.client || "Cliente sem nome")}</span>${sample}</div>
      <div class="row-product">${esc(order.product || "Produto sem descrição")}</div>
      <div class="row-meta"><span><span class="inline-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>${esc(delivery)}</span><span>${esc(order.mode || "Retirada")}</span>${summary}</div>
    </div>
    <div class="row-side"><span class="row-total">${esc(money(order.total))}</span>${statusPill(order.status)}</div>
  </article>`;
}

function emptyState(title, message, button = true) {
  return `<div class="empty-state"><h3>${esc(title)}</h3><p>${esc(message)}</p>${button ? `<button class="button button-primary" type="button" data-action="new-order">Criar primeiro pedido</button>` : ""}</div>`;
}

function nextActionMarkup() {
  const actions = state.orders.filter((order) => !sampleOrder(order) && !isFinished(order) && order.nextAction).sort((a, b) => timeValue(a.nextAt) - timeValue(b.nextAt));
  if (!actions.length) {
    return '';
  }
  const order = actions[0];
  const when = order.nextAt ? dateTimeLabel(order.nextAt) : "Sem prazo definido";
  return `<section class="next-action-card mini-card surface"><div class="section-head"><h2>Próxima ação</h2></div><div class="next-action-copy"><strong>${esc(order.nextAction)}</strong>${esc(order.client)} · ${esc(when)}</div><button class="text-link mini-link" type="button" data-open-order="${esc(order.id)}" aria-label="Ver pedido de ${esc(order.client)}">Ver pedido</button></section>`;
}

function renderToday() {
  const panel = $("#view-today");
  panel.classList.add('today-redesign');
  const todays = todayOrders();
  const committed = state.orders.filter((order) => !sampleOrder(order) && isCommitted(order));
  const totalConfirmed = committed.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const balances = committed.map(balanceFor).filter((balance) => balance !== null);
  const unknown = committed.length - balances.length;
  const totalBalance = balances.reduce((sum, balance) => sum + Math.max(0, balance), 0);
  const upcoming = sortOrders(state.orders.filter((order) => !sampleOrder(order) && !isFinished(order) && order.dueAt && (parseDate(order.dueAt)?.getTime() ?? 0) >= new Date(new Date().setHours(24, 0, 0, 0)).getTime())).slice(0, 4);
  const pendingChanges = state.orders.filter((order) => !sampleOrder(order) && !isFinished(order) && order.pendingChange);
  const sample = state.orders.find((order) => order.isSample || order.isDemo || order.sample);
  const firstUse = !state.orders.some((order) => !(order.isSample || order.isDemo || order.sample));
  const nextAction = nextActionMarkup();
  const financeNote = unknown ? (balances.length ? 'Saldo parcial conhecido · ' : 'Nenhum saldo conhecido: ') + unknown + (unknown === 1 ? ' pedido ainda sem recebimento conferido.' : ' pedidos ainda sem recebimento conferido.') : 'Calculado após os recebimentos conferidos. Excedentes não reduzem o saldo de outros pedidos.';
  panel.innerHTML = `<div class="page-heading today-heading"><div><h1 id="today-title">Hoje</h1></div><span class="date-label">${esc(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()))}</span></div>
    ${firstUse ? `<section class="welcome-panel"><h2>Cadastre sua primeira encomenda</h2><p>Comece com cliente, produto e valor. Complete os detalhes quando estiverem combinados.</p><div class="welcome-actions"><button class="button button-primary" type="button" data-action="new-order">Novo pedido</button></div></section>` : ''}
    ${sample ? `<details class="sample-examples"><summary>Exemplo fictício — não entra na sua agenda</summary><div class="sample-example-list">${state.orders.filter(sampleOrder).map((order) => `<button class="text-link" type="button" data-open-order="${esc(order.id)}">Ver exemplo: ${esc(order.client || order.product || "pedido")}</button>`).join("")}</div></details>` : ''}
    <div class="content-grid ${nextAction ? '' : 'today-single'}"><section class="today-agenda section-card surface" aria-labelledby="today-list-title"><div class="section-head"><h2 id="today-list-title">Pedidos de hoje${todays.length ? ` <span class="today-count">· ${todays.length}</span>` : ''}</h2><button class="text-link" type="button" data-view="week">Ver semana</button></div>${todays.length ? `<div class="order-list">${todays.map((order) => rowMarkup(order)).join("")}</div>` : `<div class="today-empty"><h3>Nenhum pedido agendado para hoje.</h3><p>${upcoming.length ? 'Os próximos pedidos estão logo abaixo.' : 'Pedidos sem data aparecem em Pedidos.'}</p></div>`}</section>${nextAction ? `<aside class="content-aside">${nextAction}</aside>` : ''}</div>
    ${pendingChanges.length ? `<section class="pending-card surface"><div class="section-head"><h2>Alterações para revisar</h2><span class="pending-count">${pendingChanges.length}</span></div><div class="pending-list">${pendingChanges.slice(0, 3).map((order) => `<button class="pending-row" type="button" data-open-order="${esc(order.id)}"><span><strong>${esc(order.client)}</strong><small>${esc(order.product)}</small></span><span class="pending-chevron" aria-hidden="true">↗</span><span class="pending-banner"><strong>Pedido de mudança:</strong> ${esc(order.pendingChange)}</span></button>`).join("")}</div></section>` : ""}
    ${upcoming.length ? `<section class="coming-soon"><div class="section-head"><h2>Logo mais</h2><button class="text-link" type="button" data-view="orders">Todos os pedidos →</button></div><div class="order-list">${upcoming.map((order) => rowMarkup(order)).join("")}</div></section>` : ""}
    ${state.orders.some((order) => !sampleOrder(order)) ? `<section class="finance-summary" aria-labelledby="finance-title"><div class="section-head"><h2 id="finance-title">Resumo financeiro</h2></div><div class="stats-grid">
      <article class="stat-card"><div class="stat-top">Em andamento</div><div class="stat-value">${state.orders.filter((order) => !sampleOrder(order) && !isFinished(order)).length}</div><div class="stat-note">pedidos ainda não encerrados</div></article>
      <article class="stat-card"><div class="stat-top">Valor dos pedidos confirmados</div><div class="stat-value">${esc(money(totalConfirmed))}</div><div class="stat-note">inclui produção, prontos e entregues; não é dinheiro recebido</div></article>
      <article class="stat-card"><div class="stat-top">Saldo a receber</div><div class="stat-value ${!balances.length && committed.length ? 'is-unknown' : ''}">${balances.length || !committed.length ? esc(money(totalBalance)) : "Ainda não conferido"}</div><div class="stat-note">somente recebimentos conferidos</div></article>
    </div><p class="finance-note">${esc(financeNote)}</p></section>` : ''}
    <p class="storage-note">${window.DoceApi.mode === 'cloud' ? 'Dados salvos na sua conta. Recarregue a agenda para ver alterações feitas em outro aparelho.' : 'Dados salvos neste computador. Sem sincronização entre aparelhos.'} <button class="text-link" type="button" data-action="export">Baixar backup</button></p>`;
  panel.hidden = state.activeView !== "today";
}

function filteredOrders() {
  const query = state.search.trim().toLocaleLowerCase("pt-BR");
  return sortOrders(state.orders.filter((order) => !sampleOrder(order)).filter((order) => {
    const matchesStatus = state.statusFilter === "all" || order.status === state.statusFilter;
    const searchable = [order.client, order.product, order.details, order.location, order.contact, order.nextAction].join(" ").toLocaleLowerCase("pt-BR");
    return matchesStatus && (!query || searchable.includes(query));
  }));
}

function renderOrders() {
  const panel = $("#view-orders");
  const queryWasFocused = document.activeElement?.id === "order-search";
  const statusWasFocused = document.activeElement?.id === "status-filter";
  const caret = queryWasFocused ? document.activeElement.selectionStart : null;
  const orders = filteredOrders();
  panel.innerHTML = `<div class="page-heading"><div><span class="eyebrow">TUDO NO MESMO LUGAR</span><h1 id="orders-title">Seus pedidos</h1><p>Do primeiro orçamento à entrega, com o combinado sempre à mão.</p></div><button class="button button-primary page-add" data-action="new-order" type="button">＋ Novo pedido</button></div>
    <div class="toolbar"><label class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input class="search-input" id="order-search" type="search" placeholder="Buscar cliente, produto ou detalhe…" value="${esc(state.search)}" aria-label="Buscar pedidos"></label><select class="filter-select" id="status-filter" aria-label="Filtrar por situação"><option value="all" ${state.statusFilter === "all" ? "selected" : ""}>Todas as situações</option>${ORDER_STATUSES.map((status) => `<option value="${esc(status)}" ${state.statusFilter === status ? "selected" : ""}>${esc(status)}</option>`).join("")}</select></div>
    <p class="order-results" aria-live="polite"><strong>${orders.length}</strong> ${orders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}</p>
    ${orders.length ? `<div class="orders-full-list">${orders.map((order) => rowMarkup(order)).join("")}</div>` : state.orders.some((order) => !sampleOrder(order)) ? emptyState("Nada por aqui com esse filtro", "Tente outro nome ou situação para encontrar o pedido.", false) : emptyState("Seu próximo pedido começa aqui", "Cadastre o combinado com a cliente e acompanhe pagamentos, mudanças e data de entrega.", true)}`;
  panel.hidden = state.activeView !== "orders";
  if (queryWasFocused) {
    const input = $("#order-search"); input?.focus(); input?.setSelectionRange(caret, caret);
  }
  if (statusWasFocused) $("#status-filter")?.focus({ preventScroll: true });
}

function mondayFor(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setDate(monday.getDate() + state.weekOffset * 7);
  return monday;
}

function availabilityPanelMarkup(selectedKey) {
  const config = state.availability;
  const day = availabilityFor(selectedKey);
  const closedDays = Array.isArray(config.closedWeekdays) ? config.closedWeekdays : [];
  const override = config.dateOverrides?.[selectedKey] || {};
  const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const affected = state.orders.filter((order) => committedForCapacity(order) && order.dueAt?.slice(0, 10) === selectedKey);
  return `<section class="availability-settings surface"><details id="availability-panel-details" open>
    <summary>Regras recorrentes</summary><p>Defina dias fechados, antecedência e um limite de encomendas por data. O limite conta pedidos confirmados, não horas de produção.</p>
    <form id="availability-form"><fieldset><legend>Dias em que não recebe encomendas</legend><div class="closed-weekdays">${weekdayNames.map((name, index) => `<label><input type="checkbox" name="closedWeekdays" value="${index}" ${closedDays.includes(index) ? "checked" : ""}>${name}</label>`).join("")}</div></fieldset>
      <div class="availability-fields"><label class="field"><span>Antecedência mínima (horas)</span><input name="minimumNoticeHours" type="number" min="0" max="8760" step="1" value="${Number(config.minimumNoticeHours) || 0}"></label><label class="field"><span>Limite de encomendas por data</span><input name="dailyOrderLimit" type="number" min="1" max="50" step="1" value="${Number.isInteger(config.dailyOrderLimit) ? config.dailyOrderLimit : ""}"><small>Deixe vazio para não definir limite.</small></label></div>
      <button class="button button-primary" type="submit">Salvar regras semanais</button></form></details>
    <details id="date-availability-details" open><summary>Somente nesta data</summary><form id="date-availability-form" data-date="${esc(selectedKey)}"><h3>Exceção para ${esc(calendarDateLabel(selectedKey, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</h3><p>${day.count} encomendas ocupam esta data${Number.isInteger(day.limit) ? ` · limite ${day.limit}` : " · limite não definido"}${day.full ? " · limite atingido" : ""}${day.closed ? " · data fechada" : ""}.</p>${day.closed && affected.length ? `<p class="availability-warning"><strong>${affected.length} pedidos já combinados continuam nesta data:</strong> ${esc(affected.map((order) => order.client).join(", "))}. A regra não os move nem cancela.</p>` : ""}
      <label class="availability-closed"><input name="closed" type="checkbox" ${day.closed ? "checked" : ""}> Não vou aceitar pedidos neste dia</label><p>Desmarque para abrir esta data, mesmo se o dia da semana estiver fechado.</p>
      <label class="field"><span>Limite específico nesta data (opcional)</span><input name="limit" type="number" min="1" max="50" step="1" value="${Number.isInteger(override.limit) ? override.limit : ""}"><small>Deixe vazio para usar o limite das regras recorrentes.</small></label>
      <button class="button button-quiet" type="submit">Salvar para este dia</button><button class="text-link" type="button" data-action="clear-day-override" data-date="${selectedKey}">Usar regras semanais</button><p class="availability-note">Orçamentos e solicitações não ocupam vagas. Pedidos de exemplo são ignorados. Limites se aplicam ao confirmar; encomendas já combinadas continuam visíveis mesmo se fechar a data.</p></form></details>
  <details class="order-template-settings"><summary>Modelo de personalização do bolo</summary><p>Defina os campos e opções que você oferece. Campos marcados como obrigatórios só são exigidos ao confirmar um pedido.</p>${orderTemplateSettingsMarkup()}</details></section>`;
}

function orderTemplateSettingsMarkup() {
  return `<form id="order-template-form">${state.orderTemplate.fields.map((field) => `<details class="template-field" ${state.openTemplateField === field.key ? "open" : ""}><summary><span>${esc(field.label)}<small>${!field.enabled ? "Oculto" : field.required ? "Obrigatório ao confirmar" : "Opcional"} · ${field.options?.length ? `${field.options.length} ${field.options.length === 1 ? "opção" : "opções"}` : "Resposta livre"}</small></span></summary><fieldset><legend class="visually-hidden">${esc(field.label)}</legend><label><input name="enabled" type="checkbox" value="${esc(field.key)}" ${field.enabled ? "checked" : ""}> Mostrar este campo</label><label><input name="required" type="checkbox" value="${esc(field.key)}" ${field.required ? "checked" : ""} ${field.enabled ? "" : "disabled"}> Exigir ao confirmar</label><label class="field"><span>Nome do campo</span><input name="label.${esc(field.key)}" maxlength="80" required value="${esc(field.label)}"></label><label class="field"><span>Opções (uma por linha; vazio = resposta livre)</span><textarea name="options.${esc(field.key)}" rows="2" maxlength="1000">${esc((field.options || []).join("\n"))}</textarea></label></fieldset></details>`).join("")}<button class="button button-primary" type="submit">Salvar modelo do bolo</button></form>`;
}

function renderSettings() {
  const panel = $("#view-settings");
  const content = $("#settings-content");
  const focused = document.activeElement;
  const focusId = focused?.id === "settings-date" ? focused.id : "";
  const focusForm = focused?.form?.id;
  const focusName = ["date-availability-form", "availability-form"].includes(focusForm) ? focused.name : "";
  const focusSelection = focusName && typeof focused.selectionStart === "number" ? focused.selectionStart : null;
  content.innerHTML = `<div class="page-heading"><div><span class="eyebrow">PREFERÊNCIAS DA AGENDA</span><h1 id="settings-title">Ajustes</h1><p>Configure a disponibilidade e os detalhes que você combina nos pedidos.</p></div></div><label class="field settings-date-field"><span>Data para definir uma exceção</span><input id="settings-date" type="date" value="${esc(state.settingsDate)}"></label>${availabilityPanelMarkup(state.settingsDate)}`;
  panel.hidden = state.activeView !== "settings";
  if (focusId) $("#settings-date")?.focus({ preventScroll: true });
  if (focusName) { const target = panel.querySelector(`#${focusForm} [name="${CSS.escape(focusName)}"]`); target?.focus(); if (target && focusSelection !== null) target.setSelectionRange(focusSelection, focusSelection); }
}

function renderWeek() {
  const panel = $("#view-week");
  const focused = document.activeElement;
  const focusSelector = focused?.dataset?.weekShift !== undefined ? `[data-week-shift="${CSS.escape(focused.dataset.weekShift)}"]` : focused?.dataset?.selectDay ? `[data-select-day="${CSS.escape(focused.dataset.selectDay)}"]` : "";
  const monday = mondayFor(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index); return date;
  });
  if (!days.some((day) => localDateKey(day) === state.selectedDay)) state.selectedDay = localDateKey(days[0]);
  const selected = days.find((day) => localDateKey(day) === state.selectedDay) || days[0];
  const selectedKey = localDateKey(selected);
  const scheduled = sortOrders(state.orders.filter((order) => !sampleOrder(order) && !isCancelled(order) && order.dueAt && localDateKey(parseDate(order.dueAt) || new Date(0)) === selectedKey));
  const range = `${dateLabel(days[0], { day: "numeric", month: "short" })} – ${dateLabel(days[6], { day: "numeric", month: "short", year: "numeric" })}`;
  const todayKey = localDateKey(new Date());
  panel.innerHTML = `<div class="page-heading"><div><span class="eyebrow">AGENDA SEMANAL</span><h1 id="week-title">Sua semana</h1><p>Veja os pedidos marcados em cada dia.</p></div><div class="week-controls"><button class="icon-button week-step" data-week-shift="-1" type="button" aria-label="Semana anterior">‹</button><span class="week-range">${esc(range)}</span><button class="icon-button week-step" data-week-shift="1" type="button" aria-label="Próxima semana">›</button></div></div>
    <div class="week-days" role="group" aria-label="Escolher dia da semana">${days.map((day) => {
      const key = localDateKey(day);
      const count = state.orders.filter((order) => !sampleOrder(order) && !isCancelled(order) && order.dueAt && localDateKey(parseDate(order.dueAt) || new Date(0)) === key).length;
      const availability = availabilityFor(key);
      const classes = ["day-button", key === todayKey ? "is-today" : "", key === selectedKey ? "is-selected" : "", availability.closed ? "is-closed" : "", availability.full ? "is-full" : ""].filter(Boolean).join(" ");
      const statusText = availability.closed ? "fechado" : availability.full ? "limite atingido" : Number.isInteger(availability.limit) ? `limite ${availability.limit}` : "limite não definido";
      return `<button class="${classes}" data-select-day="${key}" type="button" aria-label="${esc(dateLabel(day, { weekday: "long", day: "numeric", month: "long" }))}, ${count} pedidos, ${statusText}" aria-pressed="${key === selectedKey}"><span class="day-name">${esc(new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", ""))}</span><span class="day-number">${day.getDate()}</span><span class="day-count">${count || "·"}</span>${availability.closed ? `<small class="day-availability">Fechado</small>` : availability.full ? `<small class="day-availability">Lotado</small>` : ""}</button>`;
    }).join("")}</div>
    <section class="week-agenda surface"><h2 class="agenda-date">${esc(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(selected))}<span>${scheduled.length ? `${scheduled.length} ${scheduled.length === 1 ? "encomenda" : "encomendas"}` : ""}</span></h2>${scheduled.length ? `<div class="order-list">${scheduled.map((order) => rowMarkup(order)).join("")}</div>` : `<div class="agenda-empty"><strong>Dia livre de encomendas marcadas</strong>Pedidos sem data continuam em Seus pedidos.</div>`}<button class="text-link" type="button" data-action="adjust-selected-date" data-date="${selectedKey}">Ajustar esta data</button></section>`;
  panel.hidden = state.activeView !== "week";
  if (focusSelector) panel.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function render() {
  renderToday(); renderOrders(); renderWeek(); renderSettings();
  $$("[data-view]").forEach((button) => {
    if (!button.matches(".nav-item, .settings-button")) return;
    const current = button.dataset.view === state.activeView;
    button.classList.toggle("active", current);
    if (current) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  $("#nav-order-count").textContent = String(state.orders.filter((order) => !sampleOrder(order)).length);
  $("#main-content").setAttribute("aria-busy", "false");
}

function populateStatusOptions() {
  $("#order-status").innerHTML = ORDER_STATUSES.map((status) => `<option value="${esc(status)}">${esc(status)}</option>`).join("");
}

function openOrderForm(order = null) {
  const form = $("#order-form");
  form.reset();
  $("#order-form-error").hidden = true;
  $("#capacity-override-box").hidden = true;
  form.elements.namedItem("overrideReason").value = "";
  $("#cake-order-fields").innerHTML = cakeFormMarkup(order);
  form.dataset.id = order ? String(order.id) : "";
  $("#order-dialog-title").textContent = order ? "Editar pedido" : "Novo pedido";
  $("#order-form-eyebrow").textContent = order ? "ATUALIZAR COMBINADO" : "NOVA ENCOMENDA";
  $("#save-order-button").textContent = order ? "Salvar alterações" : "Salvar pedido";
  const formValues = {
    client: order?.client || "", product: order?.product || "", details: order?.details || "", dueAt: dateTimeInput(order?.dueAt),
    mode: order?.mode || "Retirada", location: order?.location || "", total: order?.total ?? 0,
    status: order?.status || "Orçamento", nextAction: order?.nextAction || "", nextAt: dateTimeInput(order?.nextAt),
    pendingChange: order?.pendingChange || "", contact: order?.contact || "",
  };
  Object.entries(formValues).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
  const cakeToggle = form.elements.namedItem("hasCake");
  cakeToggle.checked = !!order?.cake || /\bbolos?\b/i.test(formValues.product);
  cakeToggle.dataset.touched = "";
  $("#cake-order-fields").hidden = !cakeToggle.checked;
  $$(".optional-fields", form).forEach((section) => { section.open = !!order && [...section.querySelectorAll("input, textarea, select")].some((field) => field.value && field.value !== "Retirada"); });
  syncDateRequirement();
  $("#order-dialog").showModal();
  setTimeout(() => form.elements.namedItem("client").focus(), 0);
}

function syncDateRequirement() {
  const confirmed = isCommitted({ status: $("#order-status").value });
  const dueAt = $("#order-form").elements.namedItem("dueAt");
  dueAt.required = confirmed;
  $("#order-form").querySelector("[name=dueAt]").setAttribute("aria-required", String(confirmed));
}

function formatWhenHistory(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date) : "Data não informada";
}

function detailMarkup(order) {
  const payments = orderPayments(order.id).sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));
  const balance = balanceFor(order);
  const history = Array.isArray(order.history) ? [...order.history].reverse() : [];
  const sample = order.isSample || order.isDemo || order.sample ? `<span class="demo-label">Exemplo fictício</span>` : "";
  const location = order.location ? `<div class="detail-tile"><div class="detail-tile-label">${order.mode === "Entrega" ? "Local de entrega" : "Local de retirada"}</div><div class="detail-tile-value">${esc(order.location)}</div></div>` : "";
  const dueAt = order.dueAt ? dateTimeLabel(order.dueAt) : "Data e horário a combinar";
  const pending = order.pendingChange ? `<div class="pending-banner"><strong>Alteração ainda pendente:</strong> ${esc(order.pendingChange)}</div>` : "";
  const details = order.details ? esc(order.details) : "Nenhum detalhe foi registrado ainda.";
  return `<div class="detail-shell">
    <div class="detail-topline"><div><span class="eyebrow">DETALHES DA ENCOMENDA</span><h2 class="detail-client" id="detail-title">${esc(order.client || "Cliente sem nome")}</h2><p class="detail-product">${esc(order.product || "Produto sem descrição")}</p></div><div class="detail-top-actions">${statusPill(order.status)}<button class="icon-button close-dialog" type="button" data-close="detail-dialog" aria-label="Fechar detalhes">×</button></div></div>
    ${sample}<div class="detail-meta-line"><span class="meta-chip">${esc(dueAt)}</span><span class="meta-chip">${esc(order.mode || "Retirada")}</span>${order.contact ? `<span class="meta-chip">${esc(order.contact)}</span>` : ""}</div>
    <div class="detail-summary"><div class="detail-summary-label">COMBINADO ATUAL</div>${details}${cakeDetailsMarkup(order)}</div>
    ${pending}
    <div class="detail-split"><div class="detail-tile"><div class="detail-tile-label">Valor total</div><div class="detail-tile-value large">${esc(money(order.total))}</div></div><div class="detail-tile"><div class="detail-tile-label">${isCommitted(order) ? "Saldo a receber" : "Recebido conferido"}</div><div class="detail-tile-value ${balance === null && isCommitted(order) ? "is-unknown" : "large"}">${balance === null ? (isCommitted(order) ? "Ainda não conferido" : esc(money(confirmedPayments(order.id).length ? confirmedPaid(order.id) : 0))) : esc(balanceLabel(balance))}${balance !== null && balance < 0 ? `<small>Confira os recebimentos registrados.</small>` : ""}</div></div>${location}${order.nextAction ? `<div class="detail-tile"><div class="detail-tile-label">Próxima ação${order.nextAt ? ` · ${esc(dateTimeLabel(order.nextAt))}` : ""}</div><div class="detail-tile-value">${esc(order.nextAction)}</div></div>` : ""}</div>
    <section class="payment-section"><div class="detail-section-title"><h3>Pagamentos</h3><button class="button button-small" data-action="add-payment" data-id="${esc(order.id)}" type="button">＋ Registrar</button></div>${payments.length ? `<div class="payment-list">${payments.map((payment) => `<div class="payment-item"><div class="payment-main"><div class="payment-amount">${esc(money(payment.amount))}</div><div class="payment-note">${esc(payment.note || "Sem observação")} · ${esc(formatWhenHistory(payment.createdAt))}</div></div><div class="payment-status"><span>${payment.status === "Conferido" ? "Recebimento conferido" : "Cliente informou"}</span>${payment.status !== "Conferido" ? `<button type="button" data-action="confirm-payment" data-id="${esc(payment.id)}">Marcar conferido</button>` : ""}</div></div>`).join("")}</div>` : `<p class="detail-empty">Nenhum pagamento registrado.</p>`}</section>
    <details class="history-section"><summary>Histórico (${history.length})</summary>${history.length ? `<div class="history-list">${history.map((item) => `<div class="history-item"><strong>${esc(formatWhenHistory(item.at))}</strong>${esc(item.text || "Atualização do pedido")}</div>`).join("")}</div>` : `<p class="detail-empty">As alterações do pedido aparecerão aqui.</p>`}</details>
    <div class="detail-actions"><button class="button button-quiet" data-action="copy-summary" data-id="${esc(order.id)}" type="button">Copiar resumo para WhatsApp</button><button class="button button-primary" data-action="edit-order" data-id="${esc(order.id)}" type="button">Editar pedido</button></div>
  </div>`;
}

function showOrderDetail(id) {
  const order = orderById(id);
  if (!order) return;
  state.detailOrderId = order.id;
  $("#detail-content").innerHTML = detailMarkup(order);
  $("#detail-dialog").showModal();
}

function closeDetails() {
  const dialog = $("#detail-dialog");
  if (dialog.open) dialog.close();
}

function openPaymentForm(orderId) {
  state.paymentOrderId = orderId;
  const order = orderById(orderId);
  const payments = order ? orderPayments(order.id) : [];
  const checkedCount = payments.filter((payment) => payment.status === "Conferido").length;
  const informedCount = payments.length - checkedCount;
  const checkedTotal = payments.filter((payment) => payment.status === "Conferido").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const receiptSummary = `${checkedCount} conferido${checkedCount === 1 ? "" : "s"} (${money(checkedTotal)})${informedCount ? ` · ${informedCount} ainda não conferido` : ""}`;
  $("#payment-context").innerHTML = order ? `<strong>${esc(order.client || "Cliente sem nome")}</strong><span>${esc(order.product || "Produto sem descrição")}</span><span>Total combinado: ${esc(money(order.total))}</span><span>${esc(receiptSummary)}</span>` : "";
  const form = $("#payment-form");
  form.reset();
  $("#payment-form-error").hidden = true;
  $("#payment-dialog").showModal();
  setTimeout(() => form.elements.namedItem("amount").focus(), 0);
}

function makeWhatsAppSummary(order) {
  const lines = [
    `Oi, ${order.client || "tudo bem"}! Confira se registrei certinho seu pedido:`,
    "",
    `Pedido: ${order.product || "não informado"}`,
  ];
  if (order.details) lines.push(`Detalhes: ${order.details}`);
  const cakeLabels = Object.fromEntries(state.orderTemplate.fields.map((field) => [field.key, order?.cake?.labels?.[field.key] || field.label]));
  for (const [key, value] of Object.entries(order.cake?.values || {})) if (String(value || "").trim()) lines.push(`${cakeLabels[key] || key}: ${value}`);
  lines.push(`${order.mode || "Retirada"}: ${order.dueAt ? dateTimeLabel(order.dueAt) : "data e horário a combinar"}`);
  if (order.location) lines.push(`Local: ${order.location}`);
  lines.push(`Total: ${money(order.total)}`);
  if (isCommitted(order)) {
    lines.push(`Pagamento conferido: ${confirmedPayments(order.id).length ? money(confirmedPaid(order.id)) : "Ainda não conferido"}`);
    lines.push(`Saldo restante: ${balanceLabel(balanceFor(order))}`);
  }
  if (order.pendingChange) lines.push(`Mudança pendente de confirmação: ${order.pendingChange}`);
  if (order.status === "Cancelado") lines.push("Este pedido está cancelado.");
  lines.push("", "Está tudo correto? Se precisar ajustar algo, me avise.");
  return lines.join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text; textarea.setAttribute("readonly", "");
  textarea.className = "visually-hidden";
  document.body.append(textarea); textarea.select();
  const success = document.execCommand("copy"); textarea.remove();
  if (!success) throw new Error("Não foi possível copiar. Tente selecionar e copiar o texto manualmente.");
}

async function exportBackup() {
  try {
    const response = await apiFetch(`${API}/export`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Não foi possível baixar o backup (status ${response.status}).`);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `doce-agenda-backup-${localDateKey(new Date())}.json`;
    document.body.append(link); link.click(); link.remove();
    URL.revokeObjectURL(link.href);
    showToast("Cópia de segurança baixada.");
  } catch (error) {
    setError("Não foi possível gerar o backup. Tente novamente.");
    showToast(error.message);
  }
}

function openRestoreDialog() {
  state.restoreData = null;
  $("#restore-file").value = "";
  $("#restore-preview").textContent = "Nenhum arquivo escolhido.";
  $("#restore-confirm").disabled = true;
  $("#restore-dialog").showModal();
}

async function inspectRestoreFile(file) {
  const preview = $("#restore-preview");
  const button = $("#restore-confirm");
  button.disabled = true;
  state.restoreData = null;
  if (!file) { preview.textContent = "Nenhum arquivo escolhido."; return; }
  if (file.size > 5 * 1024 * 1024) { preview.textContent = "O arquivo excede o limite de 5 MB."; return; }
  try {
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1 || !Array.isArray(backup.orders) || !Array.isArray(backup.payments)) throw new Error("Este arquivo não parece um backup do Doce Agenda versão 1.");
    if (backup.orders.length > 10000 || backup.payments.length > 50000) throw new Error("O backup contém mais registros que o limite aceito.");
    state.restoreData = backup;
    preview.textContent = `Arquivo reconhecido: ${backup.orders.length} pedidos e ${backup.payments.length} pagamentos. Restaurar substituirá os dados atuais ${window.DoceApi.mode === 'cloud' ? 'da sua conta' : 'neste dispositivo'}.`;
    button.disabled = false;
  } catch (error) { preview.textContent = error.message || "Não consegui ler esse arquivo JSON."; }
}

async function restoreBackup() {
  const button = $("#restore-confirm");
  if (!state.restoreData) return;
  button.disabled = true; button.textContent = "Restaurando…";
  try {
    await apiRequest("/import", { method: "POST", body: state.restoreData });
    $("#restore-dialog").close();
    await loadState({ silent: true });
    showToast("Backup restaurado. A cópia anterior foi preservada.");
  } catch (error) {
    $("#restore-preview").textContent = error.message || "Não foi possível restaurar esse backup.";
    button.disabled = false;
  } finally { button.textContent = "Substituir dados"; }
}

async function saveAvailability(event, form = event.target) {
  event.preventDefault();
  const data = new FormData(form);
  const rawLimit = String(data.get("dailyOrderLimit") || "").trim();
  const body = {
    closedWeekdays: data.getAll("closedWeekdays").map(Number),
    minimumNoticeHours: Number(data.get("minimumNoticeHours")),
    dailyOrderLimit: rawLimit ? Number(rawLimit) : null,
    dateOverrides: state.availability.dateOverrides || {},
  };
  if (!Number.isInteger(body.minimumNoticeHours) || body.minimumNoticeHours < 0 || body.minimumNoticeHours > 8760) return showToast("Antecedência deve ser entre 0 e 8.760 horas.");
  if (body.dailyOrderLimit !== null && (!Number.isInteger(body.dailyOrderLimit) || body.dailyOrderLimit < 1 || body.dailyOrderLimit > 50)) return showToast("O limite diário deve estar entre 1 e 50 encomendas, ou ficar vazio.");
  try {
    await apiRequest("/availability", { method: "PUT", body });
    await loadState({ silent: true });
    showToast("Regras semanais salvas.");
  } catch (error) { showToast(error.message || "Não foi possível salvar a disponibilidade."); }
}

async function saveDateAvailability(event, form = event.target) {
  event.preventDefault();
  const data = new FormData(form);
  const limitText = String(data.get("limit") || "").trim();
  const overrides = structuredClone(state.availability.dateOverrides || {});
  const dateKey = form.dataset.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "")) return showToast("Escolha uma data válida.");
  overrides[dateKey] = { closed: data.get("closed") === "on", limit: limitText ? Number(limitText) : null };
  if (limitText && (!Number.isInteger(Number(limitText)) || Number(limitText) < 1 || Number(limitText) > 50)) return showToast("O limite desta data deve estar entre 1 e 50, ou ficar vazio.");
  try {
    await apiRequest("/availability", { method: "PUT", body: { ...state.availability, dateOverrides: overrides } });
    await loadState({ silent: true });
    showToast("Exceção da data salva.");
  } catch (error) { showToast(error.message || "Não foi possível salvar a exceção."); }
}

async function clearDateAvailability(dateKey) {
  const overrides = structuredClone(state.availability.dateOverrides || {});
  delete overrides[dateKey];
  try {
    await apiRequest("/availability", { method: "PUT", body: { ...state.availability, dateOverrides: overrides } });
    await loadState({ silent: true });
    showToast("A data voltou a usar as regras semanais.");
  } catch (error) { showToast(error.message || "Não foi possível limpar a exceção."); }
}

async function saveOrderTemplate(event, form = event.target) {
  event.preventDefault();
  const enabled = new Set($$("[name=enabled]:checked", form).map((field) => field.value));
  const required = new Set($$("[name=required]:checked", form).map((field) => field.value));
  const fields = state.orderTemplate.fields.map((field) => {
    const label = String(form.elements.namedItem(`label.${field.key}`).value || "").trim();
    const options = String(form.elements.namedItem(`options.${field.key}`).value || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    return { key: field.key, label, enabled: enabled.has(field.key), required: enabled.has(field.key) && required.has(field.key), options: [...new Set(options)] };
  });
  if (fields.some((field) => !field.label || field.label.length > 80 || field.options.length > 20 || field.options.some((option) => option.length > 80))) return showToast("Revise os nomes e as opções: até 20 opções com 80 caracteres cada.");
  try {
    await apiRequest("/order-template", { method: "PUT", body: { version: state.orderTemplate.version, fields } });
    await loadState({ silent: true });
    state.activeView = "settings";
    render();
    $(".order-template-settings")?.setAttribute("open", "");
    showToast("Modelo do bolo salvo.");
  } catch (error) { showToast(error.message || "Não foi possível salvar o modelo."); }
}

function setActiveView(view) {
  if (!["today", "orders", "week", "settings"].includes(view)) return;
  state.activeView = view;
  render();
  $("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

function setFormError(selector, message) {
  const el = $(selector); el.textContent = message; el.hidden = false;
}

async function submitOrder(event) {
  event.preventDefault();
  syncDateRequirement();
  const form = event.currentTarget;
  const errorBox = $("#order-form-error"); errorBox.hidden = true;
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const total = Number(formData.get("total"));
  if (!Number.isFinite(total) || total < 0) return setFormError("#order-form-error", "Informe um valor total válido, igual ou maior que zero.");
  const body = {
    client: String(formData.get("client") || "").trim(), product: String(formData.get("product") || "").trim(),
    details: String(formData.get("details") || "").trim(), dueAt: String(formData.get("dueAt") || ""),
    mode: String(formData.get("mode") || "Retirada"), location: String(formData.get("location") || "").trim(),
    total, status: String(formData.get("status") || "Orçamento"), nextAction: String(formData.get("nextAction") || "").trim(),
    nextAt: String(formData.get("nextAt") || ""), pendingChange: String(formData.get("pendingChange") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
  };
  const existingOrder = form.dataset.id ? orderById(form.dataset.id) : null;
  const cakeValues = { ...(existingOrder?.cake?.values || {}), ...Object.fromEntries(state.orderTemplate.fields.filter((field) => field.enabled).map((field) => [field.key, String(formData.get(`cake.${field.key}`) || "").trim()])) };
  body.cake = formData.get("hasCake") === "on" ? { templateVersion: existingOrder?.cake?.templateVersion || state.orderTemplate.version, values: cakeValues, labels: Object.fromEntries(state.orderTemplate.fields.map((field) => [field.key, existingOrder?.cake?.labels?.[field.key] || field.label])) } : null;
  if (body.cake && isCommitted(body) && !isCommitted(existingOrder || {})) {
    const missingCake = state.orderTemplate.fields.filter((field) => field.enabled && field.required && !cakeValues[field.key]);
    if (missingCake.length) return setFormError("#order-form-error", `Preencha os campos obrigatórios do bolo: ${missingCake.map((field) => field.label).join(", ")}.`);
  }
  const overrideReason = String(formData.get("overrideReason") || "").trim();
  if (!$("#capacity-override-box").hidden) {
    if (overrideReason.length < 4) return setFormError("#order-form-error", "Registre ao menos 4 caracteres explicando a exceção de disponibilidade.");
    body.capacityOverride = { allowed: true, reason: overrideReason };
  }
  if (isCommitted(body) && !body.dueAt) return setFormError("#order-form-error", "Informe a data e o horário para confirmar este pedido.");
  const saveButton = $("#save-order-button");
  saveButton.disabled = true; saveButton.textContent = "Salvando…";
  try {
    const id = form.dataset.id;
    await apiRequest(id ? `/orders/${encodeURIComponent(id)}` : "/orders", { method: id ? "PUT" : "POST", body });
    $("#order-dialog").close();
    closeDetails();
    await loadState({ silent: true });
    showToast(id ? "Pedido atualizado." : "Pedido criado.");
  } catch (error) {
    if (["DATE_CLOSED", "DAILY_LIMIT", "NOTICE"].includes(error.code)) {
      $("#capacity-override-box").hidden = false;
      const explanation = error.code === "DATE_CLOSED" ? "A data está fechada para novas encomendas." : error.code === "DAILY_LIMIT" ? "O limite de encomendas desta data foi atingido." : "Esta encomenda não atende à antecedência mínima definida.";
      return setFormError("#order-form-error", `${explanation} Se decidiu abrir uma exceção, registre o motivo abaixo e salve novamente.`);
    }
    setFormError("#order-form-error", error.message || "Não foi possível salvar o pedido.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = form.dataset.id ? "Salvar alterações" : "Salvar pedido";
  }
}

async function submitPayment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = $("#payment-form-error"); errorBox.hidden = true;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount) || amount < 0) return setFormError("#payment-form-error", "Informe um valor igual ou maior que zero.");
  const button = $("#save-payment-button"); button.disabled = true; button.textContent = "Salvando…";
  try {
    await apiRequest(`/orders/${encodeURIComponent(state.paymentOrderId)}/payments`, {
      method: "POST", body: { amount, status: String(data.get("status") || "Informado"), note: String(data.get("note") || "").trim() },
    });
    $("#payment-dialog").close();
    await loadState({ silent: true });
    showOrderDetail(state.detailOrderId);
    showToast("Pagamento registrado.");
  } catch (error) {
    setFormError("#payment-form-error", error.message || "Não foi possível registrar o pagamento.");
  } finally {
    button.disabled = false; button.textContent = "Salvar pagamento";
  }
}

async function confirmPayment(id) {
  try {
    await apiRequest(`/payments/${encodeURIComponent(id)}`, { method: "PUT", body: { status: "Conferido" } });
    await loadState({ silent: true });
    showOrderDetail(state.detailOrderId);
    showToast("Pagamento marcado como conferido.");
  } catch (error) {
    showToast(error.message || "Não foi possível atualizar o pagamento.");
    setError("Confira sua conexão e tente novamente.");
  }
}

function handleClick(event) {
  const close = event.target.closest("[data-close]");
  if (close) { $(`#${CSS.escape(close.dataset.close)}`).close(); return; }
  const view = event.target.closest("[data-view]");
  if (view) { event.preventDefault(); setActiveView(view.dataset.view); return; }
  const newOrder = event.target.closest('[data-action="new-order"]');
  if (newOrder) { openOrderForm(); return; }
  const open = event.target.closest("[data-open-order]");
  if (open && !event.target.closest("[data-action]")) { showOrderDetail(open.dataset.openOrder); return; }
  const weekShift = event.target.closest("[data-week-shift]");
  if (weekShift) { state.weekOffset += Number(weekShift.dataset.weekShift); state.selectedDay = ""; renderWeek(); return; }
  const selectDay = event.target.closest("[data-select-day]");
  if (selectDay) { state.selectedDay = selectDay.dataset.selectDay; renderWeek(); return; }
  const adjustDate = event.target.closest('[data-action="adjust-selected-date"]');
  if (adjustDate) { state.settingsDate = adjustDate.dataset.date; setActiveView("settings"); return; }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  switch (action.dataset.action) {
    case "edit-order": {
      const order = orderById(id); closeDetails(); if (order) openOrderForm(order); break;
    }
    case "add-payment": openPaymentForm(id); break;
    case "confirm-payment": confirmPayment(id); break;
    case "copy-summary": {
      const order = orderById(id);
      if (order) copyText(makeWhatsAppSummary(order)).then(() => showToast("Resumo copiado para enviar no WhatsApp.")).catch((error) => showToast(error.message));
      break;
    }
    case "export": exportBackup(); break;
    case "clear-day-override": clearDateAvailability(action.dataset.date); break;
  }
}

function handleKeydown(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-order][role=button]")) {
    event.preventDefault(); showOrderDetail(event.target.dataset.openOrder);
  }
}

function attachEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  $("#order-form").addEventListener("submit", submitOrder);
  const resetCapacityException = (event) => {
    if (event.target.name === "overrideReason" || $("#capacity-override-box").hidden) return;
    $("#capacity-override-box").hidden = true;
    $("#order-form").elements.namedItem("overrideReason").value = "";
    $("#order-form-error").hidden = true;
  };
  $("#order-form").addEventListener("input", resetCapacityException);
  $("#order-form").addEventListener("change", resetCapacityException);
  $("#order-form [name=hasCake]").addEventListener("change", (event) => {
    $("#cake-order-fields").hidden = !event.currentTarget.checked;
  });
  $("#payment-form").addEventListener("submit", submitPayment);
  $("#main-content").addEventListener("submit", (event) => {
    if (event.target.id === "availability-form") saveAvailability(event);
    if (event.target.id === "date-availability-form") saveDateAvailability(event);
    if (event.target.id === "order-template-form") saveOrderTemplate(event);
  });
  $("#view-settings").addEventListener("change", (event) => {
    if (event.target.id === "settings-date" && /^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) { state.settingsDate = event.target.value; renderSettings(); }
    if (event.target.name === "enabled" && event.target.form?.id === "order-template-form") {
      const required = event.target.closest("details")?.querySelector('[name="required"]');
      if (required) { required.disabled = !event.target.checked; if (!event.target.checked) required.checked = false; }
    }
    const field = event.target.closest(".template-field");
    if (field) state.openTemplateField = field.querySelector("[name=enabled]")?.value || "";
  });
  $("#view-settings").addEventListener("toggle", (event) => {
    if (event.target.matches(".template-field") && event.target.open) state.openTemplateField = event.target.querySelector("[name=enabled]")?.value || "";
  }, true);
  $("#restore-file").addEventListener("change", (event) => inspectRestoreFile(event.target.files?.[0]));
  $("#restore-confirm").addEventListener("click", restoreBackup);
  $("#order-status").addEventListener("change", syncDateRequirement);
  $("#retry-button").addEventListener("click", () => loadState());
  $("#export-button").addEventListener("click", exportBackup);
  $("#restore-button").addEventListener("click", openRestoreDialog);
  $("#view-orders").addEventListener("input", (event) => {
    if (event.target.id === "order-search") { state.search = event.target.value; renderOrders(); }
  });
  $("#view-orders").addEventListener("change", (event) => {
    if (event.target.id === "status-filter") { state.statusFilter = event.target.value; renderOrders(); }
  });
  ["order-dialog", "detail-dialog", "payment-dialog"].forEach((id) => {
    const dialog = $(`#${id}`);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  });
  window.addEventListener("online", () => { if (!$("#error-notice").hidden) loadState({ silent: true }); });
  window.addEventListener("offline", () => setError("O navegador está sem conexão. Verifique sua rede e tente novamente."));
}

populateStatusOptions();
attachEvents();
loadState();
