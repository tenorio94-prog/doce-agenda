// Versão nova das telas da confeiteira (Etapa 1, só a demonstração em /demo/nova/).
// Mesmo armazenamento e mesmas rotas /api da versão atual; nada aqui muda regras do servidor.
import * as M from './model.js';
import { renderAgenda, scrollToDay } from './agenda.js';
import * as Ficha from './ficha.js';
import * as Form from './form.js';
import { renderMoney, updateMoneyBadge } from './dinheiro.js';
import * as Menu from './menu.js';
import * as Link from './link.js';
import { $, app, closeSheet, hideToast, reload, sheetOpen, toast } from './ui.js';

app.week = M.weekStart(app.today);
app.from = app.today;
app.month = app.today.slice(0, 7);

// Redesenha a tela à vista. `focusId` devolve o foco ao botão de entregue; `dayToShow` rola até o dia do pedido salvo.
async function refresh(focusId = null, dayToShow = null) {
  if (app.tab === 'agenda') {
    renderAgenda();
    updateMoneyBadge();
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
  'charge-money': (el) => Ficha.openCharge(el.dataset.id, true),
  reply: (el) => Ficha.openReply(el.dataset.id),
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
  month: (el) => { app.month = M.addMonths(app.month, Number(el.dataset.step)); renderMoney({ keep: true }).then(() => $(`[data-act="month"][data-step="${el.dataset.step}"]:not([disabled])`)?.focus()); },
  link: () => Link.openLink(),
  'copy-link': () => Link.copyLink(),
  'preview-link': () => Link.previewSaved(),
  menu: () => Menu.openMenu(),
  days: () => Menu.openDays(),
  reset: () => Menu.openReset(),
  'reset-confirm': () => Menu.resetDemo(),
  'sign-out': (el) => Menu.signOut(el),
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
  else if (form.id === 'link-wizard') Link.wizardNext(event.submitter?.value || 'next');
  else if (form.id === 'days-form') { if (await Menu.submitDays(form)) refresh(); }
});
document.addEventListener('input', (event) => { if (event.target.closest('#link-wizard')) Link.onWizardInput(event.target); });
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
    updateMoneyBadge();
  } catch (error) {
    $('#load-state').textContent = `${error.message} Recarregue a página para tentar de novo.`;
  }
}
// Agenda sempre em dia: ao voltar para a aba, a cada 2 minutos com a tela à vista e quando a conta avisa que
// outra sessão ou o link gravou (doce:stale). Com a janela aberta, só a tela de trás muda; o que ela digita fica.
const linkIds = () => new Set((app.state?.orders || []).filter((order) => order.origin === 'link' && order.status === 'Solicitação').map((order) => order.id));
let syncing = false;
async function sync() {
  if (!app.state || syncing) return;
  syncing = true;
  const before = linkIds();
  try {
    app.today = M.todayKey();
    $('#today-label').textContent = M.longDate(app.today);
    await reload();
    await refresh();
    const arrived = [...linkIds()].filter((id) => !before.has(id)).length;
    if (arrived) toast(arrived === 1 ? 'Chegou 1 pedido novo pelo link.' : `Chegaram ${arrived} pedidos novos pelo link.`);
  } catch { /* fica o que está na tela */ } finally { syncing = false; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !sheetOpen()) { hideToast(); sync(); } });
window.addEventListener('doce:stale', () => sync());
setInterval(() => { if (document.visibilityState === 'visible' && !sheetOpen()) sync(); }, 120_000);
start();
