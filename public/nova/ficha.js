// Ficha do pedido e o que se faz nela: receber, cobrar, aceitar ou recusar o pedido do link,
// confirmar o orçamento, marcar entregue e cancelar. Tudo pelas rotas /api que já existem.
import * as M from './model.js';
import { $, api, app, closeSheet, copy, esc, findOrder, openSheet, reload, showError, toast } from './ui.js';

let refresh = async () => {};
export const setRefresh = (fn) => { refresh = fn; };
const OVERRIDE_REASON = 'Aceito mesmo assim pela confeiteira.';
const modeText = (order) => (order.mode === 'Entrega' ? `Entrega${order.location ? ` · ${order.location}` : ''}` : `Retirada${order.location ? ` · ${order.location}` : ''}`);
const firstName = (order) => String(order.client || '').trim().split(/\s+/)[0];

function whenText(order) {
  const day = M.orderDay(order);
  return day ? `${M.hourLabel(order)} · ${M.fullDayLabel(day, app.today)}` : 'Sem dia marcado';
}

function agreed(order) {
  const cake = order.cake?.values || {}, labels = order.cake?.labels || {};
  const rows = Object.entries(cake).filter(([, value]) => String(value || '').trim())
    .map(([key, value]) => `<div><dt>${esc(labels[key] || key)}</dt><dd>${esc(value)}</dd></div>`).join('');
  // Pedido do link: o que a cliente pediu, nas palavras dela; nos outros, o que foi combinado.
  return `<section class="f-block" aria-labelledby="f-agreed"><h3 id="f-agreed">${order.origin === 'link' ? 'O que ela pediu' : 'O combinado'}</h3>
    <p class="f-notes">${order.details ? esc(order.details) : '<span class="muted">Nada anotado.</span>'}</p>
    ${rows ? `<dl class="f-cake">${rows}</dl>` : ''}</section>`;
}

function money(order) {
  const { total, received, due } = M.balance(app.state, order);
  const reported = M.reportedPayments(app.state, order).map((payment) => `<div class="f-reported"><p>A cliente avisou que pagou ${esc(M.brl(M.toCents(payment.amount)))}. Já viu na conta?</p>
    <button class="btn btn-outline" type="button" data-act="seen" data-payment="${esc(payment.id)}" data-id="${esc(order.id)}">Vi na conta</button></div>`).join('');
  // Cada parte inteira numa linha: "Falta R$ 120" não quebra no meio.
  const parts = total === null ? ['Valor a combinar', ...(received ? [`Recebido ${M.brl(received)}`] : [])] : [`Total ${M.brl(total)}`, `Recebido ${M.brl(received)}`, due ? `Falta ${M.brl(due)}` : 'Pago'];
  const line = parts.map((part) => `<span>${esc(part)}</span>`).join(' · ');
  const charge = due && order.contact ? `<button class="btn btn-outline" type="button" data-act="charge" data-id="${esc(order.id)}">Cobrar no WhatsApp</button>` : '';
  return `<section class="f-block" aria-labelledby="f-money"><h3 id="f-money">Dinheiro</h3>
    <p class="money-line" id="money-line">${line}</p>${reported}
    <div class="f-actions"><button class="btn btn-outline" type="button" data-act="received" data-id="${esc(order.id)}">Recebi</button>${charge}</div></section>`;
}

function mainActions(order) {
  const id = esc(order.id), kind = M.group(order.status);
  if (order.status === 'Solicitação') return `<div class="f-main"><button class="btn btn-primary" type="button" data-act="accept" data-id="${id}">Aceitar</button><button class="btn btn-outline" type="button" data-act="refuse" data-id="${id}">Recusar</button></div>`;
  if (kind === 'decide') return `<div class="f-main"><button class="btn btn-primary" type="button" data-act="confirm" data-id="${id}">Confirmar</button><button class="btn btn-outline" type="button" data-act="cancel-order" data-id="${id}">Cancelar</button></div>`;
  if (kind === 'confirmed') return `<div class="f-main"><button class="btn btn-primary" type="button" data-act="deliver" data-id="${id}">Entregue</button></div>`;
  return '';
}

