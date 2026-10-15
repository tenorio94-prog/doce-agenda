// Pix da confeiteira: chave guardada na conta e código "copia e cola" (BR Code estático do Banco Central).
// Shared by the server (validation) and the app (code generation). No provider, no automatic confirmation:
// the money is only "Conferido" when she checks her bank and marks it.

export const PIX_KEY_TYPES = ['celular', 'cpf', 'cnpj', 'email', 'aleatoria'];

export function defaultPixSettings() {
  return { keyType: '', key: '', name: '', city: '', depositPercent: 30 };
}

function fail(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

const digits = (value) => String(value || '').replace(/\D/g, '');

function validCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const size of [9, 10]) {
    let sum = 0;
    for (let index = 0; index < size; index++) sum += Number(cpf[index]) * (size + 1 - index);
    if ((sum * 10) % 11 % 10 !== Number(cpf[size])) return false;
  }
  return true;
}

function validCnpj(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  for (const size of [12, 13]) {
    let sum = 0;
    for (let index = 0; index < size; index++) sum += Number(cnpj[index]) * ((size - index - 1) % 8 + 2);
    const check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (check !== Number(cnpj[size])) return false;
  }
  return true;
}

// The key in the exact form the Pix directory uses.
export function normalizePixKey(keyType, value) {
  const raw = String(value || '').trim();
  if (keyType === 'celular') {
    let number = digits(raw);
    if (number.length === 12 || number.length === 13) number = number.replace(/^55/, '');
    if (!/^\d{10,11}$/.test(number)) fail('Celular inválido. Use DDD e número, por exemplo (11) 99999-9999.');
    return `+55${number}`;
  }
  if (keyType === 'cpf') { const cpf = digits(raw); if (!validCpf(cpf)) fail('CPF inválido.'); return cpf; }
  if (keyType === 'cnpj') { const cnpj = digits(raw); if (!validCnpj(cnpj)) fail('CNPJ inválido.'); return cnpj; }
  if (keyType === 'email') {
    const email = raw.toLowerCase();
    if (email.length > 77 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail inválido.');
    return email;
  }
  if (keyType === 'aleatoria') {
    const key = raw.toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key)) fail('Chave aleatória inválida. Copie a chave inteira do app do banco.');
    return key;
  }
  fail('Escolha o tipo da chave Pix.');
}

// BR Code fields accept plain letters only: accents and symbols are dropped.
export function pixText(value, max) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .,'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

// Validates what the confeiteira saves. An empty key clears the Pix settings.
export function pixSettingsInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Dados do Pix inválidos.');
  const percent = value.depositPercent ?? 30;
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) fail('O sinal sugerido deve ser entre 0% e 100%.');
  if (value.key !== undefined && typeof value.key !== 'string') fail('Chave Pix inválida.');
  if (!String(value.key || '').trim()) return { ...defaultPixSettings(), depositPercent: percent };
  if (!PIX_KEY_TYPES.includes(value.keyType)) fail('Escolha o tipo da chave Pix.');
  const name = pixText(value.name, 25);
  const city = pixText(value.city, 15);
  if (!name) fail('Informe o nome que aparece no Pix.');
  if (!city) fail('Informe a cidade.');
  return { keyType: value.keyType, key: normalizePixKey(value.keyType, value.key), name, city, depositPercent: percent };
}

const field = (id, content) => `${id}${String(content.length).padStart(2, '0')}${content}`;

export function crc16(payload) {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index++) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Static BR Code. amountCents is optional; without it the payer types the value.
export function pixPayload({ key, name, city, amountCents, txid = '***' }) {
  if (!key) fail('Cadastre sua chave Pix em Ajustes.');
  if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000)) fail('Valor do Pix inválido.');
  const payload = [
    field('00', '01'),
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)),
    field('52', '0000'),
    field('53', '986'),
    amountCents === undefined ? '' : field('54', `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, '0')}`),
    field('58', 'BR'),
    field('59', pixText(name, 25)),
    field('60', pixText(city, 15)),
    field('62', field('05', txid)),
    '6304',
  ].join('');
  return payload + crc16(payload);
}
