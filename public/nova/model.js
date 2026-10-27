// Regras da tela nova, só de leitura: nada aqui grava. Dinheiro em centavos inteiros; dias no fuso de São Paulo.
// A lotação do dia vem de cloud/state-engine.js, a mesma regra do servidor.
import { checkCapacity } from '../../cloud/state-engine.js';

export const TIME_ZONE = 'America/Sao_Paulo';
// As 9 situações gravadas continuam; a tela mostra só três grupos. Cancelado e Recusado ficam fora da agenda.
export const DECIDE = ['Solicitação', 'Orçamento', 'Aguardando confirmação'];
export const CONFIRMED = ['Confirmado', 'Em produção', 'Pronto'];
export const CAPACITY_CODES = ['DATE_CLOSED', 'DAILY_LIMIT', 'NOTICE', 'PRODUCT_LIMIT'];
export const group = (status) => DECIDE.includes(status) ? 'decide' : CONFIRMED.includes(status) ? 'confirmed' : status === 'Entregue' ? 'delivered' : 'out';
export const GROUP_LABEL = { decide: 'Para decidir', confirmed: 'Confirmado', delivered: 'Entregue' };

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const todayKey = (now = new Date()) => dayFormatter.format(now);
export function addDays(day, count) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
export const weekStart = (day) => addDays(day, -((weekday(day) + 6) % 7));
export const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
export function addMonths(month, count) {
  const [year, value] = month.split('-').map(Number), index = year * 12 + value - 1 + count;
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
}

// dueAt legado sem fuso é horário de parede de São Paulo: o dia é o próprio texto.
export const orderDay = (order) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(order?.dueAt || '') ? order.dueAt.slice(0, 10) : '';
export function hourLabel(order) {
  const time = String(order?.dueAt || '').slice(11, 16);
  if (!/^\d{2}:\d{2}$/.test(time)) return '';
  const [hour, minute] = time.split(':');
  return minute === '00' ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}