function fichaHtml(order) {
  const kind = M.group(order.status), request = order.status === 'Solicitação';
  const footer = [
    !request ? `<button class="link-btn" type="button" data-act="edit" data-id="${esc(order.id)}">Editar</button>` : '',
    kind === 'confirmed' ? `<button class="link-btn link-quiet" type="button" data-act="cancel-order" data-id="${esc(order.id)}">Cancelar pedido</button>` : '',
  ].filter(Boolean).join('');
  return `<article class="ficha" data-id="${esc(order.id)}">
    <p class="f-when">${esc(whenText(order))}</p>
    <h2 id="sheet-title" tabindex="-1">${esc(order.product)}</h2>
    <p class="f-who"><button class="link-btn" type="button" data-act="client" data-id="${esc(order.id)}">${esc(order.client)}</button> · ${esc(modeText(order))}</p>
    <p class="f-state"><span class="pill pill-${kind}">${M.GROUP_LABEL[kind] || order.status}</span>${order.origin === 'link' && request ? ' <span class="muted">Chegou pelo link</span>' : ''}</p>
    ${agreed(order)}
    ${request ? `<section class="f-block"><h3>Contato</h3><p>${order.contact ? `WhatsApp ${esc(order.contact)}` : '<span class="muted">Sem WhatsApp.</span>'}</p>${order.contact ? `<div class="f-actions"><button class="btn btn-outline" type="button" data-act="reply" data-id="${esc(order.id)}">Responder no WhatsApp</button></div>` : ''}</section>` : money(order)}
    ${mainActions(order)}
    ${footer ? `<div class="f-footer">${footer}</div>` : ''}
  </article>`;
}

export function openFicha(id) {
  const order = findOrder(id);
  if (!order) { closeSheet(); return; }
  openSheet(fichaHtml(order));
}
const backToFicha = (id) => () => openFicha(id);

export function openList(kind) {
  const orders = kind === 'late' ? M.lateOrders(app.state, app.today) : M.decideOrders(app.state);
  const items = orders.map((order) => {
    const day = M.orderDay(order);
    return `<li><button class="list-row" type="button" data-act="open" data-id="${esc(order.id)}"><strong>${esc(order.client)}</strong><span>${esc(order.product)}${day ? ` · ${esc(M.shortDayLabel(day))}` : ''}</span></button></li>`;
  }).join('');
  openSheet(`<h2 id="sheet-title" tabindex="-1">${kind === 'late' ? 'Ficaram para trás' : 'Para decidir'}</h2><ul class="list">${items}</ul>`);
}

// Tocar no nome: telefone, WhatsApp e os pedidos anteriores dela (pela ficha de Clientes do servidor).
export async function openClient(id) {
  const order = findOrder(id);
  let client = null;
  try { client = (await api('/clientes')).clients.find((item) => item.orderIds.includes(id)); } catch { /* mostra só o pedido */ }
  const others = (client?.orderIds || []).filter((other) => other !== id).map(findOrder)
    .filter((item) => item && M.group(item.status) !== 'out').sort((a, b) => String(b.dueAt).localeCompare(String(a.dueAt))).slice(0, 6);
  const phone = order.contact || client?.phone || '';
  const link = !app.demo && phone ? M.whatsappLink(phone, `Oi, ${firstName(order)}!`) : '';
  openSheet(`<h2 id="sheet-title" tabindex="-1">${esc(order.client)}</h2>
    <p>${phone ? `WhatsApp ${esc(phone)}` : '<span class="muted">Sem WhatsApp anotado.</span>'}</p>
    ${link ? `<p><a class="btn btn-outline" href="${esc(link)}" target="_blank" rel="noopener">Abrir conversa</a></p>` : ''}
    <h3>Pedidos anteriores</h3>
    ${others.length ? `<ul class="list">${others.map((item) => `<li><button class="list-row" type="button" data-act="open" data-id="${esc(item.id)}"><strong>${esc(M.orderDay(item) ? M.shortDate(M.orderDay(item)) + '/' + M.orderDay(item).slice(2, 4) : 'Sem dia')}</strong><span>${esc(item.product)}</span></button></li>`).join('')}</ul>` : '<p class="muted">Este é o primeiro pedido dela aqui.</p>'}`, backToFicha(id));
}

