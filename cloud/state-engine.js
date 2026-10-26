import { defaultOrderPage, orderPageInput } from './order-link-model.js';
import { monthlySummary } from './monthly-summary.js';
import { defaultPixSettings, pixSettingsInput } from './pix-code.js';
import { anonymizeClient, clientsSummary } from './clients.js';
const STATUSES = ['Solicitação', 'Orçamento', 'Aguardando confirmação', 'Confirmado', 'Em produção', 'Pronto', 'Entregue', 'Cancelado', 'Recusado'];
const DRAFT_STATUSES = ['Solicitação', 'Orçamento', 'Aguardando confirmação', 'Cancelado', 'Recusado'];
const COMMITTED_STATUSES = ['Confirmado', 'Em produção', 'Pronto', 'Entregue'];
const CAKE_KEYS = ['size', 'flavor', 'filling', 'decoration', 'inscription', 'foodNotes'];
const ORDER_LABELS = {
  client: 'Cliente', product: 'Produto', details: 'Detalhes', dueAt: 'Data e horário', mode: 'Modalidade',
  location: 'Local', total: 'Valor total', status: 'Situação', nextAction: 'Próxima ação', nextAt: 'Prazo da ação',
  pendingChange: 'Alteração pendente', contact: 'Contato', slots: 'Vagas no dia',
};
// Capacidade por tamanho: um pedido ocupa 1 vaga do dia, ou mais se for grande (campo opcional `slots`, 1 a 10).
export const orderSlots = order => (Number.isSafeInteger(order?.slots) && order.slots >= 1 ? order.slots : 1);

function fail(message, status = 400, code) {
  throw Object.assign(new Error(message), { status, code });
}

function clone(value) {
  return structuredClone(value);
}

function defaultAvailability() {
  return { closedWeekdays: [], minimumNoticeHours: 0, dailyOrderLimit: null, dateOverrides: {} };
}

function defaultOrderTemplate() {
  return {
    version: 1,
    fields: [
      ['size', 'Tamanho'], ['flavor', 'Sabor'], ['filling', 'Recheio'], ['decoration', 'Decoração'],
      ['inscription', 'Inscrição'], ['foodNotes', 'Observações alimentares'],
    ].map(([key, label]) => ({ key, label, enabled: true, required: false, options: [] })),
  };
}

export function createEmptyState() {
  return {
    version: 1,
    orders: [],
    payments: [],
    availability: defaultAvailability(),
    orderTemplate: defaultOrderTemplate(),
    orderPage: defaultOrderPage(),
    pix: defaultPixSettings(),
  };
}

function text(value, max = 2000) {
  if (value !== undefined && typeof value !== 'string') fail('Texto inválido.');
  return (value || '').trim().slice(0, max);
}

function money(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
    fail('Valor deve ser entre zero e R$ 1.000.000.');
  }
  return Math.round(value * 100) / 100;
}

function date(value) {
  value = text(value, 30);
  if (value) {
    const epoch = Date.parse(`${value}Z`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
      || !Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 16) !== value) {
      fail('Data e horário inválidos.');
    }
  }
  return value;
}

