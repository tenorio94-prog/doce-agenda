export const defaultOrderPage = () => ({ active: false, slug: '', displayName: '', welcome: '', whatsapp: '', products: [] });
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
export function orderPageInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.active !== 'boolean') linkError('Configuração do link inválida.');
  const slug = limitedText(value.slug, 40, 'Endereço');
  if (slug && !/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug)) linkError('O endereço precisa ter de 3 a 40 letras minúsculas, números ou hífens, sem hífen nas pontas.');
  const displayName = limitedText(value.displayName, 60, 'Nome da confeitaria');
  if (value.active && (!slug || !displayName)) linkError('Informe o nome e o endereço para ativar o link.');
  if (!Array.isArray(value.products) || value.products.length > 30) linkError('Cadastre até 30 produtos.');
  const products = value.products.map(p => ({ name: limitedText(p?.name, 80, 'Nome do produto', true), description: limitedText(p?.description ?? '', 160, 'Descrição') }));
  if (new Set(products.map(p => p.name.toLocaleLowerCase('pt-BR'))).size !== products.length) linkError('Não repita produtos na lista.');
  return { active: value.active, slug, displayName, welcome: limitedText(value.welcome, 280, 'Mensagem'), whatsapp: normalizeWhatsApp(value.whatsapp), products };
}
export function requestSummary(order, businessName) {
  return [`Solicitação ${order.publicCode} — ${businessName}`, `${order.product}`, `Data desejada: ${order.dueAt.replace('T', ' às ')}`, `${order.mode}${order.location ? `: ${order.location}` : ''}`, `Cliente: ${order.client}`, `WhatsApp: ${order.contact}`, order.details, ...Object.entries(order.cake?.values || {}).filter(([,v]) => v).map(([k,v]) => `${order.cake.labels[k] || k}: ${v}`), 'Ainda não confirmado. Aguardo a revisão da confeitaria.'].filter(Boolean).join('\n');
}