// Recebi: o valor sugerido é o que falta; ela pode mudar. Todo pagamento novo é Conferido.
export function openReceived(id, fromMoney = false) {
  const order = findOrder(id), { due } = M.balance(app.state, order);
  openSheet(`<form id="pay-form" data-id="${esc(id)}" data-from="${fromMoney ? 'money' : 'ficha'}" novalidate>
    <h2 id="sheet-title" tabindex="-1">Recebi</h2><p class="muted">${esc(order.product)} · ${esc(order.client)}</p>
    <label class="field"><span>Quanto você viu na conta?</span><input name="amount" inputmode="decimal" autocomplete="off" value="${due ? esc(M.centsInput(due)) : ''}" placeholder="Ex.: 50" aria-describedby="pay-error"></label>
    <p class="form-error" id="pay-error" role="alert" hidden></p>
    <button class="btn btn-primary" type="submit">Registrar</button></form>`, fromMoney ? null : backToFicha(id));
}
export async function submitReceived(form) {
  const cents = M.parseMoney(form.elements.amount.value);
  if (!cents) return showError('#pay-error', 'Escreva quanto recebeu, como 50 ou 50,50.');
  try {
    await api(`/orders/${encodeURIComponent(form.dataset.id)}/payments`, { method: 'POST', body: { amount: cents / 100, status: 'Conferido', note: 'Recebido' } });
    await reload();
    await refresh();
    if (form.dataset.from === 'money') closeSheet(); else openFicha(form.dataset.id);
    toast(`Recebido ${M.brl(cents)}.`);
  } catch (error) { showError('#pay-error', error.message); }
}

export async function markSeen(paymentId, id) {
  try {
    await api(`/payments/${encodeURIComponent(paymentId)}`, { method: 'PUT', body: { status: 'Conferido' } });
    await reload(); await refresh(); openFicha(id);
    toast('Anotado como recebido.');
  } catch (error) { toast(error.message); }
}

// Mensagem pronta. Na demonstração só mostra o texto; nunca abre o WhatsApp.
function messageSheet(title, text, contact, back) {
  const link = !app.demo ? M.whatsappLink(contact, text) : '';
  openSheet(`<h2 id="sheet-title" tabindex="-1">${esc(title)}</h2><p class="message" id="message-text">${esc(text)}</p>
    ${link ? `<a class="btn btn-primary" href="${esc(link)}" target="_blank" rel="noopener">Abrir conversa</a><button class="btn btn-outline" type="button" data-act="copy-message">Copiar mensagem</button>`
      : `<button class="btn btn-primary" type="button" data-act="copy-message">Copiar mensagem</button><p class="muted">No exemplo, a conversa não abre.</p>`}`, back);
}
export function openCharge(id, fromMoney = false) {
  const order = findOrder(id), { due } = M.balance(app.state, order);
  messageSheet('Cobrar no WhatsApp', M.chargeMessage(order, due, app.today), order.contact, fromMoney ? null : backToFicha(id));
}
export function openReply(id) {
  const order = findOrder(id);
  messageSheet('Responder no WhatsApp', M.replyMessage(order, app.today), order.contact, backToFicha(id));
}
export async function copyMessage() {
  toast(await copy($('#message-text').textContent) ? 'Mensagem copiada.' : 'Não deu para copiar. Selecione o texto e copie.');
}

// Entregue: um toque, com Desfazer. Ao desfazer volta à situação de antes (ou Confirmado, se ela não é conhecida).
export async function toggleDone(id) {
  const order = findOrder(id);
  if (!order) return;
  try {
    if (order.status === 'Entregue') {
      await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: app.previousStatus[id] || 'Confirmado' } });
      await reload(); await refresh(id);
      toast('Voltou para a agenda.');
      return;
    }
    if (M.group(order.status) !== 'confirmed') return;
    const before = order.status;
    app.previousStatus[id] = before;
    await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: 'Entregue' } });
    await reload(); await refresh(id);
    toast(`${order.product} entregue.`, async () => {
      try {
        await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: before } });
        await reload(); await refresh(id);
        toast('Desfeito.');
      } catch (error) { toast(error.message); }
    });
  } catch (error) { toast(error.message); }
}
export async function deliverFromFicha(id) {
  closeSheet();
  await toggleDone(id);
}

