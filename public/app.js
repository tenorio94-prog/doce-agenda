"use strict";

import { renderSVG } from "uqr";
import { pixPayload } from "../cloud/pix-code.js";
import { DEFAULT_COLOR, VITRINE_PRESETS, VITRINE_STYLE_INFO, formatCents, initials, photoUrl, photoAttrs, vitrinePalette } from "../cloud/vitrine-theme.js";
import { blobToBase64, dominantColor, preparePhoto, shareImage } from "./photo-prep.js";
import { printQr, shareOrDownload, storyImage } from "./share-kit.js";
import { icon } from "./ui/icons.js";
import { demoOrderPhoto } from "../cloud/demo-photos.js";

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
// One file serves both versions: the demonstration keeps data only in this browser; the account saves to the server.
const LOCAL_ONLY = window.DoceApi.mode !== "cloud";
const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const state = {
  orders: [], payments: [], availability: structuredClone(DEFAULT_AVAILABILITY), orderTemplate: structuredClone(DEFAULT_ORDER_TEMPLATE),
  orderPage: {active:false,slug:'',displayName:'',welcome:'',whatsapp:'',products:[]},
  pix: { keyType: "", key: "", name: "", city: "", depositPercent: 30 },
  restoreData: null, activeView: "today", search: "", statusFilter: "all",
  weekOffset: 0, agendaMode: "day", selectedDay: localDateKey(new Date()), settingsDate: localDateKey(new Date()), detailOrderId: null,
  paymentOrderId: null, toastTimer: null,
  month: null, monthData: null, monthLoading: false, monthError: '', monthRequest: 0,
  openSettings: new Set(), openDateException: false,
  clientsData: null, clientsError: "", clientsLoading: false, clientsRequest: 0, clientsSearch: "", clientsFilter: "all",
};

