import { clientKeyFor } from './clients.js';

const TIME_ZONE = 'America/Sao_Paulo';
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Existing dueAt values are wall-clock dates in São Paulo, not UTC timestamps.
export function saoPauloDay(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(value)) {
    const day = value.slice(0, 10);
    const check = new Date(`${day}T00:00:00Z`);
    return Number.isFinite(check.getTime()) && check.toISOString().slice(0, 10) === day ? day : null;
  }
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function cents(value) {
  // Convert the legacy reais field once. All additions and subtractions use integers.
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000 ? Math.round(value * 100) : null;
}
function ordinal(day) { return Date.parse(`${day}T00:00:00Z`) / 86400000; }

export function monthlySummary(state, month, now = new Date()) {
  const currentMonth = saoPauloDay(now).slice(0, 7);
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '1900-01' || month > currentMonth) {
    throw Object.assign(new Error('Escolha um mês válido, até o mês atual.'), { status: 400 });
  }
  const selected = new Set(), weekdays = Array(7).fill(0), products = new Map();
  let ordersCount = 0, soldCents = 0, receivedCents = 0, ordersWithoutValue = 0, noticeDays = 0, noticeOrdersCount = 0;
  for (const order of state.orders || []) {
    if (!['Confirmado', 'Entregue'].includes(order.status) || order.isSample || order.isDemo || order.sample) continue;
    const day = saoPauloDay(order.dueAt);
    if (!day || day.slice(0, 7) !== month) continue;
    ordersCount++; selected.add(String(order.id));
    const total = order.totalKnown === false ? null : cents(order.total);
    if (total === null) ordersWithoutValue++; else soldCents += total;
    weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()]++;
    const name = String(order.product || '').trim().replace(/\s+/g, ' ');
    if (name) {
      const key = name.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
      const item = products.get(key) || { name, count: 0 }; item.count++; products.set(key, item);
    }
    const createdDay = saoPauloDay(order.createdAt);
    if (createdDay) { noticeDays += ordinal(day) - ordinal(createdDay); noticeOrdersCount++; }
  }
  for (const payment of state.payments || []) {
    if (payment.status !== 'Conferido' || !selected.has(String(payment.orderId))) continue;
    const amount = cents(payment.amount); if (amount !== null) receivedCents += amount;
  }
  return {
    month, currentMonth, timeZone: TIME_ZONE, ordersCount, soldCents, receivedCents,
    receivableCents: Math.max(0, soldCents - receivedCents), ordersWithoutValue,
    busiestDays: weekdays.map((count, weekday) => ({ weekday, name: WEEKDAYS[weekday], count }))
      .filter(d => d.count).sort((a, b) => b.count - a.count || (a.weekday + 6) % 7 - (b.weekday + 6) % 7).slice(0, 3),
    topProducts: [...products.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')).slice(0, 5),
    averageNoticeDays: noticeOrdersCount ? Math.round(noticeDays * 10 / noticeOrdersCount) / 10 : null,
    noticeOrdersCount,
    lifetime: lifetimeSummary(state),
  };
}

// "O que você já guardou aqui": the same eligible orders and checked payments as Meu mês, in every month,
// so the total never disagrees with the months added up. Clients are counted by the Clientes key.
export function lifetimeSummary(state) {
  const selected = new Set(), clients = new Set();
  let ordersCount = 0, deliveredCount = 0, receivedCents = 0, firstMonth = null;
  for (const order of state.orders || []) {
    if (!['Confirmado', 'Entregue'].includes(order.status) || order.isSample || order.isDemo || order.sample) continue;
    const day = saoPauloDay(order.dueAt);
    if (!day) continue;
    ordersCount++; selected.add(String(order.id));
    if (order.status === 'Entregue') deliveredCount++;
    const key = clientKeyFor(order); if (key) clients.add(key);
    if (!firstMonth || day.slice(0, 7) < firstMonth) firstMonth = day.slice(0, 7);
  }
  for (const payment of state.payments || []) {
    if (payment.status !== 'Conferido' || !selected.has(String(payment.orderId))) continue;
    const amount = cents(payment.amount); if (amount !== null) receivedCents += amount;
  }
  return { ordersCount, deliveredCount, clientsCount: clients.size, receivedCents, firstMonth };
}
