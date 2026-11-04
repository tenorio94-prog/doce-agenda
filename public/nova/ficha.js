// Ficha do pedido e o que se faz nela: receber, cobrar, aceitar ou recusar o pedido do link,
// confirmar o orçamento, marcar entregue e cancelar. Tudo pelas rotas /api que já existem.
import * as M from './model.js';
import { $, api, app, closeSheet, conflictHtml, copy, esc, findOrder, hideConflict, openSheet, reload, showConflict, showError, toast } from './ui.js';

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

// Pagamentos lançados (conferidos e desfeitos), com Desfazer para o que foi lançado errado. Informado fica no aviso acima.
function paymentList(order) {
  const items = M.paymentsOf(app.state, order).filter((payment) => payment.status !== 'Informado').map((payment) => {
    const undone = payment.status === 'Desfeito', when = M.shortDayLabel(M.paymentDay(payment));
    return `<li class="f-pay${undone ? ' is-undone' : ''}"><span><strong>${esc(M.brl(M.toCents(payment.amount)))}</strong> · ${undone ? `desfeito ${esc(when)}` : `conferido ${esc(when)}`}</span>
      ${undone ? '' : `<button class="link-btn link-quiet" type="button" data-act="undo-payment" data-payment="${esc(payment.id)}" data-id="${esc(order.id)}">Desfazer</button>`}</li>`;
  }).join('');
  return items ? `<ul class="f-pays" aria-label="Pagamentos lançados">${items}</ul>` : '';
}

function money(order) {
  const { total, received, due } = M.balance(app.state, order), kind = M.group(order.status), reported = M.reportedPayments(app.state, order);
  // Pix avisado: conferir vem antes de tudo. Enquanto ele espera, não há Recebi nem Cobrar ao lado.
  const reportedHtml = reported.map((payment) => `<div class="f-reported"><p>A cliente avisou que pagou ${esc(M.brl(M.toCents(payment.amount)))}. Já viu na conta?</p>
    <div class="f-actions"><button class="btn btn-primary" type="button" data-act="seen" data-payment="${esc(payment.id)}" data-id="${esc(order.id)}">Vi na conta</button>
    <button class="btn btn-outline" type="button" data-act="undo-payment" data-payment="${esc(payment.id)}" data-id="${esc(order.id)}">Não caiu</button></div></div>`).join('');
  // Cada parte inteira numa linha: "Falta R$ 120" não quebra no meio.
  const parts = total === null ? ['Valor a combinar', ...(received ? [`Recebido ${M.brl(received)}`] : [])] : [`Total ${M.brl(total)}`, `Recebido ${M.brl(received)}`, due ? `Falta ${M.brl(due)}` : 'Pago'];
  const line = parts.map((part) => `<span>${esc(part)}</span>`).join(' · ');
  // Entregue com saldo tem "Recebi o resto" como ação principal, embaixo; aqui fica só o Cobrar.
  const owing = kind === 'delivered' && due > 0;
  const receive = !reported.length && due !== 0 && !owing ? `<button class="btn btn-outline" type="button" data-act="received" data-id="${esc(order.id)}">Recebi</button>` : '';
  const charge = !reported.length && due && order.contact && kind !== 'decide' ? `<button class="btn btn-outline" type="button" data-act="charge" data-id="${esc(order.id)}">Cobrar ${esc(M.brl(due))}</button>` : '';
  return `<section class="f-block" aria-labelledby="f-money"><h3 id="f-money">Dinheiro</h3>
    <p class="money-line" id="money-line">${line}</p>${reportedHtml}${paymentList(order)}
    ${receive || charge ? `<div class="f-actions">${receive}${charge}</div>` : ''}</section>`;
}

