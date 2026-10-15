// Animações da landing com Motion (motion.dev). Montado em /landing/landing.js pelo build.
// Sem a classe "motion" no <html> (movimento reduzido), tudo já aparece parado.
import { inView, stagger } from 'motion';
import { animate } from 'motion/mini';

window.landingMotion = true;
const root = document.documentElement;

function revealStep(step) {
  const copy = step.querySelectorAll('.step-copy > *');
  const phone = step.querySelector('.phone');
  const card = step.querySelector('.float-card');
  const stamp = step.querySelector('.stamp-mini');

  animate(copy, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: stagger(0.08), ease: [0.2, 0.8, 0.2, 1] });
  animate(phone, { opacity: [0, 1] }, { duration: 0.4, delay: 0.1 });
  animate(phone, { y: [80, 0] }, { type: 'spring', bounce: 0.2, duration: 0.9, delay: 0.1 });
  if (card) {
    animate(card, { opacity: [0, 1] }, { duration: 0.3, delay: 0.6 });
    animate(card, { scale: [0.6, 1] }, { type: 'spring', bounce: 0.45, duration: 0.7, delay: 0.6 });
    animate(card, { y: [0, -6, 0] }, { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.4 });
  }
  if (stamp) {
    animate(stamp, { opacity: [0, 1] }, { duration: 0.2, delay: 0.95 });
    animate(stamp, { scale: [2.2, 1] }, { type: 'spring', bounce: 0.5, duration: 0.6, delay: 0.95 });
  }
}

if (root.classList.contains('motion')) {
  for (const step of document.querySelectorAll('.step')) {
    inView(step, () => revealStep(step), { amount: 0.3 });
  }
}
