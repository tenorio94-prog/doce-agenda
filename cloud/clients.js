// Clientes: fichas montadas a partir dos pedidos da conta, sem campos novos.
// Identity is the WhatsApp number; orders without a phone are grouped by the exact name and only
// *suggested* as the same person as a phone ficha, never merged. Money in integer cents.

const COMMITTED = ['Confirmado', 'Em produção', 'Pronto', 'Entregue'];
const AWAY_DAYS = 90;
const REMINDER_WINDOW = 30;
const MIN_YEARS_AGO_DAYS = 300;

const isSample = (order) => order.isSample || order.isDemo || order.sample;

export function phoneKey(contact) {
  let digits = String(contact || '').replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? digits : '';
}

const nameKey = (name) => String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function clientKeyFor(order) {
  const phone = phoneKey(order.contact);
  if (phone) return `tel:${phone}`;
  const name = nameKey(order.client);
  return name ? `nome:${name}` : '';
}

const spDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// dueAt without offset is São Paulo wall time; with an offset it is converted.
function orderDay(order) {
  const value = String(order.dueAt || '');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value.slice(0, 10);
  const parsed = Date.parse(value || order.createdAt || '');
  return Number.isFinite(parsed) ? spDay(new Date(parsed)) : '';
}

const dayNumber = (day) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000;
const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);
const cents = (value) => Math.round(Number(value || 0) * 100);

// Same month and day in the year of `today`, or the next year once it has passed. 29 Feb falls on 28 Feb.
function nextAnniversary(day, today) {
  const month = Number(day.slice(5, 7)), date = Number(day.slice(8, 10));
  for (const year of [Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1]) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const candidate = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(date, last)).padStart(2, '0')}`;
    if (candidate >= today) return candidate;
  }
  return '';
}

export function clientsSummary(state, now = new Date()) {
  const today = spDay(now);
  const groups = new Map();
  for (const order of state.orders || []) {
    if (isSample(order) || order.status === 'Recusado') continue;
    const key = clientKeyFor(order);
    if (!key) continue;
    const day = orderDay(order);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ order, day });
  }

  const clients = [], reminders = [];
  for (const [key, entries] of groups) {
    entries.sort((a, b) => (b.day || '').localeCompare(a.day || ''));
    const purchases = entries.filter(({ order }) => COMMITTED.includes(order.status));
    const past = purchases.filter(({ day }) => day && day <= today);
    const upcoming = purchases.filter(({ order, day }) => day && day >= today && order.status !== 'Entregue').sort((a, b) => a.day.localeCompare(b.day));
    const lastPurchaseDay = past[0]?.day || '';
    const nextOrderDay = upcoming[0]?.day || '';
    const daysSinceLast = lastPurchaseDay ? daysBetween(lastPurchaseDay, today) : null;
    const productCounts = new Map();
    for (const { order } of purchases) {
      const product = String(order.product || '').trim();
      if (product) productCounts.set(product, (productCounts.get(product) || 0) + 1);
    }
    const name = String(entries.find(({ order }) => String(order.client || '').trim())?.order.client || '').trim() || 'Sem nome';
    clients.push({
      key, name, phone: key.startsWith('tel:') ? key.slice(4) : '',
      orders: entries.length, purchases: purchases.length,
      totalCents: purchases.filter(({ order }) => order.totalKnown !== false).reduce((sum, { order }) => sum + cents(order.total), 0),
      lastPurchaseDay, nextOrderDay, daysSinceLast,
      away: !nextOrderDay && daysSinceLast !== null && daysSinceLast >= AWAY_DAYS,
      topProducts: [...productCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')).slice(0, 3).map(([product, count]) => ({ product, count })),
      orderIds: entries.map(({ order }) => order.id),
      lastActivityDay: entries[0]?.day || '',
      sameNameAs: [],
    });
    // A year later the same date may be a birthday again, unless there is already an order around it.
    for (const { order, day } of past) {
      if (daysBetween(day, today) < MIN_YEARS_AGO_DAYS) continue;
      const anniversary = nextAnniversary(day, today);
      const daysUntil = anniversary ? daysBetween(today, anniversary) : Infinity;
      if (daysUntil > REMINDER_WINDOW) continue;
      if (upcoming.some((item) => Math.abs(daysBetween(item.day, anniversary)) <= 15)) continue;
      if (reminders.some((item) => item.key === key && item.day === anniversary)) continue;
      reminders.push({ key, name, product: String(order.product || '').trim(), orderId: order.id, originalDay: day, day: anniversary, daysUntil });
    }
  }

  // Same name on a ficha with phone and one without: suggest, never merge.
  const byName = new Map();
  for (const client of clients) {
    const name = nameKey(client.name);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(client);
  }
  for (const same of byName.values()) {
    if (same.length < 2) continue;
    for (const client of same) client.sameNameAs = same.filter((other) => other !== client).map(({ key, name, phone }) => ({ key, name, phone }));
  }

  clients.sort((a, b) => (b.lastActivityDay || '').localeCompare(a.lastActivityDay || '') || a.name.localeCompare(b.name, 'pt-BR'));
  reminders.sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name, 'pt-BR'));
  return { today, clients, reminders, away: clients.filter((client) => client.away).length };
}

// "Apagar dados desta cliente": personal data leaves the orders; dates, products and values stay for the accounts.
export function anonymizeClient(state, key, now = new Date().toISOString()) {
  const ids = new Set();
  for (const order of state.orders || []) {
    if (isSample(order) || clientKeyFor(order) !== key) continue;
    ids.add(order.id);
    Object.assign(order, { client: 'Cliente removida', contact: '', location: '', details: '', pendingChange: '', nextAction: '', updatedAt: now, anonymizedAt: now });
    if (order.refusalReason !== undefined) order.refusalReason = '';
    if (order.cake?.values) for (const field of Object.keys(order.cake.values)) order.cake.values[field] = '';
    order.history = [{ at: now, text: 'Dados pessoais da cliente apagados a pedido.' }];
  }
  for (const payment of state.payments || []) if (ids.has(payment.orderId)) payment.note = '';
  return ids.size;
}