// The landing links to /demo/?de=landing (nothing depends on it any more) and ?pix=teste|off turns the Pix beta on or off
// in this browser. Both flags leave the address so a shared link looks clean.
try {
  const url = new URL(location.href);
  const pixFlag = url.searchParams.get("pix");
  if (pixFlag === "teste") localStorage.setItem("doce-agenda.pix-beta", "1");
  if (pixFlag === "off") localStorage.removeItem("doce-agenda.pix-beta");
  if (url.searchParams.has("de") || pixFlag) { url.searchParams.delete("de"); url.searchParams.delete("pix"); history.replaceState(history.state, "", url.pathname + url.search + url.hash); }
} catch { /* endereço fica como está */ }

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
// Dia curto para listas: "sex, 16 out"; com o ano quando não é o ano atual.
const listDayLabel = (value) => {
  const date = parseDate(value);
  if (!date) return "Sem data";
  const options = { weekday: "short", day: "numeric", month: "short" };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  return dateLabel(value, options).replace(/\./g, "").replace(/ de /g, " ");
};
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
  // Em aberto: ainda tem trabalho (confirmado, fazendo, pronto) ou ainda tem dinheiro a receber depois de entregue.
  { key: "open", label: "Em aberto", test: (order) => (isCommitted(order) && order.status !== "Entregue") || (order.status === "Entregue" && balanceFor(order) > 0) },
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
  if (next) return `<button class="${cls}" type="button" data-action="advance-order" data-id="${id}" data-status="${esc(next[0])}">${esc(next[1])}</button>`;
  if (["Orçamento", "Aguardando confirmação"].includes(order.status)) return `<button class="${cls}" type="button" data-action="confirm-order" data-id="${id}">Confirmar pedido</button>`;
  if (order.status === "Solicitação") return `<button class="${cls}" type="button" data-action="review-request" data-id="${id}">Revisar pedido</button>`;
  return "";
}
const timeValue = (value) => parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
// Lista de Pedidos: o que ainda está em aberto vem primeiro, do mais próximo ao mais distante;
// entregues, cancelados e recusados depois, do mais recente ao mais antigo.
const sortForList = (orders) => {
  const open = sortOrders(orders.filter((order) => !isFinished(order)));
  const done = sortOrders(orders.filter(isFinished)).reverse();
  return [...open, ...done];
};
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
  setConnection("error", LOCAL_ONLY ? "Armazenamento indisponível" : "Sem conexão");
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
    state.pix = data.pix || { keyType: "", key: "", name: "", city: "", depositPercent: 30 };
    state.monthData = null; state.monthError = ''; state.monthLoading = false; state.monthRequest++;
    state.clientsData = null; state.clientsError = ""; state.clientsLoading = false; state.clientsRequest++;
    $("#error-notice").hidden = true;
    $("#loading-state").hidden = true;
    setConnection("online", window.DoceApi.mode === "cloud" ? "Salvo na sua conta" : window.DoceApi.mode === "browser" ? "Salvo neste navegador" : "Salvo neste navegador");
    render();
  } catch (error) {
    $("#loading-state").hidden = true;
    setError(LOCAL_ONLY ? "Este navegador não deixou guardar os dados. Se estiver em janela anônima, abra numa janela normal." : "Confira sua internet e toque em Tentar de novo. O que já estava na tela continua aqui.");
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

// New orders from the link: one opens straight into the review; several go to the Novos list.
function requestBanner() {
  const pending = sortOrders(state.orders.filter((order) => order.status === "Solicitação"));
  if (!pending.length) return "";
  if (pending.length === 1) {
    const order = pending[0];
    const when = order.dueAt ? dateLabel(order.dueAt, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "") : "";
    return `<section class="request-banner surface"><h2>Pedido novo pelo link</h2><p>${esc(clientName(order) || "Uma cliente")} quer ${esc(order.product || "uma encomenda")}${when ? ` para ${esc(when)}` : ""}. Ainda não ocupa vaga: você decide se aceita.</p><button class="button button-primary" type="button" data-action="review-request" data-id="${esc(order.id)}">Revisar pedido</button></section>`;
  }
  const names = [...new Set(pending.map((order) => clientName(order)).filter(Boolean))];
  const others = pending.length - Math.min(names.length, 2);
  const who = names.slice(0, 2).join(", ") + (others > 0 ? ` e mais ${others}` : "");
  return `<section class="request-banner surface"><h2>${pending.length} pedidos novos pelo link</h2><p>${who ? `${esc(who)}. ` : ""}Ainda não ocupam vaga: você decide quais aceitar.</p><button class="button button-primary" type="button" data-action="show-requests">Revisar pedidos</button></section>`;
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
  const label = (key) => {
    const name = capitalize(calendarDateLabel(key, { weekday: "long", day: "numeric", month: "short" }).replace(".", ""));
    const full = availabilityFor(key).full;
    return `${key === tomorrow ? `Amanhã, ${name.charAt(0).toLocaleLowerCase("pt-BR")}${name.slice(1)}` : name}${full ? " (lotado)" : ""}`;
  };
  return `<section class="coming-soon vn-coming"><div class="vn-section-row"><h2>Próximos dias</h2><button class="text-link" type="button" data-view="orders">Todos os pedidos</button></div>
    ${[...groups].map(([key, list]) => `<div class="upcoming-day"><h3 class="upcoming-label">${esc(label(key))}</h3><div class="vn-lines">${list.map((order) => agendaLineMarkup(order)).join("")}</div></div>`).join("")}</section>`;
}
// Linha baixa de pedido (Próximos dias): hora, produto, cliente e o carimbo pequeno. A linha inteira abre a ficha.
function agendaLineMarkup(order, options = {}) {
  const mode = (order.mode || "Retirada").toLowerCase();
  const sub = options.withDate ? `${order.dueAt ? listDayLabel(order.dueAt) : "Sem data"}, ${order.status.toLocaleLowerCase("pt-BR")}` : `${clientName(order) || "Cliente sem nome"}, ${mode}`;
  const side = options.withDate ? `<span class="vn-line-side"><b>${esc(orderTotalLabel(order))}</b>${moneyStamp(order, informedFor(order.id), { compact: true }).html}</span>` : moneyStamp(order, informedFor(order.id), { compact: true }).html;
  return `<button class="vn-line${options.withDate ? " has-date" : ""}" type="button" data-open-order="${esc(order.id)}"><span class="vn-line-time">${esc(shortTime(order.dueAt) || "—")}</span><span class="vn-line-main"><b>${esc(order.product || "Produto sem descrição")}</b><small>${esc(sub)}</small></span>${side}</button>`;
}

// "Pedem sua atenção": tudo o que pede decisão ou cobrança, numa lista só, na ordem de urgência.
// Só mostra e leva à ficha; nada é registrado daqui.
function attentionItems() {
  const own = state.orders.filter((order) => !sampleOrder(order) && !isCancelled(order));
  const short = (order) => order.dueAt ? dateLabel(order.dueAt, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "") : "";
  const items = [];
  const requests = sortOrders(own.filter((order) => order.status === "Solicitação"));
  if (requests.length === 1) {
    const order = requests[0], when = short(order);
    items.push({ kind: "link", cls: "request-banner", title: "Pedido novo pelo link", text: `${clientName(order) || "Uma cliente"} quer ${order.product || "uma encomenda"}${when ? ` para ${when}` : ""}. Ainda não ocupa vaga: você decide se aceita.`, action: `<button class="button att-btn" type="button" data-action="review-request" data-id="${esc(order.id)}">Revisar</button>` });
  } else if (requests.length > 1) {
    const names = [...new Set(requests.map((order) => clientName(order)).filter(Boolean))];
    const others = requests.length - Math.min(names.length, 2);
    const who = names.slice(0, 2).join(", ") + (others > 0 ? ` e mais ${others}` : "");
    items.push({ kind: "link", cls: "request-banner", title: `${requests.length} pedidos novos pelo link`, text: `${who ? `${who}. ` : ""}Ainda não ocupam vaga: você decide quais aceitar.`, action: '<button class="button att-btn" type="button" data-action="show-requests">Revisar</button>' });
  }
  const open = (order, label) => `<button class="vn-btn secondary small att-btn" type="button" data-open-order="${esc(order.id)}">${label}</button>`;
  sortOrders(own.filter((order) => isCommitted(order) && informedFor(order.id) > 0)).forEach((order) => items.push({ kind: "pix", title: `${clientName(order) || "A cliente"} informou um Pix de ${money(informedFor(order.id))}`, text: `${order.product || "Pedido"}${short(order) ? `, ${short(order)}` : ""}. Confira no banco antes de marcar.`, action: open(order, "Conferir") }));
  sortOrders(own.filter((order) => order.status === "Entregue" && balanceFor(order) > 0)).forEach((order) => items.push({ kind: "money", title: `${clientName(order) || "A cliente"} ainda deve ${money(balanceFor(order))}`, text: `${order.product || "Pedido"}, entregue${short(order) ? ` ${short(order)}` : ""}.`, action: open(order, "Cobrar") }));
  sortOrders(own.filter((order) => needsDeposit(order) && !informedFor(order.id))).forEach((order) => { const deposit = suggestedDepositCents(order) / 100; items.push({ kind: "money", title: `${clientName(order) || "A cliente"} ainda não pagou o sinal`, text: `${order.product || "Pedido"}${short(order) ? `, ${short(order)}` : ""}.${deposit ? ` Sugerido: ${money(deposit)}.` : ""}`, action: open(order, "Cobrar") }); });
  own.filter((order) => !isFinished(order) && order.nextAction && order.status !== "Solicitação").sort((a, b) => timeValue(a.nextAt) - timeValue(b.nextAt)).forEach((order) => items.push({ kind: "next", title: `${clientName(order) || "Pedido"}: ${order.nextAction.charAt(0).toLocaleLowerCase("pt-BR")}${order.nextAction.slice(1)}`, text: `${order.product || "Pedido"}${order.nextAt ? `, até ${dateTimeLabel(order.nextAt)}` : ", sem prazo definido"}.`, action: open(order, "Ver") }));
  return items;
}
function attentionMarkup() {
  const items = attentionItems();
  if (!items.length) return "";
  const glyph = { link: "link", pix: "pix", money: "wallet", next: "clock" };
  const row = (item) => `<div class="vn-att-row is-${item.kind}${item.cls ? ` ${item.cls}` : ""}"><span class="vn-att-glyph">${icon(glyph[item.kind])}</span><div class="vn-att-text"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>${item.action}</div>`;
  const first = items.slice(0, 3), rest = items.slice(3);
  return `<section class="vn-attention" aria-labelledby="attention-title"><h2 id="attention-title">Pedem sua atenção <span class="vn-count">${items.length}</span></h2>
    <div class="vn-att-list">${first.map(row).join("")}</div>
    ${rest.length ? `<details class="vn-att-more"><summary>Ver mais ${rest.length}</summary><div class="vn-att-list">${rest.map(row).join("")}</div></details>` : ""}</section>`;
}

const scheduledOn = (key) => sortOrders(state.orders.filter((order) => order.status !== 'Solicitação' && !sampleOrder(order) && !isCancelled(order) && order.dueAt && localDateKey(parseDate(order.dueAt) || new Date(0)) === key));

const weekRangeLabel = (days) => `${dateLabel(days[0], { day: "numeric", month: "short" })} – ${dateLabel(days[6], { day: "numeric", month: "short", year: "numeric" })}`;
const weekControlsMarkup = (range) => `<div class="week-controls"><button class="icon-button week-step" data-week-shift="-1" type="button" aria-label="Semana anterior"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><span class="week-range">${esc(range)}</span><button class="icon-button week-step" data-week-shift="1" type="button" aria-label="Próxima semana"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></div>`;
const weekDates = () => {
  const monday = mondayFor(new Date());
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
};

// ---- Agenda na nova identidade (laboratório visual). Mesmos dados e regras; só a apresentação muda. ----
const informedFor = (orderId) => state.payments.filter((payment) => payment.orderId === orderId && payment.status === "Informado").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
// Foto só quando a própria confeitaria cadastrou o produto com foto na vitrine; nunca uma foto inventada.
const vitrinePhotoFor = (order) => demoOrderPhoto(order, state.orderPage?.products || [], window.DoceStore?.isDemo === true);
function paymentBadge(order) {
  if (isCancelled(order) || sampleOrder(order)) return "";
  if (needsDeposit(order)) return '<span class="vn-badge amber">Falta o sinal</span>';
  if (!hasReceivedPayment(order.id)) return "";
  const balance = balanceFor(order);
  if (order.status === "Entregue" && balance > 0) return `<span class="vn-badge amber">Falta ${esc(money(balance))}</span>`;
  return `<span class="vn-badge green">${balance !== null && balance <= 0 ? "Total conferido" : "Sinal conferido"}</span>`;
}
const statusBadge = (status) => `<span class="vn-badge ${["Pronto", "Entregue"].includes(status) ? "green" : isCancelled({ status }) ? "muted" : "outline"}">${esc(status)}</span>`;
// Late = the delivery time has passed and the order was not delivered yet.
const isLate = (order) => ["Confirmado", "Em produção", "Pronto"].includes(order.status) && (parseDate(order.dueAt)?.getTime() ?? Infinity) < Date.now();
const lateBadge = (order) => isLate(order) ? '<span class="vn-badge red">Atrasado</span>' : "";
// Origin is independent of the current situation. Older records may have no reliable origin.
const originMarkup = (order) => order.origin === "link" ? `<div class="vn-note vn-origin">${icon("link")}<span>Recebido pelo link${order.publicCode ? `, código ${esc(order.publicCode)}` : ""}${order.possibleDuplicate ? ". Possível duplicata" : ""}</span></div>` : "";
function dateCapacityMarkup(order) {
  const day = order.dueAt?.slice(0, 10);
  if (!day) return `<div class="vn-note">${icon("calendar")}<span>Ocupação disponível quando a data for definida.</span></div>`;
  const a = availabilityFor(day);
  const occupancy = Number.isInteger(a.limit) ? `${a.count}/${a.limit} vagas ocupadas nesta data.${a.full ? " Dia lotado." : ""}` : `${a.count} ${a.count === 1 ? "pedido confirmado" : "pedidos confirmados"} nesta data. Sem limite diário definido.`;
  return `<div class="vn-note">${icon("calendar")}<span>${a.closed ? "Dia fechado na sua agenda. " : ""}${esc(occupancy)} ${order.status === "Solicitação" ? "Esta solicitação não ocupa vaga." : "Este pedido só ocupa vaga após a confirmação."}</span></div>`;
}
function cakeLine(order) {
  const values = order.cake?.values || {};
  return Object.values(values).filter(Boolean).slice(0, 3).join(" · ");
}
// Carimbo do dinheiro (direção Comanda): cheio = conferido; tracejado = falta ou falta conferir. O texto completo fica no carimbo.
// O carimbo é a única forma do dinheiro (rodada 2): quando falta algo, ele diz quanto.
// Verde só com pagamento conferido e nada pendente naquele momento; entregue com saldo é sempre caramelo.
const moneyShort = (value) => money(value).replace(/,00$/, "");
function moneyStamp(order, informed = informedFor(order.id), options = {}) {
  if (isCancelled(order) || sampleOrder(order)) return { cls: "", html: "" };
  const compact = options.compact;
  // Texto visível completo, sem abreviação que precise de leitor de tela.
  const stamp = (cls, big, small, mini) => ({ cls, html: compact
    ? `<span class="vn-stamp ${cls} is-mini"><b>${esc(mini)}</b></span>`
    : `<span class="${cls === "is-ok" ? "vn-badge green " : ""}vn-stamp ${cls}"><b>${esc(big)}</b> <small>${esc(small)}</small></span>` });
  if (informed > 0 && isCommitted(order)) return stamp("is-check", `Pix ${moneyShort(informed)}`, "falta conferir", "Pix a conferir");
  if (needsDeposit(order)) {
    const deposit = suggestedDepositCents(order) / 100;
    return deposit ? stamp("is-due", moneyShort(deposit), "falta o sinal", "Sem sinal") : stamp("is-due", "Falta", "o sinal", "Sem sinal");
  }
  if (!hasReceivedPayment(order.id)) return { cls: "", html: "" };
  const balance = balanceFor(order);
  if (order.status === "Entregue" && balance > 0) return stamp("is-due", `Falta ${moneyShort(balance)}`, "já entregue", `Falta ${moneyShort(balance)}`);
  const full = balance !== null && balance <= 0;
  return stamp("is-ok", full ? "Total" : "Sinal", "conferido", full ? "Pago" : "Com sinal");
}
function agendaCardMarkup(order, options = {}) {
  if (options.inbox) return inboxCardMarkup(order, options);
  const date = parseDate(order.dueAt), photo = vitrinePhotoFor(order), informed = informedFor(order.id);
  const detail = [order.details, cakeLine(order)].filter(Boolean).join(", ");
  const stamp = moneyStamp(order, informed, { compact: options.compact });
  const classes = ["vn-order", "comanda", stamp.cls, isLate(order) ? "is-late" : "", options.compact ? "is-compact" : "", options.list ? "is-list" : "", order.status === "Entregue" ? "is-delivered" : "", isCancelled(order) ? "is-cancelled" : "", String(order.id) === String(state.justAdvanced) ? "is-advanced" : ""].filter(Boolean).join(" ");
  const mode = order.mode || "Retirada";
  const step = options.compact ? "" : nextStepButton(order, "vn-btn primary small");
  const day = date && options.withDate ? `<span class="vn-day-label">${esc(listDayLabel(order.dueAt))}</span>` : "";
  const when = `<div class="cmd-when">${day}<b class="vn-time">${date ? esc(shortTime(order.dueAt)) : "—"}</b><small>${icon(mode === "Entrega" ? "delivery" : "bag")}${esc(mode.toLowerCase())}</small>${photo && !options.compact ? `<img class="vn-thumb" src="${esc(photoUrl(photo))}" ${photoAttrs(photo, '48px')} alt="" loading="lazy" decoding="async">` : ""}</div>`;
  // A etapa já está no verbo do botão; o rótulo só aparece quando não há botão (entregue, cancelado, lista compacta).
  const stage = isLate(order) ? '<span class="vn-badge red">Atrasado</span>' : step ? "" : statusBadge(order.status);
  return `<article class="${classes}" data-open-order="${esc(order.id)}">
    ${when}
    <div class="cmd-body">
      ${stamp.html}
      <h3><button class="vn-open" type="button" aria-label="Abrir pedido de ${esc(clientName(order) || "cliente sem nome")}: ${esc(order.product || "produto sem descrição")}">${esc(order.product || "Produto sem descrição")}</button></h3>
      <p class="cmd-meta"><span class="vn-client">${esc(clientName(order) || "Cliente sem nome")}</span>${detail && !options.compact ? `, ${esc(detail)}` : ""}</p>
      ${!options.compact ? originMarkup(order) : ""}
      ${!options.compact && order.status === "Solicitação" ? dateCapacityMarkup(order) : ""}
      ${!options.compact && order.status === "Recusado" && order.refusalReason ? `<div class="vn-note">${icon("info")}<span>Recusado: ${esc(order.refusalReason)}</span></div>` : ""}
      ${options.compact ? "" : `<div class="vn-row vn-card-foot">${stage}${step || `<strong class="vn-total">${esc(orderTotalLabel(order))}</strong>`}</div>`}
    </div>
  </article>`;
}
// Caixa de entrada (Pedidos → Novos): mantém valor e ocupação da data em destaque para decidir.
function inboxCardMarkup(order, options) {
  const date = parseDate(order.dueAt), mode = order.mode || "Retirada";
  return `<article class="vn-order is-inbox" data-open-order="${esc(order.id)}">
    <div class="vn-row vn-inbox-top"><span class="vn-eyebrow">${esc(order.status === "Solicitação" ? "Solicitação" : "Pedido")}${order.publicCode ? ` ${esc(order.publicCode)}` : ""}</span>${order.status === "Solicitação" ? '<span class="vn-badge outline">Aguardando revisão</span>' : statusBadge(order.status)}</div>
    <div class="vn-product"><div><span class="vn-client">${esc(clientName(order) || "Cliente sem nome")}</span><h3><button class="vn-open" type="button" aria-label="Abrir pedido de ${esc(clientName(order) || "cliente sem nome")}: ${esc(order.product || "produto sem descrição")}">${esc(order.product || "Produto sem descrição")}</button></h3><div class="vn-inbox-value"><span>Valor total</span><strong class="vn-total">${esc(orderTotalLabel(order))}</strong></div></div></div>
    ${originMarkup(order)}
    <div class="vn-note vn-inbox-date">${icon("clock")}<span>${esc(date ? dateTimeLabel(order.dueAt) : "Data e horário a combinar")}, ${esc(mode.toLowerCase())}</span></div>
    ${dateCapacityMarkup(order)}
    ${informedFor(order.id) > 0 ? `<div class="vn-note amber">${icon("info")}<span>Pix de ${esc(money(informedFor(order.id)))} informado. Confira no banco.</span></div>` : ""}
    ${nextStepButton(order, "vn-btn primary small") ? `<div class="vn-row vn-card-foot">${nextStepButton(order, "vn-btn primary small")}</div>` : ""}
  </article>`;
}

// Agenda = today plus the week picker: the selected day starts on today and the list shows that day.
function agendaWeekMarkup(upcomingCount) {
  const days = weekDates();
  const todayKey = localDateKey(new Date());
  if (!days.some((day) => localDateKey(day) === state.selectedDay)) state.selectedDay = days.some((day) => localDateKey(day) === todayKey) ? todayKey : localDateKey(days[0]);
  const selected = days.find((day) => localDateKey(day) === state.selectedDay) || days[0];
  const selectedKey = localDateKey(selected);
  const isToday = selectedKey === todayKey;
  const scheduled = scheduledOn(selectedKey);
  const availability = availabilityFor(selectedKey);
  const done = scheduled.filter((order) => ["Pronto", "Entregue"].includes(order.status)).length;
  const dayTitle = isToday ? "Hoje" : capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short" }).format(selected).replace(".", ""));
  const dayBadge = availability.closed ? '<span class="vn-badge muted">Fechado</span>' : availability.full ? '<span class="vn-badge red">Dia lotado</span>' : "";
  const limitText = availability.closed ? "Dia fechado" : Number.isInteger(availability.limit) ? `${scheduled.length} de ${availability.limit} ${availability.limit === 1 ? "vaga ocupada" : "vagas ocupadas"}` : `${scheduled.length} ${scheduled.length === 1 ? "encomenda" : "encomendas"}, sem limite definido`;
  const empty = isToday
    ? `<div class="vn-empty">${icon("cake")}<h3>Nenhuma encomenda para hoje</h3><p>${upcomingCount ? "As próximas estão logo abaixo." : "Pedidos sem data aparecem em Pedidos."}</p><button class="vn-btn secondary" type="button" data-action="new-order">${icon("plus")} Anotar encomenda</button></div>`
    : `<div class="vn-empty">${icon("cake")}<h3>Dia livre de pedidos marcados</h3><p>Pedidos sem data continuam em Pedidos.</p></div>`;
  return `<section class="today-agenda agenda-week" aria-labelledby="today-list-title">
    <div class="vn-day-head"><div class="vn-grow"><h2 id="today-list-title">${esc(dayTitle)} ${dayBadge}</h2><p>${esc(limitText)}</p></div>${scheduled.length ? `<div class="vn-day-progress"><progress value="${done}" max="${scheduled.length}" aria-label="Produção do dia: ${done} de ${scheduled.length} prontas"></progress><span>${done} de ${scheduled.length} ${scheduled.length === 1 ? "pronta" : "prontas"}</span></div>` : ""}</div>
    ${scheduled.length ? `<div class="vn-order-list${state.agendaEnter ? " is-entering" : ""}">${scheduled.map((order) => agendaCardMarkup(order)).join("")}</div>` : empty}
    <div class="vn-day-links">${isToday ? "" : '<button class="text-link" type="button" data-action="agenda-today">Voltar para hoje</button>'}<button class="text-link agenda-adjust" type="button" data-action="adjust-selected-date" data-date="${selectedKey}">Ajustar esta data</button></div>
  </section>`;
}
// A semana fica no topo da Agenda, acima do que ela controla. Pontinhos = vagas ocupadas (tijolo quando lota).
function weekBarMarkup() {
  const days = weekDates();
  const todayKey = localDateKey(new Date());
  if (!days.some((day) => localDateKey(day) === state.selectedDay)) state.selectedDay = days.some((day) => localDateKey(day) === todayKey) ? todayKey : localDateKey(days[0]);
  return `<nav class="vn-weekbar" aria-label="Dias da semana">${weekControlsMarkup(weekRangeLabel(days))}<div class="vn-week week-days" role="group" aria-label="Escolher dia da semana">${days.map((day) => {
    const key = localDateKey(day);
    const count = scheduledOn(key).length;
    const dayAvailability = availabilityFor(key);
    const limit = Number.isInteger(dayAvailability.limit) ? dayAvailability.limit : 0;
    const classes = ["vn-day", "day-button", key === todayKey ? "is-today" : "", key === state.selectedDay ? "is-selected" : "", dayAvailability.closed ? "is-closed" : "", dayAvailability.full ? "is-full" : ""].filter(Boolean).join(" ");
    const statusText = dayAvailability.closed ? "fechado" : dayAvailability.full ? "lotado" : limit ? `${count} de ${limit} vagas` : "limite não definido";
    const dots = dayAvailability.closed ? "" : limit && limit <= 6 ? Array.from({ length: limit }, (_, index) => `<i class="${index < count ? "on" : ""}"></i>`).join("") : count ? `<em>${count}</em>` : "";
    return `<button class="${classes}" data-select-day="${key}" type="button" aria-label="${key === todayKey ? "Hoje, " : ""}${esc(dateLabel(day, { weekday: "long", day: "numeric", month: "long" }))}, ${count} ${count === 1 ? "pedido" : "pedidos"}, ${statusText}" aria-pressed="${key === state.selectedDay}"><span class="day-name">${esc(new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", ""))}</span><strong class="day-number">${day.getDate()}</strong><span class="day-load" aria-hidden="true">${dots}</span></button>`;
  }).join("")}</div></nav>`;
}

// Lista da semana: o que precisa sair da cozinha, pelo dia da entrega. Marcar = o pedido fica Pronto.
const PRODUCTION_STATUSES = ["Confirmado", "Em produção", "Pronto", "Entregue"];
const productionDone = (order) => ["Pronto", "Entregue"].includes(order.status);
function productionWeek() {
  return weekDates().map((date) => {
    const key = localDateKey(date);
    const items = scheduledOn(key).filter((order) => PRODUCTION_STATUSES.includes(order.status));
    items.sort((a, b) => Number(productionDone(a)) - Number(productionDone(b)));
    return { date, key, items };
  });
}
const productionDayTitle = (key) => capitalize(calendarDateLabel(key, { weekday: "long", day: "numeric" }));
function productionText() {
  const week = productionWeek();
  const lines = [`Produção da semana (${weekRangeLabel(week.map((day) => day.date))})`, "Organizada pelo dia da entrega."];
  week.filter((day) => day.items.length).forEach((day) => {
    lines.push("", productionDayTitle(day.key));
    day.items.forEach((order) => lines.push(`${productionDone(order) ? "✅" : "☐"} ${shortTime(order.dueAt)} · ${order.product} · ${clientName(order)} (${(order.mode || "Retirada").toLowerCase()})`));
  });
  return lines.join("\n");
}
function productionItemMarkup(order) {
  const done = productionDone(order), id = esc(order.id), delivered = order.status === "Entregue";
  const tag = order.status === "Em produção" ? '<span class="prod-tag">fazendo</span>' : delivered ? '<span class="prod-tag">entregue</span>' : "";
  return `<li class="prod-item${done ? " is-done" : ""}">
    <button class="prod-check" type="button" data-action="toggle-produced" data-id="${id}" aria-pressed="${done}" aria-label="${delivered ? "Já entregue" : done ? "Desmarcar pronto" : "Marcar como pronto"}: ${esc(order.product)}"${delivered ? " disabled" : ""}><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
    <button class="prod-body" type="button" data-open-order="${id}"><span class="prod-time">${esc(shortTime(order.dueAt))}</span><span class="prod-text"><strong>${esc(order.product || "Produto sem descrição")}</strong><small>${esc(clientName(order) || "Cliente sem nome")} · ${esc((order.mode || "Retirada").toLowerCase())}</small></span>${tag}</button>
  </li>`;
}
function productionMarkup() {
  const week = productionWeek();
  const todayKey = localDateKey(new Date());
  const all = week.flatMap((day) => day.items);
  const done = all.filter(productionDone).length;
  const summary = all.length ? `${all.length} ${all.length === 1 ? "pedido" : "pedidos"} · ${done} ${done === 1 ? "pronto" : "prontos"}` : "Nenhum pedido confirmado nesta semana";
  return `<section class="production-week section-card surface" aria-labelledby="production-title">
    <div class="agenda-week-head"><h2 class="agenda-week-title" id="production-title">Sua produção</h2>${weekControlsMarkup(weekRangeLabel(week.map((day) => day.date)))}</div>
    <div class="production-intro"><p><strong>${esc(summary)}</strong><br>Pedidos confirmados, pelo dia da entrega. Marque quando ficar pronto.</p>${all.length ? '<button class="button button-quiet button-small" type="button" data-action="copy-production">Copiar lista</button>' : ""}</div>
    <div class="production-days">${week.map((day) => {
      const availability = availabilityFor(day.key);
      const note = day.key === todayKey ? '<span class="prod-today">hoje</span>' : "";
      const left = day.items.filter((order) => !productionDone(order)).length;
      if (!day.items.length) return `<div class="prod-day is-empty"><h3>${esc(productionDayTitle(day.key))}${note}</h3><span>${availability.closed ? "Fechado" : "Nada para entregar"}</span></div>`;
      return `<div class="prod-day"><h3>${esc(productionDayTitle(day.key))}${note}<span class="prod-left">${left ? `${left} ${left === 1 ? "falta" : "faltam"}` : "tudo pronto"}</span></h3><ul class="prod-list">${day.items.map(productionItemMarkup).join("")}</ul></div>`;
    }).join("")}</div>
  </section>`;
}

function renderToday() {
  const panel = $("#view-today");
  const focused = document.activeElement;
  const focusSelector = focused?.dataset?.weekShift !== undefined ? `[data-week-shift="${CSS.escape(focused.dataset.weekShift)}"]` : focused?.dataset?.selectDay ? `[data-select-day="${CSS.escape(focused.dataset.selectDay)}"]` : focused?.dataset?.agendaMode ? `[data-agenda-mode="${CSS.escape(focused.dataset.agendaMode)}"]` : "";
  const weekMode = state.agendaMode === "week";
  const modeSwitch = `<div class="agenda-mode vn-segmented" role="group" aria-label="Como ver a agenda"><button type="button" data-agenda-mode="day" aria-pressed="${!weekMode}">Dia a dia</button><button type="button" data-agenda-mode="week" aria-pressed="${weekMode}">Lista da semana</button></div>`;
  panel.classList.add('today-redesign');
  const todays = todayOrders();
  const upcoming = sortOrders(state.orders.filter((order) => order.status!=='Solicitação' && !sampleOrder(order) && !isFinished(order) && order.dueAt && (parseDate(order.dueAt)?.getTime() ?? 0) >= new Date(new Date().setHours(24, 0, 0, 0)).getTime())).slice(0, 5);
  const pendingChanges = state.orders.filter((order) => !sampleOrder(order) && !isFinished(order) && order.pendingChange);
  const sample = state.orders.find((order) => order.isSample || order.isDemo || order.sample);
  const firstUse = !state.orders.some((order) => !(order.isSample || order.isDemo || order.sample));
  const toDeliver = todays.filter((order) => !isFinished(order));
  const missingDeposit = toDeliver.filter(needsDeposit);
  const todayKey = localDateKey(new Date()), todayAvailability = availabilityFor(todayKey);
  const headline = toDeliver.length ? `${toDeliver.length} ${toDeliver.length === 1 ? "entrega" : "entregas"} hoje` : "Nada para entregar hoje";
  const summaryParts = [todayAvailability.closed ? "Hoje é dia fechado" : todayAvailability.full ? "Dia lotado" : "", missingDeposit.length ? `${missingDeposit.length} sem sinal` : ""].filter(Boolean);
  const attentionCount = weekMode ? 0 : attentionItems().length;
  panel.innerHTML = `<header class="vn-heading"><div><span class="vn-date">${esc(capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())))}</span><h1 id="today-title" tabindex="-1">${esc(headline)}</h1>${summaryParts.length || attentionCount ? `<p class="today-summary">${esc(summaryParts.join(", "))}${attentionCount ? `<button class="vn-att-jump" type="button" data-action="jump-attention">${attentionCount} ${attentionCount === 1 ? "pede" : "pedem"} sua atenção</button>` : ""}</p>` : ""}</div>${modeSwitch}</header>
    ${firstUse && !onboardingVisible() ? `<section class="welcome-panel"><h2>Cadastre seu primeiro pedido</h2><p>Comece com cliente, produto e valor. Complete os detalhes quando estiverem combinados.</p><div class="welcome-actions"><button class="button button-primary" type="button" data-action="new-order">Nova encomenda</button></div></section>` : ''}
    ${sample && firstUse ? `<section class="sample-card" aria-label="Pedido de exemplo">${rowMarkup(sample)}<p>Toque para ver como fica um pedido completo. O exemplo não entra na sua agenda.</p></section>` : sample ? `<details class="sample-examples"><summary>Exemplo fictício — não entra na sua agenda</summary><div class="sample-example-list">${state.orders.filter(sampleOrder).map((order) => `<button class="text-link" type="button" data-open-order="${esc(order.id)}">Ver exemplo: ${esc(clientName(order) || order.product || "pedido")}</button>`).join("")}</div></details>` : ''}
    ${weekMode ? "" : weekBarMarkup()}
    <div class="vn-agenda-grid"><div class="vn-schedule">${weekMode ? productionMarkup() : `${agendaWeekMarkup(upcoming.length)}${attentionMarkup()}`}
    ${onboardingMarkup()}
    ${pendingChanges.length ? `<section class="pending-card surface"><div class="section-head"><h2>Alterações para revisar</h2><span class="pending-count">${pendingChanges.length}</span></div><div class="pending-list">${pendingChanges.slice(0, 3).map((order) => `<button class="pending-row" type="button" data-open-order="${esc(order.id)}"><span><strong>${esc(order.client)}</strong><small>${esc(order.product)}</small></span><span class="pending-chevron" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span><span class="pending-banner"><strong>Pedido de mudança:</strong> ${esc(order.pendingChange)}</span></button>`).join("")}</div></section>` : ""}
    ${weekMode ? "" : upcomingMarkup(upcoming)}
    </div><aside class="vn-aside">${storageNoteMarkup()}</aside></div>`;
  state.agendaEnter = false;
  panel.hidden = state.activeView !== "today";
  if (focusSelector) panel.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function filteredOrders() {
  const query = state.search.trim().toLocaleLowerCase("pt-BR");
  return sortForList(state.orders.filter((order) => !sampleOrder(order)).filter((order) => {
    const stage = ORDER_STAGES.find((item) => item.key === state.statusFilter) || ORDER_STAGES[0];
    const matchesStatus = stage.test ? stage.test(order) : !stage.statuses || stage.statuses.includes(order.status);
    const searchable = [order.client, order.product, order.details, order.location, order.contact, order.nextAction].join(" ").toLocaleLowerCase("pt-BR");
    return matchesStatus && (!query || searchable.includes(query));
  }));
}

// Lista de Pedidos agrupada por dia: o cabeçalho diz quando; o cartão diz o quê, quanto e o próximo passo.
function listDayHeading(key) {
  if (!key) return "Sem data";
  const today = new Date(), at = (offset) => localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const date = parseDate(`${key}T12:00`);
  const sameYear = date.getFullYear() === today.getFullYear();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).format(date).replace(/\./g, "").replace(/ de /g, " ");
  const prefix = key === at(0) ? "Hoje, " : key === at(1) ? "Amanhã, " : key === at(-1) ? "Ontem, " : "";
  return capitalize(`${prefix}${weekday} ${dayMonth}`);
}
function ordersByDayMarkup(orders) {
  const groups = [];
  let finishedStarted = false;
  orders.forEach((order) => {
    const key = order.dueAt ? localDateKey(parseDate(order.dueAt)) : "";
    const finished = isFinished(order);
    const last = groups[groups.length - 1];
    if (last && last.key === key && last.finished === finished) { last.list.push(order); return; }
    groups.push({ key, finished, list: [order], divider: finished && !finishedStarted && groups.length > 0 });
    if (finished) finishedStarted = true;
  });
  return `<div class="orders-full-list vn-orders-by-day">${groups.map((group) => `${group.divider ? '<h2 class="vn-list-divider">Encerrados</h2>' : ""}<section class="vn-day-group"><h3 class="vn-date-head">${esc(listDayHeading(group.key))}<span>${group.list.length} ${group.list.length === 1 ? "pedido" : "pedidos"}${group.key && !group.finished && availabilityFor(group.key).full ? ", lotado" : ""}</span></h3><div class="vn-order-list">${group.list.map((order) => agendaCardMarkup(order, { list: true })).join("")}</div></section>`).join("")}</div>`;
}
function renderOrders() {
  const panel = $("#view-orders");
  const queryWasFocused = document.activeElement?.id === "order-search";
  const stageFocused = document.activeElement?.dataset?.stage;
  const caret = queryWasFocused ? document.activeElement.selectionStart : null;
  const orders = filteredOrders();
  const own = state.orders.filter((order) => !sampleOrder(order));
  const stageChips = ORDER_STAGES.map((stage) => {
    const count = stage.test ? own.filter(stage.test).length : stage.statuses ? own.filter((order) => stage.statuses.includes(order.status)).length : own.length;
    const current = stage.key === state.statusFilter;
    return `<button class="stage-chip${current ? " is-current" : ""}${count ? "" : " is-empty"}" type="button" data-stage="${stage.key}" aria-pressed="${current}">${esc(stage.label)}<span class="stage-count">${count}</span></button>`;
  }).join("");
  const pendingRequests = own.filter((order) => order.status === "Solicitação").length;
  const negotiations = own.filter((order) => ["Orçamento", "Aguardando confirmação"].includes(order.status)).length;
  const inbox = state.statusFilter === "new" ? `<section class="vn-inbox-banner"><span class="vn-summary-icon">${icon("inbox")}</span><div><h2>Caixa de entrada</h2><p class="vn-inbox-counts"><a href="#inbox-review-title">${pendingRequests} para revisar</a> · <a href="#inbox-negotiation-title">${negotiations} em negociação</a></p><p>Solicitações aguardam sua revisão. Orçamentos seguem em negociação. Só a confirmação ocupa vaga.</p></div></section>` : "";
  const inboxSections = () => [
    { key: "review", title: "Para revisar", statuses: ["Solicitação"], description: "Confira o que a cliente pediu e decida se aceita ou recusa.", empty: "Nenhuma solicitação para revisar." },
    { key: "negotiation", title: "Em negociação", statuses: ["Orçamento", "Aguardando confirmação"], description: "Orçamentos e pedidos aguardando o combinado final com a cliente.", empty: "Nenhum orçamento em negociação." },
  ].map((section) => {
    const list = orders.filter((order) => section.statuses.includes(order.status));
    return `<section class="vn-inbox-section" aria-labelledby="inbox-${section.key}-title"><div class="section-head"><h2 id="inbox-${section.key}-title" tabindex="-1">${section.title} <span class="vn-badge">${list.length}</span></h2></div><p class="vn-inbox-description">${section.description}</p>${list.length ? `<div class="vn-order-list vn-inbox-list">${list.map((order) => agendaCardMarkup(order, { inbox: true })).join("")}</div>` : `<p class="vn-inbox-empty">${state.search.trim() ? "Nenhum resultado nesta seção para a busca." : section.empty}</p>`}</section>`;
  }).join("");
  panel.innerHTML = `<header class="vn-heading"><div><h1 id="orders-title" tabindex="-1">Pedidos</h1></div><button class="vn-btn primary vn-heading-add page-add" data-action="new-order" type="button">${icon("plus")} Nova encomenda</button></header>${tipMarkup("orders")}
    <div class="toolbar"><label class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input class="search-input" id="order-search" type="search" placeholder="Buscar cliente, produto ou detalhe…" value="${esc(state.search)}" aria-label="Buscar pedidos"></label></div>
    <div class="stage-strip" role="group" aria-label="Ver pedidos por etapa">${stageChips}</div>${inbox}
    <p class="order-results" aria-live="polite"><strong>${orders.length}</strong> ${orders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}</p>
    ${state.statusFilter === "new" ? inboxSections() : orders.length ? ordersByDayMarkup(orders) : state.orders.some((order) => !sampleOrder(order)) ? emptyState("Nada por aqui com esse filtro", "Tente outro nome ou situação para encontrar o pedido.", false) : emptyState("Seu próximo pedido começa aqui", "Cadastre o combinado com a cliente e acompanhe pagamentos, mudanças e data de entrega.", true)}`;
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
  content.innerHTML = `<div class="page-heading"><div><h1 id="settings-title">Ajustes</h1></div></div>${tipMarkup("settings")}
    <div class="settings-list">
      ${settingsCard("link", "Sua vitrine", summary.link, orderPageMarkup())}
      ${settingsCard("days", "Dias e limites", summary.days, availabilitySettingsMarkup(state.settingsDate))}
      ${pixEnabled() ? settingsCard("pix", "Pix", pixSummary(), pixSettingsMarkup()) : ""}
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
    : "Seus pedidos ficam salvos neste navegador, sem sincronização entre aparelhos.";
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
  const card = (name,value,tone='',note='',ic='') => `<article class="stat-card vn-stat ${tone}"><span class="stat-label vn-eyebrow">${ic?icon(ic):''}${name}</span><strong class="stat-value">${esc(value)}</strong>${note}</article>`;
  let content;
  if (state.monthError) content = `<div class="notice error-notice" role="alert"><p>${esc(state.monthError)}</p><button type="button" class="button button-small" data-action="retry-month">Tentar de novo</button></div>`;
  else if (!data) content = '<p class="month-feedback" role="status">Carregando seu mês…</p>';
  else if (!data.ordersCount) content = emptyState('Seu mês começa com uma encomenda', 'Aqui vão aparecer seus pedidos confirmados ou entregues, os valores e os recebimentos conferidos deste mês.', false);
  else {
    // Recebido (só conferido) é o número que importa pela regra do produto: vem primeiro, em destaque.
    content = `<div class="stats-grid month-stats vn-month-stats">${card('Recebido',money(data.receivedCents/100),'is-green is-hero','<span class="vn-stat-note">só o que você conferiu</span>','check')}${card('A receber',money(data.receivableCents/100),'is-amber','<span class="vn-stat-note">saldo dos pedidos</span>','clock')}${card('Vendido',money(data.soldCents/100),'','<span class="vn-stat-note">soma dos pedidos do mês</span>','wallet')}${card('Pedidos',data.ordersCount,'is-count','<span class="vn-stat-note">confirmados ou entregues</span>','cake')}</div>`;
    if (data.ordersWithoutValue) content += `<p class="month-note">${data.ordersWithoutValue} ${data.ordersWithoutValue===1?'pedido sem valor informado não entrou':'pedidos sem valor informado não entraram'} em Vendido. ${data.ordersWithoutValue===1?'Ele continua':'Eles continuam'} na contagem de Pedidos.</p>`;
    if (data.ordersCount < 3) content += '<p class="month-note">Com mais pedidos, mostramos aqui os dias e produtos que mais saem.</p>';
    else {
      const item = row => `<li><span>${esc(row.name)}</span><strong>${row.count} ${row.count===1?'pedido':'pedidos'}</strong></li>`;
      content += `<div class="month-details"><section class="surface"><h2>Dias mais cheios</h2><ol class="month-ranking">${data.busiestDays.map(item).join('')}</ol></section><section class="surface"><h2>O que mais sai</h2><ol class="month-ranking">${data.topProducts.map(item).join('')}</ol></section><section class="surface"><h2>Prazo médio de aviso</h2><p class="month-lead-value">${data.averageNoticeDays===null?'Sem datas de criação':`${esc(new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(data.averageNoticeDays))} ${data.averageNoticeDays===1?'dia':'dias'}`}</p><p class="month-note">Entre o registro e a retirada ou entrega.${data.noticeOrdersCount<data.ordersCount?` Calculado com ${data.noticeOrdersCount} pedidos que têm data de criação.`:''}</p></section></div>`;
    }
  }
  panel.innerHTML = `<header class="vn-heading"><div><h1 id="month-title" tabindex="-1">Meu mês</h1></div></header><div class="week-controls month-controls vn-month-nav"><button class="icon-button" type="button" data-month-shift="-1" aria-label="Mês anterior" ${state.month==='1900-01'?'disabled':''}>${icon('left')}</button><span class="month-range" aria-live="polite">${esc(label)}</span><button class="icon-button" type="button" data-month-shift="1" aria-label="Próximo mês" ${state.month>=(data?.currentMonth||currentBusinessMonth())?'disabled':''}>${icon('right')}</button></div>${tipMarkup("month")}<div class="vn-month-grid"><div class="month-content" aria-busy="${state.monthLoading}" aria-live="polite">${content}</div><aside class="vn-wine-panel vn-month-note"><span class="vn-eyebrow">Mais clareza, menos papel</span><h2>Recebido não é lucro.</h2><p>Custos e despesas não fazem parte deste resumo.</p><p>Um Pix informado continua pendente até você conferir no banco e marcar no pedido.</p></aside></div><p class="month-note month-definition">Conta pedidos Confirmados e Entregues pela data de retirada ou entrega. Recebido inclui apenas pagamentos conferidos desses pedidos, mesmo que tenham sido recebidos em outro mês. Não inclui orçamentos, solicitações nem exemplos.</p>`;
  if (focused !== undefined) panel.querySelector(`[data-month-shift="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  if (!state.monthData && !state.monthError && !state.monthLoading) loadMonth();
}

function render() {
  $("#demo-bar").hidden = window.DoceApi.mode !== "browser";
  // Barra lateral (computador): nome da confeitaria. Opcional: página antiga em cache pode não ter o elemento.
  const studio = $("#nav-studio");
  if (studio) { const name = state.orderPage?.displayName || ""; studio.hidden = !name; studio.innerHTML = name ? `<span class="nav-studio-initial" aria-hidden="true">${esc(initials(name))}</span><span><strong>${esc(name)}</strong><small>${window.DoceApi.mode === "cloud" ? "Sua confeitaria" : "Confeitaria de exemplo"}</small></span>` : ""; }
  // Optional: a page cached before this button existed must still load the agenda.
  const demoReset = $("#demo-reset");
  if (demoReset) demoReset.hidden = !window.DoceStore?.resetDemo;
  renderToday(); renderOrders(); renderSettings(); renderMonth(); renderClients();
  $$("[data-view]").forEach((button) => {
    if (!button.matches(".nav-item, .settings-button")) return;
    const current = button.dataset.view === state.activeView;
    button.classList.toggle("active", current);
    if (current) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  const needsYou = state.orders.filter((order) => !sampleOrder(order) && !isCancelled(order) && (order.status === "Solicitação" || informedFor(order.id) > 0)).length;
  $("#nav-order-count").textContent = String(needsYou);
  $("#nav-order-count").hidden = !needsYou;
  $("#nav-order-count").setAttribute("aria-label", `${needsYou} ${needsYou === 1 ? "pedido precisa" : "pedidos precisam"} de você`);
  $("#main-content").setAttribute("aria-busy", "false");
}

function populateStatusOptions() {
  $("#order-status").innerHTML = ORDER_STATUSES.filter(s=>!['Solicitação','Recusado'].includes(s)).map((status) => `<wa-option value="${esc(status)}">${esc(status)}</wa-option>`).join("");
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
  if(form.dataset.review) $("#order-status").innerHTML='<wa-option value="Orçamento">Orçamento</wa-option><wa-option value="Confirmado">Confirmado</wa-option>';
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
  $$(".optional-fields", form).forEach((section) => { section.open = !!order && [...section.querySelectorAll("input, textarea, select, wa-input, wa-textarea, wa-select")].some((field) => field.value && field.value !== "Retirada"); });
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
    // Web Awesome fields validate against their inner input, which updates on the next render.
    field.updateComplete?.then(() => field.updateValidity?.());

  });
}

function formatWhenHistory(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date) : "Data não informada";
}

// Ficha do pedido (rodada 2): na ordem do trabalho. Hora grande, próximo passo, o dinheiro como um canhoto
// com a ação logo abaixo, combinado, contato e histórico. Mesmos dados, ações e regras de antes.
function detailMarkup(order) {
  const photo = vitrinePhotoFor(order);
  const payments = orderPayments(order.id).sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));
  const balance = balanceFor(order);
  const history = Array.isArray(order.history) ? [...order.history].reverse() : [];
  const sample = order.isSample || order.isDemo || order.sample ? `<span class="demo-label">Exemplo fictício</span>` : "";
  const date = parseDate(order.dueAt);
  const dayLabel = date ? capitalize(dateLabel(order.dueAt, { weekday: "long", day: "numeric", month: "short", ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) }).replace(/\./g, "").replace(/ de /g, " ")) : "Data e horário a combinar";
  const mode = order.mode || "Retirada";
  const paidNow = confirmedPaid(order.id);
  const informedList = payments.filter((payment) => payment.status === "Informado");
  const informedNow = informedList.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const lastConfirmed = payments.find((payment) => payment.status === "Conferido" && Number(payment.amount) > 0);
  const stampDay = lastConfirmed ? (parseDate(lastConfirmed.confirmedAt || lastConfirmed.createdAt) || null) : null;
  const stampDate = stampDay ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(stampDay).replace(/\./g, "").replace(" de ", " ").toUpperCase() : "";
  const committed = isCommitted(order) && !isCancelled(order);
  const totalKnown = order.totalKnown !== false && Number(order.total) > 0;
  const delivered = order.status === "Entregue";
  const where = mode === "Entrega" ? "entrega" : "retirada";
  const zap = whatsAppLink(order);
  const moneyIntent = needsDeposit(order) || (delivered && balance > 0);
  const row = (label, value, cls = "", note = "") => `<div class="ledger-row${cls ? ` ${cls}` : ""}"><dt>${label}</dt><dd>${value}${note ? `<small>${note}</small>` : ""}</dd></div>`;
  let moneyStub = "";
  if (committed) {
    const deposit = suggestedDepositCents(order) / 100;
    const stamp = hasReceivedPayment(order.id) && !(delivered && balance > 0)
      ? `<span class="stamp stamp-large"><span>${balance !== null && balance <= 0 ? "Pago" : "Sinal pago"}</span>${stampDate ? `<small>${esc(stampDate)}</small>` : ""}</span>`
      : moneyStamp(order, informedNow).html;
    const rows = [
      row("Total combinado", esc(orderTotalLabel(order))),
      informedNow > 0 ? row("Informado pela cliente", esc(money(informedNow)), "is-informed", "não conta ainda") : "",
      row("Conferido por você", esc(money(paidNow)), paidNow > 0 ? "is-done" : ""),
      needsDeposit(order) && !informedNow && deposit ? row(`Sinal sugerido (${Number(state.pix?.depositPercent) || 30}%)`, esc(money(deposit)), "is-due") : "",
      balance !== null && balance < 0 ? row("Excedente", esc(money(Math.abs(balance))), "", "Confira os recebimentos registrados.")
        : row(delivered ? "Falta receber" : "Saldo a receber", totalKnown || balance !== null ? esc(money(balance === null ? Number(order.total || 0) : Math.max(0, balance))) : "A combinar", delivered && balance > 0 ? "is-due" : "", balance === null && totalKnown ? "nada conferido ainda" : balance > 0 && !delivered ? `na ${where}` : ""),
    ].join("");
    const confirmButtons = informedList.map((payment) => `<button class="vn-btn ok" type="button" data-action="confirm-payment" data-id="${esc(payment.id)}">Conferi os ${esc(money(payment.amount))}</button>`).join("");
    const zeroNote = confirmedPayments(order.id).length && paidNow <= 0 ? '<p class="stub-note">Conferido: nenhum valor recebido.</p>' : "";
    moneyStub = `<section class="deposit-card money-stub" aria-labelledby="money-title">
      <h3 id="money-title">Dinheiro</h3>${stamp}
      <dl class="ledger">${rows}</dl>${zeroNote}
      <div class="stub-actions">${confirmButtons}${moneyIntent ? zap : ""}${pixChargeButton(order)}<button class="vn-btn quiet" data-action="add-payment" data-id="${esc(order.id)}" type="button">${icon("plus")}Registrar recebimento</button></div>
      ${informedList.length ? '<p class="stub-note">Só marque depois de ver o dinheiro na conta.</p>' : needsDeposit(order) ? '<p class="stub-note">O sinal só conta quando você confirma que recebeu.</p>' : ""}
    </section>`;
  }
  const location = order.location ? `<div class="detail-tile"><div class="detail-tile-label">${mode === "Entrega" ? "Local de entrega" : "Local de retirada"}</div><div class="detail-tile-value">${esc(order.location)}</div></div>` : "";
  const nextAction = order.nextAction ? `<div class="detail-tile"><div class="detail-tile-label">Próxima ação${order.nextAt ? ` · ${esc(dateTimeLabel(order.nextAt))}` : ""}</div><div class="detail-tile-value">${esc(order.nextAction)}</div></div>` : "";
  const valueTiles = committed ? "" : `<div class="detail-tile"><div class="detail-tile-label">Valor total</div><div class="detail-tile-value large">${esc(orderTotalLabel(order))}</div></div>${confirmedPayments(order.id).length ? `<div class="detail-tile"><div class="detail-tile-label">Recebido conferido</div><div class="detail-tile-value large">${esc(money(paidNow))}</div></div>` : ""}`;
  const tiles = valueTiles + location + nextAction;
  const pending = order.pendingChange ? `<div class="pending-banner"><strong>Alteração ainda pendente:</strong> ${esc(order.pendingChange)}</div>` : "";
  const details = order.details ? esc(order.details) : "Nenhum detalhe foi registrado ainda.";
  const phone = order.contact ? (() => { const digits = String(order.contact).replace(/\D/g, ""); return digits.length >= 8 ? `<a class="detail-phone" href="tel:${esc(digits)}">${esc(order.contact)}</a>` : `<span class="detail-phone">${esc(order.contact)}</span>`; })() : "";
  const canEdit = !["Recusado", "Solicitação"].includes(order.status);
  return `<div class="detail-shell${order.status === "Solicitação" ? " is-request" : ""}">
    <div class="detail-topline detail-head">
      <div class="detail-bar"><span class="detail-mode">${icon(mode === "Entrega" ? "delivery" : "bag")}${esc(mode)}</span>${statusBadge(order.status)}<span class="detail-tools">${canEdit ? `<button class="detail-edit" data-action="edit-order" data-id="${esc(order.id)}" type="button">Editar</button>` : ""}<button class="icon-button close-dialog" type="button" data-close="detail-dialog" aria-label="Fechar detalhes"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></span></div>
      <p class="detail-when">${date ? `<b>${esc(shortTime(order.dueAt))}</b>` : ""}<span>${esc(dayLabel)}</span></p>
      <h2 class="detail-client" id="detail-title" tabindex="-1">${esc(order.product || "Produto sem descrição")}</h2>
      <p class="detail-product">para ${esc(clientName(order) || "cliente sem nome")}</p>
    </div>
    ${sample}${order.status === "Solicitação" ? "" : (() => { const step = nextStepButton(order, "detail-advance"); return step ? `<div class="detail-next">${step}</div>` : ""; })()}
    ${originMarkup(order)}${pending}${requestReviewMarkup(order)}
    ${moneyStub}
    <div class="detail-summary">${photo ? `<img class="detail-photo" src="${esc(photoUrl(photo))}" ${photoAttrs(photo, '72px')} alt="" decoding="async">` : ""}<div class="detail-summary-label">Combinado</div>${details}${cakeDetailsMarkup(order)}</div>
    ${tiles ? `<div class="detail-split">${tiles}</div>` : ""}
    ${phone || order.client ? `<section class="detail-contact"><div><strong>${esc(clientName(order) || "Cliente sem nome")}</strong>${phone}</div>${!moneyIntent && zap ? zap : ""}</section>` : ""}
    <section class="payment-section" ${order.status==='Solicitação'?'hidden':''}><div class="detail-section-title"><h3>Recebimentos</h3>${committed ? "" : `<div class="payment-buttons">${pixChargeButton(order)}<button class="button button-small" data-action="add-payment" data-id="${esc(order.id)}" type="button">${icon("plus")} Registrar</button></div>`}</div>${payments.length ? `<div class="payment-list">${payments.map((payment) => `<div class="payment-item"><div class="payment-main"><div class="payment-amount">${esc(money(payment.amount))}</div><div class="payment-note">${esc(payment.note || "Sem observação")}, ${esc(formatWhenHistory(payment.createdAt))}</div></div><div class="payment-status"><span class="${payment.status === "Conferido" ? "is-done" : "is-informed"}">${payment.status === "Conferido" ? "Conferido" : "Cliente informou"}</span>${payment.status !== "Conferido" && !committed ? `<button type="button" data-action="confirm-payment" data-id="${esc(payment.id)}">Marcar conferido</button>` : ""}</div></div>`).join("")}</div>` : `<p class="detail-empty">Nenhum pagamento registrado.</p>`}</section>
    <details class="history-section"><summary>Histórico (${history.length})</summary>${history.length ? `<div class="history-list">${history.map((item) => `<div class="history-item"><strong>${esc(formatWhenHistory(item.at))}</strong>${esc(item.text || "Atualização do pedido")}</div>`).join("")}</div>` : `<p class="detail-empty">As alterações do pedido aparecerão aqui.</p>`}</details>
    <div class="detail-actions"><button class="button button-quiet" data-action="copy-summary" data-id="${esc(order.id)}" type="button">${order.reviewOutcome?'Copiar mensagem para a cliente':'Copiar mensagem'}</button>${order.status === "Solicitação" ? `<button class="button button-primary" data-action="edit-order" data-id="${esc(order.id)}" type="button">Editar e aceitar</button>` : ""}</div>
  </div>`;
}

function showOrderDetail(id) {
  const order = orderById(id);
  if (!order) return;
  state.detailOrderId = order.id;
  $("#detail-content").innerHTML = detailMarkup(order);
  if (!$("#detail-dialog").open) { $("#detail-dialog").showModal(); $("#detail-title")?.focus({ preventScroll: true }); }
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

// Phone from the order, as an international number for wa.me (Brazil). Unknown formats return "".
function whatsAppNumber(order) {
  const digits = String(order.contact || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return "";
}
// Suggested deposit in cents (Pix setting, default 30%). Only for a known positive total.
function suggestedDepositCents(order) {
  const totalCents = Math.round(Number(order.total || 0) * 100);
  if (order.totalKnown === false || totalCents <= 0) return 0;
  return Math.round(totalCents * (Number(state.pix?.depositPercent) || 30) / 100);
}
// What the next message to the client is about, by the order's situation. She reviews and sends it herself.
function whatsAppIntent(order) {
  const name = clientName(order) || "tudo bem";
  const balance = balanceFor(order);
  if (order.status === "Recusado") return { label: "Avisar a cliente", opening: "" };
  if (order.status === "Solicitação") return { label: "Responder a cliente", opening: `Oi, ${name}! Recebi seu pedido pelo link e já estou vendo.` };
  if (["Orçamento", "Aguardando confirmação"].includes(order.status)) return { label: "Mandar o orçamento", opening: `Oi, ${name}! Segue o orçamento do seu pedido:` };
  if (needsDeposit(order)) {
    const deposit = suggestedDepositCents(order);
    return { label: deposit ? `Pedir o sinal de ${money(deposit / 100)}` : "Pedir o sinal", opening: `Oi, ${name}! Seu pedido está confirmado. Para garantir a data${deposit ? `, o sinal é de ${money(deposit / 100)}` : ", combinamos o sinal"}.` };
  }
  if (order.status === "Pronto") return { label: "Avisar que está pronto", opening: `Oi, ${name}! Seu pedido está pronto${(order.mode || "Retirada") === "Retirada" ? " para retirar" : ""}.` };
  if (order.status === "Entregue" && balance > 0) return { label: `Cobrar ${money(balance)}`, opening: `Oi, ${name}! Obrigada pela encomenda. Ficou faltando ${money(balance)}.` };
  return { label: "Mandar o resumo", opening: `Oi, ${name}! Confira se registrei certinho seu pedido:` };
}
// Opens the client's conversation with the message already typed (wa.me); nothing is sent automatically.
function whatsAppLink(order) {
  const number = whatsAppNumber(order);
  if (!number || sampleOrder(order)) return "";
  // Na demonstração os telefones são inventados e podem ser de alguém de verdade: nunca abre o WhatsApp.
  // O botão aparece igual e mostra a mensagem que seria escrita, para quem testa ver a função.
  if (isDemoMode()) return `<button class="vn-zap detail-whatsapp" type="button" data-action="demo-whatsapp" data-id="${esc(order.id)}">${icon("whatsapp")}<span>${esc(whatsAppIntent(order).label)}</span></button>`;
  return `<a class="vn-zap detail-whatsapp" href="https://wa.me/${number}?text=${encodeURIComponent(makeWhatsAppSummary(order))}" target="_blank" rel="noopener">${icon("whatsapp")}<span>${esc(whatsAppIntent(order).label)}</span></a>`;
}
function showDemoWhatsApp(id) {
  const order = orderById(id), dialog = $("#zap-demo-dialog");
  if (!order || !dialog) return;
  state.zapDemoText = makeWhatsAppSummary(order);
  dialog.querySelector("#zap-demo-who").textContent = clientName(order) || "a cliente";
  dialog.querySelector("#zap-demo-text").textContent = state.zapDemoText;
  dialog.showModal();
}

function makeWhatsAppSummary(order) {
  if (order.status === "Recusado") {
    const when = order.dueAt ? ` para ${dateTimeLabel(order.dueAt)}` : "";
    return [`Oi, ${order.client || "tudo bem"}! Obrigada pelo pedido de ${order.product || "doce"}${when}.`, `Infelizmente não vou conseguir atender desta vez${order.refusalReason ? `: ${order.refusalReason}` : "."}`, "", "Espero poder te atender numa próxima!"].join("\n");
  }
  const lines = [
    whatsAppIntent(order).opening,
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
  const balance = balanceFor(order);
  if (isCommitted(order) && pixEnabled() && pixReady() && (balance === null || balance > 0)) lines.push(`Pix para pagamento: ${state.pix.key}${state.pix.name ? ` (${state.pix.name})` : ""}`);
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
    markOnboarding("days");
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
    markOnboarding("advance");
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
  if (!["today", "orders", "clients", "settings", "month"].includes(view)) return;
  if (view === "month") markOnboarding("month");
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
  const clientButton = event.target.closest("[data-client]");
  if (clientButton) { openClient(clientButton.dataset.client); return; }
  const clientsFilter = event.target.closest("[data-clients-filter]");
  if (clientsFilter) { state.clientsFilter = clientsFilter.dataset.clientsFilter; renderClients(); return; }
  const monthShift = event.target.closest('[data-month-shift]');
  if (monthShift) { shiftMonth(Number(monthShift.dataset.monthShift)); return; }
  const newOrder = event.target.closest('[data-action="new-order"]');
  if (newOrder) { openOrderForm(); return; }
  const open = event.target.closest("[data-open-order]");
  if (open && !event.target.closest("[data-action]")) { showOrderDetail(open.dataset.openOrder); return; }
  const weekShift = event.target.closest("[data-week-shift]");
  if (weekShift) { state.weekOffset += Number(weekShift.dataset.weekShift); state.selectedDay = ""; state.agendaEnter = true; renderToday(); return; }
  const agendaMode = event.target.closest("[data-agenda-mode]");
  if (agendaMode) { state.agendaMode = agendaMode.dataset.agendaMode === "week" ? "week" : "day"; renderToday(); return; }
  const selectDay = event.target.closest("[data-select-day]");
  if (selectDay) { state.selectedDay = selectDay.dataset.selectDay; state.agendaEnter = true; renderToday(); $("#today-list-title")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); return; }
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
    case 'open-onboarding': { const progress = readOnboarding(); progress.dismissed = false; saveOnboarding(progress); setActiveView('today'); coach('#view-today .onboarding'); break; }
    case 'onboarding-skip': { const progress = readOnboarding(); progress.dismissed = true; saveOnboarding(progress); renderToday(); if (isDemoMode()) showToast('Para ver de novo, toque em Como funciona.'); break; }
    case 'onboarding-go': runOnboardingTask(action.dataset.task); break;
    case 'close-tip': closeTip(action.dataset.tip); break;
    case 'pix-charge': openPixCharge(id); break;
    case 'retry-clients': state.clientsError = ""; state.clientsData = null; renderClients(); break;
    case 'erase-client': eraseClient(action.dataset.clientKey); break;
    case 'clear-pix': clearPix(); break;
    case 'demo-whatsapp': showDemoWhatsApp(id); break;
    case 'copy-zap-demo': copyText(state.zapDemoText || "").then(() => showToast("Mensagem copiada.")).catch((error) => showToast(error.message)); break;
    case 'reset-demo':
      if (window.DoceStore?.resetDemo && window.confirm('Recomeçar a demonstração? Os pedidos de exemplo voltam ao início e o que você mudou aqui é apagado.')) { window.DoceStore.resetDemo(); try { localStorage.removeItem(onboardingKey()); } catch { /* sem armazenamento */ } location.reload(); }
      break;
    case 'jump-attention': $("#attention-title")?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); break;
    case 'agenda-today': state.weekOffset=0;state.selectedDay=localDateKey(new Date());state.agendaEnter=true;renderToday();break;
    case 'advance-order': action.disabled=true;advanceOrder(id,action.dataset.status);break;
    case 'toggle-produced': { const order = orderById(id); if (!order || order.status === 'Entregue') break; action.disabled = true; advanceOrder(id, order.status === 'Pronto' ? 'Em produção' : 'Pronto'); break; }
    case 'copy-production': copyText(productionText()).then(() => showToast("Lista da semana copiada.")).catch((error) => showToast(error.message)); break;
    case 'confirm-order': { const order = orderById(id); closeDetails(); if (order) openConfirmForm(order); break; }
    case 'review-request': showOrderDetail(id); break;
    case 'retry-month': state.monthError='';state.monthData=null;renderMonth();break;
    case 'copy-order-link': copyOrderLink(); break;
    case 'share-order-link': shareOrderLink(); break;
    case 'preview-link': previewOrderLink(); break;
    case 'add-product': addProductRow(); break;
    case 'remove-product': removeProductRow(action); break;
    case 'move-product': moveProductRow(action); break;
    case 'remove-photo': removePhoto(action); break;
    case 'share-kit': makeShareKit(action); break;
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
    if (event.target.id === "pix-form") savePix(event);
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
    if(event.target.closest('#order-page-form'))syncVitrineForm(event);
    if(event.target.name==='slug')event.target.dataset.edited='true';
    if(event.target.name==='displayName'){
      const slug=$('#order-page-form [name=slug]');if(slug&&!slug.dataset.edited)slug.value=slugFrom(event.target.value);
    }
  });
  // Typed addresses become valid ones: lowercase, no accents, hyphens instead of spaces.
  $("#view-settings").addEventListener("change", (event) => { if (event.target.name === "slug") event.target.value = slugFrom(event.target.value); if (event.target.matches("[data-photo]")) handlePhotoPick(event.target); });
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
  $("#view-clients")?.addEventListener("input", (event) => {
    if (event.target.id === "clients-search") { state.clientsSearch = event.target.value; renderClients(); }
  });
  ["order-dialog", "detail-dialog", "payment-dialog"].forEach((id) => {
    const dialog = $(`#${id}`);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  });
  window.addEventListener("online", () => { if (!$("#error-notice").hidden) loadState({ silent: true }); });
  window.addEventListener("offline", () => LOCAL_ONLY ? showToast("Sem internet. Os pedidos continuam salvos neste navegador.") : setError("O navegador está sem conexão. Verifique sua rede e tente novamente."));
}

