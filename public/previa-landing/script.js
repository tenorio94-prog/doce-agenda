const switches = document.querySelectorAll('.ld-switch button');
const showSide = (side) => { document.querySelector('.ld-stage').dataset.side = side; for (const item of switches) item.setAttribute('aria-pressed', String(item.dataset.side === side)); };
for (const button of switches) button.addEventListener('click', () => showSide(button.dataset.side));
// Vídeo em pé: abre numa janela por cima da página, do tamanho da tela, e pausa ao fechar.
document.querySelector('.video-open').addEventListener('click', () => {
  let dialog = document.querySelector('.video-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'video-dialog';
    dialog.setAttribute('aria-label', 'Vídeo: a semana da Lu');
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'video-close'; close.textContent = 'Fechar';
    const video = document.createElement('video');
    video.controls = true; video.preload = 'none'; video.width = 1080; video.height = 1920;
    video.setAttribute('playsinline', ''); video.setAttribute('aria-describedby', 'video-roteiro');
    const source = document.createElement('source');
    source.src = '/previa-landing/a-semana-da-lu.mp4'; source.type = 'video/mp4';
    video.append(source);
    dialog.append(close, video);
    document.body.append(dialog);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => video.pause());
    // Sem rede ou sem suporte ao vídeo: diz o que houve em vez de ficar uma tela preta.
    const failed = () => {
      if (dialog.querySelector('.video-error')) return;
      const note = document.createElement('p');
      note.className = 'video-error'; note.setAttribute('role', 'alert');
      note.textContent = 'Não deu para carregar o vídeo agora. A história está nesta página, logo acima; tente o vídeo mais tarde.';
      dialog.append(note);
    };
    source.addEventListener('error', failed);
    video.addEventListener('error', failed);
  }
  dialog.showModal();
  dialog.querySelector('video').play().catch(() => {});
});

