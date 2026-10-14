"use strict";

const ORDER_STATUSES = ["Solicitação", "Orçamento", "Aguardando confirmação", "Confirmado", "Em produção", "Pronto", "Entregue", "Cancelado", "Recusado"];
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
  orderPage: {active:false,slug:'',displayName:'',welcome:'',whatsapp:'',products:[]},
  restoreData: null, activeView: "today", search: "", statusFilter: "all",
  weekOffset: 0, selectedDay: localDateKey(new Date()), settingsDate: localDateKey(new Date()), detailOrderId: null,
  paymentOrderId: null, toastTimer: null,
  month: null, monthData: null, monthLoading: false, monthError: '', monthRequest: 0,
  openSettings: new Set(), openDateException: false,
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
const isCancelled = (order) => ["Cancelado", "Recusado"].includes(order.status);
const isFinished = (order) => ["Entregue", "Cancelado", "Recusado"].includes(order.status);
const isCommitted = (order) => ["Confirmado", "Em produção", "Pronto", "Entregue"].includes(order.status);
const orderPayments = (orderId) => state.payments.filter((payment) => String(payment.orderId) === String(orderId));
const confirmedPayments = (orderId) => orderPayments(orderId).filter((payment) => payment.status === "Conferido");
const confirmedPaid = (orderId) => confirmedPayments(orderId).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
const hasReceivedPayment = (orderId) => confirmedPaid(orderId) > 0;
const balanceFor = (order) => order.totalKnown !== false && isCommitted(order) && confirmedPayments(order.id).length ? Number(order.total || 0) - confirmedPaid(order.id) : null;
const orderTotalLabel = (order) => order.totalKnown === false ? 'A combinar' : money(order.total);
const balanceLabel = (balance) => balance === null ? "Ainda não conferido" : balance < 0 ? `Excedente ${money(Math.abs(balance))}` : money(balance);
const statusSlug = (status) => ({
  "Orçamento": "quote", "Aguardando confirmação": "waiting", "Confirmado": "confirmed",
  "Em produção": "production", "Pronto": "ready", "Entregue": "entregue", "Cancelado": "cancelled",
}[status] || "waiting");
const statusPill = (status) => `<span class="status-pill status-${statusSlug(status)}-pill">${esc(status || "Sem situação")}</span>`;
// Stages of the Pedidos tab group the existing situations; stored statuses are unchanged.
const ORDER_STAGES = [
  { key: "all", label: "Todos", statuses: null },
  { key: "new", label: "Novos", statuses: ["Solicitação", "Orçamento", "Aguardando confirmação"] },
  { key: "confirmed", label: "Confirmados", statuses: ["Confirmado"] },
  { key: "production", label: "Fazendo", statuses: ["Em produção"] },
  { key: "ready", label: "Prontos", statuses: ["Pronto"] },
  { key: "delivered", label: "Entregues", statuses: ["Entregue"] },
  { key: "closed", label: "Cancelados", statuses: ["Cancelado", "Recusado"] },
];
// One-tap forward step for orders already confirmed. Earlier stages need the full form.
const NEXT_STEP = { "Confirmado": ["Em produção", "Começar a fazer"], "Em produção": ["Pronto", "Ficou pronto"], "Pronto": ["Entregue", "Marcar entregue"] };
// Next action for any order: one tap once confirmed, the form for quotes (date, capacity
// and cake checks), and the review screen for link requests.
function nextStepButton(order, extraClass = "") {
  if (sampleOrder(order)) return "";
  const next = NEXT_STEP[order.status];
  const id = esc(order.id), cls = `row-advance${extraClass ? ` ${extraClass}` : ""}`;
  if (next) return `<button class="${cls}" type="button" data-action="advance-order" data-id="${id}" data-status="${esc(next[0])}">${esc(next[1])} <span aria-hidden="true">→</span></button>`;
  if (["Orçamento", "Aguardando confirmação"].includes(order.status)) return `<button class="${cls}" type="button" data-action="confirm-order" data-id="${id}">Confirmar pedido <span aria-hidden="true">→</span></button>`;
  if (order.status === "Solicitação") return `<button class="${cls}" type="button" data-action="review-request" data-id="${id}">Revisar solicitação <span aria-hidden="true">→</span></button>`;
  return "";
}
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
  $("#connection-short").textContent = mode === "online" ? "Salvo" : message;
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
    state.orderPage = data.orderPage || {active:false,slug:'',displayName:'',welcome:'',whatsapp:'',products:[]};
    state.monthData = null; state.monthError = ''; state.monthLoading = false; state.monthRequest++;
    $("#error-notice").hidden = true;
    $("#loading-state").hidden = true;
    setConnection("online", window.DoceApi.mode === "cloud" ? "Salvo na sua conta" : window.DoceApi.mode === "browser" ? "Salvo neste navegador" : "Salvo neste computador");
    render();
    if (!silent) maybeStartTour();
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

function showToast(message, action) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("has-action", !!action);
  if (action) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "toast-action"; button.textContent = action.label;
    button.addEventListener("click", () => { toast.hidden = true; action.run(); });
    toast.append(" ", button);
  }
  toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toast.hidden = true; }, action ? 6000 : 2800);
}

// Sample orders saved by earlier versions carry the "fictício" suffix in the name; the tag already says it.
const clientName = (order) => sampleOrder(order) ? String(order.client || "").replace(/\s*•\s*exemplo fictício$/i, "") : order.client;

function todayOrders() {
  const today = localDateKey(new Date());
  return sortOrders(state.orders.filter((order) => order.status !== 'Solicitação' && !sampleOrder(order) && !isCancelled(order) && order.dueAt && localDateKey(parseDate(order.dueAt) || new Date(0)) === today));
}

const shortTime = (value) => {
  const date = parseDate(value);
  if (!date) return "";
  const minutes = date.getMinutes();
  return minutes ? `${date.getHours()}h${String(minutes).padStart(2, "0")}` : `${date.getHours()}h`;
};
// A confirmed order with a known value and no amount actually received: "falta o sinal".
const needsDeposit = (order) => isCommitted(order) && !isFinished(order) && Number(order.total || 0) > 0 && !hasReceivedPayment(order.id);