populateStatusOptions();
attachEvents();
loadState();
// ---- Link de encomenda: passo a passo, lista de produtos e prévia ----
const LINK_BASE = "lucast.app/p/";
const LINK_PREVIEW_KEY = "doce-agenda.link-preview";
const slugFrom = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
// "a partir de" typed in reais ("150", "1.500,50") becomes integer cents; empty stays empty.
function priceToCents(text) {
  const raw = String(text || "").replace(/r\$|\s/gi, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/\.(?=\d{3}(\D|$))/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}
const centsToField = (cents) => Number.isInteger(cents) ? (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: cents % 100 ? 2 : 0 }) : "";
const productThumb = (product) => product.photo ? `<img src="${esc(photoUrl(product.photo))}" ${photoAttrs(product.photo, '64px')} alt="" loading="lazy" decoding="async">` : `<span aria-hidden="true">${esc((product.name || "?")[0])}</span>`;
const productMeta = (product) => [product.category, Number.isInteger(product.priceFromCents) ? `a partir de ${formatCents(product.priceFromCents)}` : "", product.featured ? "mais pedido" : ""].filter(Boolean).join(" · ") || "Toque para editar";
const productRowMarkup = (product = { name: "", description: "" }, open = false) => `<details class="product-item"${open ? " open" : ""}>
  <summary><span class="pi-thumb">${productThumb(product)}</span><span class="pi-text"><b>${esc(product.name || "Novo produto")}</b><small>${esc(productMeta(product))}</small></span></summary>
  <div class="pi-body">
    <input type="hidden" name="productPhoto" value="${esc(product.photo || "")}">
    <div class="media-pick"><span class="media-preview pi-photo">${productThumb(product)}</span><span class="media-actions"><label class="button button-quiet button-small upload-button">${product.photo ? "Trocar foto" : "Pôr foto"}<input type="file" accept="image/*" data-photo="product" ${window.DoceApi.mode === "cloud" ? "" : "disabled"}></label><button class="text-link" type="button" data-action="remove-photo" data-target="product" ${product.photo ? "" : "hidden"}>Tirar foto</button></span><small class="photo-status" role="status"></small></div>
    <label class="field"><span>Nome</span><input name="productName" maxlength="80" value="${esc(product.name)}" placeholder="Ex.: Bolo de aniversário"></label>
    <label class="field"><span>Descrição <small>(opcional)</small></span><textarea name="productDescription" maxlength="160" rows="2" placeholder="Ex.: massa e recheio à sua escolha, a partir de 1 kg">${esc(product.description)}</textarea></label>
    <div class="pi-two">
      <label class="field"><span>Categoria <small>(opcional)</small></span><input name="productCategory" maxlength="30" list="product-categories" value="${esc(product.category || "")}" placeholder="Ex.: Bolos"></label>
      <label class="field"><span>A partir de <small>(opcional)</small></span><span class="money-field"><span>R$</span><input name="productPrice" inputmode="decimal" maxlength="12" value="${esc(centsToField(product.priceFromCents))}" placeholder="0"></span></label>
    </div>
    <label class="check-row"><input type="checkbox" name="productFeatured" ${product.featured ? "checked" : ""}><span>Mostrar em <b>Mais pedidos</b> <small>(até 3)</small></span></label>
    <div class="pi-actions"><button class="button button-quiet button-small" type="button" data-action="move-product" data-step="-1">Subir</button><button class="button button-quiet button-small" type="button" data-action="move-product" data-step="1">Descer</button><button class="text-link pi-remove" type="button" data-action="remove-product">Remover</button></div>
  </div></details>`;

