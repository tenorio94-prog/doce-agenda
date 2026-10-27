// Regras da tela nova (public/nova/model.js): grupos de situação, centavos, dias em São Paulo e dia cheio.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.js';
import { createEmptyState } from '../../cloud/state-engine.js';

test('as 9 situações viram 3 grupos; cancelado e recusado ficam fora', () => {
  const groups = ['Solicitação', 'Orçamento', 'Aguardando confirmação', 'Confirmado', 'Em produção', 'Pronto', 'Entregue', 'Cancelado', 'Recusado'].map(M.group);
  assert.deepEqual(groups, ['decide', 'decide', 'decide', 'confirmed', 'confirmed', 'confirmed', 'delivered', 'out', 'out']);
});

test('dinheiro em centavos: só Conferido entra no recebido', () => {
  const state = { payments: [
    { orderId: 'a', amount: 50, status: 'Conferido' }, { orderId: 'a', amount: 0.1, status: 'Conferido' },
    { orderId: 'a', amount: 60, status: 'Informado' }, { orderId: 'b', amount: 99, status: 'Conferido' },
  ] };
  const order = { id: 'a', total: 120.2, totalKnown: true };
  assert.deepEqual(M.balance(state, order), { total: 12020, received: 5010, due: 7010 });
  assert.deepEqual(M.moneyTag(state, order), { kind: 'due', text: 'Falta R$ 70,10' });
  assert.equal(M.moneyTag(state, { id: 'b', total: 99 }).text, 'Pago');
  assert.equal(M.moneyTag(state, { id: 'c', total: 0, totalKnown: false }).text, 'Valor a combinar');
  assert.equal(M.moneyTag(state, { id: 'c', total: 0 }).text, 'Valor a combinar');
  assert.equal(M.reportedPayments(state, order).length, 1);
});

test('valores digitados e escritos', () => {
  assert.equal(M.parseMoney('120'), 12000);
  assert.equal(M.parseMoney('120,5'), 12050);
  assert.equal(M.parseMoney('R$ 1.234,56'), 123456);
  assert.equal(M.parseMoney('1.234'), 123400);
  assert.equal(M.parseMoney('10.5'), 1050);
  assert.equal(M.parseMoney(''), null);
  assert.ok(Number.isNaN(M.parseMoney('dez')));
  assert.equal(M.brl(123456), 'R$ 1.234,56');
  assert.equal(M.brl(9000), 'R$ 90');
  assert.equal(M.centsInput(5050), '50,50');
});

test('hoje e a semana no fuso de São Paulo, de segunda a domingo', () => {
  assert.equal(M.todayKey(new Date('2026-10-28T02:30:00Z')), '2026-10-27', '23h30 em São Paulo ainda é dia 27');
  assert.equal(M.weekStart('2026-11-01'), '2026-10-26');
  assert.equal(M.weekStart('2026-10-26'), '2026-10-26');
  assert.equal(M.dayLabel('2026-10-27', '2026-10-27'), 'Hoje');
  assert.equal(M.dayLabel('2026-10-28', '2026-10-27'), 'Amanhã');
  assert.equal(M.dayLabel('2026-10-29', '2026-10-27'), 'Quinta, 29/10');
  assert.equal(M.shortDayLabel('2026-11-01'), 'dom 1/11');
  assert.equal(M.addMonths('2026-01', -1), '2025-12');
  assert.equal(M.hourLabel({ dueAt: '2026-10-27T15:30' }), '15h30');
});

test('dia cheio pela regra do servidor (soma o tamanho) e dia fechado', () => {
  const state = createEmptyState();
  state.availability.dailyOrderLimit = 3;
  state.availability.closedWeekdays = [0];
  state.orders = [
    { id: '1', status: 'Confirmado', dueAt: '2026-10-28T10:00', product: 'Bolo', slots: 2 },
    { id: '2', status: 'Solicitação', dueAt: '2026-10-28T11:00', product: 'Bolo' },
  ];
  assert.equal(M.dayMark(state, '2026-10-28'), '', 'pedido do link sem resposta não ocupa');
  state.orders.push({ id: '3', status: 'Pronto', dueAt: '2026-10-28T12:00', product: 'Pudim' });
  assert.equal(M.dayMark(state, '2026-10-28'), 'cheio');
  assert.equal(M.dayMark(state, '2026-11-01'), 'fechado');
  state.availability.dateOverrides['2026-11-01'] = { closed: false, limit: null };
  assert.equal(M.dayMark(state, '2026-11-01'), '');
});

