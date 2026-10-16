// Fotos da vitrine (logo, capa, produtos) no Supabase Storage. Regras puras, usadas pelo doce-api e testadas em Node.
// O navegador da confeiteira reduz e regrava a foto (WebP ou JPEG, sem localização) antes de enviar;
// aqui o servidor confere de novo, pelos bytes, porque o que chega do navegador não é confiável.
import { PHOTO_KEY, pagePhotoKeys } from './order-link-model.js';

export const PHOTO_BUCKET = 'vitrine';
export const PHOTO_MAX_BYTES = 1024 * 1024;
export const PHOTO_MAX_SIDE = 2400;
export const PHOTO_MAX_FILES = 60;
// Fotos enviadas e ainda não salvas na vitrine ficam um tempo antes de serem apagadas pela limpeza.
export const PHOTO_ORPHAN_MS = 60 * 60 * 1000;

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

// Pasta da conta: nome aleatório derivado de um segredo do servidor, nunca o ID do usuário.
export async function photoFolder(secret, userId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`vitrine:${secret}:${userId}`));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = (b[i + 2] << 8) | b[i + 3];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + length;
  }
  return null;
}
function webpSize(b) {
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { width: ((b[27] << 8) | b[26]) & 0x3fff, height: ((b[29] << 8) | b[28]) & 0x3fff };
  if (chunk === 'VP8L' && b[20] === 0x2f) { const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }; }
  if (chunk === 'VP8X') return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  return null;
}

// Recebe { data: base64, type } e devolve os bytes conferidos, ou erro em português.
export function decodePhoto(input) {
  if (!input || typeof input !== 'object' || typeof input.data !== 'string' || !['image/webp', 'image/jpeg'].includes(input.type)) fail('Envie a foto em WebP ou JPEG.');
  if (input.data.length > Math.ceil(PHOTO_MAX_BYTES / 3) * 4 + 4) fail('Foto muito grande. Tente outra foto.', 413);
  let bytes;
  try { bytes = Uint8Array.from(atob(input.data), (c) => c.charCodeAt(0)); } catch { fail('Foto inválida.'); }
  if (bytes.length < 64 || bytes.length > PHOTO_MAX_BYTES) fail(bytes.length < 64 ? 'Foto inválida.' : 'Foto muito grande. Tente outra foto.', bytes.length < 64 ? 400 : 413);
  const ascii = (from, to) => String.fromCharCode(...bytes.slice(from, to));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff, isWebp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if ((input.type === 'image/jpeg' && !isJpeg) || (input.type === 'image/webp' && !isWebp)) fail('O arquivo não é uma foto válida.');
  const size = isJpeg ? jpegSize(bytes) : webpSize(bytes);
  if (!size || size.width < 16 || size.height < 16) fail('O arquivo não é uma foto válida.');
  if (size.width > PHOTO_MAX_SIDE || size.height > PHOTO_MAX_SIDE) fail('Foto grande demais. Tente de novo pelo app.');
  return { bytes, ext: isJpeg ? 'jpg' : 'webp', contentType: input.type, ...size };
}

// Só aceita na vitrine fotos da própria pasta ou exemplos do site. Num backup restaurado, fotos de
// outra conta são retiradas (o produto fica, a foto não); num salvamento normal, viram erro.
export function checkPageOwnership(page, folder, { strip = false } = {}) {
  if (!page || typeof page !== 'object') return page;
  const mine = (key) => !key || key.startsWith('exemplo/') || (PHOTO_KEY.test(key) && key.startsWith(`${folder}/`));
  const keep = (key) => { if (mine(key)) return key; if (strip) return ''; fail('Esta foto não pertence à sua vitrine. Envie a foto de novo.'); };
  const result = { ...page, logo: keep(page.logo), cover: keep(page.cover), share: keep(page.share) };
  if (Array.isArray(page.products)) result.products = page.products.map((p) => { if (!p || typeof p !== 'object') return p; const photo = keep(p.photo); const { photo: _, ...rest } = p; return photo ? { ...rest, photo } : rest; });
  return result;
}

// O que apagar da pasta depois de salvar: o que a vitrine não usa mais e já passou do tempo de rascunho.
export function photosToDelete(files, page, folder, now = Date.now()) {
  const used = new Set(pagePhotoKeys(page));
  return files.filter((f) => f?.name && !used.has(`${folder}/${f.name}`) && now - Date.parse(f.created_at || 0) > PHOTO_ORPHAN_MS).map((f) => `${folder}/${f.name}`);
}
