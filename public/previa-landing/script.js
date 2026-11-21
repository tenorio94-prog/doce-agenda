// Demonstrações interativas da landing: Dia cheio, Recebi e Link da cliente (Cliente | Você).
// Com JavaScript desativado, a página permanece estática e legível sem controles que não respondem.
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const brl = (cents) => `R$ ${(cents / 100).toLocaleString('pt-BR')}`;
const replay = (element, name) => { element.classList.remove(name); void element.offsetWidth; element.classList.add(name); };

// 1. Dia cheio: arrastar um doce até o dia, ou tocar no doce e depois no dia. Limite de 3 pedidos por dia.
try {
  const demo = document.querySelector('.week-demo');
  const days = [...demo.querySelectorAll('.wk-day')];
  const sweets = [...demo.querySelectorAll('.sweet')];
  const status = demo.querySelector('.try-status');
  const reset = demo.querySelector('.try-reset');
  const LIMIT = 3;
  const start = days.map((day) => Number(day.dataset.count));
  let chosen = null, dragged = null, draggedAt = 0;
  const stamp = demo.querySelector('.wk-stamp');
  const thump = (day) => {
    if (still()) return;
    const grid = stamp.parentElement.getBoundingClientRect(), cell = day.getBoundingClientRect(), half = stamp.offsetWidth / 2;
    const x = Math.min(Math.max(cell.left - grid.left + cell.width / 2, half), grid.width - half) - half;
    const at = (scale, turn) => `translate(${x.toFixed(1)}px, -50%) scale(${scale}) rotate(${turn}deg)`;
    for (const running of stamp.getAnimations()) running.cancel();
    stamp.animate([
      { opacity: 0, transform: at(2.2, -18) },
      { opacity: 1, transform: at(1, -8), offset: 0.2 },
      { opacity: 1, transform: at(1, -8), offset: 0.8 },
      { opacity: 0, transform: at(1, -8) },
    ], { duration: 1600, easing: 'ease-out' });
  };

  const paint = (day, count, fresh) => {
    const full = count >= LIMIT;
    day.dataset.count = count;
    day.querySelectorAll('.wk-slots i').forEach((slot, i) => slot.classList.toggle('is-on', i < count));
    day.classList.toggle('is-full', full);
    day.querySelector('.wk-state').textContent = full ? 'Dia cheio' : `${count}/${LIMIT}`;
    day.setAttribute('aria-label', `${day.dataset.day}: ${full ? 'dia cheio' : `${count} de ${LIMIT} pedidos`}`);
    if (fresh && full) { replay(day, 'just-full'); thump(day); }
  };
  const choose = (sweet) => {
    chosen = sweet;
    for (const item of sweets) item.setAttribute('aria-pressed', String(item === sweet));
    demo.classList.toggle('is-choosing', Boolean(sweet));
    if (sweet) status.textContent = `${sweet.textContent}: agora toque em um dia.`;
  };
  const place = (sweet, day) => {
    const count = Number(day.dataset.count);
    if (count >= LIMIT) {
      replay(day, 'is-shake');
      status.textContent = `Dia cheio ${day.dataset.em}. Escolha outro dia.`;
      return;
    }
    paint(day, count + 1, true);
    sweet.hidden = true;
    choose(null);
    reset.hidden = false;
    status.textContent = `${sweet.textContent} entrou ${day.dataset.em}.${count + 1 >= LIMIT ? ' Dia cheio!' : ''}`;
    (sweets.find((item) => !item.hidden) ?? reset).focus({ preventScroll: true });
  };

  for (const sweet of sweets) {
    sweet.addEventListener('click', () => {
      if (dragged === sweet && performance.now() - draggedAt < 400) { dragged = null; return; }
      choose(chosen === sweet ? null : sweet);
    });
    sweet.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const box = sweet.getBoundingClientRect();
      const x0 = event.clientX, y0 = event.clientY;
      let ghost = null, over = null;
      sweet.setPointerCapture(event.pointerId);
      const move = (e) => {
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!ghost) {
          if (Math.hypot(dx, dy) < 6) return;
          ghost = sweet.cloneNode(true);
          ghost.className = 'sweet sweet-ghost';
          ghost.setAttribute('aria-hidden', 'true');
          ghost.style.width = `${box.width}px`;
          document.body.append(ghost);
          sweet.classList.add('is-lifted');
        }
        ghost.style.transform = `translate(${box.left + dx}px, ${box.top + dy}px) rotate(-3deg)`;
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wk-day');
        const next = target && demo.contains(target) ? target : null;
        if (next !== over) { over?.classList.remove('is-over'); over = next; over?.classList.add('is-over'); }
      };
      const end = (e) => {
        sweet.removeEventListener('pointermove', move);
        sweet.removeEventListener('pointerup', end);
        sweet.removeEventListener('pointercancel', end);
        if (!ghost) return;
        dragged = sweet;
        draggedAt = performance.now();
        ghost.remove();
        sweet.classList.remove('is-lifted');
        over?.classList.remove('is-over');
        if (over && e.type === 'pointerup') place(sweet, over);
      };
      sweet.addEventListener('pointermove', move);
      sweet.addEventListener('pointerup', end);
      sweet.addEventListener('pointercancel', end);
    });
  }
  for (const day of days) {
    day.addEventListener('click', () => {
      if (chosen) place(chosen, day);
      else status.textContent = 'Escolha um doce primeiro, ou arraste um doce até o dia.';
    });
  }
  reset.addEventListener('click', () => {
    days.forEach((day, i) => paint(day, start[i], false));
    for (const sweet of sweets) sweet.hidden = false;
    choose(null);
    status.textContent = '';
    reset.hidden = true;
    sweets[0].focus({ preventScroll: true });
  });
  for (const control of [...sweets, ...days]) control.disabled = false;
  demo.classList.add('is-live');
} catch { /* retrato estático */ }

