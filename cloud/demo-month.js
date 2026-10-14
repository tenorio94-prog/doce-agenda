import { monthlySummary } from './monthly-summary.js';

// Fictitious month used only by the browser demonstration while the visitor has no
// orders of her own. Numbers come from the real calculation over these orders.
const EXAMPLES = [
  // [weekday (0 = domingo), occurrence in month, product, total in reais, checked payment, notice days]
  [6, 1, 'Bolo de chocolate', 180, 180, 9],
  [5, 1, 'Brigadeiro (cento)', 95, 95, 5],
  [6, 2, 'Naked cake de morango', 260, 130, 14],
  [5, 2, 'Bolo de chocolate', 150, 75, 7],
  [0, 2, 'Torta de limão', 120, 120, 4],
  [3, 3, 'Bolo de pote (10 un.)', 60, 0, 3],
  [6, 3, 'Brigadeiro (cento)', 95, 45, 6],
  [6, 4, 'Bolo de chocolate', 220, 110, 12],
];

function nthWeekday(month, weekday, occurrence) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 + offset + (occurrence - 1) * 7));
}

export function demoMonthState(month) {
  const orders = [], payments = [];
  EXAMPLES.forEach(([weekday, occurrence, product, total, paid, notice], index) => {
    const due = nthWeekday(month, weekday, occurrence), id = `EXEMPLO-MES-${index + 1}`;
    const created = new Date(due.getTime() - notice * 86400000);
    orders.push({ id, client: 'Cliente fictícia', product, status: 'Confirmado', total, dueAt: `${due.toISOString().slice(0, 10)}T15:00`, createdAt: `${created.toISOString().slice(0, 10)}T15:00:00.000Z` });
    if (paid) payments.push({ id: `${id}-REC`, orderId: id, amount: paid, status: 'Conferido' });
  });
  return { orders, payments };
}

export function demoMonthSummary(month, now = new Date()) {
  return { ...monthlySummary(demoMonthState(month), month, now), isExample: true };
}

// Shows the example only in the current month and only before the visitor registers any order.
export function shouldUseDemoMonth(state, summary) {
  const ownOrders = (state.orders || []).some(order => !(order.isSample || order.isDemo || order.sample));
  return !ownOrders && summary.ordersCount === 0 && summary.month === summary.currentMonth;
}