function mediaPickMarkup(kind, label, key, cloud) {
  const preview = key ? `<img src="${esc(photoUrl(key))}" alt="">` : `<span aria-hidden="true">${kind === "logo" ? esc(initials(state.orderPage.displayName)) : "Sem capa"}</span>`;
  return `<div class="field"><span>${label} <small>(opcional)</small></span><div class="media-pick media-${kind}"><span class="media-preview" data-preview="${kind}">${preview}</span><span class="media-actions"><label class="button button-quiet button-small upload-button">${key ? "Trocar" : "Enviar"}<input type="file" accept="image/*" data-photo="${kind}" ${cloud ? "" : "disabled"}></label><button class="text-link" type="button" data-action="remove-photo" data-target="${kind}" ${key ? "" : "hidden"}>Remover</button></span><small class="photo-status" role="status"></small></div></div>`;
}

function vitrineStyleMarkup(p) {
  const chosenStyle = p.style || "atelie", color = p.color || DEFAULT_COLOR, preset = VITRINE_PRESETS.some(([, value]) => value === color);
  const palette = vitrinePalette(color);
  return `<div class="style-cards" role="radiogroup" aria-label="Estilo da vitrine">${Object.entries(VITRINE_STYLE_INFO).map(([key, info]) => `<label class="style-card"><input type="radio" name="style" value="${key}" ${chosenStyle === key ? "checked" : ""}><span class="style-aa" style="font-family:${info.font.replace(/"/g, "'")};font-weight:${info.weight}">Aa</span><b>${info.name}</b><small>${info.hint}</small></label>`).join("")}</div>
    <div class="field"><span>Cor</span><div class="color-row" role="radiogroup" aria-label="Cor da vitrine">${VITRINE_PRESETS.map(([name, value]) => `<label class="swatch" title="${name}"><input type="radio" name="color" value="${value}" ${color === value ? "checked" : ""} aria-label="${name}"><i style="background:${value}"></i></label>`).join("")}<label class="swatch custom-swatch"><input type="radio" name="color" value="${preset ? "#f2c94c" : esc(color)}" ${preset ? "" : "checked"} aria-label="Outra cor"><input type="color" class="color-picker" value="${preset ? "#f2c94c" : esc(color)}" aria-label="Escolher outra cor"><span>Outra</span></label></div>
    <small id="color-note" class="color-note"${palette.adjusted ? "" : " hidden"}>Essa cor deixaria o texto dos botões difícil de ler. A vitrine usa um tom mais escuro dela nos botões.</small></div>`;
}

function orderPageMarkup() {
  const p = state.orderPage, cloud = window.DoceApi.mode === "cloud", live = cloud && p.active && p.slug;
  const products = p.products.length ? p.products : [{ name: "", description: "" }];
  const categories = [...new Set(["Bolos", "Docinhos", "Tortas", "Presentes", ...p.products.map((item) => item.category).filter(Boolean)])];
  const hero = live
    ? `<div class="link-hero is-live"><span class="live-badge"><i aria-hidden="true"></i>No ar</span><h2>Seu link de encomenda</h2><p class="link-url">${esc(LINK_BASE)}<b>${esc(p.slug)}</b></p>
      <div class="link-share"><button class="button button-primary" type="button" data-action="copy-order-link">Copiar link</button><button class="button button-quiet" type="button" data-action="share-order-link">Mandar no WhatsApp</button></div>
      <div class="link-kit"><button class="text-link" type="button" data-action="share-kit" data-kind="story">Imagem para status e story</button><button class="text-link" type="button" data-action="share-kit" data-kind="qr">QR para imprimir</button></div>
      <button class="text-link" type="button" data-action="preview-link">Ver como a cliente vê</button>
      <p class="link-tip">Coloque na bio do Instagram e no status do WhatsApp. Cada pedido chega em <b>Novos</b> para você revisar antes de aceitar.</p></div>`
    : `<div class="link-hero"><h2>Sua vitrine</h2><p>Uma página com a sua marca e os seus doces. A cliente escolhe, vê as datas livres e manda o pedido. Você revisa antes de aceitar.</p>${cloud ? "" : '<p class="link-demo-note">Na demonstração dá para montar e ver a prévia. Para receber pedidos de verdade, crie sua conta grátis.</p>'}</div>`;
  const actions = live
    ? '<button class="button button-primary" type="submit" name="intent" value="save">Salvar alterações</button><button class="button button-quiet" type="button" data-action="preview-link">Ver prévia</button><button class="text-link link-pause" type="submit" name="intent" value="pause">Pausar link</button>'
    : `${cloud ? '<button class="button button-primary" type="submit" name="intent" value="activate">Ativar meu link</button>' : ""}<button class="button ${cloud ? "button-quiet" : "button-primary"}" type="button" data-action="preview-link">Ver como a cliente vê</button>${cloud ? '<button class="text-link" type="submit" name="intent" value="save">Salvar sem ativar</button>' : ""}`;
  const form = `<form id="order-page-form" class="link-steps" novalidate>
    <input type="hidden" name="logo" value="${esc(p.logo || "")}"><input type="hidden" name="cover" value="${esc(p.cover || "")}"><input type="hidden" name="share" value="${esc(p.share || "")}">
    <fieldset class="link-step"><legend><span class="step-n">1</span>Sua marca</legend>
      <label class="field"><span>Nome da confeitaria</span><input name="displayName" maxlength="60" value="${esc(p.displayName)}" placeholder="Como sua confeitaria se chama?" autocomplete="organization"></label>
      <label class="field"><span>Frase de apresentação <small>(opcional)</small></span><textarea name="welcome" maxlength="280" rows="2" placeholder="Ex.: Bolos e docinhos feitos em casa, sob encomenda, em Campinas.">${esc(p.welcome)}</textarea></label>
      <label class="field"><span>Instagram <small>(opcional)</small></span><input name="instagram" maxlength="60" value="${p.instagram ? "@" + esc(p.instagram) : ""}" placeholder="@suaconfeitaria" autocapitalize="none" spellcheck="false"></label>
      ${mediaPickMarkup("logo", "Logo", p.logo, cloud)}${mediaPickMarkup("cover", "Foto de capa", p.cover, cloud)}
      <p class="link-step-note">${cloud ? "Sem logo, o nome vira a marca, na letra do estilo. As fotos são reduzidas no seu celular e perdem a localização antes de enviar." : "Na demonstração, as fotos são exemplos. Com sua conta, você envia as suas."}</p></fieldset>
    <fieldset class="link-step"><legend><span class="step-n">2</span>Estilo e cor</legend>${vitrineStyleMarkup(p)}</fieldset>
    <fieldset class="link-step"><legend><span class="step-n">3</span>Seus doces</legend>
      <p class="link-step-note">Valor "a partir de" é opcional: sem ele, a vitrine diz que o valor é combinado depois. Categorias aparecem quando há doces suficientes.</p>
      <datalist id="product-categories">${categories.map((c) => `<option value="${esc(c)}"></option>`).join("")}</datalist>
      <div class="product-list" id="product-list">${products.map((item) => productRowMarkup(item, !item.name)).join("")}</div>
      <button class="text-link add-product" type="button" data-action="add-product">+ Adicionar produto</button>
      <p class="link-step-note">A cliente também pode descrever um doce que não está na lista.</p></fieldset>
    <fieldset class="link-step"><legend><span class="step-n">4</span>Seu link</legend>
      <label class="field"><span>Endereço</span><span class="slug-field"><span class="slug-prefix">${esc(LINK_BASE)}</span><input name="slug" maxlength="40" value="${esc(p.slug)}" ${p.slug ? 'data-edited="true"' : ""} autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="preenche sozinho com o nome"></span><small>Criado a partir do nome. Pode trocar: letras, números e hífen.</small></label>
      <label class="field"><span>Seu WhatsApp <small>(opcional)</small></span><input name="whatsapp" type="tel" maxlength="30" value="${esc(p.whatsapp)}" placeholder="(11) 99999-9999" autocomplete="tel"><small>Com o número, a cliente pode te avisar no WhatsApp depois de mandar o pedido.</small></label></fieldset>
    <p class="link-privacy">Ao ativar, você recebe os dados da cliente para atender a encomenda, conforme a <a href="/privacidade/" target="_blank" rel="noopener">política de privacidade</a>.</p>
    <p id="order-page-error" class="form-error" role="alert" hidden></p>
    <div class="link-save">${actions}</div>
  </form>`;
  const extras = live ? '<div class="link-extras"><p>Pausar impede pedidos novos. Os que já chegaram continuam para revisão.</p><button class="text-link" type="button" data-action="link-metrics">Ver métricas do link</button><p id="link-metrics-result" class="form-hint" aria-live="polite"></p></div>' : "";
  return `<section class="surface order-page-settings link-studio">${hero}${live ? `<details class="link-edit"><summary>Editar vitrine, produtos e endereço</summary>${form}</details>` : form}${extras}</section>`;
}

// Reads the form as it is now. Throws a friendly error for a price that is not a number.
function linkFormValues(form) {
  const data = new FormData(form), value = (name) => String(data.get(name) || "").trim();
  const products = $$(".product-item", form).map((row) => {
    const field = (name) => row.querySelector(`[name=${name}]`), name = field("productName").value.trim();
    const product = { name, description: field("productDescription").value.trim() };
    const category = field("productCategory").value.trim(), price = priceToCents(field("productPrice").value), photo = field("productPhoto").value;
    if (Number.isNaN(price)) throw new Error(`Confira o valor "a partir de" de ${name || "um produto"}: use só números, como 150 ou 89,90.`);
    if (category) product.category = category;
    if (price !== null) product.priceFromCents = price;
    if (field("productFeatured").checked) product.featured = true;
    if (photo) product.photo = photo;
    return product;
  }).filter((product) => product.name);
  return { displayName: value("displayName"), slug: value("slug"), welcome: value("welcome"), whatsapp: value("whatsapp"), products,
    style: value("style") || "atelie", color: value("color"), instagram: value("instagram"), logo: value("logo"), cover: value("cover"), share: value("share") };
}

async function saveOrderPage(event) {
  event.preventDefault();
  const form = event.target, error = $("#order-page-error"), intent = event.submitter?.value || "save";
  if (window.DoceApi.mode !== "cloud") return;
  const active = intent === "activate" ? true : intent === "pause" ? false : state.orderPage.active;
  let values;
  error.hidden = true;
  try { values = linkFormValues(form); } catch (failure) { error.textContent = failure.message; error.hidden = false; return; }
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
// Imagem para status/story ou QR para imprimir, feitos no aparelho com a vitrine salva.
async function makeShareKit(button) {
  const page = state.orderPage, url = `https://${LINK_BASE}${page.slug}`, story = button.dataset.kind === "story";
  button.disabled = true;
  try {
    const blob = story ? await storyImage(page, url) : await printQr(page, url);
    const result = await shareOrDownload(blob, story ? `${page.slug}-status.png` : `${page.slug}-qr.png`, story ? `Encomendas abertas: ${url}` : url);
    if (result === "downloaded") showToast(story ? "Imagem salva. Poste no status ou no story." : "QR salvo. Imprima e cole na embalagem ou no balcão.");
  } catch { showToast("Não deu para montar a imagem agora. Tente de novo."); }
  finally { button.disabled = false; }
}

