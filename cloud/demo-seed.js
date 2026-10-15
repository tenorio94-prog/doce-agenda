import { createEmptyState } from './state-engine.js';

// Fictitious bakery for the /demo/ page only. Dates are relative to the visit, so Agenda,
// Pedidos and Meu mês always have something to show. Nothing here reaches a real account.
const CAKE_LABELS = { size: 'Tamanho', flavor: 'Sabor', filling: 'Recheio', decoration: 'Decoração', inscription: 'Inscrição', foodNotes: 'Observações alimentares' };

// Fictitious WhatsApp numbers: Clientes groups the orders by them.
const CONTACTS = { Fernanda: '(11) 90000-0101', Paula: '(11) 90000-0102', 'Lúcia': '(11) 90000-0103', Gabriela: '(11) 90000-0104', Beatriz: '(11) 90000-0105',
  Roberta: '(11) 90000-0106', 'Ana Clara': '(11) 90000-0107', Marcos: '(11) 90000-0108', Juliana: '(11) 90000-0109', Carla: '(11) 90000-0110', Bia: '(11) 90000-0111',
  'Sônia': '(11) 90000-0112', 'Patrícia': '(11) 90000-0113', Renata: '(11) 90000-0114', Helena: '(11) 90000-0115' };

// [id, offset in days, time, client, product, total, status, payments [[amount, status]], notice days, extra]
const ORDERS = [
  ['01', -9, '10:00', 'Fernanda', 'Bolo de chocolate (1,5 kg)', 160, 'Entregue', [[80, 'Conferido'], [80, 'Conferido']], 8],
  ['02', -6, '15:00', 'Paula', 'Brigadeiro (cento)', 95, 'Entregue', [[95, 'Conferido']], 5],
  ['03', -4, '16:00', 'Lúcia', 'Naked cake de morango', 240, 'Entregue', [[120, 'Conferido'], [120, 'Conferido']], 12],
  ['04', -3, '14:00', 'Gabriela', 'Bolo de cenoura', 90, 'Cancelado', [], 6, { details: 'A festa foi adiada. Cliente avisou com antecedência.' }],
  ['05', -2, '11:00', 'Beatriz', 'Bolo de pote (10 un.)', 60, 'Entregue', [[60, 'Conferido']], 3],
  ['06', -1, '17:00', 'Roberta', 'Torta de limão', 110, 'Entregue', [[55, 'Conferido']], 4, { details: 'Pagou o sinal. O restante ficou para o Pix de sexta.' }],
  ['07', 0, '10:00', 'Ana Clara', 'Bolo de pistache', 180, 'Pronto', [[90, 'Conferido']], 9, {
    details: 'Retirada na portaria. Caixa alta, sem laço.',
    cake: { size: '1,5 kg', flavor: 'Massa branca com pistache', filling: 'Brigadeiro de pistache', decoration: 'Chantininho verde-claro com flores', inscription: 'Feliz aniversário, Lu!' },
  }],
  ['08', 0, '15:00', 'Marcos', 'Brigadeiro (cento)', 95, 'Em produção', [], 5, { details: 'Metade tradicional, metade de ninho.' }],
  ['09', 0, '18:00', 'Juliana', 'Docinhos sortidos (50 un.)', 120, 'Confirmado', [[60, 'Informado']], 6, { details: 'Cliente disse que fez o Pix do sinal. Confira no banco antes de marcar.' }],
  ['10', 1, '09:00', 'Carla', 'Bolo de chocolate 3 andares', 420, 'Confirmado', [[210, 'Conferido']], 21, {
    mode: 'Entrega', location: 'Salão de festas, Rua das Flores, 120',
    cake: { size: '3 andares (60 fatias)', flavor: 'Chocolate', filling: 'Brigadeiro e morango', decoration: 'Pasta americana branca com flores', inscription: 'Carla & Rafael' },
  }],
  ['11', 2, '10:00', 'Bia', 'Kit festa (bolo + 50 doces)', 350, 'Confirmado', [[175, 'Conferido']], 14, { details: 'Tema: jardim encantado. Velas de 3 anos.' }],
  ['12', 2, '14:00', 'Sônia', 'Bolo de chocolate (1 kg)', 150, 'Confirmado', [[75, 'Conferido']], 7],
  ['13', 2, '16:00', 'Patrícia', 'Brigadeiro (cento)', 95, 'Confirmado', [], 4],
  ['14', 4, '15:00', 'Renata', 'Bolo de vinho com frutas vermelhas', 150, 'Orçamento', [], 2, { nextAction: 'Mandar o orçamento com foto de referência', details: 'Quer saber se dá para fazer sem lactose.' }],
  // Older orders, so Clientes has a regular customer, one who has not ordered in a while,
  // a birthday that comes back in 20 days and a name without phone that is only suggested.
  ['H1', -345, '15:00', 'Ana Clara', 'Bolo de aniversário (2 kg)', 220, 'Entregue', [[110, 'Conferido'], [110, 'Conferido']], 10],
  ['H2', -40, '10:00', 'Paula', 'Brigadeiro (cento)', 95, 'Entregue', [[95, 'Conferido']], 6],
  ['H3', -75, '16:00', 'Paula', 'Bolo de pote (10 un.)', 60, 'Entregue', [[60, 'Conferido']], 4],
  ['H4', -130, '11:00', 'Paula', 'Brigadeiro (cento)', 90, 'Entregue', [[90, 'Conferido']], 5, { contact: '' }],
  ['H5', -120, '15:00', 'Helena', 'Bolo de cenoura', 90, 'Entregue', [[90, 'Conferido']], 6],
  ['H6', -190, '14:00', 'Helena', 'Torta de limão', 110, 'Entregue', [[110, 'Conferido']], 8],
];

