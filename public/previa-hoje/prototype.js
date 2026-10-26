// Prévia da tela Hoje: dados fictícios da Doces da Lu (os mesmos da demonstração), só na memória.
// Nada é enviado nem salvo; "Recomeçar" volta ao início.
(() => {
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const TZ = 'America/Sao_Paulo';
  const dayAt = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d; };
  const weekday = (offset) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: TZ }).format(dayAt(offset));
  const shortDay = (offset) => offset === 1 ? 'Amanhã' : new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', timeZone: TZ }).format(dayAt(offset)).replace('.', '');
  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const photo = (name) => `/encomenda/exemplos/${name}-160.webp`;

  // Estágios que ela vê no dia: Combinado → Fazendo → Pronto → Entregue (gravados como Confirmado/Em produção/Pronto/Entregue).
  const NEXT = { Combinado: ['Começar a fazer', 'Fazendo'], Fazendo: ['Ficou pronto', 'Pronto'], Pronto: ['Marcar entregue', 'Entregue'] };

  function initialState() {
    return {
      deliveries: [
        { id: 'ana', time: '10h', product: 'Bolo de pistache', client: 'Ana Clara', photo: 'bolo-pistache', stage: 'Pronto', total: 18000, paid: 9000, informed: 0, note: 'Retirada na portaria. Caixa alta, sem laço.' },
        { id: 'marcos', time: '15h', product: 'Brigadeiro (cento)', client: 'Marcos', photo: 'brigadeiros-gourmet', stage: 'Fazendo', total: 9500, paid: 0, informed: 0, note: 'Metade tradicional, metade de ninho.' },
        { id: 'juliana', time: '18h', product: 'Docinhos sortidos (50 un.)', client: 'Juliana', photo: 'caixa-docinhos', stage: 'Combinado', total: 12000, paid: 0, informed: 6000, note: 'Retirada.' },
      ],
      todos: ['pix-juliana', 'link-camila', 'cobrar-roberta', 'orcamento-renata'],
      camila: 'decidir',
      limit: 3,
    };
  }
  let state = initialState();

  const TODOS = {
    'pix-juliana': () => ({
      icon: 'R$', title: 'Conferir o Pix da Juliana',
      why: `Ela disse que mandou ${money(6000)} de sinal. Olhe no banco antes de marcar.`,
      actions: [['pix-yes', 'Caiu na conta'], ['pix-no', 'Ainda não']],
    }),
    'link-camila': () => ({
      icon: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>', title: 'Decidir o pedido da Camila',
      why: `Chegou pelo link: bolo de aniversário, ${weekday(5)}, 11h.`,
      actions: [['open-camila', 'Decidir']],
    }),
    'cobrar-roberta': () => ({
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', title: `Cobrar ${money(5500)} da Roberta`,
      why: 'Restante da torta de limão, entregue ontem.',
      actions: [['open-roberta', 'Cobrar']],
    }),
    'orcamento-renata': () => ({
      icon: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>', title: 'Mandar o orçamento da Renata',
      why: `Bolo de vinho, ${weekday(4)}. Pergunta se dá sem lactose.`,
      actions: [['open-renata', 'Mandar']],
    }),
  };

  function moneyLine(item) {
    const due = item.total - item.paid;
    if (item.informed) return { tone: 'check', text: `Pix de ${money(item.informed)} a conferir` };
    if (!item.paid) return { tone: 'due', text: `Sem sinal · ${money(due)} na retirada` };
    if (due > 0) return { tone: 'ok', text: `Sinal pago · falta ${money(due)}` };
    return { tone: 'ok', text: 'Tudo pago' };
  }

  function render() {
    const count = state.todos.length;
    $('#hoje-date').textContent = capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(new Date()));
    $('#hoje-title').textContent = count ? `${count} ${count === 1 ? 'coisa pede' : 'coisas pedem'} você` : 'Tudo em dia';
    const badge = $('#tab-badge');
    badge.textContent = count ? String(count) : '';
    badge.hidden = !count;
    $('.tab[data-tab="hoje"]').setAttribute('aria-label', count ? `Hoje, ${count} pedem você` : 'Hoje');

    $('#todo-list').innerHTML = state.todos.map((key, index) => {
      const todo = TODOS[key]();
      const buttons = todo.actions.map(([action, label], i) => `<button type="button" class="btn ${index === 0 && i === 0 ? 'btn-primary' : 'btn-quiet'}" data-action="${action}">${esc(label)}</button>`).join('');
      return `<li class="todo-item" data-todo="${key}"><span class="todo-icon" aria-hidden="true">${todo.icon}</span><div class="todo-text"><h3>${esc(todo.title)}</h3><p>${esc(todo.why)}</p></div><div class="todo-actions">${buttons}</div></li>`;
    }).join('');
    $('#todo-clear').hidden = count > 0;

    const open = state.deliveries.filter((item) => item.stage !== 'Entregue').length;
    const done = state.deliveries.length - open;
    const full = state.deliveries.length >= state.limit;
    $('#deliveries-note').textContent = `${state.deliveries.length} de ${state.limit} vagas${full ? ' · dia cheio' : ''}${done ? ` · ${done} ${done === 1 ? 'entregue' : 'entregues'}` : ''}`;
    $('#delivery-list').innerHTML = state.deliveries.map((item) => {
      const line = moneyLine(item);
      return `<li><button type="button" class="delivery${item.stage === 'Entregue' ? ' is-done' : ''}" data-delivery="${item.id}" aria-label="${esc(`${item.time}, ${item.product}, ${item.client}. ${item.stage}. ${line.text}. Abrir`)}">
        <span class="delivery-time">${esc(item.time)}</span>
        <span class="delivery-main"><strong>${esc(item.product)}</strong><span>${esc(item.client)}</span><span class="money money-${line.tone}">${esc(line.text)}</span></span>
        <span class="delivery-side"><img src="${photo(item.photo)}" alt="" width="48" height="48"><span class="stage stage-${item.stage.toLowerCase()}">${esc(item.stage)}</span></span>
      </button></li>`;
    }).join('');

    const upcoming = [
      { offset: 1, text: '1 entrega · Carla, 9h · bolo de 3 andares', full: false },
      { offset: 2, text: '3 entregas · Bia, Sônia, Patrícia', full: true },
      ...(state.camila === 'aceito' ? [{ offset: 5, text: '1 entrega · Camila, 11h · bolo de aniversário', full: false }] : []),
    ];
    $('#upcoming-list').innerHTML = upcoming.map((day) => `<li><span class="upcoming-day">${esc(capitalize(shortDay(day.offset)))}</span><span class="upcoming-text">${esc(day.text)}</span>${day.full ? '<span class="pill pill-full">cheio</span>' : ''}</li>`).join('');
  }

  // ---- Ações ----
  const toast = (text) => {
    const box = $('#toast');
    box.textContent = text; box.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { box.hidden = true; }, 4200);
  };
  function resolve(key, message) {
    state.todos = state.todos.filter((item) => item !== key);
    $('#sheet').open && $('#sheet').close();
    render();
    toast(state.todos.length ? message : `${message} Tudo em dia por agora.`);
    $('#hoje-title').focus({ preventScroll: true });
  }
  function openSheet(html) {
    $('#sheet-body').innerHTML = html;
    $('#sheet').showModal();
  }
  const juliana = () => state.deliveries.find((item) => item.id === 'juliana');

  function sheetFor(id) {
    const item = state.deliveries.find((entry) => entry.id === id);
    const line = moneyLine(item), next = NEXT[item.stage];
    const steps = ['Combinado', 'Fazendo', 'Pronto', 'Entregue'];
    const now = steps.indexOf(item.stage);
    openSheet(`<p class="sheet-kicker">Hoje, ${esc(item.time)} · retirada</p><h2 id="sheet-title">${esc(item.product)}</h2><p class="sheet-sub">para ${esc(item.client)}</p>
      <ol class="steps" aria-label="Andamento">${steps.map((step, i) => `<li class="${i < now ? 'is-past' : i === now ? 'is-now' : ''}"${i === now ? ' aria-current="step"' : ''}>${step}</li>`).join('')}</ol>
      ${next ? `<button type="button" class="btn btn-primary btn-wide" data-action="advance" data-id="${item.id}">${esc(next[0])}</button>` : '<p class="sheet-done">Entregue. Bom trabalho!</p>'}
      <dl class="ledger"><div><dt>Combinado</dt><dd>${esc(money(item.total))}</dd></div><div><dt>Você conferiu</dt><dd>${esc(money(item.paid))}</dd></div><div class="money-${line.tone}"><dt>Situação</dt><dd>${esc(line.text)}</dd></div></dl>
      <p class="sheet-note">${esc(item.note)}</p>`);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action], [data-delivery], [data-tab], [data-reset], [data-about-open]');
    if (!target) return;
    if (target.dataset.delivery) return sheetFor(target.dataset.delivery);
    if (target.dataset.tab) {
      if (target.dataset.tab === 'hoje') return;
      return toast('Nesta prévia só a tela Hoje funciona. As outras abas continuam como na demonstração.');
    }
    if (target.hasAttribute('data-reset')) { state = initialState(); render(); toast('Prévia reiniciada.'); return; }
    if (target.hasAttribute('data-about-open')) {
      $('#about-dialog-body').innerHTML = $('#about-panel').innerHTML.replace('id="about-title"', 'id="about-dialog-title"');
      return $('#about-dialog').showModal();
    }
    const action = target.dataset.action;
    if (action === 'pix-yes') { const item = juliana(); item.paid += item.informed; item.informed = 0; return resolve('pix-juliana', 'Sinal da Juliana conferido.'); }
    if (action === 'pix-no') return toast('Tudo bem. Fica aqui até cair na conta.');
    if (action === 'open-camila') return openSheet(`<p class="sheet-kicker">Pedido pelo link · ainda não ocupa vaga</p><h2 id="sheet-title">Bolo de aniversário</h2><p class="sheet-sub">para Camila · ${esc(weekday(5))}, 11h</p>
      <p class="sheet-quote">"Para 20 pessoas. Pode ser de ninho com morango?"</p><p class="sheet-note">${esc(capitalize(weekday(5)))} tem vaga: 0 de 3 ocupadas.</p>
      <div class="sheet-actions"><button type="button" class="btn btn-primary btn-wide" data-action="camila-accept">Aceitar pedido</button><button type="button" class="btn btn-quiet btn-wide" data-action="camila-quote">Ainda vou passar o preço</button><button type="button" class="text-link" data-action="camila-refuse">Recusar</button></div>`);
    if (action === 'camila-accept') { state.camila = 'aceito'; return resolve('link-camila', `Pedido da Camila aceito para ${weekday(5)}.`); }
    if (action === 'camila-quote') { state.camila = 'orcamento'; return resolve('link-camila', 'Fica em Pedidos, como orçamento, até você passar o preço.'); }
    if (action === 'camila-refuse') { state.camila = 'recusado'; return resolve('link-camila', 'Pedido recusado. A mensagem educada fica pronta para copiar.'); }
    if (action === 'open-roberta' || action === 'open-renata') {
      const roberta = action === 'open-roberta';
      const text = roberta ? `Oi, Roberta! Tudo bem? Passando para lembrar do restante da torta de limão: ${money(5500)}. Pode ser pelo Pix de sempre. Obrigada!` : 'Oi, Renata! Dá para fazer sem lactose, sim. O bolo de vinho com frutas vermelhas fica R$ 150,00. Posso reservar a data?';
      return openSheet(`<p class="sheet-kicker">Mensagem pronta</p><h2 id="sheet-title">${roberta ? `Cobrar ${esc(money(5500))} da Roberta` : 'Orçamento da Renata'}</h2><p class="sheet-sub">Copie e cole na conversa do WhatsApp. Na prévia, nada é enviado.</p>
        <p class="sheet-message">${esc(text)}</p><div class="sheet-actions"><button type="button" class="btn btn-primary btn-wide" data-action="${roberta ? 'roberta-copy' : 'renata-copy'}" data-text="${esc(text)}">Copiar mensagem</button></div>`);
    }
    if (action === 'roberta-copy' || action === 'renata-copy') {
      navigator.clipboard?.writeText(target.dataset.text).catch(() => {});
      return resolve(action === 'roberta-copy' ? 'cobrar-roberta' : 'orcamento-renata', action === 'roberta-copy' ? 'Mensagem copiada. Quando o dinheiro cair, marque na ficha.' : 'Mensagem copiada. O orçamento fica em Pedidos esperando a resposta.');
    }
    if (action === 'advance') {
      const item = state.deliveries.find((entry) => entry.id === target.dataset.id);
      const next = NEXT[item.stage];
      if (!next) return;
      item.stage = next[1];
      $('#sheet').close();
      render();
      toast(`${item.client}: ${next[1].toLowerCase()}.`);
      $(`[data-delivery="${item.id}"]`)?.focus();
    }
  });

  render();
})();
