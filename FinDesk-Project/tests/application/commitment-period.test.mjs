import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { commitmentPeriod } = require('../../out/application/commitment-period.js');

test('FIN-032: seguir Finanças preserva exatamente mês/ciclo e ausência, sem mutação', () => {
  for (const range of [
    { start: '2026-10-01', end: '2026-10-31' },
    { start: '2026-10-05', end: '2026-11-04' },
    { start: '2026-10-29', end: '2026-10-29' },
  ]) {
    const before = JSON.stringify(range);
    const result = commitmentPeriod('finance', range, '2026-10-29');
    assert.deepEqual(result, range);
    assert.notEqual(result, range);
    assert.equal(JSON.stringify(range), before);
  }
  assert.equal(commitmentPeriod('finance', null, '2026-10-29'), null);
});

test('FIN-032: 30 dias são referência mais 29 dias civis inclusivos, inclusive ano/bissexto', () => {
  for (const [start, end] of [
    ['2026-10-29', '2026-11-27'],
    ['2026-12-20', '2027-01-18'],
    ['2028-02-01', '2028-03-01'],
    ['2027-02-01', '2027-03-02'],
    ['9999-12-02', '9999-12-31'],
  ])
    assert.deepEqual(commitmentPeriod('next-30-days', null, start), { start, end });
  assert.deepEqual(
    commitmentPeriod('next-30-days', { start: '2000-01-01', end: '2000-01-31' }, '2026-10-29'),
    { start: '2026-10-29', end: '2026-11-27' },
  );
});

test('intervalo civil inválido é recusado e limite de calendário permanece indisponível', () => {
  assert.equal(commitmentPeriod('next-30-days', null, '9999-12-03'), null);
  assert.throws(
    () => commitmentPeriod('finance', { start: '2026-11-01', end: '2026-10-01' }, '2026-10-29'),
    RangeError,
  );
  assert.throws(() => commitmentPeriod('finance', null, '2026-02-30'), RangeError);
  assert.throws(() => commitmentPeriod('unknown', null, '2026-10-29'), RangeError);
});