function localDay(now, offset) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function demoSeedState(now = new Date()) {
  const state = createEmptyState();
  state.availability.dailyOrderLimit = 3;
  // Link settings filled in but inactive: the demo can open the preview, never receive orders.
  state.orderPage = {
    active: false, slug: 'doces-da-lu', displayName: 'Doces da Lu', whatsapp: '',
    welcome: 'Oi! Que bom te ver por aqui. Escolha o doce e a data, eu confirmo tudo pelo WhatsApp.',
    products: [
      { name: 'Bolo de aniversário', description: 'A partir de 1 kg. Massa e recheio à sua escolha.' },
      { name: 'Brigadeiro (cento)', description: 'Tradicional, ninho ou pistache.' },
      { name: 'Kit festa', description: 'Bolo + 50 doces.' },
      { name: 'Bolo de pote', description: 'Mínimo de 10 unidades.' },
    ],
  };
  for (const [id, offset, time, client, product, total, status, payments, notice, extra = {}] of ORDERS) {
    const orderId = `DEMO-${id}`;
    const created = `${localDay(now, offset - notice)}T12:00:00.000Z`;
    const { cake, ...rest } = extra;
    state.orders.push({
      id: orderId, client, product, details: '', dueAt: `${localDay(now, offset)}T${time}`, mode: 'Retirada', location: '',
      total, totalKnown: true, status, nextAction: '', nextAt: '', pendingChange: '', contact: CONTACTS[client] || '', origin: 'manual',
      ...rest,
      ...(cake ? { cake: { templateVersion: 1, values: cake, labels: CAKE_LABELS } } : {}),
      createdAt: created, updatedAt: created, history: [{ at: created, text: 'Pedido de demonstração.' }],
    });
    payments.forEach(([amount, paymentStatus], index) => state.payments.push({
      id: `${orderId}-REC-${index + 1}`, orderId, amount, status: paymentStatus,
      note: paymentStatus === 'Conferido' ? (index ? 'Restante' : 'Sinal') : 'Cliente informou o Pix', createdAt: created,
    }));
  }
  // A request from the public order link, waiting for review.
  const requestAt = new Date(now.getTime() - 3 * 3600000).toISOString();
  state.orders.push({
    id: 'DEMO-15', client: 'Camila', product: 'Bolo de aniversário', details: 'Para 20 pessoas. Pode ser de ninho com morango?',
    dueAt: `${localDay(now, 5)}T11:00`, mode: 'Retirada', location: '', total: 0, totalKnown: false, status: 'Solicitação',
    origin: 'link', publicCode: 'DA-DEMO15', contact: '(11) 90000-0000', consentAt: requestAt, consentVersion: '2026-10-13',
    nextAction: 'Revisar solicitação recebida pelo link', nextAt: '', pendingChange: '', createdAt: requestAt, updatedAt: requestAt,
    history: [{ at: requestAt, text: 'Solicitação recebida pelo link (demonstração).' }],
  });
  return state;
}