function shareOrderLink() {
  const text = `Agora você pode fazer sua encomenda por aqui, escolhendo o doce e a data: https://${LINK_BASE}${state.orderPage.slug}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

// The preview reads the form as it is now (even unsaved) and never sends anything.
// It opens inside the app, over Ajustes, like a phone screen; the dialog is created on first use.
function previewOrderLink() {
  const form = $("#order-page-form");
  let values;
  try { values = form ? linkFormValues(form) : state.orderPage; } catch (failure) { showToast(failure.message); return; }
  const draft = { ...values, displayName: values.displayName || "Sua confeitaria", orderTemplate: state.orderTemplate, availability: state.availability };
  try { localStorage.setItem(LINK_PREVIEW_KEY, JSON.stringify(draft)); } catch { /* a prévia usa o exemplo padrão */ }
  let dialog = $("#link-preview-dialog");
  if (!dialog) {
    document.body.insertAdjacentHTML("beforeend", `<dialog id="link-preview-dialog" class="link-preview-dialog" aria-label="Prévia da vitrine"><div class="lp-bar"><span><b>Prévia</b> · como a cliente vê</span><button class="button button-quiet button-small" type="button" data-close-preview>Fechar</button></div><iframe title="Prévia da vitrine"></iframe></dialog>`);
    dialog = $("#link-preview-dialog");
    dialog.addEventListener("click", (event) => { if (event.target.closest("[data-close-preview]") || event.target === dialog) dialog.close(); });
  }
  dialog.querySelector("iframe").src = `/encomenda/?preview=1&t=${Date.now()}`;
  dialog.showModal();
}

function addProductRow() {
  const list = $("#product-list");
  if (!list) return;
  if (list.children.length >= 30) { showToast("O link aceita até 30 produtos."); return; }
  list.insertAdjacentHTML("beforeend", productRowMarkup(undefined, true));
  list.lastElementChild.querySelector("[name=productName]")?.focus();
}

function removeProductRow(button) {
  const list = $("#product-list"), row = button.closest(".product-item");
  if (!list || !row) return;
  row.remove();
  if (!list.children.length) list.insertAdjacentHTML("beforeend", productRowMarkup(undefined, true));
}

function moveProductRow(button) {
  const row = button.closest(".product-item"), step = Number(button.dataset.step);
  const sibling = step < 0 ? row?.previousElementSibling : row?.nextElementSibling;
  if (!row || !sibling) return;
  if (step < 0) sibling.before(row); else sibling.after(row);
  button.focus();
}

// ---- Fotos da vitrine: preparadas no aparelho, enviadas na hora; publicadas quando ela salva ----
const vitrineCanvases = { logo: null, cover: null };
const kb = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
async function uploadPhoto(blob) {
  const { key } = await apiRequest("/vitrine/fotos", { method: "POST", body: { type: blob.type, data: await blobToBase64(blob) } });
  return key;
}
async function refreshShareImage(form) {
  const share = form.elements.share;
  if (!vitrineCanvases.cover && !vitrineCanvases.logo) { if (!form.elements.cover.value && !form.elements.logo.value) share.value = ""; return; }
  const tint = vitrinePalette(form.querySelector("[name=color]:checked")?.value).tint;
  share.value = await uploadPhoto(await shareImage({ cover: vitrineCanvases.cover, logo: vitrineCanvases.logo, tint }));
}
function suggestLogoColor(form, color) {
  const row = form.querySelector(".color-row");
  let label = row.querySelector(".logo-swatch");
  if (!label) { row.insertAdjacentHTML("afterbegin", '<label class="swatch logo-swatch" title="Cor do seu logo"><input type="radio" name="color" aria-label="Cor do seu logo"><i></i><span>Do logo</span></label>'); label = row.querySelector(".logo-swatch"); }
  const radio = label.querySelector("input");
  radio.value = color; label.querySelector("i").style.background = color; radio.checked = true;
  radio.dispatchEvent(new Event("input", { bubbles: true }));
}
async function handlePhotoPick(input) {
  const file = input.files?.[0], kind = input.dataset.photo, form = input.form, row = input.closest(".product-item"), pick = input.closest(".media-pick");
  const status = pick.querySelector(".photo-status");
  input.value = "";
  if (!file) return;
  const buttons = $$("[type=submit]", form);
  buttons.forEach((button) => { button.disabled = true; });
  status.textContent = "Preparando a foto…";
  try {
    const prepared = await preparePhoto(file, kind === "product" ? "product" : kind);
    status.textContent = "Enviando…";
    const key = await uploadPhoto(prepared.blob), url = URL.createObjectURL(prepared.blob);
    if (row) {
      row.querySelector("[name=productPhoto]").value = key;
      row.querySelector(".pi-thumb").innerHTML = row.querySelector(".pi-photo").innerHTML = `<img src="${url}" alt="">`;
    } else {
      form.elements[kind].value = key;
      pick.querySelector(".media-preview").innerHTML = `<img src="${url}" alt="">`;
      vitrineCanvases[kind] = prepared.canvas;
      if (kind === "logo") { const color = dominantColor(prepared.canvas); if (color) suggestLogoColor(form, color); }
      await refreshShareImage(form);
    }
    pick.querySelector("[data-action=remove-photo]").hidden = false;
    pick.querySelector(".upload-button").firstChild.textContent = kind === "product" ? "Trocar foto" : "Trocar";
    status.textContent = `Foto pronta (${kb(prepared.before)} → ${kb(prepared.blob.size)}). Toque em Salvar para publicar.`;
  } catch (failure) {
    status.textContent = failure.status === 0 || failure instanceof TypeError ? "Sem internet. A foto não foi enviada; tente de novo." : (failure.message || "Não deu para enviar a foto. Tente de novo.");
  } finally { buttons.forEach((button) => { button.disabled = false; }); }
}
async function removePhoto(button) {
  const form = button.form || button.closest("form"), kind = button.dataset.target, row = button.closest(".product-item"), pick = button.closest(".media-pick");
  if (row) {
    row.querySelector("[name=productPhoto]").value = "";
    const product = { name: row.querySelector("[name=productName]").value };
    row.querySelector(".pi-thumb").innerHTML = row.querySelector(".pi-photo").innerHTML = productThumb(product);
  } else {
    form.elements[kind].value = ""; vitrineCanvases[kind] = null;
    pick.querySelector(".media-preview").innerHTML = `<span aria-hidden="true">${kind === "logo" ? esc(initials(form.elements.displayName.value)) : "Sem capa"}</span>`;
    try { await refreshShareImage(form); } catch { form.elements.share.value = ""; }
  }
  button.hidden = true;
  pick.querySelector(".upload-button").firstChild.textContent = kind === "product" ? "Pôr foto" : "Enviar";
  pick.querySelector(".photo-status").textContent = "Foto retirada. Toque em Salvar para publicar.";
}

// Keeps the closed product summary in sync with what she types, and the style/color choice consistent.
function syncVitrineForm(event) {
  const target = event.target, row = target.closest?.(".product-item");
  if (row) {
    const name = row.querySelector("[name=productName]").value.trim(), price = priceToCents(row.querySelector("[name=productPrice]").value);
    const product = { name, category: row.querySelector("[name=productCategory]").value.trim(), priceFromCents: Number.isNaN(price) ? null : price, featured: row.querySelector("[name=productFeatured]").checked, photo: row.querySelector("[name=productPhoto]").value };
    row.querySelector(".pi-text b").textContent = name || "Novo produto";
    row.querySelector(".pi-text small").textContent = productMeta(product);
    if (!product.photo) row.querySelector(".pi-thumb").innerHTML = productThumb(product);
    if (target.name === "productFeatured" && target.checked && $$("[name=productFeatured]:checked", target.form).length > 3) {
      target.checked = false; showToast("Escolha até 3 doces para Mais pedidos."); syncVitrineForm(event);
    }
  }
  if (target.classList?.contains("color-picker")) {
    const radio = target.closest(".custom-swatch").querySelector("[name=color]");
    radio.value = target.value; radio.checked = true;
  }
  if (target.name === "color" || target.classList?.contains("color-picker")) {
    const color = target.form.querySelector("[name=color]:checked")?.value;
    $("#color-note").hidden = !vitrinePalette(color).adjusted;
    $$(".style-aa", target.form).forEach((sample) => { sample.style.color = vitrinePalette(color).ink; });
  }
}
function requestReviewMarkup(order){
 if(order.status!=='Solicitação')return order.reviewOutcome==='refused'?`<p class="pending-banner">Solicitação recusada${order.refusalReason?`: ${esc(order.refusalReason)}`:'.'}</p>`:'';
 const day=order.dueAt?.slice(0,10),available=day?availabilityFor(day):{limit:null},pending=state.orders.filter(o=>o.status==='Solicitação'&&day&&o.dueAt?.slice(0,10)===day).length;
 const remaining=Number.isInteger(available.limit)?Math.max(0,available.limit-available.count):null;
 return `<section class="request-review"><h3>Solicitação${order.publicCode ? ` ${esc(order.publicCode)}` : ""}</h3><p class="request-state"><span class="vn-badge outline">Aguardando revisão</span></p><p>Ainda não confirmada. Confira data, detalhes e valor antes de aceitar.</p><p><strong>Valor total: ${esc(orderTotalLabel(order))}</strong></p>${dateCapacityMarkup(order)}${order.possibleDuplicate?'<p class="form-error">Possível duplicata: compare com as outras solicitações antes de aceitar.</p>':''}${remaining!==null&&pending>remaining?`<p class="form-error">${pending} solicitações para ${remaining} ${remaining===1?'vaga restante':'vagas restantes'} nesta data.</p>`:''}<div class="request-actions"><button class="button button-primary" type="button" data-action="accept-request" data-id="${esc(order.id)}" data-status="Confirmado">Aceitar pedido</button><button class="button button-quiet" type="button" data-action="accept-request" data-id="${esc(order.id)}" data-status="Orçamento">Ainda vou passar o preço</button><button class="text-link" type="button" data-action="refuse-request" data-id="${esc(order.id)}">Recusar</button></div></section>`;
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
 try{await apiRequest(`/orders/${encodeURIComponent(id)}/refuse`,{method:'POST',body:{reason:form.elements.reason.value,reasonCode:'outro'}});$('#refuse-dialog').close();closeDetails();await loadState({silent:true});showOrderDetail(id);showToast('Pedido recusado. Toque em "Copiar mensagem para a cliente".');}
 catch(e){const error=form.querySelector('[role=alert]');error.textContent=e.message;error.hidden=false;}finally{button.disabled=false;}
});

async function loadLinkMetrics(){
 const output=$('#link-metrics-result');output.textContent='Carregando…';
 try{const metrics=await apiRequest('/order-page/metrics'),orders=state.orders.filter(o=>o.origin==='link'),week=orders.filter(o=>Date.parse(o.createdAt)>=Date.now()-7*86400000),accepted=orders.filter(o=>o.reviewOutcome==='accepted'),reviewed=orders.filter(o=>o.reviewedAt),times=reviewed.map(o=>Math.max(0,Date.parse(o.reviewedAt)-Date.parse(o.createdAt))),minutes=times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length/60000):null;
 output.textContent=`${metrics.visits} visitas · ${week.length} solicitações nos últimos 7 dias · ${orders.length?Math.round(accepted.length/orders.length*100):0}% aceitas${minutes!==null?` · revisão média em ${minutes} min`:''}. ${state.orders.filter(o=>!['Solicitação','Recusado'].includes(o.status)&&!sampleOrder(o)).length?Math.round(state.orders.filter(o=>o.origin==='link'&&!['Solicitação','Recusado'].includes(o.status)).length/state.orders.filter(o=>!['Solicitação','Recusado'].includes(o.status)&&!sampleOrder(o)).length*100):0}% dos pedidos vieram do link. Visitas contam carregamentos, incluindo repetições.`;
 }catch(e){output.textContent=e.message;}
}

// ---- Clientes: fichas montadas pelo servidor a partir dos pedidos ----
const formatPhone = (digits) => digits.length === 11 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : digits.length === 10 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` : digits;
const dayLabel = (key, withYear = false) => key ? calendarDateLabel(key, { weekday: withYear ? undefined : "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).replace(/\./g, "").replace(/ de /g, " ") : "";
const clientByKey = (key) => state.clientsData?.clients.find((client) => client.key === key);

async function loadClients() {
  const request = ++state.clientsRequest;
  state.clientsLoading = true;
  try {
    const data = await apiRequest("/clientes");
    if (request !== state.clientsRequest) return;
    state.clientsData = data; state.clientsError = "";
  } catch (error) {
    if (request !== state.clientsRequest) return;
    state.clientsError = error.message || "Não foi possível carregar as clientes.";
  } finally {
    if (request === state.clientsRequest) { state.clientsLoading = false; renderClients(); }
  }
}

function clientStatusLine(client) {
  if (client.nextOrderDay) return `Próximo pedido: ${dayLabel(client.nextOrderDay)}`;
  if (client.away) return `Faz ${client.daysSinceLast} dias que não pede`;
  if (client.lastPurchaseDay) return `Último pedido: ${dayLabel(client.lastPurchaseDay)}`;
  return "Ainda sem pedido confirmado";
}

function clientRowMarkup(client) {
  return `<button class="client-row${client.away ? " is-away" : ""}" type="button" data-client="${esc(client.key)}">
    <span class="client-main"><strong>${esc(client.name)}</strong><small>${client.phone ? esc(formatPhone(client.phone)) : "Sem WhatsApp"} · ${client.purchases} ${client.purchases === 1 ? "pedido" : "pedidos"}${client.totalCents ? ` · ${esc(moneyCents(client.totalCents))}` : ""}</small></span>
    <span class="client-status">${esc(clientStatusLine(client))}</span>
    ${client.sameNameAs.length && !client.phone ? '<span class="client-tag">Mesmo nome de outra ficha</span>' : ""}
  </button>`;
}

function renderClients() {
  const panel = $("#view-clients");
  if (!panel) return; // página antiga em cache, sem a aba
  panel.hidden = state.activeView !== "clients";
  if (panel.hidden) return;
  const data = state.clientsData;
  const search = state.clientsSearch.trim().toLocaleLowerCase("pt-BR");
  let body;
  if (state.clientsError) body = `<div class="empty-state"><h3>Não foi possível carregar as clientes</h3><p>${esc(state.clientsError)}</p><button class="button button-quiet" type="button" data-action="retry-clients">Tentar de novo</button></div>`;
  else if (!data) body = '<p class="month-loading" role="status">Carregando clientes…</p>';
  else if (!data.clients.length) body = '<div class="empty-state"><h3>Suas clientes aparecem aqui</h3><p>Cada pedido anotado entra na ficha da cliente. Com o WhatsApp no pedido, os pedidos da mesma pessoa se juntam sozinhos.</p></div>';
  else {
    const digits = search.replace(/\D/g, "");
    const list = data.clients.filter((client) => (state.clientsFilter !== "away" || client.away) && (!search || client.name.toLocaleLowerCase("pt-BR").includes(search) || (digits.length >= 3 && client.phone.includes(digits))));
    const reminders = data.reminders.length ? `<section class="client-reminders" aria-labelledby="reminders-title"><h2 id="reminders-title">Datas que se repetem</h2>${data.reminders.map((item) => `<div class="client-reminder"><p><strong>${esc(item.name)}</strong> pediu ${esc(item.product || "uma encomenda")} em ${esc(dayLabel(item.originalDay, true))}. Pode ter festa de novo: faltam ${item.daysUntil} ${item.daysUntil === 1 ? "dia" : "dias"}.</p><button class="button button-small" type="button" data-client="${esc(item.key)}">Ver ficha</button></div>`).join("")}</section>` : "";
    body = `${reminders}
      <div class="toolbar"><label class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input class="search-input" id="clients-search" type="search" placeholder="Buscar por nome ou WhatsApp…" value="${esc(state.clientsSearch)}" aria-label="Buscar clientes"></label></div>
      <div class="stage-strip client-filter" role="group" aria-label="Filtrar clientes">${[["all", "Todas", data.clients.length], ["away", "Faz tempo que não pedem", data.away]].map(([key, label, count]) => { const current = (state.clientsFilter === "away" ? "away" : "all") === key; return `<button class="stage-chip${current ? " is-current" : ""}${count ? "" : " is-empty"}" type="button" data-clients-filter="${key}" aria-pressed="${current}">${label} <span class="stage-count">${count}</span></button>`; }).join("")}</div>
      ${list.length ? `<div class="client-list">${list.map(clientRowMarkup).join("")}</div>` : '<p class="detail-empty">Nenhuma cliente encontrada.</p>'}`;
  }
  const focused = document.activeElement?.id === "clients-search" ? document.activeElement.selectionStart : null;
  panel.innerHTML = `<div class="page-heading"><div><h1 id="clients-title">Clientes</h1></div></div>${tipMarkup("clients")}${body}`;
  if (focused !== null) { const input = $("#clients-search"); input?.focus(); input?.setSelectionRange(focused, focused); }
  if (!data && !state.clientsError && !state.clientsLoading) loadClients();
}

function openClient(key) {
  const client = clientByKey(key);
  if (!client) return;
  let dialog = $("#client-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "client-dialog"; dialog.className = "dialog client-dialog"; dialog.setAttribute("aria-labelledby", "client-title");
    document.body.append(dialog);
  }
  const reminder = state.clientsData.reminders.find((item) => item.key === key);
  const orders = client.orderIds.map(orderById).filter(Boolean);
  dialog.innerHTML = `<div class="dialog-heading"><div><h2 id="client-title">${esc(client.name)}</h2><p class="client-phone">${client.phone ? esc(formatPhone(client.phone)) : "Sem WhatsApp nos pedidos"}</p></div><button class="icon-button close-dialog" type="button" data-close="client-dialog" aria-label="Fechar ficha"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="client-tiles"><div><small>Pedidos</small><b>${client.purchases}</b></div><div><small>Total</small><b>${esc(moneyCents(client.totalCents))}</b></div><div><small>Último</small><b>${client.lastPurchaseDay ? esc(listDayLabel(`${client.lastPurchaseDay}T12:00`).replace(/^[^,]+, /, "")) : "—"}</b></div></div>
    ${client.nextOrderDay ? `<p class="client-note">Próximo pedido: <strong>${esc(dayLabel(client.nextOrderDay))}</strong>.</p>` : ""}
    ${client.away ? `<p class="client-note is-away">Faz ${client.daysSinceLast} dias que ela não pede. Que tal mandar um oi?</p>` : ""}
    ${reminder ? `<p class="client-note">Em ${esc(dayLabel(reminder.originalDay, true))} ela pediu ${esc(reminder.product || "uma encomenda")}. Pode ter festa de novo daqui a ${reminder.daysUntil} ${reminder.daysUntil === 1 ? "dia" : "dias"}.</p>` : ""}
    ${client.topProducts.length ? `<p class="client-products">Mais pede: ${client.topProducts.map(({ product, count }) => `<span>${esc(product)}${count > 1 ? ` (${count})` : ""}</span>`).join("")}</p>` : ""}
    ${client.sameNameAs.length ? `<p class="client-note">Pode ser a mesma pessoa que ${client.sameNameAs.map((other) => `<button class="text-link" type="button" data-client="${esc(other.key)}">${esc(other.name)}${other.phone ? ` · ${esc(formatPhone(other.phone))}` : " (sem WhatsApp)"}</button>`).join(", ")}. As fichas não se juntam sozinhas: para juntar, coloque o mesmo WhatsApp nos pedidos.</p>` : ""}
    <h3 class="client-orders-title">Pedidos</h3>
    <div class="vn-lines client-orders">${orders.map((order) => agendaLineMarkup(order, { withDate: true })).join("")}</div>
    <div class="client-actions">${client.phone ? (isDemoMode() ? `<p class="vn-muted client-demo-note">Na demonstração o WhatsApp fica desligado: os telefones são inventados.</p>` : `<a class="button button-primary" href="https://wa.me/55${esc(client.phone)}" target="_blank" rel="noopener">Abrir conversa no WhatsApp</a>`) : ""}<button class="text-link client-erase" type="button" data-action="erase-client" data-client-key="${esc(client.key)}">Apagar dados desta cliente</button></div>`;
  if (!dialog.open) dialog.showModal();
}

async function eraseClient(key) {
  const client = clientByKey(key);
  if (!client) return;
  if (!window.confirm(`Apagar os dados de ${client.name}? Nome, WhatsApp, endereço e detalhes saem de ${client.orders} ${client.orders === 1 ? "pedido" : "pedidos"}. Datas e valores ficam para as suas contas. Não dá para desfazer.`)) return;
  try {
    const result = await apiRequest(`/clientes/${encodeURIComponent(key)}/anonimizar`, { method: "POST", body: {} });
    $("#client-dialog")?.close();
    await loadState({ silent: true });
    showToast(`Dados apagados de ${result.orders} ${result.orders === 1 ? "pedido" : "pedidos"}.`);
  } catch (error) { showToast(error.message || "Não foi possível apagar os dados."); }
}

// ---- Pix: cobrar com o código copia e cola ----
// Hidden while the code is checked in two bank apps: ?pix=teste turns it on in this browser, ?pix=off turns it off.
// Nothing is registered by itself: the payment only counts after she registers it and marks it Conferido.
const PIX_BETA_KEY = "doce-agenda.pix-beta";
const pixEnabled = () => { try { return localStorage.getItem(PIX_BETA_KEY) === "1"; } catch { return false; } };
const PIX_TYPE_LABELS = { celular: "Celular", cpf: "CPF", cnpj: "CNPJ", email: "E-mail", aleatoria: "Chave aleatória" };
const pixReady = () => !!state.pix?.key;
const toCents = (reais) => Math.round(Number(reais || 0) * 100);
const moneyCents = (value) => money(value / 100);
let pixCharge = null;

function pixSummary() {
  return pixReady() ? `${esc(PIX_TYPE_LABELS[state.pix.keyType] || "Chave")} · sinal sugerido ${state.pix.depositPercent}%` : "Ainda não cadastrado · para cobrar o sinal";
}

function pixSettingsMarkup() {
  const pix = state.pix || {};
  const percent = Number.isInteger(pix.depositPercent) ? pix.depositPercent : 30;
  return `<form id="pix-form" class="settings-form pix-form">
    <p class="settings-intro">Com a chave cadastrada, cada pedido ganha o botão "Cobrar por Pix". A cliente paga pelo app do banco dela; você confere na sua conta e marca como conferido.</p>
    <label class="field"><span>Tipo da chave</span><select name="keyType" required>${[["", "Escolha"], ...Object.entries(PIX_TYPE_LABELS)].map(([value, label]) => `<option value="${value}" ${(pix.keyType || "") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
    <label class="field"><span>Chave Pix</span><input name="key" autocomplete="off" maxlength="80" required value="${esc(pix.key || "")}" placeholder="Igual está no app do seu banco"></label>
    <label class="field"><span>Nome que aparece no Pix</span><input name="name" maxlength="40" required value="${esc(pix.name || state.orderPage?.displayName || "")}"><small>Até 25 letras. Acentos saem no código.</small></label>
    <label class="field"><span>Cidade</span><input name="city" maxlength="40" required value="${esc(pix.city || "")}" placeholder="Ex.: Recife"></label>
    <label class="field"><span>Sinal sugerido (%)</span><input name="depositPercent" type="number" inputmode="numeric" min="0" max="100" step="1" value="${percent}"><small>Em cada pedido dá para cobrar outro valor.</small></label>
    <p class="availability-note">A chave fica só na sua conta. A cliente vê seu nome e a chave quando recebe o código.</p>
    <div class="link-actions"><button class="button button-primary" type="submit">Salvar Pix</button>${pixReady() ? '<button class="text-link" type="button" data-action="clear-pix">Remover chave</button>' : ""}</div>
  </form>`;
}

async function savePix(event, form = event.target) {
  event.preventDefault();
  const data = new FormData(form);
  const percent = Number(data.get("depositPercent"));
  const body = { keyType: String(data.get("keyType") || ""), key: String(data.get("key") || "").trim(), name: String(data.get("name") || ""), city: String(data.get("city") || ""), depositPercent: Number.isInteger(percent) ? percent : 30 };
  if (!body.key) return showToast("Informe a chave Pix.");
  try {
    await apiRequest("/pix", { method: "PUT", body });
    await loadState({ silent: true });
    showToast("Pix salvo. Já dá para cobrar nos pedidos.");
  } catch (error) { showToast(error.message || "Não foi possível salvar o Pix."); }
}

async function clearPix() {
  if (!window.confirm("Remover a chave Pix? O botão de cobrança some dos pedidos até você cadastrar de novo.")) return;
  try {
    await apiRequest("/pix", { method: "PUT", body: { key: "", depositPercent: state.pix?.depositPercent ?? 30 } });
    await loadState({ silent: true });
    showToast("Chave Pix removida.");
  } catch (error) { showToast(error.message || "Não foi possível remover a chave."); }
}

// What can be charged now, in cents: the suggested deposit while nothing was received, then what is left.
function pixChargeOptions(order) {
  const total = toCents(order.total), received = confirmedPayments(order.id).reduce((sum, payment) => sum + toCents(payment.amount), 0);
  const deposit = Math.round(total * (state.pix?.depositPercent ?? 30) / 100), remaining = Math.max(0, total - received);
  const options = [];
  if (!received && deposit > 0 && deposit < total) options.push(["sinal", `Sinal (${state.pix.depositPercent}%)`, deposit]);
  if (remaining > 0) options.push([received ? "restante" : "total", received ? "Restante" : "Valor total", remaining]);
  return options;
}

const pixChargeButton = (order) => pixEnabled() && order.status !== "Solicitação" && !isCancelled(order) && order.totalKnown !== false && Number(order.total) > 0 && (!pixReady() || pixChargeOptions(order).length)
  ? `<button class="button button-small pix-charge" data-action="pix-charge" data-id="${esc(order.id)}" type="button">Cobrar por Pix</button>` : "";

function openPixCharge(id) {
  const order = orderById(id);
  if (!order) return;
  if (!pixReady()) {
    closeDetails(); state.openSettings.add("pix"); setActiveView("settings");
    coach('.settings-card[data-settings="pix"]'); showToast("Cadastre sua chave Pix para cobrar.");
    return;
  }
  const options = pixChargeOptions(order);
  pixCharge = { orderId: order.id, options, kind: options[0]?.[0] || "outro", amount: options[0]?.[2] || 0 };
  let dialog = $("#pix-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "pix-dialog"; dialog.className = "dialog pix-dialog"; dialog.setAttribute("aria-labelledby", "pix-title");
    document.body.append(dialog);
    dialog.addEventListener("click", pixDialogClick);
    dialog.addEventListener("change", pixDialogChange);
    dialog.addEventListener("input", (event) => { if (event.target.name === "pix-other") { pixCharge.amount = toCents(parseMoney(event.target.value)); renderPixResult(); } });
  }
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="pix-title">Cobrar por Pix</h2><button class="icon-button close-dialog" type="button" data-pix="close" aria-label="Fechar"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="pix-for">${esc(order.product || "Encomenda")} · ${esc(clientName(order) || "cliente")}</p>
    <fieldset class="pix-amounts"><legend>Quanto cobrar?</legend><div class="choice-chips">${options.map(([kind, label, value]) => `<label><input type="radio" name="pix-kind" value="${kind}" ${pixCharge.kind === kind ? "checked" : ""}><span>${esc(label)} · ${esc(moneyCents(value))}</span></label>`).join("")}<label><input type="radio" name="pix-kind" value="outro" ${pixCharge.kind === "outro" ? "checked" : ""}><span>Outro valor</span></label></div></fieldset>
    <label class="field pix-other" ${pixCharge.kind === "outro" ? "" : "hidden"}><span>Valor</span><input name="pix-other" inputmode="decimal" placeholder="0,00"></label>
    <div id="pix-result"></div>
    <p class="deposit-rule">Quando o dinheiro cair na sua conta, registre o pagamento e marque como conferido. O app não confere sozinho.</p>`;
  renderPixResult();
  if (!dialog.open) dialog.showModal();
}

function renderPixResult() {
  const result = $("#pix-result");
  if (!result || !pixCharge) return;
  let code = "", error = "";
  try { if (pixCharge.amount > 0) code = pixPayload({ key: state.pix.key, name: state.pix.name, city: state.pix.city, amountCents: pixCharge.amount }); } catch (failure) { error = failure.message; }
  pixCharge.code = code;
  result.innerHTML = code
    ? `<div class="pix-qr" role="img" aria-label="QR Code do Pix de ${esc(moneyCents(pixCharge.amount))}">${renderSVG(code, { border: 4, ecc: "M" })}</div>
      <p class="pix-amount">${esc(moneyCents(pixCharge.amount))}</p>
      <label class="field pix-code"><span>Pix copia e cola</span><textarea readonly rows="3">${esc(code)}</textarea></label>
      <div class="pix-actions"><button class="button button-primary" type="button" data-pix="message">Copiar mensagem para WhatsApp</button><button class="button button-quiet" type="button" data-pix="code">Copiar só o código</button></div>`
    : `<p class="detail-empty">${esc(error || "Escolha quanto cobrar.")}</p>`;
}

function pixDialogChange(event) {
  if (event.target.name !== "pix-kind") return;
  const option = pixCharge.options.find(([kind]) => kind === event.target.value);
  pixCharge.kind = event.target.value;
  const other = $("#pix-dialog .pix-other");
  other.hidden = pixCharge.kind !== "outro";
  pixCharge.amount = option ? option[2] : toCents(parseMoney(other.querySelector("input").value));
  if (pixCharge.kind === "outro") other.querySelector("input").focus();
  renderPixResult();
}

function pixDialogClick(event) {
  const button = event.target.closest("[data-pix]");
  if (!button) return;
  const dialog = $("#pix-dialog"), order = orderById(pixCharge?.orderId);
  if (button.dataset.pix === "close") { dialog.close(); return; }
  if (!pixCharge?.code || !order) return;
  if (button.dataset.pix === "code") { copyText(pixCharge.code).then(() => showToast("Código Pix copiado.")).catch((error) => showToast(error.message)); return; }
  const what = { sinal: "do sinal", restante: "do restante", total: "" }[pixCharge.kind] || "";
  const message = `Oi, ${clientName(order) || "tudo bem"}! Segue o Pix${what ? ` ${what}` : ""} de ${order.product || "sua encomenda"}: ${moneyCents(pixCharge.amount)}.\n\nPix copia e cola:\n${pixCharge.code}\n\nDepois de pagar, me mande o comprovante, por favor.`;
  copyText(message).then(() => showToast("Mensagem copiada. Cole na conversa com a cliente.")).catch((error) => showToast(error.message));
}

// ---- Boas-vindas: tarefas na tela de verdade ----
// The demonstration asks for four short tasks in any order; a new account gets three first steps.
// Progress is read from the agenda itself where possible; the rest is remembered on this device.
const isDemoMode = () => !!window.DoceStore?.isDemo;
const onboardingKey = () => `doce-agenda.onboarding.${isDemoMode() ? "demo" : "conta"}.v1`;
function readOnboarding() {
  try {
    const saved = JSON.parse(localStorage.getItem(onboardingKey()) || "{}");
    return { dismissed: saved.dismissed === true, done: Array.isArray(saved.done) ? saved.done : [] };
  } catch { return { dismissed: false, done: [] }; }
}
function saveOnboarding(progress) {
  try { localStorage.setItem(onboardingKey(), JSON.stringify(progress)); } catch { /* sem armazenamento: só não lembra */ }
}
function markOnboarding(key) {
  const progress = readOnboarding();
  if (!progress.done.includes(key)) { progress.done.push(key); saveOnboarding(progress); }
}
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pendingRequest = () => sortOrders(state.orders.filter((order) => order.status === "Solicitação"))[0];
const informedPayment = () => state.payments.find((payment) => payment.status === "Informado" && orderById(payment.orderId) && !sampleOrder(orderById(payment.orderId)));

function onboardingTasks() {
  const { done } = readOnboarding();
  if (isDemoMode()) {
    const request = pendingRequest(), payment = informedPayment(), payer = payment && orderById(payment.orderId);
    return [
      { key: "request", title: "Decida o pedido que chegou pelo link", text: request ? `${clientName(request) || "A cliente"} quer ${request.product || "uma encomenda"}. Aceite ou recuse.` : "Aceite ou recuse o pedido da cliente.", done: !request },
      { key: "pix", title: "Confira um Pix informado", text: payer ? `${clientName(payer) || "A cliente"} disse que pagou o sinal. Marque como conferido e veja o carimbo.` : "Marque o sinal como conferido e veja o carimbo.", done: !payment },
      { key: "advance", title: "Avance um pedido de etapa", text: "Começar a fazer, ficou pronto, entregue: um toque em cada.", done: done.includes("advance") },
      { key: "month", title: "Veja quanto entrou no mês", text: "Só conta o dinheiro que você conferiu.", done: done.includes("month") },
    ];
  }
  const availability = state.availability || {};
  return [
    { key: "order", title: "Anote seu primeiro pedido", text: "Cliente, produto, data e valor. O resto pode vir depois.", done: state.orders.some((order) => !sampleOrder(order) && order.status !== "Solicitação") },
    { key: "days", title: "Diga seus dias e limites", text: "Os dias em que você não trabalha e quantos pedidos cabem por dia.", done: done.includes("days") || (availability.closedWeekdays || []).length > 0 || availability.dailyOrderLimit != null || Number(availability.minimumNoticeHours) > 0 },
    { key: "link", title: "Ative seu link de encomenda", text: "As clientes pedem sozinhas, e nada ocupa vaga até você aceitar.", done: !!state.orderPage?.active },
  ];
}

const onboardingVisible = () => !readOnboarding().dismissed && (isDemoMode() || onboardingTasks().some((task) => !task.done));

function onboardingMarkup() {
  if (!onboardingVisible()) return "";
  const demo = isDemoMode(), tasks = onboardingTasks(), count = tasks.filter((task) => task.done).length;
  if (count === tasks.length) {
    return `<section class="onboarding is-complete surface" aria-labelledby="onboarding-title"><h2 id="onboarding-title">Pronto, você já sabe usar.</h2><p>Agora é com a sua confeitaria: crie a conta e anote seus pedidos de verdade.</p><div class="onboarding-end"><a class="button button-primary" href="/cadastro/">Criar conta grátis</a><button class="text-link" type="button" data-action="onboarding-skip">Fechar</button></div></section>`;
  }
  return `<section class="onboarding surface" aria-labelledby="onboarding-title">
    <div class="onboarding-head"><div><h2 id="onboarding-title">${demo ? "Experimente em 1 minuto" : "Primeiros passos"}</h2><p>${demo ? "Faça na tela de verdade, na ordem que quiser." : "Três coisas para deixar sua agenda pronta."}</p></div><button class="text-link onboarding-skip" type="button" data-action="onboarding-skip">Pular</button></div>
    <div class="onboarding-progress" role="progressbar" aria-label="Tarefas feitas" aria-valuemin="0" aria-valuemax="${tasks.length}" aria-valuenow="${count}"><i style="width:${Math.round(count / tasks.length * 100)}%"></i></div>
    <p class="onboarding-count">${count} de ${tasks.length} feitas</p>
    <ol class="onboarding-list">${tasks.map((task) => `<li class="onboarding-task${task.done ? " is-done" : ""}"><span class="onboarding-check" aria-hidden="true">${task.done ? "✓" : ""}</span><span class="onboarding-text"><strong>${esc(task.title)}</strong><small>${esc(task.text)}</small></span>${task.done ? '<span class="visually-hidden">Feito.</span>' : `<button class="button button-quiet onboarding-go" type="button" data-action="onboarding-go" data-task="${task.key}" aria-label="Fazer: ${esc(task.title)}">Fazer</button>`}</li>`).join("")}</ol>
    ${demo ? "" : '<a class="text-link onboarding-demo" href="/demo/">Ver a demonstração antes</a>'}
  </section>`;
}

// Takes her to the place of the task and briefly rings what to tap.
function coach(selector) {
  setTimeout(() => {
    const target = $(selector);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    target.classList.remove("coach-target"); void target.offsetWidth; target.classList.add("coach-target");
    setTimeout(() => target.classList.remove("coach-target"), 3600);
  }, 150);
}

function runOnboardingTask(key) {
  if (key === "request") { setActiveView("today"); coach("#view-today .request-banner .button"); }
  else if (key === "pix") { const payment = informedPayment(); if (payment) { showOrderDetail(payment.orderId); coach('#detail-dialog [data-action="confirm-payment"]'); } }
  else if (key === "advance") { state.agendaMode = "day"; state.selectedDay = localDateKey(new Date()); setActiveView("today"); coach('#view-today [data-action="advance-order"]'); }
  else if (key === "month") setActiveView("month");
  else if (key === "order") openOrderForm();
  else if (key === "days" || key === "link") { state.openSettings.add(key); setActiveView("settings"); coach(`.settings-card[data-settings="${key}"]`); }
}

// One-sentence tips at the top of a tab, until she closes them.
const TIP_KEY = "doce-agenda.tips.v1";
const TIPS = {
  orders: "Em Novos, veja o que está Para revisar e os orçamentos Em negociação. O selo Recebido pelo link mostra a origem, mesmo depois de aceitar.",
  month: "Só conta como recebido o dinheiro que você marcou como conferido.",
  settings: "Aqui você ativa o link para as clientes e diz quais dias e quantos pedidos aceita.",
  clients: "Os pedidos com o mesmo WhatsApp formam a ficha de cada cliente. Sem WhatsApp, juntamos pelo nome.",
};
const closedTips = () => { try { const list = JSON.parse(localStorage.getItem(TIP_KEY) || "[]"); return Array.isArray(list) ? list : []; } catch { return []; } };
const tipMarkup = (key) => closedTips().includes(key) ? "" : `<div class="tab-tip" role="note"><p><strong>Dica:</strong> ${esc(TIPS[key])}</p><button class="tab-tip-close" type="button" data-action="close-tip" data-tip="${key}" aria-label="Fechar dica"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
function closeTip(key) {
  try { localStorage.setItem(TIP_KEY, JSON.stringify([...new Set([...closedTips(), key])])); } catch { /* sem armazenamento */ }
  render();
}
