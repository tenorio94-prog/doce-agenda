const switches = document.querySelectorAll('.ld-switch button');
const showSide = (side) => { document.querySelector('.ld-stage').dataset.side = side; for (const item of switches) item.setAttribute('aria-pressed', String(item.dataset.side === side)); };
for (const button of switches) button.addEventListener('click', () => showSide(button.dataset.side));
document.querySelector('.video-open').addEventListener('click', event => { const video = document.createElement('video'); video.controls = true; video.preload = 'none'; video.setAttribute('playsinline', ''); const source = document.createElement('source'); source.src = '/previa-landing/historia.mp4'; source.type = 'video/mp4'; const track = document.createElement('track'); track.kind = 'captions'; track.srclang = 'pt-BR'; track.label = 'Português'; track.src = '/previa-landing/legendas.vtt'; track.default = true; video.append(source, track); document.querySelector('.video-holder').append(video); event.currentTarget.hidden = true; video.play().catch(() => {}); });

// Movimento: a classe .anima só entra no fim, depois que tudo foi preparado. Se algo falhar antes,
// ou se a pessoa pediu menos movimento, a página fica parada e com todo o conteúdo à vista.
try {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 701px)');

  const ticker = document.querySelector('.ticker');
  const tickerTrack = ticker.querySelector('.ticker-track');
  const tickerList = ticker.querySelector('.ticker-list');
  const tickerCopy = tickerList.cloneNode(true);
  tickerCopy.setAttribute('aria-hidden', 'true');
  tickerList.after(tickerCopy);
  const pause = ticker.querySelector('.ticker-pause');
  const togglePause = () => pause.setAttribute('aria-pressed', String(ticker.classList.toggle('is-paused')));
  pause.addEventListener('click', togglePause);
  tickerTrack.addEventListener('click', () => { if (root.classList.contains('anima')) togglePause(); });

  const storyTrack = document.querySelector('.story-track');
  const scenes = [...storyTrack.querySelectorAll('figure')];
  const count = storyTrack.querySelector('.story-count');
  const steps = [...document.querySelectorAll('.how-grid article')];
  const screens = [...document.querySelectorAll('.how-screen img')];
  const stage = document.querySelector('.how-stage');
  let scene = -1, step = -1, queued = false;

  function showScene(index) {
    if (index === scene) return;
    scene = index;
    scenes.forEach((figure, i) => { figure.classList.toggle('is-active', i === index); figure.classList.toggle('is-past', i < index); });
    count.textContent = `0${index + 1}/0${scenes.length}`;
  }
  function showStep(index) {
    if (index === step) return;
    step = index;
    steps.forEach((article, i) => article.classList.toggle('is-active', i === index));
    screens.forEach((img, i) => img.classList.toggle('is-active', i === index));
  }
  function update() {
    queued = false;
    const box = storyTrack.getBoundingClientRect();
    const range = box.height - innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, -box.top / range)) : 0;
    showScene(Math.min(scenes.length - 1, Math.floor(progress * scenes.length)));
    // No celular o passo vale quando o topo passa de 70% da tela; no computador, quando o meio passa de 60%.
    let current = 0;
    steps.forEach((article, i) => {
      const r = article.getBoundingClientRect();
      if ((wide.matches ? r.top + r.height / 2 : r.top) < innerHeight * (wide.matches ? 0.6 : 0.7)) current = i;
    });
    showStep(current);
  }
  // No celular, o aparelho solta junto com o último passo, que fica à vista logo abaixo dele.
  const measure = () => stage.style.setProperty('--how-tail', wide.matches ? '0px' : `${steps.at(-1).offsetHeight}px`);
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { measure(); queue(); });

  const apply = () => {
    root.classList.toggle('anima', !reduce.matches);
    tickerTrack.tabIndex = reduce.matches ? 0 : -1;
    measure();
    update();
  };
  reduce.addEventListener('change', apply);
  apply();
} catch (error) {
  document.documentElement.classList.remove('anima');
}

// Demonstrações para tocar (Fase 2). Cada uma liga seus botões e ganha a classe is-live só se o preparo terminar;
// sem isso fica o retrato parado. Com movimento reduzido elas funcionam igual, só que sem animação.
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const brl = (cents) => `R$ ${(cents / 100).toLocaleString('pt-BR')}`;
const replay = (element, name) => { element.classList.remove(name); void element.offsetWidth; element.classList.add(name); };

