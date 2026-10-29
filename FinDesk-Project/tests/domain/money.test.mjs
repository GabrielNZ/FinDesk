import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  money,
  addMoney,
  subtractMoney,
  sumMoney,
  summarizeAmounts,
  divideForDisplay,
  convertForDisplay,
} = require('../../out/domain/money.js');
const { civilDate } = require('../../out/domain/civil-date.js');
const brl = (amount) => money(amount, 'BRL');

test('FIN-048 / C31: centavos são inteiros seguros; ausência e moeda inválida não viram zero', () => {
  assert.equal(addMoney(brl(10), brl(20)).minorUnits, 30);
  for (const amount of [
    0.1,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    undefined,
    null,
    '100',
  ]) {
    assert.throws(() => money(amount, 'BRL'), RangeError);
  }
  assert.throws(() => money(100, 'EUR'), RangeError);
  assert.equal(Object.is(brl(-0).minorUnits, -0), false);
  assert.equal(brl(-1).minorUnits, -1);
});

test('FIN-048 / C31: soma/subtração recusam moedas distintas e excesso antes de perder precisão', () => {
  assert.throws(() => addMoney(brl(1), money(1, 'USD')), /moedas/);
  assert.throws(() => subtractMoney(brl(1), money(1, 'USD')), /moedas/);
  assert.throws(() => addMoney(brl(Number.MAX_SAFE_INTEGER), brl(1)), /precisão/);
  assert.throws(() => subtractMoney(brl(Number.MIN_SAFE_INTEGER), brl(1)), /precisão/);
  assert.throws(() => sumMoney('BRL', [brl(Number.MAX_SAFE_INTEGER), brl(1), brl(-1)]), /precisão/);
  assert.equal(
    addMoney(brl(Number.MAX_SAFE_INTEGER), brl(-1)).minorUnits,
    Number.MAX_SAFE_INTEGER - 1,
  );
  assert.throws(() => addMoney({ minorUnits: 1.5, currency: 'BRL' }, brl(1)), /precisão/);
});

test('FIN-048 / C31: subtotal incompleto identifica ausências; zero conhecido continua distinto', () => {
  const result = summarizeAmounts('BRL', [
    { status: 'known', value: brl(0) },
    { status: 'unknown', reason: 'Sem cobertura' },
    { status: 'known', value: brl(100) },
  ]);
  assert.deepEqual(result, { knownSubtotal: brl(100), complete: false, missingCount: 1 });
  assert.equal(summarizeAmounts('BRL', [{ status: 'unknown', reason: 'Ausente' }]).complete, false);
  assert.equal(summarizeAmounts('BRL', [{ status: 'known', value: brl(0) }]).complete, true);
  assert.throws(() => summarizeAmounts('BRL', [{ status: 'unknown', reason: '' }]), /ausência/);
});

test('FIN-036 / C12: equivalente anual arredonda só para apresentação, inclusive empates negativos', () => {
  const annual = brl(23990);
  assert.equal(divideForDisplay(annual, 12).minorUnits, 1999);
  assert.equal(annual.minorUnits, 23990);
  assert.equal(divideForDisplay(brl(1), 2).minorUnits, 1);
  assert.equal(divideForDisplay(brl(-1), 2).minorUnits, -1);
  assert.equal(divideForDisplay(brl(-4), 3).minorUnits, -1);
  assert.equal(divideForDisplay(brl(Number.MAX_SAFE_INTEGER), 2).minorUnits, 4503599627370496);
  for (const divisor of [0, -1, 1.5, Infinity])
    assert.throws(() => divideForDisplay(annual, divisor), RangeError);
});

test('FIN-008 / C23: conversão exata conserva original, taxa, data e natureza', () => {
  const original = money(30000, 'USD');
  const rate = {
    from: 'USD',
    to: 'BRL',
    numerator: 5,
    denominator: 1,
    on: civilDate('2026-10-29'),
    source: 'ficticia',
    nature: 'fictitious',
  };
  const result = convertForDisplay(original, rate);
  assert.deepEqual(result.original, original);
  assert.deepEqual(result.converted, brl(150000));
  assert.deepEqual(result.rate, rate);
  assert.equal(addMoney(brl(310020), result.converted).minorUnits, 460020);
  assert.throws(() => convertForDisplay(original, { ...rate, from: 'BRL' }), /Cotação/);
  assert.throws(() => convertForDisplay(original, { ...rate, denominator: 0 }), /Cotação/);
  assert.throws(() => convertForDisplay(original, { ...rate, on: '2026-02-31' }), /Data/);
  assert.throws(() => convertForDisplay(original, { ...rate, source: '' }), /Cotação/);
});

test('FIN-048 / C31: intermediário da taxa é exato mesmo acima do limite; saída excessiva é recusada', () => {
  const value = money(Number.MAX_SAFE_INTEGER, 'USD');
  const rate = {
    from: 'USD',
    to: 'BRL',
    numerator: 2,
    denominator: 2,
    on: civilDate('2026-10-29'),
    source: 'teste',
    nature: 'fictitious',
  };
  assert.equal(convertForDisplay(value, rate).converted.minorUnits, Number.MAX_SAFE_INTEGER);
  assert.throws(() => convertForDisplay(value, { ...rate, denominator: 1 }), /precisão/);
  assert.equal(convertForDisplay(money(-1, 'USD'), rate).converted.minorUnits, -1);
});
