// Identidade visual da vitrine, usada pela página da cliente e pelos Ajustes.
// Sem dependências: roda no navegador (empacotado pelo esbuild) e nos testes em Node.
export const VITRINE_PRESETS = [
  ['Framboesa', '#b8325a'], ['Chocolate', '#6b3f2a'], ['Pistache', '#3f7a4a'],
  ['Lavanda', '#6e54a6'], ['Caramelo', '#b4621b'], ['Azul-céu', '#2f6a96'],
];
export const VITRINE_STYLE_INFO = {
  atelie: { name: 'Ateliê', hint: 'Elegante, para bolos de festa e casamento', font: '"Young Serif",Georgia,serif', weight: 400 },
  doceria: { name: 'Doceria', hint: 'Alegre e arredondada, festa infantil', font: '"Baloo 2","Figtree",sans-serif', weight: 800 },
  caseira: { name: 'Caseira', hint: 'Afetiva, cara de receita de família', font: '"Caprasimo",Georgia,serif', weight: 400 },
  moderna: { name: 'Moderna', hint: 'Forte e direta, doces gourmet', font: '"Bricolage Grotesque","Figtree",sans-serif', weight: 800 },
};
export const DEFAULT_COLOR = '#b8325a';
// Fotos guardadas no Supabase, entregues pelo nosso endereço (worker/index.js, com cache).
export const PHOTO_BASE = '/fotos/';

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
export const contrast = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Tons derivados da cor escolhida. "ink" é a cor dos botões e textos de destaque: escurece até ter
// contraste de 4,5:1 com branco, então qualquer cor escolhida continua legível.
export function vitrinePalette(color) {
  const chosen = /^#[0-9a-f]{6}$/i.test(color || '') ? color.toLowerCase() : DEFAULT_COLOR;
  const base = rgb(chosen);
  let ink = base, steps = 0;
  while (contrast(hex(ink), '#ffffff') < 4.5 && steps < 40) { ink = mix(ink, [20, 12, 16], 0.07); steps++; }
  return { color: chosen, ink: hex(ink), adjusted: steps > 0, tint: hex(mix(base, [255, 255, 255], 0.9)), tint2: hex(mix(base, [255, 255, 255], 0.76)), soft: hex(mix(base, [255, 255, 255], 0.5)) };
}

export function photoUrl(key) {
  if (!key) return '';
  if (key.startsWith('exemplo/')) return `/encomenda/exemplos/${key.slice(8)}`;
  return PHOTO_BASE + key;
}

// Only our bundled demo photographs have these variants. Never rewrite account photos.
export function photoAttrs(key, sizes = '100vw') {
  if (!/^exemplo\/[a-z0-9-]+-960\.webp$/.test(key || '')) return '';
  const base = photoUrl(key).replace(/-960\.webp$/, '');
  return `srcset="${base}-160.webp 160w, ${base}-480.webp 480w, ${base}-960.webp 960w" sizes="${sizes}" width="960" height="${key.includes('bastidores-confeitaria') ? 540 : 960}"`;
}

export function initials(name) {
  const words = String(name || '').replace(/\b(da|de|do|das|dos|e)\b/gi, ' ').trim().split(/\s+/).filter(Boolean);
  return (words.map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase();
}

export function formatCents(cents) {
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
}