function orderInput(body) {
  if (body.totalKnown !== undefined && typeof body.totalKnown !== 'boolean') fail('Indicação de valor inválida.');
  const order = {
    client: text(body.client, 120), product: text(body.product, 300), details: text(body.details), dueAt: date(body.dueAt),
    mode: text(body.mode, 30) || 'Retirada', location: text(body.location, 400), total: money(body.total),
    status: text(body.status, 40) || 'Orçamento', nextAction: text(body.nextAction, 300), nextAt: date(body.nextAt),
    pendingChange: text(body.pendingChange), contact: text(body.contact, 120),
  };
  if (body.totalKnown !== undefined) order.totalKnown = body.totalKnown;
  if (body.slots !== undefined) {
    if (!Number.isSafeInteger(body.slots) || body.slots < 1 || body.slots > 10) fail('Vagas no dia: use um número de 1 a 10.');
    order.slots = body.slots;
  }
  // Older app versions do not send totalKnown when a public request receives its price.
  if (order.totalKnown === false && order.total > 0) order.totalKnown = true;
  if (!order.client || !order.product) fail('Preencha cliente e produto.');
  if (!STATUSES.includes(order.status)) fail('Situação inválida.');
  if (!['Retirada', 'Entrega'].includes(order.mode)) fail('Modalidade inválida.');
  if (!DRAFT_STATUSES.includes(order.status) && !order.dueAt) fail('Defina data e horário para este pedido.');
  if (body.cake === null) order.cake = null;
  else if (body.cake !== undefined) {
    const cake = body.cake;
    if (!cake || typeof cake !== 'object' || !Number.isSafeInteger(cake.templateVersion) || cake.templateVersion < 1
      || !cake.values || typeof cake.values !== 'object' || Array.isArray(cake.values)
      || Object.keys(cake.values).some(key => !CAKE_KEYS.includes(key))
      || (cake.labels !== undefined && (!cake.labels || typeof cake.labels !== 'object' || Array.isArray(cake.labels)
        || Object.keys(cake.labels).some(key => !CAKE_KEYS.includes(key))))) fail('Dados do bolo inválidos.');
    const values = {};
    for (const key of CAKE_KEYS) if (cake.values[key] !== undefined) values[key] = text(cake.values[key], key === 'foodNotes' ? 500 : 200);
    const labels = {};
    for (const [key, label] of Object.entries(cake.labels || {})) labels[key] = text(label, 80);
    order.cake = { templateVersion: cake.templateVersion, values, labels };
  }
  return order;
}

const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function limitValue(value) {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 50) fail('Limite diário deve ser um número entre 1 e 50 ou ilimitado.');
  return value;
}

function availabilityInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.closedWeekdays)
    || value.closedWeekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)
    || new Set(value.closedWeekdays).size !== value.closedWeekdays.length
    || !Number.isSafeInteger(value.minimumNoticeHours) || value.minimumNoticeHours < 0 || value.minimumNoticeHours > 8760
    || !value.dateOverrides || typeof value.dateOverrides !== 'object' || Array.isArray(value.dateOverrides)) {
    fail('Configuração de disponibilidade inválida.');
  }
  const dateOverrides = {};
  for (const [day, item] of Object.entries(value.dateOverrides)) {
    if (!validDay(day) || !item || typeof item !== 'object' || Array.isArray(item) || typeof item.closed !== 'boolean') {
      fail('Exceção de data inválida.');
    }
    dateOverrides[day] = { closed: item.closed, limit: limitValue(item.limit) };
  }
  return {
    closedWeekdays: [...value.closedWeekdays].sort((a, b) => a - b),
    minimumNoticeHours: value.minimumNoticeHours,
    dailyOrderLimit: limitValue(value.dailyOrderLimit),
    dateOverrides,
  };
}

function templateInput(value) {
  if (!value || !Number.isSafeInteger(value.version) || value.version < 1 || !Array.isArray(value.fields)
    || value.fields.length !== CAKE_KEYS.length) fail('Modelo de bolo inválido.');
  const fields = [];
  for (const field of value.fields) {
    if (!field || !CAKE_KEYS.includes(field.key) || fields.some(existing => existing.key === field.key)
      || typeof field.label !== 'string' || !field.label.trim() || field.label.length > 80
      || typeof field.enabled !== 'boolean' || typeof field.required !== 'boolean'
      || !Array.isArray(field.options) || field.options.length > 30
      || field.options.some(option => typeof option !== 'string' || !option.trim() || option.length > 80)
      || new Set(field.options).size !== field.options.length) fail('Campo do modelo de bolo inválido.');
    fields.push({ key: field.key, label: field.label.trim(), enabled: field.enabled, required: field.required, options: field.options.map(option => option.trim()) });
  }
  if (CAKE_KEYS.some(key => !fields.some(field => field.key === key))) fail('O modelo precisa conter todos os campos de bolo.');
  return { version: value.version, fields: CAKE_KEYS.map(key => fields.find(field => field.key === key)) };
}