// 2. Recebi: marca o pedido como Pago e atualiza o "Falta receber".
try {
  const demo = document.querySelector('.money-demo');
  const total = demo.querySelector('.money-total');
  const sum = demo.querySelector('.money-sum');
  const status = demo.querySelector('.money-status');
  const reset = demo.querySelector('.try-reset');
  const cards = [...demo.querySelectorAll('.money-card')];
  const tags = cards.map((card) => card.querySelector('.t-tag').textContent);
  const label = total.querySelector('span');
  const due = () => cards.filter((card) => !card.classList.contains('is-paid')).reduce((left, card) => left + Number(card.dataset.cents), 0);
  let shown = due(), frame = 0;

  const countTo = (target) => {
    cancelAnimationFrame(frame);
    const from = shown, begin = performance.now(), length = still() ? 0 : 650;
    const step = (now) => {
      const t = length ? Math.min(1, (now - begin) / length) : 1;
      shown = t < 1 ? Math.round((from + (target - from) * (1 - (1 - t) ** 3)) / 100) * 100 : target;
      const done = t >= 1 && target === 0;
      sum.textContent = done ? 'Tudo recebido' : brl(shown);
      label.hidden = done;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  const settle = () => {
    const left = due();
    countTo(left);
    total.classList.toggle('is-done', left === 0);
    status.textContent = left ? `Falta receber: ${brl(left)}.` : 'Tudo recebido.';
    return left;
  };
  const sprinkles = ['#1D449B', '#E6EEFA', '#161D2B', '#166534', '#E3F4E8', '#FEF2D4'];
  const celebrate = () => {
    if (still()) return;
    for (let i = 0; i < 24; i++) {
      const bit = document.createElement('i');
      bit.className = 'granulado';
      bit.setAttribute('aria-hidden', 'true');
      bit.style.background = sprinkles[i % sprinkles.length];
      total.append(bit);
      const angle = -Math.PI * (0.08 + Math.random() * 0.84), reach = 64 + Math.random() * 96;
      const dx = Math.cos(angle) * reach, dy = Math.sin(angle) * reach, spin = Math.random() * 540 - 270;
      bit.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${spin.toFixed(0)}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${(dx * 1.2).toFixed(1)}px, ${(dy + 110).toFixed(1)}px) rotate(${(spin * 1.5).toFixed(0)}deg)`, opacity: 0 },
      ], { duration: 1000 + Math.random() * 450, easing: 'cubic-bezier(.2,.75,.35,1)' }).finished.then(() => bit.remove(), () => bit.remove());
    }
  };
  cards.forEach((card) => card.querySelector('.mc-btn').addEventListener('click', () => {
    card.classList.add('is-paid');
    card.querySelector('.t-tag').hidden = true;
    reset.hidden = false;
    if (settle() === 0) celebrate();
    (cards.find((item) => !item.classList.contains('is-paid'))?.querySelector('.mc-btn') ?? reset).focus({ preventScroll: true });
  }));
  reset.addEventListener('click', () => {
    cards.forEach((card, i) => {
      card.classList.remove('is-paid');
      card.querySelector('.t-tag').textContent = tags[i];
      card.querySelector('.t-tag').hidden = false;
    });
    reset.hidden = true;
    settle();
    status.textContent = '';
    cards[0].querySelector('.mc-btn').focus({ preventScroll: true });
  });
  for (const card of cards) card.querySelector('.mc-btn').disabled = false;
  demo.classList.add('is-live');
} catch { /* retrato estático */ }

// 3. Link da cliente: alterna entre Cliente e Você e simula o pedido chegando para decidir.
try {
  const visual = document.querySelector('.link-visual');
  const stage = visual.querySelector('.ld-stage');
  const switches = visual.querySelectorAll('.ld-switch button');
  const showSide = (side) => {
    stage.dataset.side = side;
    for (const item of switches) item.setAttribute('aria-pressed', String(item.dataset.side === side));
  };
  for (const button of switches) button.addEventListener('click', () => showSide(button.dataset.side));

  const send = stage.querySelector('.m-send');
  const see = stage.querySelector('.m-see');
  const flyer = stage.querySelector('.ld-flyer');
  const banner = stage.querySelector('.m-banner');
  const status = visual.querySelector('.ld-status');
  const again = visual.querySelector('.ld-replay');
  const bakerTab = visual.querySelector('.ld-switch [data-side="baker"]');
  const accept = stage.querySelector('.m-accept'), refuse = stage.querySelector('.m-refuse'), zap = stage.querySelector('.m-zap');
  const feedback = stage.querySelector('.m-feedback');
  const begin = () => { stage.classList.remove('s4', 's5', 's6', 's7'); showSide('client'); again.hidden = true; status.textContent = ''; feedback.textContent = ''; };
  const say = (text) => { feedback.textContent = text; status.textContent = text; };

  accept.addEventListener('click', () => {
    stage.classList.add('s7');
    status.textContent = 'Pedido aceito: entrou na agenda no sábado, 24/10, às 11h.';
    again.focus({ preventScroll: true });
  });
  zap.addEventListener('click', () => say('No app, abre a conversa com a Camila no WhatsApp. Quem envia é você.'));
  refuse.addEventListener('click', () => say('No app, você recusa com um toque e pode avisar a Camila pelo WhatsApp.'));

  send.addEventListener('click', async () => {
    if (stage.classList.contains('s4')) return;
    const from = send.getBoundingClientRect();
    stage.classList.add('s4');
    if (!still()) {
      const base = stage.getBoundingClientRect(), to = bakerTab.getBoundingClientRect();
      flyer.classList.add('is-flying');
      const x0 = from.left - base.left + (from.width - flyer.offsetWidth) / 2, y0 = from.top - base.top;
      const x1 = to.left - base.left + (to.width - flyer.offsetWidth) / 2, y1 = to.top - base.top + (to.height - flyer.offsetHeight) / 2;
      await flyer.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.9)`, opacity: 0 },
        { transform: `translate(${x0}px, ${y0 - 40}px) scale(1)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x1}px, ${y1}px) scale(.6)`, opacity: 0.85 },
      ], { duration: 800, easing: 'cubic-bezier(.45,0,.25,1)' }).finished;
      flyer.classList.remove('is-flying');
      bakerTab.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 280 });
    }
    stage.classList.add('s5');
    showSide('baker');
    if (!still()) banner.animate([{ opacity: 0, transform: 'translateY(-14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1.2)' });
    status.textContent = 'Pedido enviado. Chegou para a confeiteira em Para decidir.';
    again.hidden = false;
    see.focus({ preventScroll: true });
  });
  see.addEventListener('click', () => { stage.classList.add('s6'); status.textContent = 'Ficha aberta: o que ela pediu, responder, aceitar ou recusar.'; });
  again.addEventListener('click', () => { begin(); send.focus({ preventScroll: true }); });

  stage.removeAttribute('role');
  stage.removeAttribute('aria-label');
  begin();
  send.disabled = false;
  see.disabled = false;
  for (const button of [accept, refuse, zap]) button.disabled = false;
  visual.classList.add('is-live');
} catch { /* retrato com os dois lados */ }
