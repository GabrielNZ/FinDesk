import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { savedCyclePeriods } = require('../../out/application/finance-periods.js');
const {
  createDemoScenario,
  createLateSalaryScenario,
} = require('../../out/fixtures/financas/demo.js');

function snapshot(scenario = createDemoScenario()) {
  return {
    formatVersion: 1,
    seedId: 'demo-financas-v1',
    seedVersion: 1,
    asOf: scenario.clock.today(),
    timezone: scenario.timezone,
    facts: scenario.facts,
  };
}
function current(catalogue) {
  return catalogue.periods.find((period) => period.key === catalogue.currentKey)?.range;
}

test('D37 / FIN-010/011: salário usa previsões até a véspera; recebimento antes/depois não move o ciclo', () => {
  const initial = snapshot();
  assert.deepEqual(current(savedCyclePeriods(initial, 'demo-a', 'salary-cycle')), {
    start: '2026-10-05',
    end: '2026-11-04',
  });
  for (const scenario of [createLateSalaryScenario(false), createLateSalaryScenario(true)]) {
    const data = snapshot(scenario);
    assert.deepEqual(
      savedCyclePeriods(data, 'demo-a', 'salary-cycle').periods,
      savedCyclePeriods(initial, 'demo-a', 'salary-cycle').periods,
    );
  }
});

test('D37 / FIN-010: cartão inclui o fechamento e começa no dia seguinte ao anterior; vencimento não move intervalo', () => {
  const data = snapshot();
  const before = JSON.stringify(data);
  const expected = { start: '2026-10-03', end: '2026-11-02' };
  assert.deepEqual(current(savedCyclePeriods(data, 'demo-a', 'card-cycle')), expected);
  assert.deepEqual(
    current(savedCyclePeriods({ ...data, asOf: '2026-11-02' }, 'demo-a', 'card-cycle')),
    expected,
  );
  assert.deepEqual(
    current(savedCyclePeriods({ ...data, asOf: '2026-11-03' }, 'demo-a', 'card-cycle')),
    { start: '2026-11-03', end: '2026-12-02' },
  );
  assert.equal(JSON.stringify(data), before);
});

test('D37: falta de datas, conta, cartão ou referência não inventa intervalo nem usa outra conta', () => {
  const data = snapshot();
  for (const mode of ['salary-cycle', 'card-cycle']) {
    for (const account of ['all', 'demo-u', 'ausente']) {
      const result = savedCyclePeriods(data, account, mode);
      assert.equal(result.currentKey, null);
      assert.ok(result.unavailableReason);
    }
    const removed = { ...data, facts: { ...data.facts, salaries: [], invoices: [] } };
    assert.equal(savedCyclePeriods(removed, 'demo-a', mode).currentKey, null);
  }
  const multiple = {
    ...data,
    facts: {
      ...data.facts,
      cards: [...data.facts.cards, { ...data.facts.cards[0], id: 'segundo' }],
    },
  };
  assert.equal(savedCyclePeriods(multiple, 'demo-a', 'card-cycle').currentKey, null);
  assert.equal(
    savedCyclePeriods({ ...data, asOf: '2027-12-01' }, 'demo-a', 'card-cycle').currentKey,
    null,
  );
});

test('D37: datas observadas 29–31, bissexto e virada do ano são usadas sem normalização ou geração', () => {
  const data = snapshot();
  data.asOf = '2028-02-29';
  data.facts = {
    ...data.facts,
    salaries: [
      { ...data.facts.salaries[0], expectedOn: '2028-02-29' },
      { ...data.facts.salaries[1], expectedOn: '2028-03-31' },
    ],
  };
  assert.deepEqual(current(savedCyclePeriods(data, 'demo-a', 'salary-cycle')), {
    start: '2028-02-29',
    end: '2028-03-30',
  });
  const first = data.facts.invoices[0];
  data.asOf = '2027-01-01';
  data.facts = {
    ...data.facts,
    invoices: [
      { ...first, closesOn: '2026-12-31' },
      { ...first, id: 'next', closesOn: '2027-01-31' },
    ],
  };
  assert.deepEqual(current(savedCyclePeriods(data, 'demo-a', 'card-cycle')), {
    start: '2027-01-01',
    end: '2027-01-31',
  });
});
