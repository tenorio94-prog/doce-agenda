// Meu link e menu. A vitrine continua sendo montada na versão atual, com os mesmos dados.
import { $, api, app, closeSheet, copy, esc, openSheet, reload, showError, toast } from './ui.js';

const fullVersion = () => (app.demo ? '/demo/' : '/app/');
const DAYS = [[1, 'Segunda'], [2, 'Terça'], [3, 'Quarta'], [4, 'Quinta'], [5, 'Sexta'], [6, 'Sábado'], [0, 'Domingo']];

export function openLink() {
  const page = app.state.orderPage || {};
  if (page.active && page.slug) {
    const url = `${location.origin}/p/${page.slug}`;
    openSheet(`<h2 id="sheet-title" tabindex="-1">Meu link</h2><p>Mande este endereço para a cliente escolher o doce e a data.</p>
      <p class="link-url" id="link-url">${esc(url.replace(/^https?:\/\//, ''))}</p>
      <button class="btn btn-primary" type="button" data-act="copy-link">Copiar link</button>
      <a class="btn btn-outline" href="/p/${esc(page.slug)}" target="_blank" rel="noopener">Ver como a cliente vê</a>
      <p class="muted">Para mudar doces, fotos e textos, use a versão completa.</p>`);
    return;
  }
  openSheet(`<h2 id="sheet-title" tabindex="-1">Meu link</h2>
    <p>Com o link, a cliente escolhe o doce e a data sozinha, e o pedido chega aqui para você decidir.</p>
    <p class="muted">${app.demo ? 'No exemplo, o link não está ligado.' : 'Seu link ainda não está ligado.'} Ele se monta em Ajustes, na versão completa.</p>
    <a class="btn btn-primary" href="${fullVersion()}">Montar meu link</a>`);
}
export async function copyLink() {
  toast(await copy(`${location.origin}/p/${app.state.orderPage.slug}`) ? 'Link copiado.' : 'Não deu para copiar. Selecione o endereço e copie.');
}

export function openMenu() {
  openSheet(`<h2 id="sheet-title" tabindex="-1">Menu</h2><ul class="menu-list">
    <li><button class="menu-item" type="button" data-act="days">Dias e limite</button></li>
    <li><a class="menu-item" href="${fullVersion()}">Ver versão completa</a></li>
    ${app.demo ? '<li><button class="menu-item" type="button" data-act="reset">Recomeçar exemplo</button></li><li><a class="menu-item" href="/cadastro/">Criar conta grátis</a></li>'
      : '<li><button class="menu-item" type="button" data-act="sign-out">Sair</button></li>'}
  </ul>`);
}
export async function signOut(button) {
  button.disabled = true;
  if (!await window.DoceAccount?.signOut()) { button.disabled = false; toast('Não deu para sair. Tente de novo.'); }
}

// Dias em que ela não trabalha e quantos pedidos aceita por dia.
export async function openDays() {
  let availability;
  try { availability = await api('/availability'); } catch (error) { toast(error.message); return; }
  const closed = new Set(availability.closedWeekdays);
  openSheet(`<form id="days-form" novalidate><h2 id="sheet-title" tabindex="-1">Dias e limite</h2>
    <fieldset class="field"><legend>Dias em que não trabalho</legend><div class="day-checks">
      ${DAYS.map(([value, name]) => `<label class="check"><input type="checkbox" name="closed" value="${value}"${closed.has(value) ? ' checked' : ''}><span>${name}</span></label>`).join('')}</div></fieldset>
    <label class="field"><span>Quantos pedidos aceito por dia, no máximo?</span><input name="limit" type="number" inputmode="numeric" min="1" max="50" value="${availability.dailyOrderLimit ?? ''}" aria-describedby="days-help"></label>
    <p class="muted" id="days-help">Deixe vazio para não ter limite.</p>
    <p class="form-error" id="days-error" role="alert" hidden></p>
    <button class="btn btn-primary" type="submit">Salvar</button></form>`, openMenu);
}
export async function submitDays(form) {
  const raw = form.elements.limit.value.trim(), limit = raw ? Number(raw) : null;
  if (raw && (!Number.isInteger(limit) || limit < 1 || limit > 50)) return showError('#days-error', 'Use um número de 1 a 50, ou deixe vazio.');
  try {
    // A disponibilidade inteira, lida agora do servidor, só com a mudança: datas especiais e exceções ficam.
    const current = await api('/availability');
    const closedWeekdays = [...form.querySelectorAll('[name=closed]:checked')].map((input) => Number(input.value)).sort((a, b) => a - b);
    await api('/availability', { method: 'PUT', body: { ...current, closedWeekdays, dailyOrderLimit: limit } });
    await reload();
    closeSheet();
    toast('Dias e limite salvos.');
    return true;
  } catch (error) { showError('#days-error', error.message); }
}

export function openReset() {
  openSheet(`<h2 id="sheet-title" tabindex="-1">Recomeçar o exemplo?</h2><p>Os pedidos de exemplo voltam ao começo. O que você mudou aqui some, nesta tela e na versão completa.</p>
    <button class="btn btn-primary" type="button" data-act="reset-confirm">Recomeçar</button>`, openMenu);
}
export function resetDemo() {
  if (!window.DoceStore?.resetDemo) return;
  window.DoceStore.resetDemo();
  location.reload();
}
