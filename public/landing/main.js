// Landing: componentes da Web Awesome (webawesome.com) e animações da Motion (motion.dev).
// Montado em /landing/landing.js pelo build. Sem a classe "motion" no <html>
// (quem prefere menos movimento), tudo já aparece parado, no estado final das demonstrações.
import '../ui/wa-setup.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/details/details.js';
import { inView, stagger } from 'motion';
import { animate } from 'motion/mini';

window.landingMotion = true;
const moving = document.documentElement.classList.contains('motion');
const springy = { type: 'spring', bounce: 0.45, duration: 0.7 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function popCard(card, delay) {
  animate(card, { opacity: [0, 1] }, { duration: 0.3, delay });
  animate(card, { scale: [0.6, 1] }, { ...springy, delay });
}

function dropStamp(stamp, delay) {
  animate(stamp, { opacity: [0, 1] }, { duration: 0.2, delay });
  animate(stamp, { scale: [2.2, 1] }, { type: 'spring', bounce: 0.5, duration: 0.6, delay });
}

// Um "toque" de dedo num botão desenhado.
function tap(el) {
  if (el) animate(el, { scale: [1, 0.92, 1] }, { duration: 0.32 });
}

// Topo: a foto entra e o "Pago" bate uma vez no pedido preso na bancada. É o único movimento do topo.
function revealHero() {
  const bench = document.querySelector('.hero-bench .bench');
  if (!bench) return;
  const order = bench.querySelector('.bench-order');
  if (order) { animate(order, { opacity: [0, 1] }, { duration: 0.3, delay: 0.5 }); animate(order, { y: [24, 0] }, { type: 'spring', bounce: 0.3, duration: 0.7, delay: 0.5 }); }
  const stamp = bench.querySelector('.stamp-mini');
  if (stamp) dropStamp(stamp, 1.1);
}

// Link e Como funciona: cada bloco entra assim que começa a aparecer na tela.
function revealStep(step) {
  animate(step.querySelectorAll('.step-copy > *, .link-copy > *'), { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, delay: stagger(0.05), ease: [0.2, 0.8, 0.2, 1] });
  const visuals = step.querySelectorAll('.phone, .mock-card, .ld-stage');
  animate(visuals, { opacity: [0, 1] }, { duration: 0.35, delay: stagger(0.1, { startDelay: 0.05 }) });
  animate(visuals, { y: [40, 0] }, { type: 'spring', bounce: 0.2, duration: 0.8, delay: stagger(0.1, { startDelay: 0.05 }) });
}

// Link de encomenda: a cliente escolhe e envia; o pedido chega no topo da Agenda da confeiteira,
// que abre a ficha ("O que ela pediu") e decide. Legendas da lista acompanham cada parte.
function setupLinkDemo(root) {
  const stage = root.querySelector('.ld-stage');
  const flyer = stage.querySelector('.ld-flyer');
  const replay = root.querySelector('.ld-replay');
  const switches = [...root.querySelectorAll('.ld-switch button')];
  const captions = [...document.querySelectorAll('.link-flow li')];
  const finalState = [1, 2, 3, 5, 6];
  let run = 0;
  let played = false;

  const setStage = (steps) => {
    stage.classList.remove('s1', 's2', 's3', 's4', 's5', 's6');
    stage.classList.add(...steps.map((n) => `s${n}`));
  };
  const showSide = (side) => {
    stage.dataset.side = side;
    switches.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.side === side)));
  };
  const caption = (index) => captions.forEach((li, n) => li.classList.toggle('is-on', n === index));
  const oneAtATime = () => switches.length > 0 && getComputedStyle(switches[0].parentElement).display !== 'none';

  // A solicitação viaja de um celular ao outro (lado a lado) ou cai no celular da confeiteira (um de cada vez).
  async function fly() {
    const box = stage.getBoundingClientRect();
    flyer.style.display = 'flex';
    const w = flyer.offsetWidth;
    if (oneAtATime()) {
      showSide('baker');
      const to = stage.querySelector('.ld-baker .mock-phone').getBoundingClientRect();
      const x = to.left - box.left + (to.width - w) / 2;
      const y = to.top - box.top + 90;
      animate(flyer, { transform: [`translate(${x}px, ${y - 40}px)`, `translate(${x}px, ${y}px)`], opacity: [0, 1, 1, 0] }, { duration: 1.1, ease: 'easeOut' });
    } else {
      const from = stage.querySelector('.ld-client .mock-phone').getBoundingClientRect();
      const to = stage.querySelector('.ld-baker .mock-phone').getBoundingClientRect();
      const x0 = from.left - box.left + (from.width - w) / 2;
      const x1 = to.left - box.left + (to.width - w) / 2;
      const y0 = from.top - box.top + from.height * 0.55;
      const y1 = to.top - box.top + 90;
      animate(flyer, { transform: [`translate(${x0}px, ${y0}px)`, `translate(${x1}px, ${y1}px)`], opacity: [0, 1, 1, 0] }, { duration: 1.2, ease: [0.4, 0, 0.2, 1] });
    }
    await sleep(1050);
    flyer.style.display = 'none';
  }

  async function play() {
    const id = ++run;
    const still = async (ms) => { await sleep(ms); return id === run; };
    replay.hidden = true;
    setStage([]);
    showSide('client');
    caption(0);
    if (!await still(900)) return;
    tap(stage.querySelector('.m-product'));
    setStage([1]);
    if (!await still(900)) return;
    tap(stage.querySelector('.m-pick'));
    setStage([1, 2]);
    if (!await still(900)) return;
    setStage([1, 2, 3]);
    if (!await still(800)) return;
    tap(stage.querySelector('.m-form .m-btn'));
    if (!await still(350)) return;
    setStage([1, 2, 3, 4]);
    caption(1);
    // Um de cada vez: mostra a confirmação da cliente antes de trocar de lado.
    if (oneAtATime() && !await still(1500)) return;
    await fly();
    if (id !== run) return;
    setStage([1, 2, 3, 4, 5]);
    popCard(stage.querySelector('.m-banner'), 0);
    if (!await still(1600)) return;
    tap(stage.querySelector('.m-banner .m-btn'));
    if (!await still(350)) return;
    setStage([1, 2, 3, 4, 6]);
    caption(2);
    popCard(stage.querySelector('.m-review'), 0);
    if (!await still(1200)) return;
    replay.hidden = false;
  }

  // Ver um lado à mão interrompe a sequência e mostra o resultado final.
  switches.forEach((button) => button.addEventListener('click', () => {
    run++;
    flyer.style.display = 'none';
    setStage(finalState);
    caption(-1);
    showSide(button.dataset.side);
    replay.hidden = false;
  }));
  replay.addEventListener('click', play);
  inView(root, () => {
    if (!played) { played = true; play(); }
  }, { amount: 0.4 });
}

