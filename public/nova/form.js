// Novo pedido e Editar. Tudo à vista, na ordem do caderno. Ao editar, só vai o que mudou:
// o servidor mescla, então bolo, vagas, próxima ação e alteração pendente ficam como estavam.
import * as M from './model.js';
import { $, api, app, closeSheet, esc, findOrder, openSheet, reload, showError, toast } from './ui.js';

let refresh = async () => {};
export const setRefresh = (fn) => { refresh = fn; };
const OVERRIDE_REASON = 'Anotado mesmo assim pela confeiteira.';

export function openForm(id = null) {
  const order = id ? findOrder(id) : null;
  const showQuote = !order || M.group(order.status) === 'decide';
  const value = order ? M.totalCents(order) : null;
  const delivery = order?.mode === 'Entrega';
  openSheet(`<form id="order-form" novalidate${order ? ` data-id="${esc(order.id)}"` : ''}>
    <h2 id="sheet-title" tabindex="-1">${order ? 'Editar pedido' : 'Novo pedido'}</h2>
    <label class="field"><span>Quem pediu?</span><input name="client" autocomplete="off" maxlength="120" value="${esc(order?.client)}" aria-describedby="form-error"></label>
    <label class="field"><span>O quê?</span><input name="product" autocomplete="off" maxlength="300" value="${esc(order?.product)}" placeholder="Ex.: bolo de cenoura"></label>
    <fieldset class="field"><legend>Quando?</legend>
      <div class="quick"><button class="chip" type="button" data-act="quick" data-days="0">Hoje</button><button class="chip" type="button" data-act="quick" data-days="1">Amanhã</button></div>
      <div class="when-fields"><label class="field"><span>Dia</span><input type="date" name="date" value="${esc(M.orderDay(order))}"></label>
      <label class="field"><span>Hora</span><input type="time" name="time" value="${esc(String(order?.dueAt || '').slice(11, 16))}"></label></div></fieldset>
    <label class="field"><span>Valor <small>(opcional)</small></span><input name="total" inputmode="decimal" autocomplete="off" placeholder="Ex.: 120" value="${value ? esc(M.centsInput(value)) : ''}"></label>
    <label class="field"><span>Anotações</span><textarea name="details" rows="3" maxlength="2000" placeholder="Sabor, tamanho, decoração, o que combinaram">${esc(order?.details)}</textarea></label>
    <label class="field"><span>WhatsApp da cliente <small>(opcional)</small></span><input name="contact" type="tel" inputmode="tel" autocomplete="off" maxlength="120" value="${esc(order?.contact)}"></label>
    <fieldset class="field"><legend>Retirada ou entrega</legend><div class="seg">
      <label><input type="radio" name="mode" value="Retirada"${delivery ? '' : ' checked'}><span>Retirada</span></label>
      <label><input type="radio" name="mode" value="Entrega"${delivery ? ' checked' : ''}><span>Entrega</span></label></div></fieldset>
    <label class="field" id="location-field"${delivery ? '' : ' hidden'}><span>Endereço da entrega</span><input name="location" autocomplete="off" maxlength="400" value="${esc(order?.location)}"></label>
    ${showQuote ? `<label class="check"><input type="checkbox" name="quote"${order && M.group(order.status) === 'decide' ? ' checked' : ''}><span>Ainda é orçamento</span></label>` : ''}
    <p class="form-error" id="form-error" role="alert" hidden></p>
    <div class="conflict" id="form-conflict" hidden><button class="btn btn-outline" type="button" data-act="force-save">Salvar mesmo assim</button></div>
    <button class="btn btn-primary" type="submit">Salvar pedido</button></form>`);
  if (!order) $('#order-form [name=client]').focus();
}

export function quickDay(days) {
  $('#order-form [name=date]').value = M.addDays(app.today, Number(days));
  $('#order-form [name=time]').focus();
}
export function syncMode(form) {
  $('#location-field').hidden = form.elements.mode.value !== 'Entrega';
}

