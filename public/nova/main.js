// Versão nova das telas da confeiteira (Etapa 1, só a demonstração em /demo/nova/).
// Mesmo armazenamento e mesmas rotas /api da versão atual; nada aqui muda regras do servidor.
import * as M from './model.js';
import { renderAgenda, scrollToDay } from './agenda.js';
import * as Ficha from './ficha.js';
import * as Form from './form.js';
import { renderMoney } from './dinheiro.js';
import * as Menu from './menu.js';
import { $, app, closeSheet, hideToast, reload, sheetOpen } from './ui.js';

app.week = M.weekStart(app.today);
app.from = app.today;
app.month = app.today.slice(0, 7);

// Redesenha a tela à vista. `focusId` devolve o foco ao botão de entregue; `dayToShow` rola até o dia do pedido salvo.
async function refresh(focusId = null, dayToShow = null) {
  if (app.tab === 'agenda') {
    renderAgenda();
    if (dayToShow) scrollToDay(dayToShow);
    if (focusId) document.querySelector(`.order-done[data-id="${CSS.escape(focusId)}"]`)?.focus({ preventScroll: true });
  } else await renderMoney();
}
Ficha.setRefresh(refresh);
Form.setRefresh(refresh);

function setTab(tab) {
  app.tab = tab;
  $('#view-agenda').hidden = tab !== 'agenda';
  $('#view-dinheiro').hidden = tab !== 'dinheiro';
  for (const button of document.querySelectorAll('[data-tab]')) {
    if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
  refresh();
}

const actions = {
  open: (el) => Ficha.openFicha(el.dataset.id),
  list: (el) => Ficha.openList(el.dataset.list),
  client: (el) => Ficha.openClient(el.dataset.id),
  received: (el) => Ficha.openReceived(el.dataset.id),
  'received-money': (el) => Ficha.openReceived(el.dataset.id, true),
  seen: (el) => Ficha.markSeen(el.dataset.payment, el.dataset.id),
  charge: (el) => Ficha.openCharge(el.dataset.id),
  'copy-message': () => Ficha.copyMessage(),
  done: (el) => Ficha.toggleDone(el.dataset.id),
  deliver: (el) => Ficha.deliverFromFicha(el.dataset.id),
  accept: (el) => Ficha.openAccept(el.dataset.id),
  'change-date': () => { $('#when-fields').hidden = false; $('#accept-form [name=date]').focus(); },
  'accept-anyway': () => Ficha.submitAccept($('#accept-form'), true),
  refuse: (el) => Ficha.openRefuse(el.dataset.id),
  'refuse-message': (el) => Ficha.openRefuseMessage(el.dataset.id),
  confirm: (el) => Ficha.confirmQuote(el.dataset.id),
  'cancel-order': (el) => Ficha.openCancel(el.dataset.id),
  'cancel-confirm': (el) => Ficha.cancelOrder(el.dataset.id),
  edit: (el) => Form.openForm(el.dataset.id),
  new: () => Form.openForm(),
  quick: (el) => Form.quickDay(el.dataset.days),
  'force-save': () => Form.submitForm($('#order-form'), true),
  day: (el) => scrollToDay(el.dataset.day),
  week: (el) => { app.week = M.addDays(app.week, Number(el.dataset.step)); renderAgenda(); $(`[data-act="week"][data-step="${el.dataset.step}"]`)?.focus(); },
  month: (el) => { app.month = M.addMonths(app.month, Number(el.dataset.step)); renderMoney().then(() => $(`[data-act="month"][data-step="${el.dataset.step}"]:not([disabled])`)?.focus()); },
  link: () => Menu.openLink(),
  'copy-link': () => Menu.copyLink(),
  menu: () => Menu.openMenu(),
  days: () => Menu.openDays(),
  reset: () => Menu.openReset(),
  'reset-confirm': () => Menu.resetDemo(),
  close: () => closeSheet(),
  back: () => app.back?.(),
};

document.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) { closeSheet(); setTab(tab.dataset.tab); return; }
  const target = event.target.closest('[data-act]');
  if (target && actions[target.dataset.act]) { event.preventDefault(); actions[target.dataset.act](target, event); }
});
document.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'order-form') Form.submitForm(form);
  else if (form.id === 'pay-form') Ficha.submitReceived(form);
  else if (form.id === 'accept-form') Ficha.submitAccept(form);
  else if (form.id === 'refuse-form') Ficha.submitRefuse(form);
  else if (form.id === 'confirm-form') Ficha.confirmQuote(form.dataset.id, form.dataset.anyway === 'true');
  else if (form.id === 'days-form') { if (await Menu.submitDays(form)) refresh(); }
});
document.addEventListener('change', (event) => {
  if (event.target.name === 'mode' && event.target.form?.id === 'order-form') Form.syncMode(event.target.form);
});
// Fechar a janela tocando fora dela.
$('#sheet').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeSheet(); });
$('#sheet').addEventListener('close', () => { app.back = null; });

async function start() {
  $('#today-label').textContent = M.longDate(app.today);
  $('#demo-line').hidden = !app.demo;
  try {
    await reload();
    $('#load-state').hidden = true;
    $('#views').hidden = false;
    renderAgenda();
  } catch (error) {
    $('#load-state').textContent = `${error.message} Recarregue a página para tentar de novo.`;
  }
}
// Ao voltar para a aba, o "hoje" e os pedidos podem ter mudado (a versão completa usa o mesmo armazenamento).
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !app.state || sheetOpen()) return;
  app.today = M.todayKey();
  $('#today-label').textContent = M.longDate(app.today);
  try { await reload(); hideToast(); refresh(); } catch { /* fica o que está na tela */ }
});
start();
