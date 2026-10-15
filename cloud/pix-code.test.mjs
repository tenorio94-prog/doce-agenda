import test from 'node:test';
import assert from 'node:assert/strict';
import { crc16, normalizePixKey, pixPayload, pixSettingsInput, defaultPixSettings } from './pix-code.js';
import { createEmptyState, transactState } from './state-engine.js';

test('matches the Banco Central example BR Code, CRC included', () => {
  // Manual de Padrões para Iniciação do Pix, exemplo de QR estático.
  const expected = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';
  assert.equal(pixPayload({ key: '123e4567-e12b-12d1-a456-426655440000', name: 'Fulano de Tal', city: 'BRASILIA' }), expected);
  assert.equal(crc16(expected.slice(0, -4)), '1D3D');
});

test('amount goes in field 54 with two decimals and keeps a valid CRC', () => {
  const code = pixPayload({ key: '+5511999998888', name: 'Doces da Lú', city: 'São Paulo', amountCents: 5400 });
  assert.match(code, /540554\.00/);
  assert.match(code, /5911Doces da Lu6009Sao Paulo/);
  assert.equal(crc16(code.slice(0, -4)), code.slice(-4));
  assert.match(pixPayload({ key: 'a@b.co', name: 'A', city: 'B', amountCents: 7 }), /54040\.07/);
  assert.throws(() => pixPayload({ key: 'a@b.co', name: 'A', city: 'B', amountCents: 0 }), /Valor do Pix inválido/);
  assert.throws(() => pixPayload({ key: '', name: 'A', city: 'B' }), /Cadastre sua chave Pix/);
});

test('keys are normalized the way the Pix directory stores them', () => {
  assert.equal(normalizePixKey('celular', '(11) 99999-8888'), '+5511999998888');
  assert.equal(normalizePixKey('celular', '+55 11 99999-8888'), '+5511999998888');
  assert.equal(normalizePixKey('cpf', '529.982.247-25'), '52998224725');
  assert.equal(normalizePixKey('cnpj', '11.222.333/0001-81'), '11222333000181');
  assert.equal(normalizePixKey('email', ' Lu@Doces.COM '), 'lu@doces.com');
  assert.equal(normalizePixKey('aleatoria', '123E4567-E12B-12D1-A456-426655440000'), '123e4567-e12b-12d1-a456-426655440000');
  assert.throws(() => normalizePixKey('cpf', '111.111.111-11'), /CPF inválido/);
  assert.throws(() => normalizePixKey('cnpj', '11.222.333/0001-80'), /CNPJ inválido/);
  assert.throws(() => normalizePixKey('celular', '9999'), /Celular inválido/);
  assert.throws(() => normalizePixKey('aleatoria', 'abc'), /Chave aleatória inválida/);
});

test('settings require name and city, clear with an empty key and bound the deposit percent', () => {
  assert.deepEqual(pixSettingsInput({ key: '', depositPercent: 40 }), { ...defaultPixSettings(), depositPercent: 40 });
  assert.deepEqual(pixSettingsInput({ keyType: 'email', key: 'lu@doces.com', name: 'Lúcia Ávila', city: 'Belo Horizonte' }),
    { keyType: 'email', key: 'lu@doces.com', name: 'Lucia Avila', city: 'Belo Horizonte', depositPercent: 30 });
  assert.throws(() => pixSettingsInput({ keyType: 'email', key: 'lu@doces.com', name: '', city: 'BH' }), /nome/);
  assert.throws(() => pixSettingsInput({ keyType: 'email', key: 'lu@doces.com', name: 'Lu', city: '' }), /cidade/);
  assert.throws(() => pixSettingsInput({ key: '', depositPercent: 101 }), /entre 0% e 100%/);
  assert.throws(() => pixSettingsInput({ key: '', depositPercent: 30.5 }), /entre 0% e 100%/);
});

test('the account saves Pix settings, keeps them in export and accepts old backups without them', () => {
  const empty = createEmptyState();
  assert.deepEqual(empty.pix, defaultPixSettings());
  const saved = transactState(empty, '/api/pix', { method: 'PUT', body: JSON.stringify({ keyType: 'celular', key: '11999998888', name: 'Doces da Lu', city: 'Recife', depositPercent: 50 }) });
  assert.equal(saved.status, 200);
  assert.equal(saved.mutated, true);
  assert.equal(saved.state.pix.key, '+5511999998888');
  const exported = transactState(saved.state, '/api/export');
  assert.equal(exported.body.pix.depositPercent, 50);
  const restored = transactState(empty, '/api/import', { method: 'POST', body: JSON.stringify(exported.body) });
  assert.equal(restored.status, 200);
  assert.equal(restored.state.pix.key, '+5511999998888');
  const legacy = { ...createEmptyState() }; delete legacy.pix;
  const old = transactState(empty, '/api/import', { method: 'POST', body: JSON.stringify(legacy) });
  assert.equal(old.status, 200);
  assert.deepEqual(old.state.pix, defaultPixSettings());
  const legacyRead = transactState(legacy, '/api/state');
  assert.deepEqual(legacyRead.body.pix, defaultPixSettings());
  const invalid = transactState(empty, '/api/pix', { method: 'PUT', body: JSON.stringify({ keyType: 'cpf', key: '123', name: 'Lu', city: 'Recife' }) });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.mutated, false);
});