export const shortDate = (day) => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
export const weekdayName = (day) => WEEKDAYS[weekday(day)];
export const weekdayShort = (day) => SHORT[weekday(day)];
export function dayLabel(day, today) {
  const diff = daysBetween(today, day);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return `${WEEKDAYS[weekday(day)]}, ${shortDate(day)}`;
}
// "Hoje, ter 27/10" na ficha: o dia da semana ajuda quem lê "amanhã" à noite.
export function fullDayLabel(day, today) {
  const label = dayLabel(day, today);
  return ['Hoje', 'Amanhã', 'Ontem'].includes(label) ? `${label}, ${SHORT[weekday(day)]} ${shortDate(day)}` : label;
}
export const shortDayLabel = (day) => `${SHORT[weekday(day)]} ${shortDate(day)}`;
export const longDate = (day) => `${WEEKDAYS[weekday(day)]}, ${Number(day.slice(8, 10))} de ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
export const monthLabel = (month) => `${MONTHS[Number(month.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase())} de ${month.slice(0, 4)}`;

// Dinheiro: campos legados em reais viram centavos aqui, na fronteira.
export const toCents = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0);
export function totalCents(order) {
  if (order.totalKnown === false) return null;
  const cents = toCents(order.total);
  return cents > 0 ? cents : null;
}
const paymentsOf = (state, order) => (state.payments || []).filter((payment) => payment.orderId === order.id);
// Só Conferido é dinheiro recebido. Informado é só um aviso da cliente.
export const receivedCents = (state, order) => paymentsOf(state, order).filter((p) => p.status === 'Conferido').reduce((sum, p) => sum + toCents(p.amount), 0);
export const reportedPayments = (state, order) => paymentsOf(state, order).filter((p) => p.status === 'Informado');
export function balance(state, order) {
  const total = totalCents(order), received = receivedCents(state, order);
  return { total, received, due: total === null ? null : Math.max(0, total - received) };
}
export function moneyTag(state, order) {
  const { due } = balance(state, order);
  if (due === null) return { kind: 'open', text: 'Valor a combinar' };
  return due === 0 ? { kind: 'paid', text: 'Pago' } : { kind: 'due', text: `Falta ${brl(due)}` };
}
export function brl(cents) {
  const whole = Math.floor(cents / 100), rest = cents % 100;
  return `R$ ${whole.toLocaleString('pt-BR')}${rest ? `,${String(rest).padStart(2, '0')}` : ''}`;
}
// "120", "120,50", "1.234,56", "R$ 60" → centavos; vazio → null; o que não for número → NaN.
export function parseMoney(text) {
  let value = String(text ?? '').replace(/R\$/i, '').replace(/\s/g, '');
  if (!value) return null;
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
  return Math.round(Number(value) * 100);
}
// Endereço do link a partir do nome: sem acento, minúsculas e hífens (igual ao app.js).
export const slugFrom = (text) => String(text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
export const centsInput = (cents) => (cents % 100 ? (cents / 100).toFixed(2).replace('.', ',') : String(cents / 100));

// Dia fechado ou cheio. "Cheio" é a regra do servidor: não cabe mais um pedido de tamanho 1.
export function dayMark(state, day) {
  const availability = state.availability || {}, override = availability.dateOverrides?.[day];
  if (override ? override.closed : (availability.closedWeekdays || []).includes(weekday(day))) return 'fechado';
  try {
    checkCapacity({ status: 'Confirmado', dueAt: `${day}T12:00`, product: '' }, state, null, null, 'limit');
    return '';
  } catch (error) {
    return error.code === 'DAILY_LIMIT' ? 'cheio' : '';
  }
}

const byTime = (a, b) => String(a.dueAt).localeCompare(String(b.dueAt));
// Pedidos do dia: confirmados pela hora e, no fim, os entregues (riscados, não somem).
export function dayOrders(state, day) {
  const orders = (state.orders || []).filter((order) => orderDay(order) === day);
  return [
    ...orders.filter((order) => group(order.status) === 'confirmed').sort(byTime),
    ...orders.filter((order) => group(order.status) === 'delivered').sort(byTime),
  ];
}
export const decideOrders = (state) => (state.orders || []).filter((order) => group(order.status) === 'decide')
  .sort((a, b) => (orderDay(a) || '9999').localeCompare(orderDay(b) || '9999') || byTime(a, b));
export const lateOrders = (state, today) => (state.orders || []).filter((order) => group(order.status) === 'confirmed' && orderDay(order) && orderDay(order) < today).sort(byTime);
// Dinheiro: quem já levou e ainda deve (de qualquer mês, os mais antigos primeiro) separado do que ainda vai entrar
// (confirmados não entregues com saldo, por data). Pedido sem valor não entra em nenhuma das duas.
const withBalance = (state, kind) => (state.orders || []).filter((order) => group(order.status) === kind && balance(state, order).due > 0).sort(byTime);
export const owedOrders = (state) => withBalance(state, 'delivered');
export const comingOrders = (state) => withBalance(state, 'confirmed');
export const sumDue = (state, orders) => orders.reduce((total, order) => total + balance(state, order).due, 0);

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const lowerFirst = (text) => String(text || '').trim().replace(/^./, (c) => c.toLocaleLowerCase('pt-BR'));
const whenText = (order, today) => {
  const day = orderDay(order);
  if (!day) return '';
  const label = dayLabel(day, today);
  return label === 'Hoje' ? 'hoje' : label === 'Amanhã' ? 'amanhã' : `${label.split(',')[0].toLocaleLowerCase('pt-BR')}, ${shortDate(day)}`;
};
export function decideSummary(order, today) {
  const day = orderDay(order), when = day ? `, ${shortDayLabel(day)}` : '';
  return order.origin === 'link'
    ? `${firstName(order.client)} pediu pelo link: ${lowerFirst(order.product)}${when}`
    : `${firstName(order.client)} espera sua resposta: ${lowerFirst(order.product)}${when}`;
}
export function chargeMessage(order, dueCents, today) {
  const when = whenText(order, today);
  return `Oi, ${firstName(order.client)}! Tudo bem? Passando para lembrar do ${lowerFirst(order.product)}${when ? ` (${when})` : ''}: falta ${brl(dueCents)}. Qualquer dúvida, é só me chamar. Obrigada!`;
}
// Pedido do link com dúvida ("pode ser de ninho?"): responder sem decidir ainda.
export function replyMessage(order, today) {
  const when = whenText(order, today);
  return `Oi, ${firstName(order.client)}! Vi seu pedido do ${lowerFirst(order.product)}${when ? ` para ${when}` : ''}.`;
}
export function refuseMessage(order, today) {
  const when = whenText(order, today);
  return `Oi, ${firstName(order.client)}! Obrigada por lembrar de mim. Infelizmente não vou conseguir fazer o ${lowerFirst(order.product)}${when ? ` para ${when}` : ''}. Espero poder te atender numa próxima!`;
}
export function whatsappLink(contact, text) {
  let digits = String(contact || '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : '';
}

// Mensagens do servidor aparecem como vieram, menos as que usam palavras que esta tela não usa.
const OLD_WORDS = /vaga|solicita|informad|etapa|carimbo|fazendo|em produção|aguardando confirmação/i;
export function friendlyError(message, fallback = 'Não deu para salvar. Tente de novo.') {
  return message && !OLD_WORDS.test(message) ? message : fallback;
}