function mainActions(order) {
  // Um botão cheio por tela: com Pix avisado, o cheio é "Vi na conta" e a etapa fica contornada.
  const id = esc(order.id), kind = M.group(order.status), main = M.reportedPayments(app.state, order).length ? 'btn-outline' : 'btn-primary';
  if (order.status === 'Solicitação') return `<div class="f-main"><button class="btn ${main}" type="button" data-act="accept" data-id="${id}">Aceitar</button><button class="btn btn-outline" type="button" data-act="refuse" data-id="${id}">Recusar</button></div>`;
  if (kind === 'decide') return `<div class="f-main"><button class="btn ${main}" type="button" data-act="confirm" data-id="${id}">Confirmar</button><button class="btn btn-outline" type="button" data-act="cancel-order" data-id="${id}">Cancelar orçamento</button></div>`;
  if (kind === 'confirmed') return `<div class="f-main"><button class="btn ${main}" type="button" data-act="deliver" data-id="${id}">Entregue</button></div>`;
  if (kind === 'delivered' && M.balance(app.state, order).due > 0 && !M.reportedPayments(app.state, order).length) return `<div class="f-main"><button class="btn btn-primary" type="button" data-act="received" data-id="${id}">Recebi o resto</button></div>`;
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

export function openFicha(id, back = null) {
  const order = findOrder(id);
  if (!order) { closeSheet(); return; }
  openSheet(fichaHtml(order), back);
}
const backToFicha = (id) => () => openFicha(id);

export function openList(kind) {
  const orders = kind === 'late' ? M.lateOrders(app.state, app.today) : kind === 'pix' ? M.reportedOrders(app.state) : M.decideOrders(app.state);
  const items = orders.map((order) => {
    const day = M.orderDay(order);
    return `<li><button class="list-row" type="button" data-act="open" data-id="${esc(order.id)}" data-back="${esc(kind)}"><strong>${esc(order.client)}</strong><span>${esc(order.product)}${day ? ` · ${esc(M.shortDayLabel(day))}` : ''}</span></button></li>`;
  }).join('');
  const title = { late: 'Ficaram para trás', pix: 'Pix para conferir' }[kind] || 'Para decidir';
  openSheet(`<h2 id="sheet-title" tabindex="-1">${title}</h2><ul class="list">${items}</ul>`);
}

// Tocar no nome: telefone, WhatsApp e os pedidos anteriores dela (pela ficha de Clientes do servidor).
export async function openClient(id) {
  const order = findOrder(id);
  let client = null;
  try { client = (await api('/clientes')).clients.find((item) => item.orderIds.includes(id)); } catch { /* mostra só o pedido */ }
  // Cancelados e recusados aparecem também, marcados: é aqui que ela acha o pedido se a cliente pedir o sinal de volta.
  const others = (client?.orderIds || []).filter((other) => other !== id).map(findOrder)
    .filter(Boolean).sort((a, b) => String(b.dueAt).localeCompare(String(a.dueAt))).slice(0, 6);
  const outText = (item) => (item.status === 'Recusado' ? ' · recusado' : item.status === 'Cancelado' ? ' · cancelado' : '');
  const phone = order.contact || client?.phone || '';
  const link = !app.demo && phone ? M.whatsappLink(phone, `Oi, ${firstName(order)}!`) : '';
  openSheet(`<h2 id="sheet-title" tabindex="-1">${esc(order.client)}</h2>
    <p>${phone ? `WhatsApp ${esc(phone)}` : '<span class="muted">Sem WhatsApp anotado.</span>'}</p>
    ${link ? `<p><a class="btn btn-outline" href="${esc(link)}" target="_blank" rel="noopener">Abrir conversa</a></p>` : ''}
    <h3>Pedidos anteriores</h3>
    ${others.length ? `<ul class="list">${others.map((item) => `<li><button class="list-row" type="button" data-act="open" data-id="${esc(item.id)}"><strong>${esc(M.orderDay(item) ? M.pastDayLabel(M.orderDay(item), app.today) : 'Sem dia')}</strong><span>${esc(item.product + outText(item))}</span></button></li>`).join('')}</ul>` : '<p class="muted">Este é o primeiro pedido dela aqui.</p>'}`, backToFicha(id));
}

// Recebi: o campo vem vazio (caiu só o sinal? ela escreve o sinal) com o atalho "Tudo que falta". Depois de entregue,
// "Recebi o resto" já sugere o resto. Todo pagamento novo é Conferido.
// Valor acima do que falta pede uma segunda confirmação ("950" no lugar de "95" não vira Pago sem querer).
export function openReceived(id, fromMoney = false) {
  const order = findOrder(id), { due } = M.balance(app.state, order), rest = order.status === 'Entregue';
  openSheet(`<form id="pay-form" data-id="${esc(id)}" data-from="${fromMoney ? 'money' : 'ficha'}" novalidate>
    <h2 id="sheet-title" tabindex="-1">${rest ? 'Recebi o resto' : 'Recebi'}</h2><p class="muted">${esc(order.product)} · ${esc(order.client)}${due ? ` · falta ${esc(M.brl(due))}` : ''}</p>
    <label class="field"><span>Quanto você viu na conta?</span><input name="amount" inputmode="decimal" autocomplete="off" value="${rest && due ? esc(M.centsInput(due)) : ''}" placeholder="Ex.: 50" aria-describedby="pay-error"></label>
    ${!rest && due ? `<div class="quick"><button class="chip" type="button" data-act="fill-due" data-value="${esc(M.centsInput(due))}">Tudo que falta: ${esc(M.brl(due))}</button></div>` : ''}
    <p class="form-error" id="pay-error" role="alert" hidden></p>
    <button class="btn btn-primary" type="submit">Registrar</button></form>`, fromMoney ? null : backToFicha(id));
}
export function resetReceived(form) {
  delete form.dataset.over;
  form.querySelector('[type=submit]').textContent = 'Registrar';
  showError('#pay-error', '');
}
export async function submitReceived(form) {
  const cents = M.parseMoney(form.elements.amount.value), id = form.dataset.id, button = form.querySelector('[type=submit]');
  if (!cents) return showError('#pay-error', 'Escreva quanto recebeu, como 50 ou 50,50.');
  const { due } = M.balance(app.state, findOrder(id));
  if (due !== null && cents > due && form.dataset.over !== String(cents)) {
    form.dataset.over = String(cents);
    button.textContent = 'Registrar mesmo assim';
    return showError('#pay-error', due ? `Falta ${M.brl(due)}. Com ${M.brl(cents)}, passa do total em ${M.brl(cents - due)}. Confira o valor.` : `Este pedido já está pago. ${M.brl(cents)} passaria do total.`);
  }
  if (button.disabled) return;
  button.disabled = true;
  try {
    const payment = await api(`/orders/${encodeURIComponent(id)}/payments`, { method: 'POST', body: { amount: cents / 100, status: 'Conferido', note: 'Recebido' } });
    await reload();
    await refresh();
    if (form.dataset.from === 'money') closeSheet(); else openFicha(id);
    toast(`Recebido ${M.brl(cents)}.`, () => undoPayment(payment.id, id, form.dataset.from === 'money'));
  } catch (error) { showError('#pay-error', error.message); button.disabled = false; }
}

export async function markSeen(paymentId, id) {
  try {
    await api(`/payments/${encodeURIComponent(paymentId)}`, { method: 'PUT', body: { status: 'Conferido' } });
    await reload(); await refresh(); openFicha(id);
    toast('Anotado como recebido.');
  } catch (error) { toast(error.message); }
}

// Desfazer um pagamento lançado errado, ou marcar que o Pix avisado não caiu. Ele fica no histórico como desfeito.
export function openUndoPayment(paymentId, id) {
  const payment = app.state.payments.find((item) => item.id === paymentId);
  if (!payment) return openFicha(id);
  const value = M.brl(M.toCents(payment.amount)), reported = payment.status === 'Informado';
  openSheet(`<h2 id="sheet-title" tabindex="-1">${reported ? `O Pix de ${esc(value)} não caiu?` : `Desfazer o pagamento de ${esc(value)}?`}</h2>
    <p>${reported ? 'O aviso da cliente sai da ficha. Se o dinheiro cair depois, use Recebi.' : 'Ele deixa de contar como recebido.'} Fica anotado no histórico do pedido como desfeito.</p>
    <p class="form-error" id="undo-error" role="alert" hidden></p>
    <div class="f-main"><button class="btn btn-primary" type="button" data-act="undo-confirm" data-payment="${esc(paymentId)}" data-id="${esc(id)}">${reported ? 'Não caiu' : 'Desfazer pagamento'}</button>
    <button class="btn btn-outline" type="button" data-act="open" data-id="${esc(id)}">${reported ? 'Manter o aviso' : 'Manter o pagamento'}</button></div>`, backToFicha(id));
}
export async function undoPayment(paymentId, id, fromMoney = false) {
  const reported = app.state.payments.find((item) => item.id === paymentId)?.status === 'Informado';
  try {
    await api(`/payments/${encodeURIComponent(paymentId)}`, { method: 'PUT', body: { status: 'Desfeito' } });
    await reload(); await refresh();
    if (!fromMoney) openFicha(id);
    toast(reported ? 'Anotado: o Pix não caiu.' : 'Pagamento desfeito.');
  } catch (error) { if ($('#undo-error')) showError('#undo-error', error.message); else toast(error.message); }
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
// Enquanto grava, um segundo toque não faz nada; a linha marcada fica no lugar até o aviso sumir (7 s).
const busy = new Set();
let holdTimer = 0;
function holdRow(id) {
  app.hold = id;
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (app.hold !== id) return;
    app.hold = null;
    const focused = document.activeElement?.closest?.('.order-done')?.dataset.id || null;
    if (app.tab === 'agenda' && !$('#sheet').open) refresh(focused);
  }, 7000);
}
export async function toggleDone(id) {
  const order = findOrder(id);
  if (!order || busy.has(id)) return;
  busy.add(id);
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
    holdRow(id);
    await reload(); await refresh(id);
    toast(`Pedido entregue: ${order.product}.`, async () => {
      try {
        await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: before } });
        await reload(); await refresh(id);
        toast('Desfeito.');
      } catch (error) { toast(error.message); }
    });
  } catch (error) { toast(error.message); } finally { busy.delete(id); }
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
    ${conflictHtml('accept-anyway', 'Aceitar mesmo assim')}
    <p class="form-error" id="accept-error" role="alert" hidden></p>
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
    if (error.capacity) {
      showError('#accept-error', '');
      showConflict(form, M.conflictMessage(error, form.elements.date?.value || M.orderDay(findOrder(id))));
    } else {
      hideConflict(form);
      showError('#accept-error', error.message);
    }
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
    <button class="btn btn-danger" type="submit">Recusar pedido</button></form>`, backToFicha(id));
}
export async function submitRefuse(form) {
  const id = form.dataset.id;
  try {
    await api(`/orders/${encodeURIComponent(id)}/refuse`, { method: 'POST', body: { reason: form.elements.reason.value.trim(), reasonCode: 'outro' } });
    await reload(); await refresh();
    const order = findOrder(id);
    openSheet(`<h2 id="sheet-title" tabindex="-1">Pedido recusado</h2><p>Ele saiu da agenda.${order.contact ? ' Quer avisar a cliente?' : ''}</p>
      ${order.contact ? `<button class="btn btn-primary" type="button" data-act="refuse-message" data-id="${esc(id)}">Avisar no WhatsApp</button>` : ''}
      <button class="btn btn-outline" type="button" data-act="close">Fechar</button>
      <button class="link-btn" type="button" data-act="unrefuse" data-id="${esc(id)}">Desfazer a recusa</button>`);
  } catch (error) { showError('#refuse-error', error.message); }
}
// Recusou sem querer: o pedido volta para decidir, como chegou.
export async function unrefuse(id) {
  try {
    await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: 'Solicitação' } });
    await reload(); await refresh();
    openFicha(id);
    toast('Recusa desfeita: o pedido voltou para decidir.');
  } catch (error) { toast(error.message); }
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
    if (!form) {
      openSheet(`<form id="confirm-form" data-id="${esc(id)}" novalidate><h2 id="sheet-title" tabindex="-1">Confirmar o pedido de ${esc(firstName(order))}</h2>
        <p class="muted">${esc(order.product)} · ${esc(whenText({ ...order, dueAt }))}</p>${dateFields({ ...order, dueAt }, false)}
        ${conflictHtml('confirm-anyway', 'Confirmar mesmo assim')}
        <p class="form-error" id="confirm-error" role="alert" hidden></p><button class="btn btn-primary" type="submit">Confirmar</button></form>`, backToFicha(id));
    } else if (!$('#conflict', form)) form.querySelector('[type=submit]').insertAdjacentHTML('beforebegin', conflictHtml('confirm-anyway', 'Confirmar mesmo assim'));
    showError('#confirm-error', '');
    showConflict($('#confirm-form'), M.conflictMessage(error, dueAt.slice(0, 10)));
  }
}

// Cancelar: a confirmação diz quanto ela já pagou (continua no Recebido); o aviso tem Desfazer, como o Entregue.
export function openCancel(id) {
  const order = findOrder(id), { received } = M.balance(app.state, order);
  const paid = received ? ` Ela já pagou ${M.brl(received)}: esse valor continua contando no Recebido.` : '';
  openSheet(`<h2 id="sheet-title" tabindex="-1">Cancelar o pedido de ${esc(firstName(order))}?</h2><p>${esc(order.product)}. Ele sai da agenda e fica no histórico da cliente.${esc(paid)}</p>
    <p class="form-error" id="cancel-error" role="alert" hidden></p>
    <div class="f-main"><button class="btn btn-danger" type="button" data-act="cancel-confirm" data-id="${esc(id)}">Cancelar pedido</button>
    <button class="btn btn-outline" type="button" data-act="open" data-id="${esc(id)}">Manter o pedido</button></div>`, backToFicha(id));
}
export async function cancelOrder(id) {
  const before = findOrder(id)?.status;
  try {
    await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: 'Cancelado' } });
    await reload(); await refresh();
    closeSheet();
    $('#main').focus({ preventScroll: true });
    toast('Pedido cancelado.', async () => {
      // A vaga era dele segundos antes: volta mesmo que o dia tenha enchido nesse meio-tempo.
      const back = M.group(before) === 'confirmed' ? { capacityOverride: { allowed: true, reason: 'Cancelamento desfeito.' } } : {};
      try {
        await api(`/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: before, ...back } });
        await reload(); await refresh();
        toast('Cancelamento desfeito.');
      } catch (error) { toast(error.message); }
    });
  } catch (error) { showError('#cancel-error', error.message); }
}