export function wallTimeEpoch(value) {
  const [dayPart, timePart] = value.split('T');
  const [year, month, day] = dayPart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(guess))
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return guess + (guess - represented);
}

export function checkCapacity(input, state, currentId, override) {
  if (!COMMITTED_STATUSES.includes(input.status)) return;
  const day = input.dueAt.slice(0, 10);
  const config = state.availability;
  const dayOverride = config.dateOverrides[day];
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  let conflict = dayOverride?.closed || (!dayOverride && config.closedWeekdays.includes(weekday))
    ? ['DATE_CLOSED', 'Esta data está marcada como fechada.'] : null;
  if (!conflict && wallTimeEpoch(input.dueAt) - Date.now() < config.minimumNoticeHours * 3_600_000) {
    conflict = ['NOTICE', 'O pedido precisa respeitar a antecedência mínima.'];
  }
  const limit = dayOverride?.limit ?? config.dailyOrderLimit;
  const used = state.orders.filter(order => order.id !== currentId && COMMITTED_STATUSES.includes(order.status)
    && !order.isSample && !order.isDemo && !order.sample && order.dueAt?.slice(0, 10) === day).reduce((sum, order) => sum + orderSlots(order), 0);
  const need = orderSlots(input);
  if (!conflict && limit !== null && used + need > limit) {
    conflict = ['DAILY_LIMIT', need > 1 && used < limit ? `Este pedido ocupa ${need} vagas e a data só tem ${limit - used} livre${limit - used === 1 ? '' : 's'}.` : 'O limite de pedidos para esta data foi atingido.'];
  }
  if (!conflict) return;
  if (override?.allowed === true) {
    const reason = text(override.reason, 301);
    if (reason.length < 4 || reason.length > 300) fail('Informe o motivo da exceção (4 a 300 caracteres).');
    return { reason, conflict };
  }
  fail(conflict[1], 409, conflict[0]);
}

function checkRequiredCake(input, template) {
  if (!input.cake) return;
  const values = input.cake.values || {};
  for (const field of template.fields) if (field.enabled) {
    const value = text(values[field.key], 500);
    if (field.required && !value) fail(`Preencha o campo obrigatório: ${field.label}.`);
    if (value && field.options.length && !field.options.includes(value)) fail(`Escolha uma opção válida para: ${field.label}.`);
  }
}