// Semana: na hora da entrega, um toque no ✓ risca o pedido como entregue; depois ele volta, enquanto está na tela.
function setupWeekDemo(visual) {
  const card = visual.querySelector('.order-mock');
  const check = card.querySelector('.om-check');
  const show = (done) => { card.dataset.done = String(done); };
  inView(visual, () => {
    let done = false;
    show(done);
    animate(visual.querySelectorAll('.wm-days .is-full, .wm-days .is-closed'), { scale: [1, 1.12, 1] }, { duration: 0.5, delay: stagger(0.15, { startDelay: 0.7 }) });
    const timer = setInterval(() => {
      if (!done) tap(check);
      setTimeout(() => {
        done = !done;
        show(done);
        if (done) animate(check, { scale: [0.7, 1] }, { type: 'spring', bounce: 0.5, duration: 0.5 });
      }, done ? 0 : 280);
    }, 1700);
    return () => { clearInterval(timer); show(true); };
  }, { amount: 0.5 });
}

// Dinheiro: um toque em Recebi, o pedido passa a dever menos e o Recebido do mês soma.
function setupMoneyDemo(visual) {
  const pay = visual.querySelector('.pay-mock');
  const button = pay.querySelector('.pm-btn');
  const stamp = pay.querySelector('.pm-stamp');
  const numbers = [...visual.querySelectorAll('[data-from]')];
  const brl = (value) => `R$ ${Math.round(value).toLocaleString('pt-BR')}`;
  const reset = () => {
    pay.classList.add('is-pending');
    numbers.forEach((b) => { b.textContent = brl(Number(b.dataset.from)); });
  };
  const count = () => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - t) ** 3;
      numbers.forEach((b) => {
        const from = Number(b.dataset.from);
        b.textContent = brl(from + (Number(b.dataset.to) - from) * eased);
      });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  reset();
  inView(visual, () => {
    reset();
    const timer = setTimeout(async () => {
      tap(button);
      await sleep(320);
      pay.classList.remove('is-pending');
      dropStamp(stamp, 0);
      await sleep(450);
      count();
    }, 1300);
    return () => { clearTimeout(timer); reset(); };
  }, { amount: 0.5 });
}

if (moving) {
  revealHero();
  for (const step of document.querySelectorAll('.step, .link-section')) {
    inView(step, () => revealStep(step), { amount: 0.15 });
  }
  const link = document.querySelector('.link-visual');
  if (link) setupLinkDemo(link);
  const visuals = document.querySelectorAll('.mock-visual');
  for (const visual of visuals) {
    if (visual.querySelector('.order-mock')) setupWeekDemo(visual);
    if (visual.querySelector('.pay-mock')) setupMoneyDemo(visual);
  }
}