test('lista do dia: confirmados pela hora e entregues no fim; avisos de decidir e de atraso', () => {
  const state = { payments: [], orders: [
    { id: 'e', status: 'Entregue', dueAt: '2026-10-27T08:00' }, { id: 'b', status: 'Pronto', dueAt: '2026-10-27T15:00' },
    { id: 'a', status: 'Confirmado', dueAt: '2026-10-27T10:00' }, { id: 'x', status: 'Cancelado', dueAt: '2026-10-27T09:00' },
    { id: 'q', status: 'Orçamento', dueAt: '' }, { id: 'l', status: 'Em produção', dueAt: '2026-10-25T10:00' },
  ] };
  assert.deepEqual(M.dayOrders(state, '2026-10-27').map((o) => o.id), ['a', 'b', 'e']);
  assert.deepEqual(M.decideOrders(state).map((o) => o.id), ['q']);
  assert.deepEqual(M.lateOrders(state, '2026-10-27').map((o) => o.id), ['l']);
});

test('mensagens prontas e palavras que a tela não usa', () => {
  const order = { client: 'Camila Souza', product: 'Bolo de aniversário', dueAt: '2026-11-01T11:00', origin: 'link' };
  assert.equal(M.decideSummary(order, '2026-10-27'), 'Camila pediu pelo link: bolo de aniversário, dom 1/11');
  assert.match(M.refuseMessage(order, '2026-10-27'), /^Oi, Camila! .*bolo de aniversário para domingo, 1\/11\./);
  assert.match(M.chargeMessage(order, 9000, '2026-10-31'), /falta R\$ 90/);
  assert.equal(M.whatsappLink('(11) 90000-0101', 'oi'), 'https://wa.me/5511900000101?text=oi');
  assert.equal(M.friendlyError('Este pedido ocupa 2 vagas.', 'outra'), 'outra');
  assert.equal(M.friendlyError('Esta data está marcada como fechada.'), 'Esta data está marcada como fechada.');
});

test('Dinheiro: quem já levou e deve (qualquer mês) separado do que vai entrar; pedido sem valor fica fora', () => {
  const state = { payments: [{ orderId: 'r', amount: 55, status: 'Conferido' }, { orderId: 'j', amount: 60, status: 'Informado' }], orders: [
    { id: 'r', status: 'Entregue', dueAt: '2026-10-26T17:00', total: 110 }, { id: 'old', status: 'Entregue', dueAt: '2026-08-02T10:00', total: 40 },
    { id: 'paid', status: 'Entregue', dueAt: '2026-10-20T10:00', total: 30, totalKnown: true }, { id: 'j', status: 'Confirmado', dueAt: '2026-10-27T18:00', total: 120 },
    { id: 'p', status: 'Pronto', dueAt: '2026-10-27T10:00', total: 90 }, { id: 'open', status: 'Confirmado', dueAt: '2026-10-28T10:00', total: 0, totalKnown: false },
    { id: 'x', status: 'Cancelado', dueAt: '2026-10-28T10:00', total: 99 },
  ] };
  state.payments.push({ orderId: 'paid', amount: 30, status: 'Conferido' });
  assert.deepEqual(M.owedOrders(state).map((o) => o.id), ['old', 'r']);
  assert.deepEqual(M.comingOrders(state).map((o) => o.id), ['p', 'j']);
  assert.equal(M.sumDue(state, M.owedOrders(state)), 9500);
  assert.equal(M.sumDue(state, M.comingOrders(state)), 21000, 'o Pix só avisado não desconta');
});

test('Meu link e resposta ao pedido do link', () => {
  assert.equal(M.slugFrom('Doçuras da Rô!'), 'docuras-da-ro');
  assert.equal(M.slugFrom('  -- Ána  Bolo -- '), 'ana-bolo');
  assert.equal(M.replyMessage({ client: 'Camila Souza', product: 'Bolo de aniversário', dueAt: '2026-11-01T11:00' }, '2026-10-27'), 'Oi, Camila! Vi seu pedido do bolo de aniversário para domingo, 1/11.');
  assert.equal(M.replyMessage({ client: 'Bia', product: 'Pudim', dueAt: '' }, '2026-10-27'), 'Oi, Bia! Vi seu pedido do pudim.');
});