function rowMarkup(order, options = {}) {
  const date = parseDate(order.dueAt);
  const dayLabel = date ? dateLabel(order.dueAt, { weekday: "short", day: "2-digit", month: "short" }) : "Sem data definida";
  const balance = balanceFor(order);
  const paid = hasReceivedPayment(order.id) && !isCancelled(order);
  const stamp = paid ? `<span class="stamp">${balance !== null && balance <= 0 ? "Pago" : "Sinal pago"}</span>` : "";
  const summary = balance === null ? "" : `<span${balance > 0 ? ' class="row-balance"' : ""} title="Após pagamentos conferidos">${esc(balance < 0 ? balanceLabel(balance) : `Saldo ${money(balance)}`)}</span>`;
  const sample = order.isSample || order.isDemo || order.sample ? `<span class="sample-tag">Exemplo</span>` : "";
  const deposit = needsDeposit(order);
  const classes = ["order-row", isCancelled(order) ? "is-cancelled" : "", order.status === "Entregue" ? "is-delivered" : "", order.status === "Pronto" ? "is-ready" : "", deposit ? "is-deposit-pending" : "", paid ? "is-paid" : "", options.compact ? "is-compact" : "", String(order.id) === String(state.justAdvanced) ? "is-advanced" : ""].filter(Boolean).join(" ");
  const step = options.advance && !options.compact ? nextStepButton(order) : "";
  return `<article class="${classes}" data-open-order="${esc(order.id)}" tabindex="0" role="button" aria-label="Abrir pedido de ${esc(clientName(order))}">
    <span class="row-accent status-${statusSlug(order.status)}" aria-hidden="true"></span>
    <div class="row-time">${date ? esc(shortTime(order.dueAt)) : "—"}</div>
    <div class="row-main">
      <div class="row-product">${esc(order.product || "Produto sem descrição")}</div>
      <div class="row-title-line"><span class="row-client">${esc(clientName(order) || "Cliente sem nome")}</span>${sample}<span class="row-mode">${esc((order.mode || "Retirada").toLowerCase())}</span></div>
      ${order.origin==='link' ? `<div class="request-origin">Pelo link · ${esc(order.publicCode)}${order.possibleDuplicate?' · Possível duplicata':''}</div>`:''}
      ${deposit ? `<div class="row-flag">Falta o sinal</div>` : ""}
      <div class="row-meta"><span class="row-date">${esc(dayLabel)}</span>${summary}</div>
      ${step}
    </div>
    <div class="row-side"><span class="row-total">${esc(orderTotalLabel(order))}</span>${statusPill(order.status)}</div>
    ${stamp}
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

function requestBanner() {
  const pending=state.orders.filter(o=>o.status==='Solicitação');
  return pending.length ? `<section class="request-banner surface"><h2>${pending.length} ${pending.length===1?'solicitação para revisar':'solicitações para revisar'}</h2><p>Chegaram pelo link. Ainda não ocupam vagas na agenda.</p><button class="button button-primary" type="button" data-action="show-requests">Revisar solicitações</button></section>`:'';
}
const capitalize = (text) => text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);

// Reminder of what comes after today, grouped under a clear day label. It only shows while
// today is selected, so the same order never appears twice on screen.
function upcomingMarkup(orders) {
  if (!orders.length || state.selectedDay !== localDateKey(new Date())) return "";
  const now = new Date();
  const tomorrow = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const groups = new Map();
  orders.forEach((order) => {
    const key = localDateKey(parseDate(order.dueAt));
    groups.set(key, [...(groups.get(key) || []), order]);
  });
  return `<section class="coming-soon"><div class="section-head"><h2>Próximos dias</h2><button class="text-link" type="button" data-view="orders">Todos os pedidos →</button></div>
    ${[...groups].map(([key, list]) => `<div class="upcoming-day"><h3 class="upcoming-label">${key === tomorrow ? "Amanhã" : esc(capitalize(calendarDateLabel(key, { weekday: "long", day: "numeric", month: "short" }).replace(".", "")))}</h3><div class="order-list">${list.map((order) => rowMarkup(order, { compact: true })).join("")}</div></div>`).join("")}</section>`;
}

const scheduledOn = (key) => sortOrders(state.orders.filter((order) => order.status !== 'Solicitação' && !sampleOrder(order) && !isCancelled(order) && order.dueAt && localDateKey(parseDate(order.dueAt) || new Date(0)) === key));

// Agenda = today plus the week picker: the selected day starts on today and the list shows that day.
function agendaWeekMarkup(upcomingCount) {
  const monday = mondayFor(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index); return date;
  });
  const todayKey = localDateKey(new Date());
  if (!days.some((day) => localDateKey(day) === state.selectedDay)) state.selectedDay = days.some((day) => localDateKey(day) === todayKey) ? todayKey : localDateKey(days[0]);
  const selected = days.find((day) => localDateKey(day) === state.selectedDay) || days[0];
  const selectedKey = localDateKey(selected);
  const isToday = selectedKey === todayKey;
  const scheduled = scheduledOn(selectedKey);
  const range = `${dateLabel(days[0], { day: "numeric", month: "short" })} – ${dateLabel(days[6], { day: "numeric", month: "short", year: "numeric" })}`;
  const weekdayTitle = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(selected);
  const dayTitle = isToday ? "Pedidos de hoje" : capitalize(weekdayTitle);
  const empty = isToday
    ? `<div class="today-empty"><h3>Nenhum pedido agendado para hoje.</h3><p>${upcomingCount ? 'Os próximos pedidos estão logo abaixo.' : 'Pedidos sem data aparecem em Pedidos.'}</p></div>`
    : `<div class="agenda-empty"><strong>Dia livre de pedidos marcados</strong>Pedidos sem data continuam em Pedidos.</div>`;
  return `<section class="today-agenda agenda-week section-card surface" aria-labelledby="today-list-title">
    <div class="agenda-week-head"><h2 class="agenda-week-title">Sua semana</h2><div class="week-controls"><button class="icon-button week-step" data-week-shift="-1" type="button" aria-label="Semana anterior"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><span class="week-range">${esc(range)}</span><button class="icon-button week-step" data-week-shift="1" type="button" aria-label="Próxima semana"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></div></div>
    <div class="week-days" role="group" aria-label="Escolher dia da semana">${days.map((day) => {
      const key = localDateKey(day);
      const count = scheduledOn(key).length;
      const availability = availabilityFor(key);
      const classes = ["day-button", key === todayKey ? "is-today" : "", key === selectedKey ? "is-selected" : "", availability.closed ? "is-closed" : "", availability.full ? "is-full" : ""].filter(Boolean).join(" ");
      const statusText = availability.closed ? "fechado" : availability.full ? "limite atingido" : Number.isInteger(availability.limit) ? `limite ${availability.limit}` : "limite não definido";
      return `<button class="${classes}" data-select-day="${key}" type="button" aria-label="${key === todayKey ? "Hoje, " : ""}${esc(dateLabel(day, { weekday: "long", day: "numeric", month: "long" }))}, ${count} ${count === 1 ? "pedido" : "pedidos"}, ${statusText}" aria-pressed="${key === selectedKey}"><span class="day-name">${esc(new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", ""))}</span><span class="day-number">${day.getDate()}</span><span class="day-count">${count || (key === todayKey ? "hoje" : "·")}</span>${availability.closed ? `<small class="day-availability">Fechado</small>` : availability.full ? `<small class="day-availability">Lotado</small>` : ""}</button>`;
    }).join("")}</div>
    <div class="section-head"><h2 id="today-list-title">${esc(dayTitle)}${scheduled.length ? ` <span class="today-count">· ${scheduled.length}</span>` : ''}</h2>${isToday ? '' : '<button class="text-link" type="button" data-action="agenda-today">Voltar para hoje</button>'}</div>
    ${scheduled.length ? `<div class="order-list${state.agendaEnter ? " is-entering" : ""}">${scheduled.map((order) => rowMarkup(order, { advance: true })).join("")}</div>` : empty}
    <button class="text-link agenda-adjust" type="button" data-action="adjust-selected-date" data-date="${selectedKey}">Ajustar esta data</button>
  </section>`;
}

function renderToday() {
  const panel = $("#view-today");
  const focused = document.activeElement;
  const focusSelector = focused?.dataset?.weekShift !== undefined ? `[data-week-shift="${CSS.escape(focused.dataset.weekShift)}"]` : focused?.dataset?.selectDay ? `[data-select-day="${CSS.escape(focused.dataset.selectDay)}"]` : "";
  panel.classList.add('today-redesign');
  const todays = todayOrders();
  const committed = state.orders.filter((order) => !sampleOrder(order) && isCommitted(order));
  const totalConfirmed = committed.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const balances = committed.map(balanceFor).filter((balance) => balance !== null);
  const unknown = committed.length - balances.length;
  const totalBalance = balances.reduce((sum, balance) => sum + Math.max(0, balance), 0);
  const upcoming = sortOrders(state.orders.filter((order) => order.status!=='Solicitação' && !sampleOrder(order) && !isFinished(order) && order.dueAt && (parseDate(order.dueAt)?.getTime() ?? 0) >= new Date(new Date().setHours(24, 0, 0, 0)).getTime())).slice(0, 5);
  const pendingChanges = state.orders.filter((order) => !sampleOrder(order) && !isFinished(order) && order.pendingChange);
  const sample = state.orders.find((order) => order.isSample || order.isDemo || order.sample);
  const firstUse = !state.orders.some((order) => !(order.isSample || order.isDemo || order.sample));
  const nextAction = nextActionMarkup();
  const toDeliver = todays.filter((order) => !isFinished(order));
  const missingDeposit = toDeliver.filter(needsDeposit);
  const todaySummary = toDeliver.length
    ? `<strong>${toDeliver.length} para entregar</strong>${missingDeposit.length ? ` · ${missingDeposit.length} ${missingDeposit.length === 1 ? "falta" : "faltam"} o sinal` : ""}`
    : "Nada para entregar hoje";
  const financeNote = unknown ? (balances.length ? 'Saldo parcial conhecido · ' : 'Nenhum saldo conhecido: ') + unknown + (unknown === 1 ? ' pedido ainda sem recebimento conferido.' : ' pedidos ainda sem recebimento conferido.') : '';
  panel.innerHTML = `<div class="page-heading today-heading"><div><span class="date-label">${esc(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()))}</span><h1 id="today-title">Hoje</h1><p class="today-summary">${todaySummary}</p></div></div>
    ${requestBanner()}${firstUse ? `<section class="welcome-panel"><h2>Cadastre seu primeiro pedido</h2><p>Comece com cliente, produto e valor. Complete os detalhes quando estiverem combinados.</p><div class="welcome-actions"><button class="button button-primary" type="button" data-action="new-order">Nova encomenda</button><button class="text-link" type="button" data-action="open-tour">Ver como funciona</button></div></section>` : ''}
    ${sample && firstUse ? `<section class="sample-card" aria-label="Pedido de exemplo">${rowMarkup(sample)}<p>Toque para ver como fica um pedido completo. O exemplo não entra na sua agenda.</p></section>` : sample ? `<details class="sample-examples"><summary>Exemplo fictício — não entra na sua agenda</summary><div class="sample-example-list">${state.orders.filter(sampleOrder).map((order) => `<button class="text-link" type="button" data-open-order="${esc(order.id)}">Ver exemplo: ${esc(clientName(order) || order.product || "pedido")}</button>`).join("")}</div></details>` : ''}
    <div class="today-columns"><div class="today-main"><div class="content-grid today-single">${agendaWeekMarkup(upcoming.length)}</div>${nextAction}
    ${pendingChanges.length ? `<section class="pending-card surface"><div class="section-head"><h2>Alterações para revisar</h2><span class="pending-count">${pendingChanges.length}</span></div><div class="pending-list">${pendingChanges.slice(0, 3).map((order) => `<button class="pending-row" type="button" data-open-order="${esc(order.id)}"><span><strong>${esc(order.client)}</strong><small>${esc(order.product)}</small></span><span class="pending-chevron" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span><span class="pending-banner"><strong>Pedido de mudança:</strong> ${esc(order.pendingChange)}</span></button>`).join("")}</div></section>` : ""}
    ${upcomingMarkup(upcoming)}
    </div><div class="today-side">${state.orders.some((order) => !sampleOrder(order)) ? `<section class="finance-summary" aria-labelledby="finance-title"><div class="section-head"><h2 id="finance-title">Resumo financeiro</h2></div><div class="stats-grid">
      <article class="stat-card"><div class="stat-top">Em andamento</div><div class="stat-value">${state.orders.filter((order) => !sampleOrder(order) && !isFinished(order)).length}</div><div class="stat-note">pedidos ainda não encerrados</div></article>
      <article class="stat-card"><div class="stat-top">Valor dos pedidos confirmados</div><div class="stat-value">${esc(money(totalConfirmed))}</div><div class="stat-note">Soma dos pedidos confirmados. Ainda não é dinheiro recebido.</div></article>
      <article class="stat-card"><div class="stat-top">Saldo a receber</div><div class="stat-value ${!balances.length && committed.length ? 'is-unknown' : ''}">${balances.length || !committed.length ? esc(money(totalBalance)) : "Ainda não conferido"}</div><div class="stat-note">Conta só pagamentos que você conferiu.</div></article>
    </div>${financeNote ? `<p class="finance-note">${esc(financeNote)}</p>` : ''}<details class="finance-how"><summary>Como calculamos?</summary><p>O valor dos pedidos confirmados soma os pedidos confirmados, em produção, prontos e entregues. Cancelados e orçamentos ficam de fora.</p><p>O saldo de cada pedido é o valor total menos os pagamentos que você conferiu. Pagamentos só informados não entram na conta.</p><p>Se um pedido recebeu mais do que o combinado, o excedente não reduz o saldo de outros pedidos.</p></details></section>` : ''}
    ${storageNoteMarkup()}</div></div>`;
  state.agendaEnter = false;
  panel.hidden = state.activeView !== "today";
  if (focusSelector) panel.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function filteredOrders() {
  const query = state.search.trim().toLocaleLowerCase("pt-BR");
  return sortOrders(state.orders.filter((order) => !sampleOrder(order)).filter((order) => {
    const stage = ORDER_STAGES.find((item) => item.key === state.statusFilter) || ORDER_STAGES[0];
    const matchesStatus = !stage.statuses || stage.statuses.includes(order.status);
    const searchable = [order.client, order.product, order.details, order.location, order.contact, order.nextAction].join(" ").toLocaleLowerCase("pt-BR");
    return matchesStatus && (!query || searchable.includes(query));
  }));
}

function renderOrders() {
  const panel = $("#view-orders");
  const queryWasFocused = document.activeElement?.id === "order-search";
  const stageFocused = document.activeElement?.dataset?.stage;
  const caret = queryWasFocused ? document.activeElement.selectionStart : null;
  const orders = filteredOrders();
  const own = state.orders.filter((order) => !sampleOrder(order));
  const stageChips = ORDER_STAGES.map((stage) => {
    const count = stage.statuses ? own.filter((order) => stage.statuses.includes(order.status)).length : own.length;
    const current = stage.key === state.statusFilter;
    return `<button class="stage-chip${current ? " is-current" : ""}${count ? "" : " is-empty"}" type="button" data-stage="${stage.key}" aria-pressed="${current}">${esc(stage.label)}<span class="stage-count">${count}</span></button>`;
  }).join("");
  panel.innerHTML = `<div class="page-heading"><div><h1 id="orders-title">Seus pedidos</h1><p>Do primeiro orçamento à entrega, com o combinado sempre à mão.</p></div><button class="button button-primary page-add" data-action="new-order" type="button"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> Nova encomenda</button></div>
    ${requestBanner()}<div class="toolbar"><label class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input class="search-input" id="order-search" type="search" placeholder="Buscar cliente, produto ou detalhe…" value="${esc(state.search)}" aria-label="Buscar pedidos"></label></div>
    <div class="stage-strip" role="group" aria-label="Ver pedidos por etapa">${stageChips}</div>
    <p class="order-results" aria-live="polite"><strong>${orders.length}</strong> ${orders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}</p>
    ${orders.length ? `<div class="orders-full-list">${orders.map((order) => rowMarkup(order, { advance: true })).join("")}</div>` : state.orders.some((order) => !sampleOrder(order)) ? emptyState("Nada por aqui com esse filtro", "Tente outro nome ou situação para encontrar o pedido.", false) : emptyState("Seu próximo pedido começa aqui", "Cadastre o combinado com a cliente e acompanhe pagamentos, mudanças e data de entrega.", true)}`;
  panel.hidden = state.activeView !== "orders";
  if (queryWasFocused) {
    const input = $("#order-search"); input?.focus(); input?.setSelectionRange(caret, caret);
  }
  if (stageFocused) panel.querySelector(`[data-stage="${CSS.escape(stageFocused)}"]`)?.focus({ preventScroll: true });
}

function mondayFor(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setDate(monday.getDate() + state.weekOffset * 7);
  return monday;
}

function orderTemplateSettingsMarkup() {
  return `<form id="order-template-form">${state.orderTemplate.fields.map((field) => `<details class="template-field" ${state.openTemplateField === field.key ? "open" : ""}><summary><span>${esc(field.label)}<small>${!field.enabled ? "Oculto" : field.required ? "Obrigatório ao confirmar" : "Opcional"} · ${field.options?.length ? `${field.options.length} ${field.options.length === 1 ? "opção" : "opções"}` : "Resposta livre"}</small></span></summary><fieldset><legend class="visually-hidden">${esc(field.label)}</legend><label><input name="enabled" type="checkbox" value="${esc(field.key)}" ${field.enabled ? "checked" : ""}> Mostrar este campo</label><label><input name="required" type="checkbox" value="${esc(field.key)}" ${field.required ? "checked" : ""} ${field.enabled ? "" : "disabled"}> Exigir ao confirmar</label><label class="field"><span>Nome do campo</span><input name="label.${esc(field.key)}" maxlength="80" required value="${esc(field.label)}"></label><label class="field"><span>Opções (uma por linha; vazio = resposta livre)</span><textarea name="options.${esc(field.key)}" rows="2" maxlength="1000">${esc((field.options || []).join("\n"))}</textarea></label></fieldset></details>`).join("")}<button class="button button-primary" type="submit">Salvar modelo do bolo</button></form>`;
}

// Notice choices in days; stored in hours as before. A value saved earlier keeps its own option.
const NOTICE_OPTIONS = [[0, "Sem mínimo"], [24, "1 dia"], [48, "2 dias"], [72, "3 dias"], [168, "1 semana"]];
const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const noticeLabel = (hours) => NOTICE_OPTIONS.find(([value]) => value === hours)?.[1] || (hours % 24 === 0 ? `${hours / 24} dias` : `${hours} horas`);
const listJoin = (items) => items.length > 1 ? `${items.slice(0, -1).join(", ")} e ${items.at(-1)}` : items.join("");

function availabilitySettingsMarkup(selectedKey) {
  const config = state.availability;
  const day = availabilityFor(selectedKey);
  const closedDays = Array.isArray(config.closedWeekdays) ? config.closedWeekdays : [];
  const override = config.dateOverrides?.[selectedKey] || {};
  const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const affected = state.orders.filter((order) => committedForCapacity(order) && order.dueAt?.slice(0, 10) === selectedKey);
  const notice = Number(config.minimumNoticeHours) || 0;
  const noticeOptions = NOTICE_OPTIONS.some(([value]) => value === notice) ? NOTICE_OPTIONS : [...NOTICE_OPTIONS, [notice, noticeLabel(notice)]];
  return `<div class="availability-settings">
    <form id="availability-form" class="settings-form">
      <fieldset><legend>Dias em que você não aceita pedidos</legend><div class="closed-weekdays">${weekdayNames.map((name, index) => `<label><input type="checkbox" name="closedWeekdays" value="${index}" aria-label="${name}" ${closedDays.includes(index) ? "checked" : ""}><span aria-hidden="true">${name.slice(0, 3)}</span></label>`).join("")}</div></fieldset>
      <fieldset><legend>Com quanta antecedência a cliente precisa pedir?</legend><div class="choice-chips">${noticeOptions.map(([value, label]) => `<label><input type="radio" name="minimumNoticeHours" value="${value}" ${value === notice ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div></fieldset>
      <label class="field"><span>Quantos pedidos você aceita por dia?</span><input name="dailyOrderLimit" type="number" inputmode="numeric" min="1" max="50" step="1" value="${Number.isInteger(config.dailyOrderLimit) ? config.dailyOrderLimit : ""}" placeholder="Sem limite"><small>Conta só pedidos confirmados. Quando o dia lota, a agenda avisa e o link não oferece a data.</small></label>
      <button class="button button-primary" type="submit">Salvar dias e limites</button></form>
    <details id="date-availability-details" class="date-exception" ${state.openDateException ? "open" : ""}><summary>Mudar só uma data <span>Fechar um feriado ou aceitar mais pedidos num dia</span></summary>
      <label class="field settings-date-field"><span>Qual data?</span><input id="settings-date" type="date" value="${esc(selectedKey)}"></label>
      <form id="date-availability-form" data-date="${esc(selectedKey)}"><h3>${esc(capitalize(calendarDateLabel(selectedKey, { weekday: "long", day: "numeric", month: "long" })))}</h3><p class="date-exception-status">${day.count} ${day.count === 1 ? "pedido confirmado" : "pedidos confirmados"}${Number.isInteger(day.limit) ? ` · limite ${day.limit}` : " · sem limite"}${day.full ? " · lotado" : ""}${day.closed ? " · fechado" : ""}</p>${day.closed && affected.length ? `<p class="availability-warning"><strong>${affected.length} ${affected.length === 1 ? "pedido já combinado continua" : "pedidos já combinados continuam"} nesta data:</strong> ${esc(affected.map((order) => order.client).join(", "))}. Fechar a data não move nem cancela pedidos.</p>` : ""}
        <label class="availability-closed"><input name="closed" type="checkbox" ${day.closed ? "checked" : ""}> Não vou aceitar pedidos neste dia</label>
        <label class="field"><span>Limite só para este dia <small>(opcional)</small></span><input name="limit" type="number" inputmode="numeric" min="1" max="50" step="1" value="${Number.isInteger(override.limit) ? override.limit : ""}" placeholder="Igual aos outros dias"></label>
        <div class="date-exception-actions"><button class="button button-quiet" type="submit">Salvar esta data</button><button class="text-link" type="button" data-action="clear-day-override" data-date="${selectedKey}">Voltar ao normal</button></div>
        <p class="availability-note">Orçamentos e solicitações não ocupam vagas.</p></form></details>
  </div>`;
}

function settingsCard(key, title, summary, body) {
  return `<details class="settings-card" data-settings="${key}" ${state.openSettings.has(key) ? "open" : ""}><summary><span class="settings-card-text"><span class="settings-card-title">${esc(title)}</span><span class="settings-card-summary">${summary}</span></span></summary><div class="settings-card-body">${body}</div></details>`;
}

function settingsSummaries() {
  const p = state.orderPage, cloud = window.DoceApi.mode === "cloud", config = state.availability;
  const link = !cloud ? "Exemplo para explorar e ver a prévia"
    : p.active && p.slug ? `<b class="summary-live">No ar</b> · ${esc(LINK_BASE)}${esc(p.slug)}`
    : p.slug ? "Pausado · toque para ativar" : "Ainda não montado · leva 2 minutos";
  const closed = (config.closedWeekdays || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((index) => WEEKDAY_SHORT[index]);
  const notice = Number(config.minimumNoticeHours) || 0;
  const days = [closed.length ? `fecha ${listJoin(closed)}` : "todos os dias", Number.isInteger(config.dailyOrderLimit) ? `até ${config.dailyOrderLimit} por dia` : "sem limite por dia", notice ? `${noticeLabel(notice)} de antecedência` : ""].filter(Boolean).join(" · ");
  const fields = state.orderTemplate.fields.filter((field) => field.enabled), required = fields.filter((field) => field.required).length;
  const cake = `${fields.length} ${fields.length === 1 ? "campo" : "campos"}${required ? ` · ${required} ${required === 1 ? "obrigatório" : "obrigatórios"}` : ""}`;
  return { link, days: capitalize(days), cake };
}

function renderSettings() {
  const panel = $("#view-settings");
  const content = $("#settings-content");
  const focused = document.activeElement;
  const focusId = focused?.id === "settings-date" ? focused.id : "";
  const focusForm = focused?.form?.id;
  const focusName = ["date-availability-form", "availability-form"].includes(focusForm) ? focused.name : "";
  const focusSelection = focusName && typeof focused.selectionStart === "number" ? focused.selectionStart : null;
  const summary = settingsSummaries();
  content.innerHTML = `<div class="page-heading"><div><h1 id="settings-title">Ajustes</h1><p>Toque num item para ver ou mudar.</p></div></div>
    <div class="settings-list">
      ${settingsCard("link", "Link de encomenda", summary.link, orderPageMarkup())}
      ${settingsCard("days", "Dias e limites", summary.days, availabilitySettingsMarkup(state.settingsDate))}
      ${settingsCard("cake", "Detalhes do bolo", summary.cake, `<p class="settings-intro">Os campos que aparecem quando o pedido é um bolo, aqui e no seu link. Campos obrigatórios só são exigidos ao confirmar.</p>${orderTemplateSettingsMarkup()}`)}
    </div>`;
  panel.hidden = state.activeView !== "settings";
  if (focusId) $("#settings-date")?.focus({ preventScroll: true });
  if (focusName) { const target = panel.querySelector(`#${focusForm} [name="${CSS.escape(focusName)}"]`); target?.focus(); if (target && focusSelection !== null && target.setSelectionRange) target.setSelectionRange(focusSelection, focusSelection); }
}

function storageNoteMarkup() {
  const mode = window.DoceApi.mode;
  const text = mode === "cloud" ? "Salvo na sua conta. Para ver mudanças feitas em outro aparelho, recarregue a agenda."
    : mode === "browser" ? "Seus pedidos ficam só neste navegador. Se limpar os dados do navegador, eles somem."
    : "Seus pedidos ficam salvos neste computador, sem sincronização entre aparelhos.";
  const cloud = `<path d="M7 18a4 4 0 0 1-.5-7.97A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.5 8.5H7Z"/>`;
  const icon = `<svg viewBox="0 0 24 24">${cloud}${mode === "cloud" ? "" : `<path d="m4 4 16 16"/>`}</svg>`;
  return `<div class="storage-note"><span class="storage-note-icon" aria-hidden="true">${icon}</span><p>${text}</p><button class="text-link" type="button" data-action="export">Baixar cópia de segurança</button></div>`;
}

function currentBusinessMonth() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}`;
}
function shiftedMonth(month, offset) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}
function shiftMonth(offset) {
  const target = shiftedMonth(state.month || currentBusinessMonth(), offset);
  if (target > currentBusinessMonth() || target < '1900-01') return;
  state.month = target; state.monthData = null; state.monthError = ''; state.monthLoading = false; state.monthRequest++;
  renderMonth();
}
async function loadMonth() {
  const request = ++state.monthRequest, month = state.month;
  state.monthLoading = true;
  try {
    const data = await apiRequest(`/resumo-mensal?mes=${encodeURIComponent(month)}`);
    if (request !== state.monthRequest) return;
    state.monthData = data; state.monthError = '';
  } catch (error) {
    if (request !== state.monthRequest) return;
    state.monthError = error.message || 'Não foi possível carregar o mês.';
  } finally {
    if (request === state.monthRequest) { state.monthLoading = false; renderMonth(); }
  }
}
function renderMonth() {
  const panel = $('#view-month'); panel.hidden = state.activeView !== 'month';
  if (panel.hidden) return;
  state.month ||= currentBusinessMonth();
  const focused = document.activeElement?.dataset.monthShift;
  const data = state.monthData;
  const label = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${state.month}-01T12:00:00Z`));
  const card = (name,value) => `<article class="stat-card"><span class="stat-label">${name}</span><strong class="stat-value">${esc(value)}</strong></article>`;
  let content;
  if (state.monthError) content = `<div class="notice error-notice" role="alert"><p>${esc(state.monthError)}</p><button type="button" class="button button-small" data-action="retry-month">Tentar de novo</button></div>`;
  else if (!data) content = '<p class="month-feedback" role="status">Carregando seu mês…</p>';
  else if (!data.ordersCount) content = emptyState('Seu mês começa com uma encomenda', 'Aqui vão aparecer seus pedidos confirmados ou entregues, os valores e os recebimentos conferidos deste mês.', false);
  else {
    content = `<div class="stats-grid month-stats">${card('Pedidos',data.ordersCount)}${card('Vendido',money(data.soldCents/100))}${card('Recebido',money(data.receivedCents/100))}${card('A receber',money(data.receivableCents/100))}</div>`;
    if (data.ordersWithoutValue) content += `<p class="month-note">${data.ordersWithoutValue} ${data.ordersWithoutValue===1?'pedido sem valor informado não entrou':'pedidos sem valor informado não entraram'} em Vendido. ${data.ordersWithoutValue===1?'Ele continua':'Eles continuam'} na contagem de Pedidos.</p>`;
    if (data.ordersCount < 3) content += '<p class="month-note">Com mais pedidos, mostramos aqui os dias e produtos que mais saem.</p>';
    else {
      const item = row => `<li><span>${esc(row.name)}</span><strong>${row.count} ${row.count===1?'pedido':'pedidos'}</strong></li>`;
      content += `<div class="month-details"><section class="surface"><h2>Dias mais cheios</h2><ol class="month-ranking">${data.busiestDays.map(item).join('')}</ol></section><section class="surface"><h2>O que mais sai</h2><ol class="month-ranking">${data.topProducts.map(item).join('')}</ol></section><section class="surface"><h2>Prazo médio de aviso</h2><p class="month-lead-value">${data.averageNoticeDays===null?'Sem datas de criação':`${esc(new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(data.averageNoticeDays))} ${data.averageNoticeDays===1?'dia':'dias'}`}</p><p class="month-note">Entre o registro e a retirada ou entrega.${data.noticeOrdersCount<data.ordersCount?` Calculado com ${data.noticeOrdersCount} pedidos que têm data de criação.`:''}</p></section></div>`;
    }
  }
  panel.innerHTML = `<div class="page-heading"><div><h1 id="month-title">Meu mês</h1><p>Como foram as encomendas do mês.</p></div><div class="week-controls month-controls"><button class="icon-button" type="button" data-month-shift="-1" aria-label="Mês anterior" ${state.month==='1900-01'?'disabled':''}>←</button><span class="month-range" aria-live="polite">${esc(label)}</span><button class="icon-button" type="button" data-month-shift="1" aria-label="Próximo mês" ${state.month>=(data?.currentMonth||currentBusinessMonth())?'disabled':''}>→</button></div></div><div class="month-content" aria-busy="${state.monthLoading}" aria-live="polite">${content}</div><p class="month-note month-definition">Conta pedidos Confirmados e Entregues pela data de retirada ou entrega. Recebido inclui apenas pagamentos conferidos desses pedidos, mesmo que tenham sido recebidos em outro mês. Não inclui orçamentos, solicitações nem exemplos.</p>`;
  if (focused !== undefined) panel.querySelector(`[data-month-shift="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  if (!state.monthData && !state.monthError && !state.monthLoading) loadMonth();
}

function render() {
  $("#demo-bar").hidden = window.DoceApi.mode !== "browser";
  // Optional: a page cached before this button existed must still load the agenda.
  const demoReset = $("#demo-reset");
  if (demoReset) demoReset.hidden = !window.DoceStore?.resetDemo;
  renderToday(); renderOrders(); renderSettings(); renderMonth();
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
  $("#order-status").innerHTML = ORDER_STATUSES.filter(s=>!['Solicitação','Recusado'].includes(s)).map((status) => `<option value="${esc(status)}">${esc(status)}</option>`).join("");
}

function openOrderForm(order = null) {
  populateStatusOptions();
  const form = $("#order-form");
  form.reset();
  $("#order-form-error").hidden = true;
  $("#capacity-override-box").hidden = true;
  form.elements.namedItem("overrideReason").value = "";
  $("#cake-order-fields").innerHTML = cakeFormMarkup(order);
  form.dataset.id = order ? String(order.id) : "";
  form.dataset.review = order?.status==='Solicitação' ? 'true' : '';
  if(form.dataset.review) $("#order-status").innerHTML='<option>Orçamento</option><option>Confirmado</option>';
  $("#order-dialog-title").textContent = order ? "Editar encomenda" : "Nova encomenda";
  $("#save-order-button").textContent = order ? "Salvar alterações" : "Salvar encomenda";
  const formValues = {
    client: order?.client || "", product: order?.product || "", details: order?.details || "", dueAt: dateTimeInput(order?.dueAt),
    mode: order?.mode || "Retirada", location: order?.location || "", total: order && order.totalKnown !== false ? moneyInput(order.total) : "",
    status: order?.status==='Solicitação' ? 'Orçamento' : order?.status || "Orçamento", nextAction: order?.nextAction || "", nextAt: dateTimeInput(order?.nextAt),
    pendingChange: order?.pendingChange || "", contact: order?.contact || "",
  };
  Object.entries(formValues).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
  form.elements.namedItem("dueDate").value = formValues.dueAt.slice(0, 10);
  form.elements.namedItem("dueTime").value = formValues.dueAt.slice(11, 16);
  clearFieldErrors(form);
  const cakeToggle = form.elements.namedItem("hasCake");
  cakeToggle.checked = !!order?.cake || /\bbolos?\b/i.test(formValues.product);
  cakeToggle.dataset.touched = "";
  $("#cake-order-fields").hidden = !cakeToggle.checked;
  $$(".optional-fields", form).forEach((section) => { section.open = !!order && [...section.querySelectorAll("input, textarea, select")].some((field) => field.value && field.value !== "Retirada"); });
  syncDateRequirement();
  if(form.dataset.review) {$("#order-dialog-title").textContent='Editar e aceitar solicitação';$("#save-order-button").textContent='Aceitar solicitação';}
  $("#order-dialog").showModal();
  setTimeout(() => form.elements.namedItem("client").focus(), 0);
}

function syncDateRequirement() {
  const confirmed = isCommitted({ status: $("#order-status").value });
  ["dueDate", "dueTime"].forEach((name) => {
    const field = $("#order-form").elements.namedItem(name);
    field.required = confirmed;
    field.setAttribute("aria-required", String(confirmed));
  });
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
  const whenLabel = `${order.dueAt ? `${dateLabel(order.dueAt, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")} · ${shortTime(order.dueAt)}` : "Sem data"}`;
  const paidNow = confirmedPaid(order.id);
  const informedNow = payments.filter((payment) => payment.status === "Informado").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const lastConfirmed = payments.find((payment) => payment.status === "Conferido" && Number(payment.amount) > 0);
  const stampDay = lastConfirmed ? (parseDate(lastConfirmed.confirmedAt || lastConfirmed.createdAt) || null) : null;
  const stampDate = stampDay ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(stampDay).replace(/\./g, "").replace(" de ", " ").toUpperCase() : "";
  const depositCard = !isCommitted(order) || isCancelled(order) ? "" : hasReceivedPayment(order.id)
    ? `<section class="deposit-card is-paid" aria-label="Sinal"><div class="deposit-top"><span class="deposit-label">Sinal</span><span>Total ${esc(orderTotalLabel(order))}</span></div><div class="deposit-main"><div class="deposit-amount">${esc(money(paidNow))}</div><span class="stamp stamp-large"><span>${balance !== null && balance <= 0 ? "Pago" : "Sinal pago"}</span>${stampDate ? `<small>${esc(stampDate)}</small>` : ""}</span></div><div class="deposit-note">${balance !== null && balance > 0 ? `Falta ${esc(money(balance))} na ${order.mode === "Entrega" ? "entrega" : "retirada"}` : order.totalKnown === false ? "Valor total ainda a combinar" : "Pagamento completo"}</div></section>`
    : `<section class="deposit-card is-pending" aria-label="Sinal"><div class="deposit-top"><span class="deposit-label">Sinal</span><span>Total ${esc(orderTotalLabel(order))}</span></div><div class="deposit-amount">${informedNow > 0 ? esc(money(informedNow)) : confirmedPayments(order.id).length ? esc(money(0)) : "—"}</div><div class="deposit-note">${informedNow > 0 ? "Informado pela cliente, ainda não conferido" : confirmedPayments(order.id).length ? "Conferido: nenhum valor recebido" : "Ainda não recebido"}</div></section>`;
  const pending = order.pendingChange ? `<div class="pending-banner"><strong>Alteração ainda pendente:</strong> ${esc(order.pendingChange)}</div>` : "";
  const details = order.details ? esc(order.details) : "Nenhum detalhe foi registrado ainda.";
  return `<div class="detail-shell">
    <div class="detail-topline"><div><p class="detail-when">${esc(whenLabel)}</p><h2 class="detail-client" id="detail-title">${esc(order.product || "Produto sem descrição")}</h2><p class="detail-product">para ${esc(clientName(order) || "cliente sem nome")}</p></div><div class="detail-top-actions">${statusPill(order.status)}<button class="icon-button close-dialog" type="button" data-close="detail-dialog" aria-label="Fechar detalhes"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
    ${sample}${order.status === "Solicitação" ? "" : (() => { const step = nextStepButton(order, "detail-advance"); return step ? `<div class="detail-next">${step}</div>` : ""; })()}<div class="detail-meta-line"><span class="meta-chip">${esc(dueAt)}</span><span class="meta-chip">${esc(order.mode || "Retirada")}</span>${order.contact ? `<span class="meta-chip">${esc(order.contact)}</span>` : ""}</div>
    <div class="detail-summary"><div class="detail-summary-label">COMBINADO ATUAL</div>${details}${cakeDetailsMarkup(order)}</div>
    ${pending}${requestReviewMarkup(order)}
    ${depositCard}<p class="deposit-rule">O sinal só conta quando você confirma que recebeu.</p>
    <div class="detail-split"><div class="detail-tile"><div class="detail-tile-label">Valor total</div><div class="detail-tile-value large">${esc(orderTotalLabel(order))}</div></div><div class="detail-tile"><div class="detail-tile-label">${isCommitted(order) ? "Saldo a receber" : "Recebido conferido"}</div><div class="detail-tile-value ${balance === null && isCommitted(order) ? "is-unknown" : "large"}">${balance === null ? (isCommitted(order) ? "Ainda não conferido" : esc(money(confirmedPayments(order.id).length ? confirmedPaid(order.id) : 0))) : esc(balanceLabel(balance))}${balance !== null && balance < 0 ? `<small>Confira os recebimentos registrados.</small>` : ""}</div></div>${location}${order.nextAction ? `<div class="detail-tile"><div class="detail-tile-label">Próxima ação${order.nextAt ? ` · ${esc(dateTimeLabel(order.nextAt))}` : ""}</div><div class="detail-tile-value">${esc(order.nextAction)}</div></div>` : ""}</div>
    <section class="payment-section" ${order.status==='Solicitação'?'hidden':''}><div class="detail-section-title"><h3>Pagamentos</h3><button class="button button-small" data-action="add-payment" data-id="${esc(order.id)}" type="button"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> Registrar</button></div>${payments.length ? `<div class="payment-list">${payments.map((payment) => `<div class="payment-item"><div class="payment-main"><div class="payment-amount">${esc(money(payment.amount))}</div><div class="payment-note">${esc(payment.note || "Sem observação")} · ${esc(formatWhenHistory(payment.createdAt))}</div></div><div class="payment-status"><span>${payment.status === "Conferido" ? "Recebimento conferido" : "Cliente informou"}</span>${payment.status !== "Conferido" ? `<button type="button" data-action="confirm-payment" data-id="${esc(payment.id)}">Marcar conferido</button>` : ""}</div></div>`).join("")}</div>` : `<p class="detail-empty">Nenhum pagamento registrado.</p>`}</section>
    <details class="history-section"><summary>Histórico (${history.length})</summary>${history.length ? `<div class="history-list">${history.map((item) => `<div class="history-item"><strong>${esc(formatWhenHistory(item.at))}</strong>${esc(item.text || "Atualização do pedido")}</div>`).join("")}</div>` : `<p class="detail-empty">As alterações do pedido aparecerão aqui.</p>`}</details>
    <div class="detail-actions"><button class="button button-quiet" data-action="copy-summary" data-id="${esc(order.id)}" type="button">${order.reviewOutcome?'Copiar mensagem para a cliente':'Copiar resumo para WhatsApp'}</button><button class="button button-primary" data-action="edit-order" data-id="${esc(order.id)}" type="button" ${order.status==='Recusado'?'hidden':''}>${order.status==='Solicitação'?'Editar e aceitar':'Editar encomenda'}</button></div>
  </div>`;
}

function showOrderDetail(id) {
  const order = orderById(id);
  if (!order) return;
  state.detailOrderId = order.id;
  $("#detail-content").innerHTML = detailMarkup(order);
  if (!$("#detail-dialog").open) $("#detail-dialog").showModal();
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
  $("#payment-context").innerHTML = order ? `<strong>${esc(order.client || "Cliente sem nome")}</strong><span>${esc(order.product || "Produto sem descrição")}</span><span>Total combinado: ${esc(orderTotalLabel(order))}</span><span>${esc(receiptSummary)}</span>` : "";
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
  lines.push(`Total: ${orderTotalLabel(order)}`);
  if (isCommitted(order)) {
    lines.push(`Pagamento conferido: ${confirmedPayments(order.id).length ? money(confirmedPaid(order.id)) : "Ainda não conferido"}`);
    lines.push(`Saldo restante: ${balanceLabel(balanceFor(order))}`);
  }
  if (order.pendingChange) lines.push(`Mudança pendente de confirmação: ${order.pendingChange}`);
  if (order.status === "Cancelado") lines.push("Este pedido está cancelado.");
  lines.push("", "Está tudo correto? Se precisar ajustar algo, me avise.");
  if(order.publicCode)lines.unshift(`Solicitação ${order.publicCode}`);
  if(order.status==='Solicitação')lines.push('Ainda não confirmado. Aguarde a revisão da confeitaria.');
  if(order.status==='Recusado')lines.push(`Solicitação recusada${order.refusalReason?`: ${order.refusalReason}`:'.'}`);
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
    preview.textContent = `Arquivo reconhecido: ${backup.orders.length} ${backup.orders.length === 1 ? "pedido" : "pedidos"} e ${backup.payments.length} ${backup.payments.length === 1 ? "pagamento" : "pagamentos"}. Restaurar substituirá os dados atuais ${window.DoceApi.mode === 'cloud' ? 'da sua conta' : 'neste dispositivo'}.`;
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
  if (body.dailyOrderLimit !== null && (!Number.isInteger(body.dailyOrderLimit) || body.dailyOrderLimit < 1 || body.dailyOrderLimit > 50)) return showToast("O limite diário deve estar entre 1 e 50 pedidos, ou ficar vazio.");
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
    showToast("Modelo do bolo salvo.");
  } catch (error) { showToast(error.message || "Não foi possível salvar o modelo."); }
}

// Opens the edit form already set to Confirmado; the form keeps the date, capacity and cake checks.
function openConfirmForm(order) {
  openOrderForm(order);
  $("#order-status").value = "Confirmado";
  syncDateRequirement();
  $("#order-dialog-title").textContent = "Confirmar pedido";
  $("#save-order-button").textContent = "Confirmar pedido";
}

// Moves a confirmed order one stage forward, with undo for a mistaken tap.
async function advanceOrder(id, status, undo = true) {
  const order = orderById(id);
  if (!order) return;
  const previous = order.status;
  try {
    await apiRequest(`/orders/${encodeURIComponent(id)}`, { method: "PUT", body: { status } });
    state.justAdvanced = id;
    await loadState({ silent: true });
    state.justAdvanced = null;
    if ($("#detail-dialog").open && String(state.detailOrderId) === String(id)) showOrderDetail(id);
    showToast(`${clientName(order) || "Pedido"}: ${status}.`, undo && { label: "Desfazer", run: () => advanceOrder(id, previous, false) });
  } catch (error) {
    showToast(error.message || "Não foi possível mudar a etapa.");
    render();
  }
}

function setActiveView(view) {
  if (view === "week") view = "today";
  if (!["today", "orders", "settings", "month"].includes(view)) return;
  state.activeView = view;
  render();
  $("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

function setFormError(selector, message) {
  const el = $(selector); el.textContent = message; el.hidden = false;
}

// Accepts "150", "150,5", "150.50" and "1.250,00". Empty means zero (value not known yet).
function parseMoney(value) {
  const text = String(value ?? "").trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!text) return 0;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(text)) return NaN;
  if (text.includes(",")) return Number(text.replace(/\./g, "").replace(",", "."));
  return Number(/^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, "") : text);
}
const moneyInput = (value) => { const number = Number(value) || 0; return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(".", ","); };

// Error next to the field (UI-6); the summary box at the top repeats it for screen readers.
function clearFieldErrors(form) {
  $$(".field-error", form).forEach((node) => node.remove());
  $$("[aria-invalid]", form).forEach((field) => { field.removeAttribute("aria-invalid"); field.removeAttribute("aria-describedby"); });
}
function setFieldError(form, name, message) {
  const field = form.elements.namedItem(name);
  const note = document.createElement("small");
  note.className = "field-error"; note.id = `${form.id}-${name}-error`; note.textContent = message;
  field.setAttribute("aria-invalid", "true"); field.setAttribute("aria-describedby", note.id);
  field.closest(".field").append(note);
  setFormError(`#${form.id}-error`, message);
  field.focus();
}

