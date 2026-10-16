// Prepara fotos da vitrine no aparelho da confeiteira, antes de enviar: reduz, recorta quando preciso e
// regrava em WebP (ou JPEG, se o navegador não gravar WebP). Regravar pelo canvas descarta metadados da câmera,
// inclusive localização. Também tira a cor principal do logo e monta a imagem de compartilhamento (1200×630).
const MAX_BYTES = 1024 * 1024;

async function loadBitmap(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('Escolha uma foto (JPG, PNG, WebP ou HEIC).');
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    const url = URL.createObjectURL(file);
    try { const img = new Image(); img.src = url; await img.decode(); return img; }
    catch { throw new Error('Não consegui abrir essa foto. Tente outra, de preferência JPG.'); }
    finally { URL.revokeObjectURL(url); }
  }
}
function toBlob(canvas, type, quality) { return new Promise((resolve) => canvas.toBlob(resolve, type, quality)); }
async function encode(canvas, preferJpeg = false) {
  for (const quality of [0.84, 0.76, 0.66, 0.56]) {
    let blob = preferJpeg ? null : await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('A foto ficou grande demais. Tente outra.');
}
function draw(source, sx, sy, sw, sh, width, height, background) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width); canvas.height = Math.round(height);
  const context = canvas.getContext('2d');
  if (background) { context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// kind: "product" (até 1200 px), "cover" (até 1800 px de largura), "logo" (quadrado de 400 px).
export async function preparePhoto(file, kind) {
  const bitmap = await loadBitmap(file), w = bitmap.width, h = bitmap.height;
  if (!w || !h) throw new Error('Não consegui abrir essa foto.');
  let canvas;
  if (kind === 'logo') { const side = Math.min(w, h), size = Math.min(400, side); canvas = draw(bitmap, (w - side) / 2, (h - side) / 2, side, side, size, size, '#ffffff'); }
  else { const max = kind === 'cover' ? 1800 : 1200, scale = Math.min(1, max / Math.max(w, h)); canvas = draw(bitmap, 0, 0, w, h, w * scale, h * scale, '#ffffff'); }
  const blob = await encode(canvas);
  return { blob, canvas, width: canvas.width, height: canvas.height, before: file.size };
}

// Cor mais presente no logo, ignorando fundo branco, preto e cinzas.
export function dominantColor(canvas) {
  const small = draw(canvas, 0, 0, canvas.width, canvas.height, 64, 64), data = small.getContext('2d').getImageData(0, 0, 64, 64).data, buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]], max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (a < 200 || max < 35 || max - min < 40 || (max > 235 && min > 215)) continue;
    const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5), entry = buckets.get(key) || [0, 0, 0, 0];
    entry[0] += r; entry[1] += g; entry[2] += b; entry[3]++; buckets.set(key, entry);
  }
  const best = [...buckets.values()].sort((x, y) => y[3] - x[3])[0];
  if (!best || best[3] < 20) return null;
  return '#' + best.slice(0, 3).map((v) => Math.round(v / best[3]).toString(16).padStart(2, '0')).join('');
}

// Imagem para a prévia do WhatsApp: a capa recortada em 1200×630 ou, sem capa, o logo sobre a cor da marca.
export async function shareImage({ cover, logo, tint }) {
  let canvas;
  if (cover) {
    const ratio = 1200 / 630, w = cover.width, h = cover.height, sw = Math.min(w, h * ratio), sh = sw / ratio;
    canvas = draw(cover, (w - sw) / 2, (h - sh) / 2, sw, sh, 1200, 630, '#ffffff');
  } else {
    canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const context = canvas.getContext('2d');
    context.fillStyle = tint || '#f8e7ec'; context.fillRect(0, 0, 1200, 630);
    context.save(); context.beginPath(); context.arc(600, 315, 190, 0, Math.PI * 2); context.fillStyle = '#ffffff'; context.fill(); context.clip();
    context.drawImage(logo, 410, 125, 380, 380); context.restore();
  }
  return encode(canvas, true);
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Não consegui ler a foto.')); reader.readAsDataURL(blob); });
}
