import { demoSeedState } from './demo-seed.js';
import { saoPauloDay } from './monthly-summary.js';

// O marcador acompanha o estado para que uma gravação interrompida não avance as datas duas vezes.
const STATE_DAY = 'demoExampleDay';
const DATE_FIELDS = ['dueAt', 'createdAt', 'updatedAt', 'confirmedAt', 'reviewedAt', 'nextAt', 'consentAt'];
const EXAMPLE_ID = /^DEMO-/;
const EXTRA_ID = /^DEMO-(?:1[6-9]|2[0-9])$/;
const DAY_MS = 86400000;

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function shiftDate(value, days) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) || !validDay(value.slice(0, 10))) return value;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) + value.slice(10);
}
function shiftFields(record, days) {
  const next = { ...record };
  for (const field of DATE_FIELDS) if (field in next) next[field] = shiftDate(next[field], days);
  if (Array.isArray(record.history)) next.history = record.history.map((entry) => entry && typeof entry === 'object' ? { ...entry, at: shiftDate(entry.at, days) } : entry);
  return next;
}

// A demo antiga não tinha marcador: DEMO-07 nasceu no dia em que o exemplo foi montado.
export function prepareDemoState(state, storedDay, now = new Date()) {
  const today = saoPauloDay(now);
  if (!state || state.version !== 1 || !Array.isArray(state.orders) || !Array.isArray(state.payments)) return { state, day: null, changed: false };
  const anaDay = state.orders.find((order) => order?.id === 'DEMO-07')?.dueAt?.slice(0, 10);
  const previous = [state[STATE_DAY], storedDay, anaDay].find(validDay);
  if (!previous) {
    // Recomeça os exemplos sem descartar pedidos e pagamentos criados pela visitante.
    const fresh = demoSeedState(now);
    const ownOrders = state.orders.filter((order) => !EXAMPLE_ID.test(order?.id || ''));
    const ownIds = new Set(ownOrders.map((order) => order.id));
    return { state: { ...state, [STATE_DAY]: today, orders: [...fresh.orders, ...ownOrders],
      payments: [...fresh.payments, ...state.payments.filter((payment) => ownIds.has(payment.orderId))] }, day: today, changed: true };
  }
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`)) / DAY_MS);
  if (days < 0) return { state, day: previous, changed: false };
  // A versão antiga só tinha os 21 pedidos originais. Inclui os novos uma vez,
  // sem recriá-los quando uma visitante os remove depois da atualização.
  const needsExtras = !validDay(state[STATE_DAY]) && !validDay(storedDay)
    && !state.orders.some((order) => EXTRA_ID.test(order?.id || ''));
  if (days === 0 && !needsExtras) return { state, day: previous, changed: false };
  const exampleIds = new Set(state.orders.filter((order) => EXAMPLE_ID.test(order?.id || '')).map((order) => order.id));
  const next = { ...state, [STATE_DAY]: today,
    orders: days ? state.orders.map((order) => exampleIds.has(order?.id) ? shiftFields(order, days) : order) : [...state.orders],
    payments: days ? state.payments.map((payment) => exampleIds.has(payment?.orderId) ? shiftFields(payment, days) : payment) : [...state.payments],
  };
  if (needsExtras) {
    const fresh = demoSeedState(now), extra = fresh.orders.filter((order) => EXTRA_ID.test(order.id));
    const extraIds = new Set(extra.map((order) => order.id));
    next.orders.push(...extra);
    next.payments.push(...fresh.payments.filter((payment) => extraIds.has(payment.orderId)));
  }
  return { state: next, day: today, changed: true };
}

export function stampNewDemo(state, now = new Date()) {
  return { ...state, [STATE_DAY]: saoPauloDay(now) };
}