async function submitOrder(event) {
  event.preventDefault();
  syncDateRequirement();
  const form = event.currentTarget;
  const errorBox = $("#order-form-error"); errorBox.hidden = true;
  clearFieldErrors(form);
  const dueDate = form.elements.namedItem("dueDate").value;
  const dueTime = form.elements.namedItem("dueTime").value;
  form.elements.namedItem("dueAt").value = dueDate && dueTime ? `${dueDate}T${dueTime}` : "";
  if (!form.reportValidity()) return;
  if (dueDate && !dueTime) return setFieldError(form, "dueTime", "Informe também o horário.");
  if (dueTime && !dueDate) return setFieldError(form, "dueDate", "Informe também a data.");
  const formData = new FormData(form);
  const total = parseMoney(formData.get("total"));
  if (!Number.isFinite(total) || total < 0) return setFieldError(form, "total", "Informe um valor válido, como 150 ou 150,50.");
  const body = {
    client: String(formData.get("client") || "").trim(), product: String(formData.get("product") || "").trim(),
    details: String(formData.get("details") || "").trim(), dueAt: String(formData.get("dueAt") || ""),
    mode: String(formData.get("mode") || "Retirada"), location: String(formData.get("location") || "").trim(),
    total, totalKnown: String(formData.get("total") || '').trim() !== '', status: String(formData.get("status") || "Orçamento"), nextAction: String(formData.get("nextAction") || "").trim(),
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
  if (isCommitted(body) && !body.dueAt) return setFieldError(form, "dueDate", "Informe a data e o horário para confirmar este pedido.");
  const saveButton = $("#save-order-button");
  saveButton.disabled = true; saveButton.textContent = "Salvando…";
  try {
    const id = form.dataset.id;
    const reviewing=form.dataset.review==='true';
    const saved = await apiRequest(reviewing ? `/orders/${encodeURIComponent(id)}/accept` : id ? `/orders/${encodeURIComponent(id)}` : "/orders", { method: reviewing ? 'POST' : id ? "PUT" : "POST", body: reviewing ? {status:body.status,order:body} : body });
    $("#order-dialog").close();
    closeDetails();
    await loadState({ silent: true });
    const savedOrder = orderById(id || saved?.id || saved?.order?.id);
    if (savedOrder) $$(".order-row").filter((row) => row.dataset.openOrder === savedOrder.id).forEach((row) => row.classList.add("is-fresh"));
    showToast("Encomenda salva.", savedOrder && { label: "Copiar resumo", run: () => copyText(makeWhatsAppSummary(savedOrder)).then(() => showToast("Resumo copiado para enviar no WhatsApp.")).catch((error) => showToast(error.message)) });
  } catch (error) {
    if (["DATE_CLOSED", "DAILY_LIMIT", "NOTICE"].includes(error.code) && form.dataset.review!=='true') {
      $("#capacity-override-box").hidden = false;
      const explanation = error.code === "DATE_CLOSED" ? "A data está fechada para novos pedidos." : error.code === "DAILY_LIMIT" ? "O limite de pedidos desta data foi atingido." : "Este pedido não atende à antecedência mínima definida.";
      return setFormError("#order-form-error", `${explanation} Se decidiu abrir uma exceção, registre o motivo abaixo e salve novamente.`);
    }
    setFormError("#order-form-error", error.message || "Não foi possível salvar o pedido.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = form.dataset.id ? "Salvar alterações" : "Salvar encomenda";
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
  const monthShift = event.target.closest('[data-month-shift]');
  if (monthShift) { shiftMonth(Number(monthShift.dataset.monthShift)); return; }
  const newOrder = event.target.closest('[data-action="new-order"]');
  if (newOrder) { openOrderForm(); return; }
  const open = event.target.closest("[data-open-order]");
  if (open && !event.target.closest("[data-action]")) { showOrderDetail(open.dataset.openOrder); return; }
  const weekShift = event.target.closest("[data-week-shift]");
  if (weekShift) { state.weekOffset += Number(weekShift.dataset.weekShift); state.selectedDay = ""; state.agendaEnter = true; renderToday(); return; }
  const selectDay = event.target.closest("[data-select-day]");
  if (selectDay) { state.selectedDay = selectDay.dataset.selectDay; state.agendaEnter = true; renderToday(); return; }
  const stage = event.target.closest("[data-stage]");
  if (stage) { state.statusFilter = stage.dataset.stage; renderOrders(); return; }
  const adjustDate = event.target.closest('[data-action="adjust-selected-date"]');
  if (adjustDate) {
    state.settingsDate = adjustDate.dataset.date; state.openSettings.add("days"); state.openDateException = true;
    setActiveView("settings");
    $("#date-availability-details")?.scrollIntoView({ block: "start" });
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  switch (action.dataset.action) {
    case "edit-order": {
      const order = orderById(id); closeDetails(); if (order) openOrderForm(order); break;
    }
    case 'show-requests': state.statusFilter='new';state.search='';setActiveView('orders');break;
    case 'open-tour': openTour(); break;
    case 'reset-demo':
      if (window.DoceStore?.resetDemo && window.confirm('Recomeçar a demonstração? Os pedidos de exemplo voltam ao início e o que você mudou aqui é apagado.')) { window.DoceStore.resetDemo(); location.reload(); }
      break;
    case 'agenda-today': state.weekOffset=0;state.selectedDay=localDateKey(new Date());state.agendaEnter=true;renderToday();break;
    case 'advance-order': action.disabled=true;advanceOrder(id,action.dataset.status);break;
    case 'confirm-order': { const order = orderById(id); closeDetails(); if (order) openConfirmForm(order); break; }
    case 'review-request': showOrderDetail(id); break;
    case 'retry-month': state.monthError='';state.monthData=null;renderMonth();break;
    case 'copy-order-link': copyOrderLink(); break;
    case 'share-order-link': shareOrderLink(); break;
    case 'preview-link': previewOrderLink(); break;
    case 'add-product': addProductRow(); break;
    case 'remove-product': removeProductRow(action); break;
    case 'link-metrics': loadLinkMetrics();break;
    case 'accept-request': reviewRequest(id,action.dataset.status);break;
    case 'refuse-request': refuseRequest(id);break;
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
    if (event.target.id === "order-page-form") saveOrderPage(event);
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
  $("#view-settings").addEventListener('input',event=>{
    if(event.target.name==='slug')event.target.dataset.edited='true';
    if(event.target.name==='displayName'){
      const slug=$('#order-page-form [name=slug]');if(slug&&!slug.dataset.edited)slug.value=slugFrom(event.target.value);
    }
  });
  // Typed addresses become valid ones: lowercase, no accents, hyphens instead of spaces.
  $("#view-settings").addEventListener("change", (event) => { if (event.target.name === "slug") event.target.value = slugFrom(event.target.value); });
  $("#view-settings").addEventListener("toggle", (event) => {
    if (event.target.matches(".template-field") && event.target.open) state.openTemplateField = event.target.querySelector("[name=enabled]")?.value || "";
    // Saving re-renders Ajustes; remember which cards were open.
    if (event.target.matches(".settings-card")) { const key = event.target.dataset.settings; if (event.target.open) state.openSettings.add(key); else state.openSettings.delete(key); }
    if (event.target.id === "date-availability-details") state.openDateException = event.target.open;
  }, true);
  $("#restore-file").addEventListener("change", (event) => inspectRestoreFile(event.target.files?.[0]));
  $("#restore-confirm").addEventListener("click", restoreBackup);
  $("#order-status").addEventListener("change", syncDateRequirement);
  $("#order-form").addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-due-shortcut]");
    if (!shortcut) return;
    const day = new Date(); day.setDate(day.getDate() + Number(shortcut.dataset.dueShortcut));
    const form = event.currentTarget;
    form.elements.namedItem("dueDate").value = localDateKey(day);
    form.elements.namedItem("dueDate").dispatchEvent(new Event("input", { bubbles: true }));
    form.elements.namedItem("dueTime").focus();
  });
  $("#retry-button").addEventListener("click", () => loadState());
  $("#export-button").addEventListener("click", exportBackup);
  $("#restore-button").addEventListener("click", openRestoreDialog);
  $("#view-orders").addEventListener("input", (event) => {
    if (event.target.id === "order-search") { state.search = event.target.value; renderOrders(); }
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
// ---- Link de encomenda: passo a passo, lista de produtos e prévia ----
const LINK_BASE = "lucast.app/p/";
const LINK_PREVIEW_KEY = "doce-agenda.link-preview";
const slugFrom = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
const productRowMarkup = (product = { name: "", description: "" }) => `<div class="product-row"><input name="productName" maxlength="80" value="${esc(product.name)}" placeholder="Ex.: Bolo de aniversário" aria-label="Nome do produto"><input name="productDescription" maxlength="160" value="${esc(product.description)}" placeholder="Detalhe opcional, ex.: a partir de 1 kg" aria-label="Detalhe do produto (opcional)"><button class="icon-button product-remove" type="button" data-action="remove-product" aria-label="Remover produto"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;

function orderPageMarkup() {
  const p = state.orderPage, cloud = window.DoceApi.mode === "cloud", live = cloud && p.active && p.slug;
  const products = p.products.length ? p.products : [{ name: "", description: "" }];
  const hero = live
    ? `<div class="link-hero is-live"><span class="live-badge"><i aria-hidden="true"></i>No ar</span><h2>Seu link de encomenda</h2><p class="link-url">${esc(LINK_BASE)}<b>${esc(p.slug)}</b></p>
      <div class="link-share"><button class="button button-primary" type="button" data-action="copy-order-link">Copiar link</button><button class="button button-quiet" type="button" data-action="share-order-link">Mandar no WhatsApp</button></div>
      <button class="text-link" type="button" data-action="preview-link">Ver como a cliente vê</button>
      <p class="link-tip">Coloque na bio do Instagram e no status do WhatsApp. Cada pedido chega em <b>Novos</b> para você revisar antes de aceitar.</p></div>`
    : `<div class="link-hero"><h2>Link de encomenda</h2><p>Sua cliente escolhe o doce e uma data livre e manda o pedido sozinha. Você revisa antes de aceitar. Leva uns 2 minutos para montar.</p>${cloud ? "" : '<p class="link-demo-note">Na demonstração dá para montar e ver a prévia. Para receber pedidos de verdade, crie sua conta grátis.</p>'}</div>`;
  const actions = live
    ? '<button class="button button-primary" type="submit" name="intent" value="save">Salvar alterações</button><button class="button button-quiet" type="button" data-action="preview-link">Ver prévia</button><button class="text-link link-pause" type="submit" name="intent" value="pause">Pausar link</button>'
    : `${cloud ? '<button class="button button-primary" type="submit" name="intent" value="activate">Ativar meu link</button>' : ""}<button class="button ${cloud ? "button-quiet" : "button-primary"}" type="button" data-action="preview-link">Ver como a cliente vê</button>${cloud ? '<button class="text-link" type="submit" name="intent" value="save">Salvar sem ativar</button>' : ""}`;
  const form = `<form id="order-page-form" class="link-steps" novalidate>
    <fieldset class="link-step"><legend><span class="step-n">1</span>Sua vitrine</legend>
      <label class="field"><span>Nome da confeitaria</span><input name="displayName" maxlength="60" value="${esc(p.displayName)}" placeholder="Como sua confeitaria se chama?" autocomplete="organization"></label>
      <label class="field"><span>Boas-vindas <small>(opcional)</small></span><textarea name="welcome" maxlength="280" rows="2" placeholder="Ex.: Oi! Escolha o doce e a data. Eu confirmo tudo pelo WhatsApp.">${esc(p.welcome)}</textarea></label></fieldset>
    <fieldset class="link-step"><legend><span class="step-n">2</span>O que você aceita por encomenda</legend>
      <div class="product-list" id="product-list">${products.map(productRowMarkup).join("")}</div>
      <button class="text-link add-product" type="button" data-action="add-product">+ Adicionar produto</button>
      <p class="link-step-note">A cliente também pode escolher "Outro" e descrever o que quer.</p></fieldset>
    <fieldset class="link-step"><legend><span class="step-n">3</span>Seu link</legend>
      <label class="field"><span>Endereço</span><span class="slug-field"><span class="slug-prefix">${esc(LINK_BASE)}</span><input name="slug" maxlength="40" value="${esc(p.slug)}" ${p.slug ? 'data-edited="true"' : ""} autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="preenche sozinho com o nome"></span><small>Criado a partir do nome. Pode trocar: letras, números e hífen.</small></label>
      <label class="field"><span>Seu WhatsApp <small>(opcional)</small></span><input name="whatsapp" type="tel" maxlength="30" value="${esc(p.whatsapp)}" placeholder="(11) 99999-9999" autocomplete="tel"><small>Com o número, a cliente pode te avisar no WhatsApp depois de mandar o pedido.</small></label></fieldset>
    <p class="link-privacy">Ao ativar, você recebe os dados da cliente para atender a encomenda, conforme a <a href="/privacidade/" target="_blank" rel="noopener">política de privacidade</a>.</p>
    <p id="order-page-error" class="form-error" role="alert" hidden></p>
    <div class="link-save">${actions}</div>
  </form>`;
  const extras = live ? '<div class="link-extras"><p>Pausar impede pedidos novos. Os que já chegaram continuam para revisão.</p><button class="text-link" type="button" data-action="link-metrics">Ver métricas do link</button><p id="link-metrics-result" class="form-hint" aria-live="polite"></p></div>' : "";
  return `<section class="surface order-page-settings link-studio">${hero}${live ? `<details class="link-edit"><summary>Editar vitrine, produtos e endereço</summary>${form}</details>` : form}${extras}</section>`;
}

function linkFormValues(form) {
  const data = new FormData(form), descriptions = data.getAll("productDescription");
  const products = data.getAll("productName").map((name, index) => ({ name: String(name).trim(), description: String(descriptions[index] || "").trim() })).filter((product) => product.name);
  return { displayName: String(data.get("displayName") || "").trim(), slug: String(data.get("slug") || "").trim(), welcome: String(data.get("welcome") || "").trim(), whatsapp: String(data.get("whatsapp") || "").trim(), products };
}

async function saveOrderPage(event) {
  event.preventDefault();
  const form = event.target, error = $("#order-page-error"), intent = event.submitter?.value || "save";
  if (window.DoceApi.mode !== "cloud") return;
  const active = intent === "activate" ? true : intent === "pause" ? false : state.orderPage.active;
  const values = linkFormValues(form);
  error.hidden = true;
  if (active && (!values.displayName || !values.slug)) { error.textContent = "Para ativar, preencha o nome da confeitaria e o endereço do link."; error.hidden = false; return; }
  const buttons = $$("[type=submit]", form);
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await apiRequest("/order-page", { method: "PUT", body: { active, ...values } });
    await loadState({ silent: true });
    if (intent === "activate") showToast("Seu link está no ar!", { label: "Copiar link", run: copyOrderLink });
    else showToast(intent === "pause" ? "Link pausado. Pedidos novos não chegam até você ativar de novo." : "Link salvo.");
  } catch (failure) { error.textContent = failure.message; error.hidden = false; }
  finally { buttons.forEach((button) => { button.disabled = false; }); }
}

function copyOrderLink() {
  copyText(`https://${LINK_BASE}${state.orderPage.slug}`).then(() => showToast("Link copiado. Cole na bio ou no WhatsApp.")).catch((failure) => showToast(failure.message));
}

// WhatsApp opens with the message ready; she picks the contact or status and sends it herself.
function shareOrderLink() {
  const text = `Agora você pode fazer sua encomenda por aqui, escolhendo o doce e a data: https://${LINK_BASE}${state.orderPage.slug}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

// The preview reads the form as it is now (even unsaved) and never sends anything.
function previewOrderLink() {
  const form = $("#order-page-form");
  const values = form ? linkFormValues(form) : state.orderPage;
  const draft = { ...values, displayName: values.displayName || "Sua confeitaria", orderTemplate: state.orderTemplate, availability: state.availability };
  try { localStorage.setItem(LINK_PREVIEW_KEY, JSON.stringify(draft)); } catch { /* a prévia usa o exemplo padrão */ }
  window.open("/encomenda/?preview=1", "_blank", "noopener");
}

function addProductRow() {
  const list = $("#product-list");
  if (!list) return;
  if (list.children.length >= 30) { showToast("O link aceita até 30 produtos."); return; }
  list.insertAdjacentHTML("beforeend", productRowMarkup());
  list.lastElementChild.querySelector("input")?.focus();
}

function removeProductRow(button) {
  const list = $("#product-list"), row = button.closest(".product-row");
  if (!list || !row) return;
  row.remove();
  if (!list.children.length) list.insertAdjacentHTML("beforeend", productRowMarkup());
}
function requestReviewMarkup(order){
 if(order.status!=='Solicitação')return order.reviewOutcome==='refused'?`<p class="pending-banner">Solicitação recusada${order.refusalReason?`: ${esc(order.refusalReason)}`:'.'}</p>`:'';
 const day=order.dueAt.slice(0,10),available=availabilityFor(day),pending=state.orders.filter(o=>o.status==='Solicitação'&&o.dueAt.slice(0,10)===day).length;
 const remaining=Number.isInteger(available.limit)?Math.max(0,available.limit-available.count):null;
 return `<section class="request-review"><h3>Solicitação ${esc(order.publicCode)}</h3><p>Ainda não confirmada. Confira data, detalhes e valor antes de aceitar.</p>${order.possibleDuplicate?'<p class="form-error">Possível duplicata: compare com as outras solicitações antes de aceitar.</p>':''}${remaining!==null&&pending>remaining?`<p class="form-error">${pending} solicitações para ${remaining} ${remaining===1?'vaga restante':'vagas restantes'} nesta data.</p>`:''}<div class="request-actions"><button class="button button-primary" type="button" data-action="accept-request" data-id="${esc(order.id)}" data-status="Confirmado">Aceitar como Confirmado</button><button class="button button-quiet" type="button" data-action="accept-request" data-id="${esc(order.id)}" data-status="Orçamento">Aceitar como Orçamento</button><button class="text-link" type="button" data-action="refuse-request" data-id="${esc(order.id)}">Recusar</button></div></section>`;
}
async function reviewRequest(id,status){
 try{await apiRequest(`/orders/${encodeURIComponent(id)}/accept`,{method:'POST',body:{status}});closeDetails();await loadState({silent:true});showOrderDetail(id);showToast('Solicitação aceita. Você pode copiar a mensagem para a cliente.');}
 catch(e){if(e.code==='REVISION_CONFLICT')await loadState({silent:true});showToast(e.message);}
}
function refuseRequest(id){
 const dialog=$('#refuse-dialog');dialog.querySelector('form').dataset.id=id;dialog.querySelector('textarea').value='';dialog.querySelector('[role=alert]').hidden=true;dialog.showModal();
}
$('#refuse-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),id=form.dataset.id;button.disabled=true;
 try{await apiRequest(`/orders/${encodeURIComponent(id)}/refuse`,{method:'POST',body:{reason:form.elements.reason.value,reasonCode:form.elements.reasonCode.value}});$('#refuse-dialog').close();closeDetails();await loadState({silent:true});showOrderDetail(id);showToast('Recusa registrada. Copie a mensagem para a cliente.');}
 catch(e){const error=form.querySelector('[role=alert]');error.textContent=e.message;error.hidden=false;}finally{button.disabled=false;}
});

async function loadLinkMetrics(){
 const output=$('#link-metrics-result');output.textContent='Carregando…';
 try{const metrics=await apiRequest('/order-page/metrics'),orders=state.orders.filter(o=>o.origin==='link'),week=orders.filter(o=>Date.parse(o.createdAt)>=Date.now()-7*86400000),accepted=orders.filter(o=>o.reviewOutcome==='accepted'),reviewed=orders.filter(o=>o.reviewedAt),times=reviewed.map(o=>Math.max(0,Date.parse(o.reviewedAt)-Date.parse(o.createdAt))),minutes=times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length/60000):null;
 output.textContent=`${metrics.visits} visitas · ${week.length} solicitações nos últimos 7 dias · ${orders.length?Math.round(accepted.length/orders.length*100):0}% aceitas${minutes!==null?` · revisão média em ${minutes} min`:''}. ${state.orders.filter(o=>!['Solicitação','Recusado'].includes(o.status)&&!sampleOrder(o)).length?Math.round(state.orders.filter(o=>o.origin==='link'&&!['Solicitação','Recusado'].includes(o.status)).length/state.orders.filter(o=>!['Solicitação','Recusado'].includes(o.status)&&!sampleOrder(o)).length*100):0}% dos pedidos vieram do link. Visitas contam carregamentos, incluindo repetições.`;
 }catch(e){output.textContent=e.message;}
}

// ---- Boas-vindas em formato de stories ----
// Short animated scenes (CSS only) that teach the main flows. Opens once per device and from "Como funciona".
const TOUR_KEY = "doce-agenda.tour.v1";
const tourSeen = () => { try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return true; } };
const markTourSeen = () => { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* sem armazenamento: o tour só não lembra */ } };
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const miniCard = (time, product, client, extra = "", cls = "") => `<div class="mc ${cls}"><b>${time}</b><span><strong>${product}</strong><small>${client}</small></span>${extra}</div>`;
const miniStamp = (text = "Pago") => `<i class="mp-stamp">${text}</i>`;
const SPRINKLE_COLORS = ["#f7c5d0", "#d3e7c1", "#fbe9a9", "#2e6a46", "#8f2a4f", "#ffffff"];
const TOUR_STORIES = [
  { title: "Do caderno para o celular", text: "Cada encomenda vira um cartão no dia certo. Nada se perde entre páginas e conversas.", ms: 6500,
    scene: () => `<div class="scene s-notebook"><div class="mini-phone"><div class="mp-head">Hoje <em>3 para entregar</em></div><div class="mp-list">${miniCard("10h", "Bolo de pistache", "Ana Clara", miniStamp(), "d1")}${miniCard("15h", "Brigadeiro (cento)", "Marcos · falta o sinal", "", "d2 is-yellow")}${miniCard("18h", "Docinhos (50 un.)", "Juliana", "", "d3")}</div></div>
      <div class="paper"><p>Ana Clara · bolo pistache <s>sex</s> sáb?</p><p>Marcos 100 brigad. <span class="pen-red">sinal??</span></p><p>Juliana docinhos · 18h</p><p><s>Paula</s> → ligar amanhã</p><p class="pen-red">pagou???</p></div></div>` },
  { title: "Anote em segundos", text: "Toque em + Novo e escreva o básico: cliente, produto, data e valor. Os detalhes você completa depois.", ms: 8500,
    scene: () => `<div class="scene s-create"><div class="mini-phone"><div class="mp-head">Hoje</div><div class="mp-list">${miniCard("10h", "Bolo de pistache", "Ana Clara", miniStamp())}${miniCard("15h", "Brigadeiro (cento)", "Marcos", "", "is-yellow")}${miniCard("18h", "Bolo de cenoura", "Dona Rosa", '<i class="mp-new">novo</i>', "mc-new")}</div>
      <span class="mp-plus">+</span><span class="tap tap-plus"></span>
      <div class="mp-sheet"><h4>Nova encomenda</h4><label>Cliente<span class="type"><i class="t1">Dona Rosa</i></span></label><label>Produto<span class="type"><i class="t2">Bolo de cenoura</i></span></label><label>Data<span class="type"><i class="t3">Hoje · 18h</i></span></label><label>Valor<span class="type"><i class="t4">R$ 90</i></span></label><span class="mp-save">Salvar encomenda</span><span class="tap tap-save"></span></div></div></div>` },
  { title: "Carimbou, tá pago", text: "Conferiu o Pix do sinal? Marque e o pedido ganha o carimbo. Amarelo quer dizer que o sinal ainda não chegou.", ms: 6500,
    scene: () => `<div class="scene s-stamp"><div class="pix-chip">Pix de R$ 90 · conferido no banco ✓</div><div class="big-card"><b>15h</b><div><strong>Bolo de pistache</strong><small>Ana Clara · retirada</small><em class="flag">Falta o sinal</em></div><span class="big-total">R$ 180</span></div><span class="ink-ring"></span><span class="slam-stamp">Sinal pago</span></div>` },
  { title: "Um toque, próxima etapa", text: "Começar a fazer, ficou pronto, entregue. Na aba Pedidos você vê quantos estão em cada etapa.", ms: 7000, steps: true,
    scene: () => `<div class="scene s-steps" data-step="3"><div class="chips"><i class="chip-hl"></i><span>Confirmados</span><span>Fazendo</span><span>Prontos</span><span>Entregues</span></div>
      <div class="big-card"><b>15h</b><div><strong>Brigadeiro (cento)</strong><small>Marcos · retirada</small></div><span class="status-stack"><em>Confirmado</em><em>Em produção</em><em>Pronto</em><em>Entregue</em></span></div>
      <span class="advance-btn"><em>Começar a fazer →</em><em>Ficou pronto →</em><em>Marcar entregue →</em><em>Entregue ✓</em></span><div class="undo-toast">Marcos: Entregue. <u>Desfazer</u></div></div>` },
  { title: "Seu mês, sem fazer conta", text: "Meu mês mostra quanto você vendeu, quanto entrou e quanto falta receber. Só conta o dinheiro que você conferiu.", ms: 6500,
    scene: () => `<div class="scene s-month"><div class="tiles"><div class="tile"><small>Vendido</small><b data-count="1180">R$ 1.180</b></div><div class="tile"><small>Recebido</small><b data-count="755">R$ 755</b></div><div class="tile is-due"><small>A receber</small><b data-count="425">R$ 425</b></div></div>
      <div class="bars">${[["Seg", 20], ["Ter", 35], ["Qua", 30], ["Qui", 45], ["Sex", 70], ["Sáb", 100], ["Dom", 40]].map(([day, height], index) => `<span style="--h:${height}%;--i:${index}"><i></i><small>${day}</small></span>`).join("")}</div><p class="bars-label">Sábado é o seu dia mais cheio</p></div>` },
  { title: "A cliente pede pelo seu link", text: "Ative o link de encomenda e mande no WhatsApp. O pedido chega em Novos e só vale depois que você aceitar.", ms: 7000,
    scene: () => `<div class="scene s-link"><div class="wa-bubble">Oi! Você faz bolo para sábado?</div><div class="wa-bubble me">Faço sim! Faz o pedido por aqui: <u>meu link de encomenda</u></div>
      <div class="request-pop"><span class="rp-chip">Novos <b>1</b></span><span><strong>Camila</strong><small>Bolo de aniversário · sábado</small></span></div></div>` },
  { title: "Mais espaço para criar.", text: "", ms: 0, final: true,
    scene: () => `<div class="scene s-final">${Array.from({ length: 34 }, (_, index) => `<i class="sprinkle" style="--x:${(index * 37) % 100}%;--d:${((index * 13) % 20) / 10}s;--r:${(index * 47) % 180}deg;--c:${SPRINKLE_COLORS[index % SPRINKLE_COLORS.length]};--t:${2.4 + ((index * 7) % 10) / 10}s"></i>`).join("")}<div class="final-logo"><img src="/logo.svg" alt="" width="182" height="48"></div></div>` },
];
const tour = { index: 0, overlay: null, timers: [], pressAt: 0 };

function openTour(start = 0) {
  if (tour.overlay) return;
  const overlay = document.createElement("div");
  overlay.className = "story-overlay";
  overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true"); overlay.setAttribute("aria-label", "Como funciona o Doce Agenda");
  overlay.innerHTML = `<div class="story" tabindex="-1"><div class="story-progress">${TOUR_STORIES.map(() => '<span class="sp"><i></i></span>').join("")}</div>
    <div class="story-top"><span class="story-brand">doce agenda</span><button class="story-close" type="button" data-tour="close">Pular</button></div>
    <div class="story-stage" aria-hidden="true"></div><div class="story-copy" aria-live="polite"></div><div class="story-actions"></div>
    <button class="story-zone story-prev" type="button" data-tour="prev" aria-label="Voltar"></button><button class="story-zone story-next" type="button" data-tour="next" aria-label="Avançar"></button></div>`;
  [...document.body.children].forEach((child) => { child.inert = true; });
  document.body.append(overlay); document.body.classList.add("story-open");
  tour.overlay = overlay;
  overlay.addEventListener("click", tourClick);
  overlay.addEventListener("pointerdown", () => { tour.pressAt = Date.now(); overlay.classList.add("is-paused"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => overlay.addEventListener(type, () => overlay.classList.remove("is-paused")));
  overlay.addEventListener("animationend", (event) => { if (event.target.matches(".sp.is-active i")) showStory(tour.index + 1); });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTour(); else if (event.key === "ArrowRight") showStory(tour.index + 1); else if (event.key === "ArrowLeft") showStory(tour.index - 1);
  });
  showStory(start);
}

function tourClick(event) {
  const button = event.target.closest("[data-tour]");
  if (!button) return;
  // A long press only pauses, like stories; it does not change the scene.
  if (["prev", "next"].includes(button.dataset.tour) && event.detail && Date.now() - tour.pressAt > 350) return;
  const action = button.dataset.tour;
  if (action === "next") showStory(tour.index + 1);
  else if (action === "prev") showStory(tour.index - 1);
  else if (action === "close") closeTour();
  else if (action === "new-order") { closeTour(); openOrderForm(); }
}

function showStory(index) {
  if (!tour.overlay || index < 0) return;
  if (index >= TOUR_STORIES.length) { closeTour(); return; }
  tour.timers.forEach(clearTimeout); tour.timers = [];
  tour.index = index;
  const story = TOUR_STORIES[index], overlay = tour.overlay;
  overlay.querySelectorAll(".sp").forEach((bar, position) => {
    bar.className = `sp${position < index ? " is-done" : position === index ? " is-active" : ""}`;
    bar.style.setProperty("--ms", `${story.ms || 1}ms`);
  });
  overlay.classList.toggle("is-final", !!story.final);
  overlay.querySelector(".story-stage").innerHTML = story.scene();
  const demo = !!window.DoceStore?.isDemo;
  overlay.querySelector(".story-copy").innerHTML = `<h2>${esc(story.title)}</h2><p>${esc(story.final ? (demo ? "Aqui tudo é de mentira: mexa à vontade. Nada sai deste navegador." : "Comece anotando o seu próximo pedido.") : story.text)}</p>`;
  overlay.querySelector(".story-actions").innerHTML = story.final
    ? `<button class="button button-primary" type="button" data-tour="${demo ? "close" : "new-order"}">${demo ? "Explorar a demonstração" : "Anotar um pedido"}</button><button class="story-again" type="button" data-tour="prev">Voltar</button>`
    : "";
  if (story.final) markTourSeen();
  if (story.steps) runStepScene(overlay.querySelector(".s-steps"));
  overlay.querySelectorAll("[data-count]").forEach(countUp);
  (overlay.querySelector(".story-actions .button") || overlay.querySelector(".story")).focus({ preventScroll: true });
}

function runStepScene(scene) {
  if (!scene || reducedMotion()) return;
  scene.dataset.step = "0";
  [1500, 3000, 4500].forEach((delay, position) => {
    tour.timers.push(setTimeout(() => scene.classList.add("is-pressing"), delay - 220));
    tour.timers.push(setTimeout(() => { scene.classList.remove("is-pressing"); scene.dataset.step = String(position + 1); }, delay));
  });
}

function countUp(element) {
  const target = Number(element.dataset.count), format = (value) => `R$ ${new Intl.NumberFormat("pt-BR").format(value)}`;
  if (reducedMotion()) { element.textContent = format(target); return; }
  const started = performance.now() + 500;
  const frame = (now) => {
    if (!element.isConnected) return;
    const progress = Math.min(1, Math.max(0, (now - started) / 1400));
    element.textContent = format(Math.round(target * (1 - Math.pow(1 - progress, 3))));
    if (progress < 1) requestAnimationFrame(frame);
  };
  element.textContent = format(0); requestAnimationFrame(frame);
}

function closeTour() {
  if (!tour.overlay) return;
  tour.timers.forEach(clearTimeout); tour.timers = [];
  markTourSeen();
  tour.overlay.remove(); tour.overlay = null;
  document.body.classList.remove("story-open");
  [...document.body.children].forEach((child) => { child.inert = false; });
  $("#main-content")?.focus({ preventScroll: true });
}

// First visit: the demonstration, or a new account without orders, opens the stories once.
function maybeStartTour() {
  if (tour.overlay || tourSeen()) return;
  if (window.DoceStore?.isDemo || !state.orders.some((order) => !sampleOrder(order))) openTour();
}