// Movimento: a classe .anima só entra no fim, depois que tudo foi preparado. Se algo falhar antes,
// ou se a pessoa pediu menos movimento, a página fica parada e com todo o conteúdo à vista.
try {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 701px)');

  const storyTrack = document.querySelector('.story-track');
  const scenes = [...storyTrack.querySelectorAll('figure')];
  const captions = scenes.map((figure) => figure.querySelector('figcaption'));
  const count = storyTrack.querySelector('.story-count');
  const sky = document.querySelector('.story-sky');
  const day = storyTrack.querySelector('.story-day');
  const when = storyTrack.querySelector('.story-when');
  const bar = storyTrack.querySelector('.story-bar i');
  const cakeTrack = document.querySelector('.cake-track');
  const cakeRows = [...cakeTrack.querySelectorAll('.cake-layer')];
  const cakeLabels = cakeRows.map((row) => row.querySelector('.cake-label'));
  const cakeList = cakeTrack.querySelector('.cake');
  let cakeShift = cakeRows.map(() => [0, 0]);
  const painted = [...scenes, ...captions, sky, day, bar, ...cakeRows, ...cakeLabels.filter(Boolean), cakeList];
  let scene = -1, queued = false;

  function showScene(index) {
    if (index === scene) return;
    scene = index;
    scenes.forEach((figure, i) => { figure.classList.toggle('is-active', i === index); figure.classList.toggle('is-past', i < index); });
    count.textContent = `0${index + 1}/0${scenes.length}`;
    when.textContent = ['de manhã', '11h', 'à noite'][index];
  }
  // As cenas acompanham o dedo: cada troca ocupa um trecho da rolagem e anoitece na última.
  const between = (p, a, b) => { const t = Math.min(1, Math.max(0, (p - a) / (b - a))); return t * t * (3 - 2 * t); };
  function paintStory(progress) {
    const second = between(progress, 0.2, 0.38), third = between(progress, 0.56, 0.74);
    // Como uma tira de filme: a cena seguinte entra pela direita, inclinada, e a anterior sai pela esquerda.
    const position = second + third;
    scenes.forEach((figure, i) => {
      const offset = i - position;
      figure.style.opacity = Math.max(0, 1 - Math.abs(offset) * 0.6).toFixed(3);
      figure.style.transform = `translate3d(${(offset * 112).toFixed(2)}%, 0, 0) rotate(${(offset * 5).toFixed(2)}deg)`;
      // Só a legenda da cena atual fica legível; as vizinhas somem antes de chegar à borda da tela.
      captions[i].style.opacity = Math.max(0, 1 - Math.abs(offset) * 2.5).toFixed(3);
    });
    sky.style.opacity = third.toFixed(3);
    day.classList.toggle('is-night', third >= 0.5);
    // O dia gigante vira de segunda a sábado enquanto a semana passa entre a primeira e a segunda cena.
    const today = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][third > 0 ? 5 : Math.round(second * 5)];
    if (day.dataset.day !== today) day.dataset.day = today;
    day.style.transform = `translate3d(0, ${(progress * -18).toFixed(1)}px, 0)`;
    bar.style.transform = `scaleX(${progress.toFixed(3)})`;
    showScene(third >= 0.5 ? 2 : second >= 0.5 ? 1 : 0);
  }
  // Bolo: mede o bolo aberto (como ele fica parado) e calcula quanto cada camada anda para encostar na de baixo,
  // pelo topo e pela base de cada desenho (data-top/data-base, em unidades do desenho de 240 de largura).
  function measureCake() {
    const images = cakeRows.map((row) => row.querySelector('img'));
    const scale = images[0].clientWidth / 240;
    const tops = images.map((img, i) => cakeRows[i].offsetTop + img.offsetTop);
    const closed = [];
    for (let i = cakeRows.length - 1; i >= 0; i--) {
      closed[i] = i === cakeRows.length - 1 ? tops[i] : closed[i + 1] + (Number(cakeRows[i + 1].dataset.top) - Number(cakeRows[i].dataset.base)) * scale;
    }
    // Montado, o bolo fica no meio do espaço que ele ocupa aberto: abre do centro para cima e para baixo. No celular ele
    // começa logo abaixo do texto e abre para baixo, sem o vão vazio entre o título e o bolo.
    const spare = (tops.at(-1) - tops[0]) - (closed.at(-1) - closed[0]), lift = wide.matches ? spare / 2 : spare;
    const center = cakeRows[0].parentElement.clientWidth / 2 - (images[0].offsetLeft + images[0].clientWidth / 2);
    cakeShift = cakeRows.map((row, i) => [center, closed[i] - tops[i] - lift]);
  }
  function paintCake(progress) {
    const open = between(progress, 0.08, 0.62), shut = 1 - open, last = cakeRows.length - 1;
    // Montado ele aparece maior e encolhe enquanto abre.
    cakeList.style.transform = `scale(${(1 + shut * 0.3).toFixed(3)})`;
    cakeRows.forEach((row, i) => {
      const [dx, dy] = cakeShift[i];
      const tilt = i === last ? 0 : Math.sin(open * Math.PI) * (i % 2 ? 2.5 : -2.5);
      row.style.transform = `translate3d(${(dx * shut).toFixed(1)}px, ${(dy * shut).toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
    });
    cakeLabels.forEach((label, i) => {
      if (!label) return;
      const shown = between(open, 0.45 + i * 0.09, 0.75 + i * 0.06);
      label.style.opacity = shown.toFixed(3);
      label.style.transform = `translate3d(${(-(1 - shown) * 14).toFixed(1)}px, 0, 0)`;
    });
  }
  // Barra fixa no celular: aparece enquanto o botão principal do topo não está à vista (em celular baixo ele fica
  // abaixo da foto, então a barra já vem na primeira tela) e some no bolo parado, em toda a semana da Lu (o botão do
  // vídeo fica no pé da cena), nas demonstrações para tocar (ficava na zona do polegar, sobre Recebi e Aceitar) e quando
  // chega o convite do fim. Escondida, fica fora do teclado e do leitor de tela.
  const cta = document.querySelector('.float-cta');
  const heroPrimary = document.querySelector('.hero-end .primary');
  const closing = document.querySelector('.closing-new');
  const demos = [...document.querySelectorAll('.try, #link-cliente')];
  const narrow = matchMedia('(max-width: 700px)');
  let ctaShown = null;
  cta.hidden = false;
  function placeCta() {
    const pinned = (box) => box.top <= 1 && box.bottom >= innerHeight - 1;
    const inView = (box) => box.top < innerHeight && box.bottom > 0;
    const primary = heroPrimary.getBoundingClientRect();
    const heroHidden = primary.bottom < 0 || primary.top > innerHeight - cta.offsetHeight;
    const show = narrow.matches && heroHidden && closing.getBoundingClientRect().top > innerHeight
      && !inView(storyTrack.getBoundingClientRect()) && !pinned(cakeTrack.getBoundingClientRect())
      && !demos.some((section) => inView(section.getBoundingClientRect()));
    if (show === ctaShown) return;
    ctaShown = show;
    cta.classList.toggle('is-shown', show);
    cta.inert = !show;
  }
  function update() {
    queued = false;
    placeCta();
    const box = storyTrack.getBoundingClientRect();
    const range = box.height - innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, -box.top / range)) : 0;
    if (!root.classList.contains('anima')) return;
    if (box.top < innerHeight * 1.5 && box.bottom > -innerHeight / 2) paintStory(progress);
    const cakeBox = cakeTrack.getBoundingClientRect();
    if (cakeBox.top < innerHeight * 1.5 && cakeBox.bottom > -innerHeight / 2) {
      const cakeRange = cakeBox.height - innerHeight;
      paintCake(cakeRange > 0 ? Math.min(1, Math.max(0, -cakeBox.top / cakeRange)) : 0);
    }
  }
  const measure = () => { if (root.classList.contains('anima')) measureCake(); };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { measure(); queue(); });

  const apply = () => {
    root.classList.toggle('anima', !reduce.matches);
    if (reduce.matches) for (const element of painted) element.removeAttribute('style');
    measure();
    update();
  };
  reduce.addEventListener('change', apply);
  apply();
  // As letras chegam depois e mudam a altura das legendas: mede de novo.
  document.fonts?.ready.then(() => { measure(); queue(); });
  addEventListener('load', () => { measure(); queue(); });
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
  // O carimbo "Dia cheio" bate sobre a coluna que lotou e some; o texto da coluna continua dizendo.
  const stamp = demo.querySelector('.wk-stamp');
  const thump = (day) => {
    if (still()) return;
    const grid = stamp.parentElement.getBoundingClientRect(), cell = day.getBoundingClientRect(), half = stamp.offsetWidth / 2;
    const x = Math.min(Math.max(cell.left - grid.left + cell.width / 2, half), grid.width - half) - half;
    const at = (scale, turn) => `translate(${x.toFixed(1)}px, -50%) scale(${scale}) rotate(${turn}deg)`;
    for (const running of stamp.getAnimations()) running.cancel();
    stamp.animate([
      { opacity: 0, transform: at(2.3, -20) },
      { opacity: 1, transform: at(1, -9), offset: 0.2 },
      { opacity: 1, transform: at(1, -9), offset: 0.8 },
      { opacity: 0, transform: at(1, -9) },
    ], { duration: 1700, easing: 'ease-out' });
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
  const label = total.querySelector('span');
  const due = () => cards.filter((card) => !card.classList.contains('is-paid')).reduce((left, card) => left + Number(card.dataset.cents), 0);
  let shown = due(), frame = 0;

  const countTo = (target) => {
    cancelAnimationFrame(frame);
    const from = shown, begin = performance.now(), length = still() ? 0 : 700;
    const step = (now) => {
      const t = length ? Math.min(1, (now - begin) / length) : 1;
      // Conta em reais inteiros durante a descida; o valor final é o exato.
      shown = t < 1 ? Math.round((from + (target - from) * (1 - (1 - t) ** 3)) / 100) * 100 : target;
      // Zerou: no lugar de "Falta receber R$ 0", a frase inteira.
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
  // Granulado nas cores da marca, saindo do total, só quando tudo foi recebido.
  const sprinkles = ['#f7c5d0', '#b0244a', '#fbe9a9', '#d3e7c1', '#3a1220', '#e98aa3'];
  const celebrate = () => {
    if (still()) return;
    for (let i = 0; i < 30; i++) {
      const bit = document.createElement('i');
      bit.className = 'granulado';
      bit.setAttribute('aria-hidden', 'true');
      bit.style.background = sprinkles[i % sprinkles.length];
      total.append(bit);
      const angle = -Math.PI * (0.08 + Math.random() * 0.84), reach = 70 + Math.random() * 110;
      const dx = Math.cos(angle) * reach, dy = Math.sin(angle) * reach, spin = Math.random() * 540 - 270;
      bit.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${spin.toFixed(0)}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${(dx * 1.2).toFixed(1)}px, ${(dy + 130).toFixed(1)}px) rotate(${(spin * 1.5).toFixed(0)}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.75,.35,1)' }).finished.then(() => bit.remove(), () => bit.remove());
    }
  };
  cards.forEach((card) => card.querySelector('.mc-btn').addEventListener('click', () => {
    // O carimbo "Pago" fica no lugar do botão; a etiqueta sai para não dizer "Pago" duas vezes.
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
  const accept = stage.querySelector('.m-accept'), refuse = stage.querySelector('.m-refuse'), zap = stage.querySelector('.m-zap');
  const feedback = stage.querySelector('.m-feedback');
  const begin = () => { stage.classList.remove('s4', 's5', 's6', 's7'); showSide('client'); again.hidden = true; status.textContent = ''; feedback.textContent = ''; };
  // Na ficha: Aceitar é o último passo (o pedido entra no sábado); responder e recusar dizem o que o app faz de verdade.
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
  for (const button of [accept, refuse, zap]) button.disabled = false;
  visual.classList.add('is-live');
} catch (error) { /* fica o retrato com os dois lados */ }
