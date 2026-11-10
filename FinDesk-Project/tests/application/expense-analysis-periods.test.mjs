import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  expensePeriodDays,
  previousExpenseMonths,
  planExpensePeriods,
  assessExpenseCoverage,
} = require('../../out/application/expense-analysis-periods.js');
const { createDemoScenario } = require('../../out/fixtures/financas/demo.js');
const range = (start, end) => ({ start, end });
const month = (value) => require('../../out/domain/civil-date.js').calendarMonth(value);
const demo = () => {
  const scenario = createDemoScenario();
  return { asOf: scenario.clock.today(), facts: scenario.facts };
};

test('F07a/D127: encerrados usam totais completos; parciais usam prefixos inclusivos equivalentes', () => {
  const march = month('2027-03-01'),
    previous = previousExpenseMonths(march);
  const complete = planExpensePeriods(march, '2027-04-01', previous, 3);
  assert.deepEqual(complete.observed, march);
  assert.deepEqual(complete.comparison.current, march);
  assert.deepEqual(complete.comparison.references, previous);
  assert.equal(complete.comparison.partial, false);
  const partial = planExpensePeriods(march, '2027-03-29', previous, 3);
  assert.deepEqual(partial.observed, range('2027-03-01', '2027-03-29'));
  assert.deepEqual(partial.comparison.current, range('2027-03-01', '2027-03-28'));
  assert.deepEqual(partial.comparison.references, [
    range('2027-02-01', '2027-02-28'),
    range('2027-01-01', '2027-01-28'),
    range('2026-12-01', '2026-12-28'),
  ]);
  assert.equal(partial.comparison.shortened, true);
  assert.equal(partial.comparison.partial, true);
});

test('F07a: último dia ainda é parcial; bissexto, virada do ano e limites civis não mudam por fuso', () => {
  const march = month('2028-03-01');
  const result = planExpensePeriods(march, '2028-03-31', previousExpenseMonths(march), 1);
  assert.deepEqual(result.comparison.current, range('2028-03-01', '2028-03-29'));
  assert.equal(expensePeriodDays(month('2028-02-01')), 29);
  assert.equal(expensePeriodDays(month('2100-02-01')), 28);
  assert.deepEqual(previousExpenseMonths(month('0001-01-01')), []);
  assert.equal(expensePeriodDays(range('0001-01-01', '0001-01-01')), 1);
  const boundary = month('9999-12-01');
  assert.equal(
    planExpensePeriods(boundary, '9999-12-31', previousExpenseMonths(boundary), 3).comparison
      .partial,
    true,
  );
  assert.throws(() => expensePeriodDays(range('2026-02-30', '2026-03-01')));
  assert.throws(() => previousExpenseMonths(range('2026-10-02', '2026-10-29')));
});

test('F07a: anterior e habitual têm janelas próprias; ciclos só usam intervalos fornecidos consecutivos', () => {
  const current = range('2026-03-05', '2026-04-04');
  const previous = [
    range('2026-02-05', '2026-03-04'),
    range('2026-01-05', '2026-02-04'),
    range('2025-12-05', '2026-01-04'),
  ];
  const original = JSON.stringify(previous);
  assert.deepEqual(
    planExpensePeriods(current, '2026-04-03', previous, 3).comparison.current,
    range('2026-03-05', '2026-04-01'),
  );
  assert.equal(
    planExpensePeriods(current, '2026-04-05', previous, 3).comparison.current.end,
    '2026-04-04',
  );
  assert.equal(
    planExpensePeriods(current, '2026-03-06', previous.slice(0, 1), 1).unavailable,
    null,
  );
  assert.equal(
    planExpensePeriods(current, '2026-03-06', previous.slice(0, 2), 3).unavailable,
    'missing-periods',
  );
  assert.equal(
    planExpensePeriods(current, '2026-03-06', previous.slice(1), 1).unavailable,
    'missing-periods',
  );
  assert.equal(planExpensePeriods(current, '2026-03-04', previous, 3).unavailable, 'future');
  assert.equal(planExpensePeriods(current, '2026-03-04', previous, 3).observed, null);
  assert.equal(JSON.stringify(previous), original);
  assert.throws(() => planExpensePeriods(current, '2026-03-06', previous, 2));
});

test('F07a/D129: outubro é coberto até a referência; setembro ausente não vira zero', () => {
  const snapshot = demo(),
    before = JSON.stringify(snapshot);
  const current = planExpensePeriods(
    month('2026-10-01'),
    snapshot.asOf,
    previousExpenseMonths(month('2026-10-01')),
    1,
  );
  assert.equal(assessExpenseCoverage(snapshot, 'demo-a', current.observed).covered, true);
  assert.equal(assessExpenseCoverage(snapshot, 'all', current.observed).covered, true);
  assert.equal(
    assessExpenseCoverage(snapshot, 'demo-a', current.comparison.references[0]).covered,
    false,
  );
  assert.equal(assessExpenseCoverage(snapshot, 'demo-u', current.observed).covered, true);
  assert.equal(assessExpenseCoverage(snapshot, 'demo-a', month('2026-10-01')).covered, false);
  assert.equal(assessExpenseCoverage(snapshot, 'inexistente', current.observed).covered, false);
  assert.equal(JSON.stringify(snapshot), before);
});

test('F07a: lacunas de fonte/conta não podem ser ocultas por cobertura parcial ou de outra conta', () => {
  const snapshot = demo(),
    base = snapshot.facts.coverage[0];
  const query = range('2026-10-01', '2026-10-29');
  const split = (gap = false) => [
    { ...base, range: range('2026-10-01', '2026-10-10') },
    { ...base, range: range(gap ? '2026-10-12' : '2026-10-11', '2026-10-29') },
  ];
  const withCoverage = (coverage) => ({ ...snapshot, facts: { ...snapshot.facts, coverage } });
  assert.equal(assessExpenseCoverage(withCoverage(split()), 'demo-a', query).covered, true);
  assert.equal(assessExpenseCoverage(withCoverage(split(true)), 'demo-a', query).covered, false);
  assert.deepEqual(assessExpenseCoverage(withCoverage(split()), 'all', query).missingAccountIds, [
    'demo-b',
    'demo-u',
  ]);
  for (const status of ['incomplete', 'failed'])
    assert.equal(
      assessExpenseCoverage(withCoverage([{ ...base, status }]), 'demo-a', query).covered,
      false,
    );
  assert.equal(
    assessExpenseCoverage(
      withCoverage([base, { ...base, sourceId: 'outra', status: 'incomplete' }]),
      'demo-a',
      query,
    ).covered,
    false,
  );
  assert.equal(assessExpenseCoverage(withCoverage([]), 'demo-a', query).covered, false);
});
