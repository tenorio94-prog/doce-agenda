// Ajustes de confiança no Menu da tela nova: Datas especiais, Detalhes do bolo e Cópia de segurança.
// Usa somente as rotas existentes (/api/availability, /api/order-template, /api/export e /api/import).
import { specialLimitFor } from '../../cloud/state-engine.js';
import { openMenu } from './menu.js';
import * as M from './model.js';
import { $, api, app, closeSheet, esc, openSheet, reload, showError, toast } from './ui.js';

let refresh = async () => {};
export const setRefresh = (fn) => { refresh = fn; };

const SPECIAL_PLACEHOLDERS = ['Ex.: Ovo de colher', 'Ex.: Ovo trufado', 'Ex.: Cesta de Páscoa'];
function specialRowHtml(index) {
  return `<div class="pi-two special-row">
    <label class="field"><span>Doce${index ? ' <small>(opcional)</small>' : ''}</span><input name="product" list="special-products" maxlength="80" placeholder="${SPECIAL_PLACEHOLDERS[index] || 'Ex.: Panetone recheado'}"></label>
    <label class="field"><span>Limite</span><input name="max" type="number" min="1" max="500" inputmode="numeric" placeholder="Ex.: 40"></label>
  </div>`;
}

export async function openSpecialDates() {
  let availability;
  try { availability = await api('/availability'); } catch (error) { toast(error.message); return; }
  app.state.availability = availability;
  const list = availability.specialDates || [];
  const products = [...new Set((app.state?.orderPage?.products || []).map((product) => product.name).filter(Boolean))];
  const items = list.map((period) => {
    const limits = (period.limits || []).map((limit) => {
      const used = specialLimitFor(app.state, limit.product, period.from)?.used || 0;
      return `<small class="special-use${used >= limit.max ? ' is-full' : ''}">${esc(limit.product)}: ${used} de ${limit.max} combinados</small>`;
    }).join('');
    return `<li class="special-item"><div class="special-info"><strong>${esc(period.name)}</strong><small>${esc(M.shortDate(period.from))} a ${esc(M.shortDate(period.to))}</small><div class="special-tags">${limits}</div></div>
      <button class="link-btn pi-remove" type="button" data-act="remove-special" data-id="${esc(period.id)}">Remover</button></li>`;
  }).join('');
  const formHtml = list.length >= 10
    ? '<p class="muted">Você já tem 10 datas especiais. Remova uma antiga para criar outra.</p>'
    : `<details class="more-fields special-new"${list.length ? '' : ' open'}>
      <summary><span>Nova data especial<small>Páscoa, Dia das Mães, Natal (até 10 períodos)</small></span></summary>
      <form id="special-date-form" class="more-fields-body" novalidate>
        <label class="field"><span>Nome</span><input name="name" maxlength="40" placeholder="Ex.: Páscoa"></label>
        <div class="pi-two special-dates"><label class="field"><span>De</span><input name="from" type="date"></label><label class="field"><span>Até</span><input name="to" type="date"></label></div>
        <div class="special-limits" id="special-limits-list">${[0, 1, 2].map(specialRowHtml).join('')}</div>
        <button class="btn btn-outline btn-small add-product" type="button" data-act="add-special-row">+ Outro doce</button>
        <datalist id="special-products">${products.map((name) => `<option value="${esc(name)}"></option>`).join('')}</datalist>
        <p class="form-error" id="special-date-error" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">Salvar data especial</button>
      </form>
    </details>`;
  openSheet(`<h2 id="sheet-title" tabindex="-1">Datas especiais</h2>
    <p class="muted">Defina um período com limite de pedidos combinados por doce. Quando atingir o limite, o link deixa de oferecer esse doce nessas datas.</p>
    ${list.length ? `<ul class="special-list" id="special-list">${items}</ul>` : ''}
    ${formHtml}`, openMenu);
}

export function addSpecialRow() {
  const list = $('#special-limits-list');
  if (!list) return;
  if (list.children.length >= 10) { toast('Cada data especial aceita até 10 doces.'); return; }
  list.insertAdjacentHTML('beforeend', specialRowHtml(list.children.length));
  list.lastElementChild.querySelector('[name=product]')?.focus();
}

export async function submitSpecialDate(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const from = String(data.get('from') || '').trim();
  const to = String(data.get('to') || '').trim();
  const products = data.getAll('product').map((value) => String(value || '').trim());
  const maxes = data.getAll('max').map((value) => String(value || '').trim());
  const limits = products.map((product, i) => ({ product, max: Number(maxes[i]) })).filter((item) => item.product);
  if (!name) { showError('#special-date-error', 'Dê um nome para a data especial, como Páscoa.'); return false; }
  if (!from || !to || from > to) { showError('#special-date-error', 'Confira o começo e o fim do período.'); return false; }
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 92) { showError('#special-date-error', 'Use um período de até 3 meses (92 dias).'); return false; }
  if (!limits.length) { showError('#special-date-error', 'Escolha pelo menos um doce com limite.'); return false; }
  if (limits.some((item) => !Number.isInteger(item.max) || item.max < 1 || item.max > 500)) {
    showError('#special-date-error', 'Cada doce precisa de um limite de 1 a 500 pedidos.');
    return false;
  }
  const seen = new Set(limits.map((item) => item.product.toLocaleLowerCase('pt-BR')));
  if (seen.size !== limits.length) { showError('#special-date-error', 'Não repita o mesmo doce na mesma data especial.'); return false; }
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try {
    const current = await api('/availability');
    const next = [...(current.specialDates || []), { id: `esp-${Date.now().toString(36)}`, name, from, to, limits }];
    await api('/availability', { method: 'PUT', body: { ...current, specialDates: next } });
    await reload();
    await refresh();
    await openSpecialDates();
    toast(`${name} salva.`);
    return true;
  } catch (error) {
    showError('#special-date-error', error.message);
    button.disabled = false;
    return false;
  }
}

