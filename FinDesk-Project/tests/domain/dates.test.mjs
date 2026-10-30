import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const {
  civilDate,
  dateRange,
  containsDate,
  calendarMonth,
  fixedClock,
  adjacentCivilDate,
  monthlyCivilDate,
} = require('../../out/domain/civil-date.js');

test('FIN-010/048 / C19/C31: calendário valida meses curtos e bissextos sem normalizar datas inválidas', () => {
  for (const value of [
    '2026-02-29',
    '2026-02-31',
    '1900-02-29',
    '2100-02-29',
    '2026-04-31',
    '0000-01-01',
    '2026-00-10',
    '2026-13-01',
    '2026-01-00',
    '2026-1-1',
    '2026-10-29T00:00:00Z',
    ' 2026-10-29',
    '',
    null,
  ]) {
    assert.throws(() => civilDate(value), RangeError, String(value));
  }
  for (const value of ['0001-01-01', '2000-02-29', '2028-02-29', '9999-12-31'])
    assert.equal(civilDate(value), value);
  assert.deepEqual(calendarMonth(civilDate('2026-02-20')), {
    start: '2026-02-01',
    end: '2026-02-28',
  });
  assert.deepEqual(calendarMonth(civilDate('2028-02-20')), {
    start: '2028-02-01',
    end: '2028-02-29',
  });
  assert.deepEqual(calendarMonth(civilDate('2026-12-31')), {
    start: '2026-12-01',
    end: '2026-12-31',
  });
});

test('FIN-010 / C01: intervalo fornecido inclui fronteiras, sem inferir ciclos bancários', () => {
  const range = dateRange(civilDate('2026-10-01'), civilDate('2026-10-31'));
  for (const date of ['2026-10-01', '2026-10-15', '2026-10-31'])
    assert.equal(containsDate(range, civilDate(date)), true);
  assert.equal(containsDate(range, civilDate('2026-11-01')), false);
  assert.throws(() => dateRange(range.end, range.start), /posterior/);
});

test('D47/D48: dia-base mensal usa fim do mês, recupera dia-base e mantém fins de semana', () => {
  for (const [month, day, expected] of [
    ['2026-01-01', 31, '2026-01-31'],
    ['2026-02-01', 31, '2026-02-28'],
    ['2026-03-01', 31, '2026-03-31'],
    ['2026-04-01', 31, '2026-04-30'],
    ['2028-02-01', 30, '2028-02-29'],
    ['2028-03-01', 30, '2028-03-30'],
    ['2100-02-01', 29, '2100-02-28'],
    ['2000-02-01', 29, '2000-02-29'],
    ['2026-11-01', 1, '2026-11-01'],
    ['0001-01-01', 1, '0001-01-01'],
    ['9999-12-01', 31, '9999-12-31'],
  ])
    assert.equal(monthlyCivilDate(civilDate(month), day), expected);
  for (const day of [0, 32, 1.5, NaN, Infinity, '5', null])
    assert.throws(() => monthlyCivilDate(civilDate('2026-02-01'), day), RangeError);
});

test('FIN-010/048: dia vizinho atravessa meses/anos/bissexto e não extrapola o calendário', () => {
  for (const [on, direction, expected] of [
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'],
    ['0001-01-01', -1, null],
    ['9999-12-31', 1, null],
  ])
    assert.equal(adjacentCivilDate(civilDate(on), direction), expected);
  assert.throws(() => adjacentCivilDate(civilDate('2026-10-01'), 0));
});

test('FIN-048 / C19: data civil e relógio congelado conservam o dia em fusos diferentes', () => {
  const file = require.resolve('../../out/domain/civil-date.js');
  const code = `const d=require(${JSON.stringify(file)});console.log(JSON.stringify([d.civilDate('2026-01-01'),d.calendarMonth(d.civilDate('2028-02-29')),d.fixedClock(d.civilDate('2026-10-29')).today()]));`;
  const results = ['UTC', 'America/Sao_Paulo', 'America/New_York', 'Pacific/Kiritimati'].map(
    (TZ) => {
      const result = spawnSync(process.execPath, ['-e', code], {
        env: { ...process.env, TZ },
        encoding: 'utf8',
        windowsHide: true,
      });
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout);
    },
  );
  for (const result of results)
    assert.deepEqual(result, [
      '2026-01-01',
      { start: '2028-02-01', end: '2028-02-29' },
      '2026-10-29',
    ]);
  assert.equal(fixedClock(civilDate('2026-10-29')).today(), '2026-10-29');
});
