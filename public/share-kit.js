// Kit de divulgação da vitrine, montado no aparelho da confeiteira: imagem para status/story (1080×1920)
// e QR para imprimir (etiqueta, embalagem, balcão). Nada é enviado ao servidor.
import { encode } from 'uqr';
import { VITRINE_STYLE_INFO, initials, photoUrl, vitrinePalette } from '../cloud/vitrine-theme.js';

const FONT_FILES = { atelie: 'young-serif', doceria: 'baloo-2', caseira: 'caprasimo', moderna: 'bricolage-grotesque' };

async function loadImage(src) {
  if (!src) return null;
  const img = new Image(); img.decoding = 'async'; img.src = src;
  try { await img.decode(); return img; } catch { return null; }
}
async function styleFont(style) {
  const info = VITRINE_STYLE_INFO[style] || VITRINE_STYLE_INFO.atelie, family = info.font.split(',')[0].replace(/"/g, '');
  try { const face = new FontFace(family, `url(/fonts/vitrine/${FONT_FILES[style] || FONT_FILES.atelie}.woff2)`, { weight: String(info.weight) }); document.fonts.add(await face.load()); } catch { /* usa a letra reserva */ }
  return `${info.weight} {size}px ${info.font}`;
}
function drawQr(context, text, x, y, size) {
  const { data } = encode(text, { ecc: 'M', border: 0 }), cell = size / data.length;
  context.fillStyle = '#231a20';
  data.forEach((row, r) => row.forEach((on, c) => { if (on) context.fillRect(x + c * cell, y + r * cell, Math.ceil(cell), Math.ceil(cell)); }));
}
const cover = (context, img, x, y, w, h) => { const s = Math.max(w / img.width, h / img.height); context.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s); };
const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

export async function storyImage(page, url) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const x = canvas.getContext('2d'), p = vitrinePalette(page.color), font = await styleFont(page.style);
  const [coverImg, logoImg] = await Promise.all([loadImage(photoUrl(page.cover)), loadImage(photoUrl(page.logo))]);
  x.fillStyle = p.tint; x.fillRect(0, 0, 1080, 1920);
  x.fillStyle = p.tint2; for (let yy = 36; yy < 1920; yy += 48) for (let xx = 36; xx < 1080; xx += 48) { x.beginPath(); x.arc(xx, yy, 4, 0, 7); x.fill(); }
  const round = (X, Y, W, H, R) => { x.beginPath(); x.roundRect(X, Y, W, H, R); };
  let top = 470;
  if (coverImg) { x.save(); round(90, 150, 900, 760, 48); x.clip(); cover(x, coverImg, 90, 150, 900, 760); x.restore(); top = 920; }
  x.save(); x.beginPath(); x.arc(540, top, 110, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill(); x.clip();
  if (logoImg) cover(x, logoImg, 430, top - 110, 220, 220);
  else { x.fillStyle = p.ink; x.fillRect(430, top - 110, 220, 220); x.fillStyle = '#ffffff'; x.font = font.replace('{size}', '96'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(initials(page.displayName), 540, top + 6); }
  x.restore();
  x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = p.ink;
  let size = 104; x.font = font.replace('{size}', size); while (x.measureText(page.displayName).width > 940 && size > 48) { size -= 4; x.font = font.replace('{size}', size); }
  x.fillText(page.displayName, 540, top + 240);
  x.fillStyle = '#3b2c34'; x.font = '600 46px Figtree, sans-serif'; x.fillText('Encomendas abertas', 540, top + 320);
  const qy = top + 390; x.fillStyle = '#ffffff'; round(330, qy, 420, 420, 36); x.fill();
  drawQr(x, url, 365, qy + 35, 350);
  x.fillStyle = p.ink; x.font = '700 44px Figtree, sans-serif'; x.fillText(url.replace(/^https:\/\//, ''), 540, qy + 500);
  return toBlob(canvas);
}

export async function printQr(page, url) {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1500;
  const x = canvas.getContext('2d'), p = vitrinePalette(page.color), font = await styleFont(page.style);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1200, 1500);
  x.textAlign = 'center'; x.fillStyle = p.ink;
  let size = 96; x.font = font.replace('{size}', size); while (x.measureText(page.displayName).width > 1040 && size > 44) { size -= 4; x.font = font.replace('{size}', size); }
  x.fillText(page.displayName, 600, 170);
  x.fillStyle = '#3b2c34'; x.font = '600 48px Figtree, sans-serif'; x.fillText('Aponte a câmera para encomendar', 600, 260);
  drawQr(x, url, 200, 340, 800);
  x.fillStyle = p.ink; x.font = '700 46px Figtree, sans-serif'; x.fillText(url.replace(/^https:\/\//, ''), 600, 1320);
  return toBlob(canvas);
}

// No celular, abre o menu de compartilhar com a imagem; sem esse recurso, baixa o arquivo.
export async function shareOrDownload(blob, filename, text) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; } catch (error) { if (error?.name === 'AbortError') return 'cancelled'; }
  }
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 30000);
  return 'downloaded';
}