function validBackup(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.orders) || !Array.isArray(value.payments)) {
    fail('Backup inválido.');
  }
  const state = {
    ...clone(value),
    availability: availabilityInput(value.availability ?? defaultAvailability()),
    orderTemplate: templateInput(value.orderTemplate ?? defaultOrderTemplate()),
    orderPage: orderPageInput(value.orderPage ?? defaultOrderPage()),
    pix: pixSettingsInput(value.pix ?? defaultPixSettings()),
  };
  const orderIds = new Set();
  for (const order of state.orders) {
    if (!order || typeof order !== 'object' || typeof order.id !== 'string' || !order.id.trim() || orderIds.has(order.id)) {
      fail('Pedido inválido ou identificador duplicado.');
    }
    orderIds.add(order.id);
    orderInput(order);
    if(order.origin!==undefined && !['manual','link'].includes(order.origin))fail('Origem do pedido inválida.');
    if(order.publicCode!==undefined && (typeof order.publicCode!=='string'||!/^DA-[A-Z0-9]{6}$/.test(order.publicCode)))fail('Código da solicitação inválido.');
    for(const key of ['consentAt','reviewedAt'])if(order[key]!==undefined && !Number.isFinite(Date.parse(order[key])))fail('Data da solicitação inválida.');
    if(order.refusalReason!==undefined && (typeof order.refusalReason!=='string'||order.refusalReason.length>500))fail('Motivo inválido.');
    if (!Array.isArray(order.history)) fail('Histórico de pedido inválido.');
  }
  const paymentIds = new Set();
  for (const payment of state.payments) {
    if (!payment || typeof payment !== 'object' || typeof payment.id !== 'string' || !payment.id.trim()
      || paymentIds.has(payment.id) || orderIds.has(payment.id) || !orderIds.has(payment.orderId)
      || !Number.isFinite(payment.amount) || payment.amount < 0 || payment.amount > 1_000_000
      || !['Informado', 'Conferido'].includes(payment.status) || !Number.isFinite(Date.parse(payment.createdAt))) {
      fail('Pagamento inválido, duplicado ou sem pedido associado.');
    }
    paymentIds.add(payment.id);
  }
  return state;
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.orders) || !Array.isArray(value.payments)) {
    fail('Formato do estado inválido.', 500);
  }
  const state = clone(value);
  state.availability = availabilityInput(state.availability ?? defaultAvailability());
  state.orderTemplate = templateInput(state.orderTemplate ?? defaultOrderTemplate());
  state.orderPage = orderPageInput(state.orderPage ?? defaultOrderPage());
  state.pix = pixSettingsInput(state.pix ?? defaultPixSettings());
  state.orders=state.orders.map(order=>({...order,origin:order.origin??'manual'}));
  return state;
}

// Gravação feita sobre uma versão antiga (outra aba, ou um pedido novo que chegou pelo link): a ação é
// reaplicada sobre o estado mais novo quando o que ela altera não mudou desde que o app carregou.
// `base.order` é o carimbo do pedido visto pelo app; `base.section`, o JSON do ajuste visto. Pedido novo
// sempre pode (a capacidade é conferida de novo); importação e anonimização, nunca.
const SECTION_ROUTES = { '/api/availability': 'availability', '/api/order-template': 'orderTemplate', '/api/order-page': 'orderPage', '/api/pix': 'pix' };
export const orderStamp = order => (order && (order.updatedAt || order.createdAt)) || '';
export function canRebaseWrite(state, path, method, base = {}) {
  method = String(method || '').toUpperCase();
  if (path === '/api/orders' && method === 'POST') return true;
  let current;
  try { current = normalizeState(state); } catch { return false; }
  const section = SECTION_ROUTES[path];
  if (section) return method === 'PUT' && typeof base.section === 'string' && base.section === JSON.stringify(current[section]);
  const orderMatch = path.match(/^\/api\/orders\/([^/]+)(?:\/(?:payments|accept|refuse))?$/);
  const paymentMatch = path.match(/^\/api\/payments\/([^/]+)$/);
  let order;
  if (orderMatch) order = current.orders.find(item => item.id === decodeURIComponent(orderMatch[1]));
  else if (paymentMatch) {
    const payment = current.payments.find(item => item.id === decodeURIComponent(paymentMatch[1]));
    order = payment && current.orders.find(item => item.id === payment.orderId);
  }
  return !!order && typeof base.order === 'string' && base.order !== '' && base.order === orderStamp(order);
}

function response(body, status = 200, state, mutated = false) {
  return { state, body, status, mutated };
}