// Dia cheio: arrastar um doce até o dia, ou tocar no doce e depois no dia. Cada dia aceita 3 pedidos.
try {
  const demo = document.querySelector('.week-demo');
  const days = [...demo.querySelectorAll('.wk-day')];
  const sweets = [...demo.querySelectorAll('.sweet')];
  const status = demo.querySelector('.try-status');
  const reset = demo.querySelector('.try-reset');
  const LIMIT = 3;
  const start = days.map((day) => Number(day.dataset.count));
  // Depois de um arraste, o navegador ainda manda um clique no mesmo doce: esse é ignorado.
  let chosen = null, dragged = null, draggedAt = 0;

  const paint = (day, count, fresh) => {
    const full = count >= LIMIT;
    day.dataset.count = count;
    day.querySelectorAll('.wk-slots i').forEach((slot, i) => slot.classList.toggle('is-on', i < count));
    day.classList.toggle('is-full', full);
    day.querySelector('.wk-state').textContent = full ? 'Dia cheio' : `${count}/${LIMIT}`;
    day.setAttribute('aria-label', `${day.dataset.day}: ${full ? 'dia cheio' : `${count} de ${LIMIT} pedidos`}`);
    if (fresh && full) replay(day, 'just-full');
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
    // Arrastar com o dedo ou o mouse: uma cópia segue o ponteiro e o dia embaixo dela se destaca.
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
  for (const day of days) day.addEventListener('click', () => {
    if (chosen) place(chosen, day);
    else status.textContent = 'Escolha um doce primeiro, ou arraste um doce até o dia.';
  });
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
} catch (error) { /* fica o retrato parado da semana */ }

// Recebi: o cartão vira Pago e o "Falta receber" desce contando.
try {
  const demo = document.querySelector('.money-demo');
  const total = demo.querySelector('.money-total');
  const sum = demo.querySelector('.money-sum');
  const status = demo.querySelector('.money-status');
  const reset = demo.querySelector('.try-reset');
  const cards = [...demo.querySelectorAll('.money-card')];
  const tags = cards.map((card) => card.querySelector('.t-tag').textContent);
  const due = () => cards.filter((card) => !card.classList.contains('is-paid')).reduce((left, card) => left + Number(card.dataset.cents), 0);
  let shown = due(), frame = 0;

  const countTo = (target) => {
    cancelAnimationFrame(frame);
    const from = shown, begin = performance.now(), length = still() ? 0 : 700;
    const step = (now) => {
      const t = length ? Math.min(1, (now - begin) / length) : 1;
      // Conta em reais inteiros durante a descida; o valor final é o exato.
      shown = t < 1 ? Math.round((from + (target - from) * (1 - (1 - t) ** 3)) / 100) * 100 : target;
      sum.textContent = brl(shown);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  const settle = () => {
    const left = due();
    countTo(left);
    total.classList.toggle('is-done', left === 0);
    status.textContent = left ? `Falta receber: ${brl(left)}.` : 'Tudo recebido.';
  };
  cards.forEach((card) => card.querySelector('.mc-btn').addEventListener('click', () => {
    card.classList.add('is-paid');
    card.querySelector('.t-tag').textContent = 'Pago';
    card.querySelector('.t-tag').classList.add('is-paid');
    reset.hidden = false;
    settle();
    (cards.find((item) => !item.classList.contains('is-paid'))?.querySelector('.mc-btn') ?? reset).focus({ preventScroll: true });
  }));
  reset.addEventListener('click', () => {
    cards.forEach((card, i) => {
      card.classList.remove('is-paid');
      card.querySelector('.t-tag').textContent = tags[i];
      card.querySelector('.t-tag').classList.remove('is-paid');
    });
    reset.hidden = true;
    settle();
    status.textContent = '';
    cards[0].querySelector('.mc-btn').focus({ preventScroll: true });
  });
  for (const card of cards) card.querySelector('.mc-btn').disabled = false;
  demo.classList.add('is-live');
} catch (error) { /* fica o retrato parado do dinheiro */ }

// Link da cliente: "Enviar pedido" faz o pedido voar até o lado da confeiteira, onde aparece em Para decidir.
try {
  const visual = document.querySelector('.link-visual');
  const stage = visual.querySelector('.ld-stage');
  const send = stage.querySelector('.m-send');
  const see = stage.querySelector('.m-see');
  const flyer = stage.querySelector('.ld-flyer');
  const banner = stage.querySelector('.m-banner');
  const status = visual.querySelector('.ld-status');
  const again = visual.querySelector('.ld-replay');
  const bakerTab = visual.querySelector('.ld-switch [data-side="baker"]');
  const begin = () => { stage.classList.remove('s4', 's5', 's6'); showSide('client'); again.hidden = true; status.textContent = ''; };

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
      ], { duration: 850, easing: 'cubic-bezier(.45,0,.25,1)' }).finished;
      flyer.classList.remove('is-flying');
      bakerTab.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 300 });
    }
    stage.classList.add('s5');
    showSide('baker');
    if (!still()) banner.animate([{ opacity: 0, transform: 'translateY(-18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1.2)' });
    status.textContent = 'Pedido enviado. Chegou para a confeiteira em Para decidir.';
    again.hidden = false;
    see.focus({ preventScroll: true });
  });
  see.addEventListener('click', () => { stage.classList.add('s6'); status.textContent = 'Ficha aberta: o que ela pediu, responder, aceitar ou recusar.'; });
  again.addEventListener('click', () => { begin(); send.focus({ preventScroll: true }); });
  // Com os botões vivos, a demonstração deixa de ser uma imagem única para o leitor de tela.
  stage.removeAttribute('role');
  stage.removeAttribute('aria-label');
  begin();
  send.disabled = false;
  see.disabled = false;
  visual.classList.add('is-live');
} catch (error) { /* fica o retrato com os dois lados */ }