function readForm(form) {
  const read = (name) => String(form.elements[name]?.value || '').trim();
  const order = form.dataset.id ? findOrder(form.dataset.id) : null;
  const client = read('client'), product = read('product'), date = read('date'), time = read('time');
  if (!client) throw Object.assign(new Error('Escreva quem pediu.'), { field: 'client' });
  if (!product) throw Object.assign(new Error('Escreva o que ela pediu.'), { field: 'product' });
  if (date && !time) throw Object.assign(new Error('Escolha também a hora.'), { field: 'time' });
  if (time && !date) throw Object.assign(new Error('Escolha também o dia.'), { field: 'date' });
  const cents = M.parseMoney(read('total'));
  if (Number.isNaN(cents)) throw Object.assign(new Error('Escreva o valor como 120 ou 120,50.'), { field: 'total' });
  const quote = form.elements.quote?.checked;
  // Sem a caixinha, nasce Confirmado. O status vai sempre: sem ele o servidor grava Orçamento.
  let status = order && !form.elements.quote ? order.status : quote ? 'Orçamento' : 'Confirmado';
  if (quote && order && M.group(order.status) === 'decide') status = order.status;
  const dueAt = date && time ? `${date}T${time}` : '';
  if (!dueAt && !M.DECIDE.includes(status)) throw Object.assign(new Error('Escolha o dia e a hora. Se ainda não sabe, marque "Ainda é orçamento".'), { field: 'date' });
  const mode = form.elements.mode.value === 'Entrega' ? 'Entrega' : 'Retirada';
  return {
    order,
    body: {
      client, product, dueAt, details: read('details'), contact: read('contact'), mode,
      location: mode === 'Entrega' ? read('location') : order?.location || '',
      total: cents ? cents / 100 : 0, totalKnown: !!cents, status,
    },
  };
}

// Só os campos que mudaram. Valor: compara em centavos e se era conhecido.
function changedFields(order, body) {
  const changes = {};
  for (const key of ['client', 'product', 'dueAt', 'details', 'contact', 'mode', 'location', 'status']) {
    if (String(order[key] ?? '') !== String(body[key] ?? '')) changes[key] = body[key];
  }
  if ((M.totalCents(order) ?? 0) !== (body.totalKnown ? Math.round(body.total * 100) : 0)) Object.assign(changes, { total: body.total, totalKnown: body.totalKnown });
  return changes;
}

export async function submitForm(form, force = false) {
  showError('#form-error', '');
  let read;
  try { read = readForm(form); } catch (error) {
    showError('#form-error', error.message);
    form.elements[error.field]?.focus();
    return;
  }
  const { order, body } = read;
  const payload = order ? changedFields(order, body) : body;
  if (order && !Object.keys(payload).length) { closeSheet(); toast('Nada mudou.'); return; }
  if (force) payload.capacityOverride = { allowed: true, reason: OVERRIDE_REASON };
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try {
    const saved = await api(order ? `/orders/${encodeURIComponent(order.id)}` : '/orders', { method: order ? 'PUT' : 'POST', body: payload });
    await reload();
    closeSheet();
    const result = findOrder(saved?.id || order?.id), day = M.orderDay(result);
    await refresh(null, M.group(result.status) === 'decide' ? null : day);
    const name = result.client.split(/\s+/)[0];
    toast(order ? 'Pedido salvo.' : M.group(result.status) === 'decide' ? `Orçamento de ${name} anotado. Ele fica no aviso de decidir.` : `Pedido de ${name} anotado: ${M.dayLabel(day, app.today).toLocaleLowerCase('pt-BR')}, ${M.hourLabel(result)}.`);
  } catch (error) {
    showError('#form-error', error.message);
    $('#form-conflict').hidden = !error.capacity;
    if (error.capacity) $('#form-error').scrollIntoView({ block: 'center' });
  } finally { button.disabled = false; }
}