export async function removeSpecialDate(id) {
  try {
    const current = await api('/availability');
    const list = current.specialDates || [];
    const removed = list.find((period) => period.id === id);
    if (!removed) return;
    await api('/availability', { method: 'PUT', body: { ...current, specialDates: list.filter((period) => period.id !== id) } });
    await reload();
    await refresh();
    await openSpecialDates();
    toast(`${removed.name} removida.`, async () => {
      try {
        const latest = await api('/availability');
        await api('/availability', { method: 'PUT', body: { ...latest, specialDates: [...(latest.specialDates || []), removed] } });
        await reload();
        await refresh();
        if ($('#special-list') || $('#special-date-form')) await openSpecialDates();
        toast(`${removed.name} restaurada.`);
      } catch (error) { toast(error.message); }
    });
  } catch (error) { toast(error.message); }
}

// ---- Detalhes do bolo (/api/order-template) ----
function templateMeta(field) {
  const status = !field.enabled ? 'Oculto' : field.required ? 'Obrigatório ao confirmar' : 'Opcional';
  const count = (field.options || []).length;
  const opts = count ? `${count} ${count === 1 ? 'opção' : 'opções'}` : 'Resposta livre';
  return `${status} · ${opts}`;
}

export async function openCakeTemplate() {
  let template;
  try { template = await api('/order-template'); } catch (error) { toast(error.message); return; }
  app.state.orderTemplate = template;
  const cards = (template.fields || []).map((field, index) => `<details class="product-item template-field" data-key="${esc(field.key)}"${index === 0 ? ' open' : ''}>
    <summary><span class="pi-thumb" aria-hidden="true">${index + 1}</span><span class="pi-text"><b>${esc(field.label)}</b><small>${esc(templateMeta(field))}</small></span></summary>
    <div class="pi-body">
      <label class="check"><input type="checkbox" name="enabled" value="${esc(field.key)}"${field.enabled ? ' checked' : ''}><span>Mostrar este campo</span></label>
      <label class="check"><input type="checkbox" name="required" value="${esc(field.key)}"${field.required ? ' checked' : ''}${field.enabled ? '' : ' disabled'}><span>Exigir ao confirmar</span></label>
      <label class="field"><span>Nome do campo</span><input name="label.${esc(field.key)}" maxlength="80" required value="${esc(field.label)}"></label>
      <label class="field"><span>Opções <small>(uma por linha; vazio = resposta livre)</small></span><textarea name="options.${esc(field.key)}" rows="2" maxlength="1000" placeholder="Deixe vazio para a cliente escrever livremente">${esc((field.options || []).join('\n'))}</textarea></label>
    </div>
  </details>`).join('');
  openSheet(`<form id="cake-template-form" novalidate>
    <h2 id="sheet-title" tabindex="-1">Detalhes do bolo</h2>
    <p class="muted">Os campos que aparecem quando a cliente pede um bolo pelo seu link. Campos obrigatórios são pedidos na hora de confirmar.</p>
    <div class="product-list" id="cake-template-list">${cards}</div>
    <p class="form-error" id="cake-template-error" role="alert" hidden></p>
    <button class="btn btn-primary" type="submit">Salvar detalhes do bolo</button>
  </form>`, openMenu);
}

