// Landing: componentes da Web Awesome (webawesome.com) e animações da Motion (motion.dev).
// Montado em /landing/landing.js pelo build. Sem a classe "motion" no <html>
// (quem prefere menos movimento), tudo já aparece parado.
import '../ui/wa-setup.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/details/details.js';
import { inView, stagger } from 'motion';
import { animate } from 'motion/mini';

window.landingMotion = true;
const moving = document.documentElement.classList.contains('motion');
const springy = { type: 'spring', bounce: 0.45, duration: 0.7 };

function popCard(card, delay) {
  animate(card, { opacity: [0, 1] }, { duration: 0.3, delay });
  animate(card, { scale: [0.6, 1] }, { ...springy, delay });
}

function float(card, delay) {
  animate(card, { y: [0, -6, 0] }, { duration: 6, repeat: Infinity, ease: 'easeInOut', delay });
}

function dropStamp(stamp, delay) {
  animate(stamp, { opacity: [0, 1] }, { duration: 0.2, delay });
  animate(stamp, { scale: [2.2, 1] }, { type: 'spring', bounce: 0.5, duration: 0.6, delay });
}

// Topo: o celular sobe e os cartões aparecem um a um, depois flutuam devagar.
function revealHero() {
  const device = document.querySelector('.hero-device');
  if (!device) return;
  const phone = device.querySelector('.phone');
  animate(phone, { opacity: [0, 1] }, { duration: 0.4 });
  animate(phone, { y: [48, 0] }, { type: 'spring', bounce: 0.2, duration: 0.9 });
  device.querySelectorAll('.float-card').forEach((card, i) => {
    popCard(card, 0.5 + i * 0.3);
    float(card, 1.4 + i * 0.4);
  });
  const stamp = device.querySelector('.stamp-mini');
  if (stamp) dropStamp(stamp, 1.1);
  const dot = device.querySelector('.fc-dot');
  if (dot) animate(dot, { scale: [1, 1.35, 1] }, { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 1.8 });
}

// Como funciona: cada passo entra quando aparece na tela.
function revealStep(step) {
  animate(step.querySelectorAll('.step-copy > *'), { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: stagger(0.08), ease: [0.2, 0.8, 0.2, 1] });
  const phone = step.querySelector('.phone');
  animate(phone, { opacity: [0, 1] }, { duration: 0.4, delay: 0.1 });
  animate(phone, { y: [80, 0] }, { type: 'spring', bounce: 0.2, duration: 0.9, delay: 0.1 });
  const card = step.querySelector('.float-card');
  if (card) {
    popCard(card, 0.6);
    float(card, 1.4);
  }
  const stamp = step.querySelector('.stamp-mini');
  if (stamp) dropStamp(stamp, 0.95);
}

if (moving) {
  revealHero();
  for (const step of document.querySelectorAll('.step')) {
    inView(step, () => revealStep(step), { amount: 0.3 });
  }
}