const dateFields = (order, show) => `<div class="when-fields" id="when-fields"${show ? '' : ' hidden'}>
  <label class="field"><span>Dia</span><input type="date" name="date" value="${esc(M.orderDay(order))}"></label>
  <label class="field"><span>Hora</span><input type="time" name="time" value="${esc(String(order.dueAt || '').slice(11, 16))}"></label></div>`;
const readWhen = (form) => (form.elements.date?.value && form.elements.time?.value ? `${form.elements.date.value}T${form.elements.time.value}` : '');

// Aceitar o pedido do link: valor opcional na mesma janela. Data cheia ou fechada: mudar a data ou aceitar mesmo assim.
export function openAccept(id) {
  const order = findOrder(id), noValue = M.totalCents(order) === null, noDay = !M.orderDay(order);
  openSheet(`<form id="accept-form" data-id="${esc(id)}" novalidate>
    <h2 id="sheet-title" tabindex="-1">Aceitar o pedido de ${esc(firstName(order))}</h2>
    <p class="muted">${esc(order.product)} · ${esc(whenText(order))}</p>
    ${noValue ? '<label class="field"><span>Valor combinado <small>(opcional)</small></span><input name="total" inputmode="decimal" autocomplete="off" placeholder="Ex.: 150" aria-describedby="accept-error"></label>' : ''}
    ${dateFields(order, noDay)}
    <p class="form-error" id="accept-error" role="alert" hidden></p>
    <div class="conflict" id="accept-conflict" hidden><button class="btn btn-outline" type="button" data-act="change-date">Mudar a data</button><button class="btn btn-outline" type="button" data-act="accept-anyway">Aceitar mesmo assim</button></div>
    <button class="btn btn-primary" type="submit">Aceitar</button></form>`, backToFicha(id));
}
function acceptBody(form) {
  const body = {};
  if (form.elements.total) {
    const cents = M.parseMoney(form.elements.total.value);
    if (Number.isNaN(cents)) throw new Error('Escreva o valor como 150 ou 150,50.');
    if (cents) Object.assign(body, { total: cents / 100, totalKnown: true });
  }
  const dueAt = readWhen(form);
  if (dueAt) body.dueAt = dueAt;
  return body;
}
export async function submitAccept(form, anyway = false) {
  const id = form.dataset.id;
  showError('#accept-error', '');
  try {
    const order = acceptBody(form);
    if (anyway) {
      // A rota de aceitar não abre exceção: aceita como orçamento e confirma com o motivo, como no formulário.
      await api(`/orders/${encodeURIComponent(id)}/accept`, { method: 'POST', body: { status: 'Orçamento', order } });
      await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: 'Confirmado', capacityOverride: { allowed: true, reason: OVERRIDE_REASON } } });
    } else {
      await api(`/orders/${encodeURIComponent(id)}/accept`, { method: 'POST', body: { status: 'Confirmado', order } });
    }
    await reload(); await refresh();
    closeSheet();
    const saved = findOrder(id), day = M.orderDay(saved);
    toast(`Pedido de ${firstName(saved)} confirmado${day ? `: ${M.dayLabel(day, app.today).toLocaleLowerCase('pt-BR')}` : ''}.`);
  } catch (error) {
    showError('#accept-error', error.message);
    $('#accept-conflict').hidden = !error.capacity;
    if (/data e horário/i.test(error.message)) $('#when-fields').hidden = false;
    if (anyway) { await reload(); await refresh(); }
  }
}

