export const VITRINE_STYLES = ['atelie', 'doceria', 'caseira', 'moderna'];
export const DEFAULT_VITRINE_COLOR = '#b8325a';
export const MAX_FEATURED = 3;
export const defaultOrderPage = () => ({ active: false, slug: '', displayName: '', welcome: '', whatsapp: '', products: [], style: 'atelie', color: '', instagram: '', logo: '', cover: '', share: '' });
export function linkError(message, status = 400, code) { throw Object.assign(new Error(message), { status, code }); }
export function limitedText(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max) linkError(`${label}: use até ${max} caracteres.`);
  const text = value.trim(); if (required && !text) linkError(`Preencha ${label.toLowerCase()}.`); return text;
}
export function normalizeWhatsApp(value, required = false) {
  const text = limitedText(value ?? '', 30, 'WhatsApp', required);
  if (!text && !required) return '';
  const digits = text.replace(/[\s()+.-]/g, '');
  const international = text.startsWith('+') ? digits : /^[1-9]\d{9,10}$/.test(digits) ? `55${digits}` : digits;
  if (!/^[1-9]\d{7,14}$/.test(international)) linkError('Informe um WhatsApp com DDD e código do país.');
  return `+${international}`;
}
// Photo keys: "<account folder>/<uuid>.webp|jpg" in Storage, or a bundled example ("exemplo/<name>.svg").
// Which folder belongs to the account is checked by the server (doce-api), not here.
export const PHOTO_KEY = /^(?:[a-f0-9]{32}\/[a-f0-9-]{36}\.(?:webp|jpg)|exemplo\/[a-z0-9-]{1,40}\.svg)$/;
function photoKey(value, label) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !PHOTO_KEY.test(value)) linkError(`${label}: imagem inválida.`);
  return value;
}
function vitrineColor(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) linkError('Cor inválida.');
  return value.toLowerCase();
}
function instagramHandle(value) {
  const text = limitedText(value ?? '', 60, 'Instagram').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (text && !/^[A-Za-z0-9._]{1,30}$/.test(text)) linkError('Instagram: use só o nome do perfil, como @docesdalu.');
  return text;
}
function priceFrom(value) {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000_000) linkError('"A partir de" deve ser um valor entre R$ 0 e R$ 100.000.');
  return value;
}
function productInput(p) {
  const product = { name: limitedText(p?.name, 80, 'Nome do produto', true), description: limitedText(p?.description ?? '', 160, 'Descrição') };
  const category = limitedText(p?.category ?? '', 30, 'Categoria'); if (category) product.category = category;
  const price = priceFrom(p?.priceFromCents); if (price !== null) product.priceFromCents = price;
  if (p?.featured === true) product.featured = true;
  const photo = photoKey(p?.photo, 'Foto do produto'); if (photo) product.photo = photo;
  return product;
}
export function orderPageInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.active !== 'boolean') linkError('Configuração do link inválida.');
  const slug = limitedText(value.slug, 40, 'Endereço');
  if (slug && !/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug)) linkError('O endereço precisa ter de 3 a 40 letras minúsculas, números ou hífens, sem hífen nas pontas.');
  const displayName = limitedText(value.displayName, 60, 'Nome da confeitaria');
  if (value.active && (!slug || !displayName)) linkError('Informe o nome e o endereço para ativar o link.');
  if (!Array.isArray(value.products) || value.products.length > 30) linkError('Cadastre até 30 produtos.');
  const products = value.products.map(productInput);
  if (new Set(products.map(p => p.name.toLocaleLowerCase('pt-BR'))).size !== products.length) linkError('Não repita produtos na lista.');
  if (products.filter(p => p.featured).length > MAX_FEATURED) linkError(`Marque até ${MAX_FEATURED} produtos como mais pedidos.`);
  const style = value.style === undefined || value.style === '' ? 'atelie' : value.style;
  if (!VITRINE_STYLES.includes(style)) linkError('Estilo da vitrine inválido.');
  return { active: value.active, slug, displayName, welcome: limitedText(value.welcome, 280, 'Mensagem'), whatsapp: normalizeWhatsApp(value.whatsapp), products,
    style, color: vitrineColor(value.color), instagram: instagramHandle(value.instagram),
    logo: photoKey(value.logo, 'Logo'), cover: photoKey(value.cover, 'Capa'), share: photoKey(value.share, 'Imagem de compartilhamento') };
}
// Every photo key a page uses (for Storage cleanup and ownership checks).
export function pagePhotoKeys(page) {
  return [page?.logo, page?.cover, page?.share, ...(page?.products || []).map(p => p.photo)].filter(Boolean);
}
export function requestSummary(order, businessName) {
  return [`Solicitação ${order.publicCode} — ${businessName}`, `${order.product}`, `Data desejada: ${order.dueAt.replace('T', ' às ')}`, `${order.mode}${order.location ? `: ${order.location}` : ''}`, `Cliente: ${order.client}`, `WhatsApp: ${order.contact}`, order.details, ...Object.entries(order.cake?.values || {}).filter(([,v]) => v).map(([k,v]) => `${order.cake.labels[k] || k}: ${v}`), 'Ainda não confirmado. Aguardo a revisão da confeitaria.'].filter(Boolean).join('\n');
}