export function transactState(state, url, options = {}) {
  try {
    const requested = new URL(url, 'http://localhost');
    if ((options.method || 'GET').toUpperCase() === 'GET' && requested.pathname === '/api/resumo-mensal') {
      return response(monthlySummary(state, requested.searchParams.get('mes')), 200, state);
    }
    const nextState = normalizeState(state);
    const originalState = clone(nextState);
    const path = new URL(url, 'http://localhost').pathname;
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET' && ['/api/state', '/api/export'].includes(path)) return response(nextState, 200, nextState);
    if (method === 'GET' && path === '/api/availability') return response(nextState.availability, 200, nextState);
    if (method === 'GET' && path === '/api/order-template') return response(nextState.orderTemplate, 200, nextState);
    if (method === 'GET' && path === '/api/order-page') return response(nextState.orderPage, 200, nextState);
    if (method === 'GET' && path === '/api/clientes') return response(clientsSummary(nextState), 200, nextState);

    let body;
    try { body = JSON.parse(options.body || '{}'); } catch { fail('JSON inválido.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Dados inválidos.');

    const now = new Date().toISOString();
    let result;
    let status = 200;
    const reviewMatch = path.match(/^\/api\/orders\/([^/]+)\/(accept|refuse)$/);
    if (reviewMatch && method === 'POST') {
      const order = nextState.orders.find(o => o.id === decodeURIComponent(reviewMatch[1]));
      if (!order || order.status !== 'Solicitação') fail('Esta solicitação já foi revisada ou não existe.', 409);
      if (reviewMatch[2] === 'accept') {
        if (!['Orçamento', 'Confirmado'].includes(body.status)) fail('Escolha Orçamento ou Confirmado.');
        const input = orderInput({ ...order, ...(body.order || {}), status: body.status });
        checkCapacity(input, nextState, order.id);
        if (body.status === 'Confirmado' && input.cake) checkRequiredCake(input, nextState.orderTemplate);
        Object.assign(order, input, { reviewedAt: now, updatedAt: now, reviewOutcome: 'accepted' });
        order.history.push({ at: now, text: `Solicitação aceita como ${body.status}.` });
      } else {
        if (typeof body.reason !== 'string' || body.reason.length > 500) fail('Use até 500 caracteres para o motivo.');
        if(body.reasonCode!==undefined && !['indisponibilidade','fora-da-oferta','outro'].includes(body.reasonCode))fail('Motivo geral inválido.');
        Object.assign(order, { status: 'Recusado', refusalReason: body.reason.trim(), refusalReasonCode: body.reasonCode||'outro', reviewedAt: now, updatedAt: now, reviewOutcome: 'refused' });
        order.history.push({ at: now, text: `Solicitação recusada${order.refusalReason ? `: ${order.refusalReason}` : '.'}` });
      }
      result = order;
    } else if (path === '/api/order-page' && method === 'PUT') {
      nextState.orderPage = orderPageInput(body); result = nextState.orderPage;
    } else if (path.match(/^\/api\/clientes\/[^/]+\/anonimizar$/) && method === 'POST') {
      const key = decodeURIComponent(path.split('/')[3]);
      const orders = anonymizeClient(nextState, key, now);
      if (!orders) fail('Cliente não encontrada.', 404);
      result = { ok: true, orders };
    } else if (path === '/api/pix' && method === 'PUT') {
      nextState.pix = pixSettingsInput(body); result = nextState.pix;
    } else if (path === '/api/availability' && method === 'PUT') {
      nextState.availability = availabilityInput(body);
      result = nextState.availability;
    } else if (path === '/api/order-template' && method === 'PUT') {
      const requested = templateInput(body);
      const changed = JSON.stringify(nextState.orderTemplate.fields) !== JSON.stringify(requested.fields);
      nextState.orderTemplate = { ...requested, version: changed ? nextState.orderTemplate.version + 1 : nextState.orderTemplate.version };
      result = nextState.orderTemplate;
    } else if (path === '/api/import' && method === 'POST') {
      const imported = validBackup(body);
      return response({ ok: true, orders: imported.orders.length, payments: imported.payments.length }, 200, imported, true);
    } else if (path === '/api/orders' && method === 'POST') {
      const input = orderInput(body);
      const allowed = checkCapacity(input, nextState, null, body.capacityOverride);
      if (COMMITTED_STATUSES.includes(input.status) && input.cake) checkRequiredCake(input, nextState.orderTemplate);
      result = { ...input, origin: 'manual', id: crypto.randomUUID(), createdAt: now, updatedAt: now, history: [{ at: now, text: 'Pedido cadastrado.' }] };
      if (allowed) result.history.push({ at: now, text: `Exceção de disponibilidade (${allowed.conflict[0]}): ${allowed.reason}` });
      nextState.orders.push(result);
      status = 201;
    } else {
      const match = path.match(/^\/api\/orders\/([^/]+)(\/payments)?$/);
      const paymentMatch = path.match(/^\/api\/payments\/([^/]+)$/);
      if (match) {
        const order = nextState.orders.find(item => item.id === decodeURIComponent(match[1]));
        if (!order) fail('Pedido não encontrado.', 404);
        if (match[2] && method === 'POST') {
          const amount = money(body.amount);
          const paymentStatus = text(body.status, 30);
          if (!['Informado', 'Conferido'].includes(paymentStatus)) fail('Estado do pagamento inválido.');
          result = { id: crypto.randomUUID(), orderId: order.id, amount, status: paymentStatus, note: text(body.note, 500), createdAt: now };
          nextState.payments.push(result);
          order.updatedAt = now;
          order.history.push({ at: now, text: `Pagamento registrado: R$ ${amount.toFixed(2)} • ${paymentStatus}.` });
        } else if (!match[2] && method === 'PUT') {
          if (order.status === 'Solicitação' && body.status && body.status !== 'Solicitação') fail('Use Aceitar ou Recusar para revisar a solicitação.');
          const input = orderInput({ ...order, ...body });
          const changes = Object.keys(input).filter(key => JSON.stringify(input[key]) !== JSON.stringify(order[key]));
          const needsCheck = COMMITTED_STATUSES.includes(input.status)
            && (!COMMITTED_STATUSES.includes(order.status) || input.dueAt !== order.dueAt || orderSlots(input) > orderSlots(order));
          let allowed;
          if (needsCheck) allowed = checkCapacity(input, nextState, order.id, body.capacityOverride);
          if (COMMITTED_STATUSES.includes(input.status) && !COMMITTED_STATUSES.includes(order.status) && input.cake) {
            checkRequiredCake(input, nextState.orderTemplate);
          }
          if (changes.length) {
            order.history.push({ at: now, text: changes.map(key => `${ORDER_LABELS[key] || 'Bolo'}: ${order[key] === 0 ? 0 : order[key] || '—'} → ${input[key] === 0 ? 0 : input[key] || '—'}`).join('; ') });
            Object.assign(order, input, { updatedAt: now });
          }
          if (allowed) order.history.push({ at: now, text: `Exceção de disponibilidade (${allowed.conflict[0]}): ${allowed.reason}` });
          result = order;
        } else fail('Rota não encontrada.', 404);
      } else if (paymentMatch && method === 'PUT') {
        const payment = nextState.payments.find(item => item.id === decodeURIComponent(paymentMatch[1]));
        if (!payment) fail('Pagamento não encontrado.', 404);
        if (body.status !== 'Conferido') fail('Só é possível confirmar o recebimento.');
        if (payment.status !== 'Conferido') {
          payment.status = 'Conferido';
          payment.confirmedAt = now;
          const order = nextState.orders.find(item => item.id === payment.orderId);
          order.history.push({ at: now, text: `Recebimento conferido: R$ ${payment.amount.toFixed(2)}.` });
          order.updatedAt = now;
        }
        result = payment;
      } else fail('Rota não encontrada.', 404);
    }
    return response(result, status, nextState, JSON.stringify(nextState) !== JSON.stringify(originalState));
  } catch (error) {
    return {
      state: state && typeof state === 'object' ? clone(state) : state,
      body: { error: error.status ? error.message : 'Não foi possível processar esta operação.', ...(error.code ? { code: error.code } : {}) },
      status: error.status || 500,
      mutated: false,
    };
  }
}