// Recusar: confirma com motivo opcional; depois oferece avisar a cliente.
export function openRefuse(id) {
  const order = findOrder(id);
  openSheet(`<form id="refuse-form" data-id="${esc(id)}" novalidate>
    <h2 id="sheet-title" tabindex="-1">Recusar o pedido de ${esc(firstName(order))}?</h2><p class="muted">${esc(order.product)} · ${esc(whenText(order))}</p>
    <label class="field"><span>Motivo <small>(opcional, fica só com você)</small></span><textarea name="reason" rows="2" maxlength="500"></textarea></label>
    <p class="form-error" id="refuse-error" role="alert" hidden></p>
    <button class="btn btn-primary" type="submit">Recusar pedido</button></form>`, backToFicha(id));
}
export async function submitRefuse(form) {
  const id = form.dataset.id;
  try {
    await api(`/orders/${encodeURIComponent(id)}/refuse`, { method: 'POST', body: { reason: form.elements.reason.value.trim(), reasonCode: 'outro' } });
    await reload(); await refresh();
    const order = findOrder(id);
    openSheet(`<h2 id="sheet-title" tabindex="-1">Pedido recusado</h2><p>Ele saiu da agenda.${order.contact ? ' Quer avisar a cliente?' : ''}</p>
      ${order.contact ? `<button class="btn btn-primary" type="button" data-act="refuse-message" data-id="${esc(id)}">Avisar no WhatsApp</button>` : ''}
      <button class="btn btn-outline" type="button" data-act="close">Fechar</button>`);
  } catch (error) { showError('#refuse-error', error.message); }
}
export function openRefuseMessage(id) {
  const order = findOrder(id);
  messageSheet('Avisar no WhatsApp', M.refuseMessage(order, app.today), order.contact, null);
}

// Orçamento anotado por ela: Confirmar (pede a data se faltar) e Cancelar.
export async function confirmQuote(id, anyway = false) {
  const order = findOrder(id), form = $('#confirm-form');
  const dueAt = form ? readWhen(form) : order.dueAt;
  if (!dueAt) {
    if (form) return showError('#confirm-error', 'Escolha o dia e a hora.');
    return openSheet(`<form id="confirm-form" data-id="${esc(id)}" novalidate><h2 id="sheet-title" tabindex="-1">Para quando?</h2>
      <p class="muted">${esc(order.product)} · ${esc(order.client)}</p>${dateFields(order, true)}
      <p class="form-error" id="confirm-error" role="alert" hidden></p><button class="btn btn-primary" type="submit">Confirmar</button></form>`, backToFicha(id));
  }
  const body = { status: 'Confirmado', ...(dueAt !== order.dueAt ? { dueAt } : {}), ...(anyway ? { capacityOverride: { allowed: true, reason: OVERRIDE_REASON } } : {}) };
  try {
    await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body });
    await reload(); await refresh();
    closeSheet();
    toast(`Pedido de ${firstName(order)} confirmado.`);
  } catch (error) {
    if (!error.capacity) {
      if (form) return showError('#confirm-error', error.message);
      return toast(error.message);
    }
    openSheet(`<form id="confirm-form" data-id="${esc(id)}" data-anyway="true" novalidate><h2 id="sheet-title" tabindex="-1">Confirmar mesmo assim?</h2>
      <p class="form-error" role="alert">${esc(error.message)}</p>${dateFields({ ...order, dueAt }, true)}
      <p class="form-error" id="confirm-error" role="alert" hidden></p>
      <button class="btn btn-primary" type="submit">Confirmar mesmo assim</button></form>`, backToFicha(id));
  }
}

export function openCancel(id) {
  const order = findOrder(id);
  openSheet(`<h2 id="sheet-title" tabindex="-1">Cancelar o pedido de ${esc(firstName(order))}?</h2><p>${esc(order.product)}. Ele sai da agenda; o que já foi recebido continua anotado.</p>
    <p class="form-error" id="cancel-error" role="alert" hidden></p>
    <button class="btn btn-primary" type="button" data-act="cancel-confirm" data-id="${esc(id)}">Cancelar pedido</button>`, backToFicha(id));
}
export async function cancelOrder(id) {
  try {
    await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: 'Cancelado' } });
    await reload(); await refresh();
    closeSheet();
    toast('Pedido cancelado.');
  } catch (error) { showError('#cancel-error', error.message); }
}