export function onCakeTemplateChange(event) {
  const row = event.target.closest('.template-field');
  if (!row) return;
  const key = row.dataset.key;
  const enabledInput = row.querySelector('[name=enabled]');
  const requiredInput = row.querySelector('[name=required]');
  if (event.target === enabledInput && requiredInput) {
    requiredInput.disabled = !enabledInput.checked;
    if (!enabledInput.checked) requiredInput.checked = false;
  }
  const label = row.querySelector(`[name="label.${key}"]`)?.value.trim() || 'Campo';
  const options = String(row.querySelector(`[name="options.${key}"]`)?.value || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  row.querySelector('.pi-text b').textContent = label;
  row.querySelector('.pi-text small').textContent = templateMeta({
    enabled: !!enabledInput?.checked,
    required: !!(enabledInput?.checked && requiredInput?.checked),
    options: [...new Set(options)],
  });
}

export async function submitCakeTemplate(form) {
  const current = app.state.orderTemplate || { version: 1, fields: [] };
  const enabledSet = new Set([...form.querySelectorAll('[name=enabled]:checked')].map((el) => el.value));
  const requiredSet = new Set([...form.querySelectorAll('[name=required]:checked')].map((el) => el.value));
  const fields = current.fields.map((field) => {
    const label = String(form.elements.namedItem(`label.${field.key}`)?.value || '').trim();
    const options = [...new Set(String(form.elements.namedItem(`options.${field.key}`)?.value || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean))];
    return {
      key: field.key,
      label,
      enabled: enabledSet.has(field.key),
      required: enabledSet.has(field.key) && requiredSet.has(field.key),
      options,
    };
  });
  if (fields.some((f) => !f.label || f.label.length > 80 || f.options.length > 20 || f.options.some((o) => o.length > 80))) {
    showError('#cake-template-error', 'Revise os nomes e as opções: até 20 opções com 80 caracteres cada.');
    return;
  }
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try {
    await api('/order-template', { method: 'PUT', body: { version: current.version || 1, fields } });
    await reload();
    openMenu();
    toast('Detalhes do bolo salvos.');
  } catch (error) {
    showError('#cake-template-error', error.message);
    button.disabled = false;
  }
}

// ---- Cópia de segurança (/api/export e /api/import) ----
let restoreData = null;

export function openBackup() {
  restoreData = null;
  openSheet(`<h2 id="sheet-title" tabindex="-1">Cópia de segurança</h2>
    <section class="f-block" aria-labelledby="backup-export-title">
      <h3 id="backup-export-title">Guardar uma cópia</h3>
      <p class="muted">Baixe um arquivo com seus pedidos, pagamentos, vitrine e ajustes para guardar no celular ou no computador.</p>
      <button class="btn btn-primary" type="button" data-act="export-backup">Baixar cópia de segurança</button>
    </section>
    <section class="f-block" aria-labelledby="backup-restore-title">
      <h3 id="backup-restore-title">Restaurar de um arquivo</h3>
      <p class="muted">Escolha uma cópia salva anteriormente para substituir os dados atuais ${app.demo ? 'deste exemplo' : 'da sua conta'}.</p>
      <label class="btn btn-outline upload-button">Escolher arquivo JSON<input id="restore-file" type="file" accept="application/json,.json"></label>
      <p class="muted" id="restore-preview" role="status">Nenhum arquivo escolhido.</p>
      <p class="form-error" id="restore-error" role="alert" hidden></p>
      <button class="btn btn-danger" id="restore-confirm" type="button" data-act="restore-confirm" disabled>Substituir dados</button>
    </section>`, openMenu);
}

export async function exportBackup(button) {
  if (button) button.disabled = true;
  try {
    const response = await window.DoceApi.fetch('/api/export', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Não foi possível baixar a cópia de segurança.');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fornada-backup-${app.today}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    toast('Cópia de segurança baixada.');
  } catch (error) {
    toast(error.message || 'Não foi possível gerar a cópia de segurança.');
  } finally {
    if (button) button.disabled = false;
  }
}

export async function inspectRestoreFile(file) {
  const preview = $('#restore-preview'), button = $('#restore-confirm');
  if (!preview || !button) return;
  button.disabled = true;
  restoreData = null;
  showError('#restore-error', '');
  if (!file) { preview.textContent = 'Nenhum arquivo escolhido.'; return; }
  if (file.size > 5 * 1024 * 1024) { preview.textContent = 'O arquivo excede o limite de 5 MB.'; return; }
  try {
    const backup = JSON.parse(await file.text());
    if (!backup || typeof backup !== 'object' || backup.version !== 1 || !Array.isArray(backup.orders) || !Array.isArray(backup.payments)) {
      throw new Error('Este arquivo não parece uma cópia do Fornada versão 1.');
    }
    if (backup.orders.length > 10000 || backup.payments.length > 50000) {
      throw new Error('O arquivo contém mais registros que o limite aceito.');
    }
    restoreData = backup;
    preview.textContent = `Arquivo reconhecido: ${backup.orders.length} ${backup.orders.length === 1 ? 'pedido' : 'pedidos'} e ${backup.payments.length} ${backup.payments.length === 1 ? 'pagamento' : 'pagamentos'}. Restaurar substituirá os dados atuais ${app.demo ? 'deste aparelho' : 'da sua conta'}.`;
    button.disabled = false;
  } catch (error) {
    preview.textContent = error.message || 'Não consegui ler esse arquivo JSON.';
  }
}

export async function restoreBackup(button) {
  if (!restoreData || !button) return;
  button.disabled = true;
  button.textContent = 'Restaurando…';
  showError('#restore-error', '');
  try {
    await api('/import', { method: 'POST', body: restoreData });
    await reload();
    closeSheet();
    await refresh();
    toast('Cópia restaurada. A cópia anterior foi preservada.');
  } catch (error) {
    showError('#restore-error', error.message || 'Não foi possível restaurar essa cópia.');
    button.disabled = false;
  } finally {
    button.textContent = 'Substituir dados';
  }
}
