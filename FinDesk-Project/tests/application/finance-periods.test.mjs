import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  savedCyclePeriods,
  configuredSalaryPeriods,
} = require('../../out/application/finance-periods.js');
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

test('D49/D52: datas confirmadas prevalecem e geração não preenche histórico nem altera fatos', () => {
  const data = snapshot();
  const before = JSON.stringify(data);
  const rule = { accountId: 'demo-a', salaryDay: 31, salaryFrom: data.asOf, referenceCardId: null };
  const catalogue = configuredSalaryPeriods(data, 'demo-a', rule, '2027-01-31');
  assert.deepEqual(current(catalogue), { start: '2026-10-05', end: '2026-11-04' });
  assert.ok(
    catalogue.periods.some(
      (period) => period.range.start === '2026-11-05' && period.range.end === '2026-12-30',
    ),
  );
  assert.ok(!catalogue.periods.some((period) => period.range.start < '2026-10-05'));
  assert.equal(JSON.stringify(data), before);
  assert.ok(configuredSalaryPeriods(data, 'demo-u', rule).unavailableReason);
});

test('D47/D48/D52: ciclos gerados seguem mês curto/bissexto, fronteiras e referência de ativação persistida', () => {
  const data = snapshot();
  data.asOf = '2028-02-15';
  data.facts = { ...data.facts, salaries: [] };
  const rule = { accountId: 'demo-a', salaryDay: 31, salaryFrom: data.asOf, referenceCardId: null };
  const catalogue = configuredSalaryPeriods(data, 'demo-a', rule, '2028-04-01');
  assert.deepEqual(current(catalogue), { start: '2028-01-31', end: '2028-02-28' });
  assert.deepEqual(
    catalogue.periods.slice(1, 3).map((period) => period.range),
    [
      { start: '2028-02-29', end: '2028-03-30' },
      { start: '2028-03-31', end: '2028-04-29' },
    ],
  );
  assert.deepEqual(
    current(configuredSalaryPeriods({ ...data, asOf: '2028-02-29' }, 'demo-a', rule)),
    { start: '2028-02-29', end: '2028-03-30' },
  );
  assert.equal(
    configuredSalaryPeriods({ ...data, asOf: '2028-01-01' }, 'demo-a', rule).currentKey,
    null,
  );
  assert.ok(
    !configuredSalaryPeriods({ ...data, asOf: '2028-03-15' }, 'demo-a', rule).periods.some(
      (period) => period.range.start < '2028-01-31',
    ),
  );
});

test('D49: ambiguidade de previsões no mês fica indisponível sem escolher origem arbitrária', () => {
  const data = snapshot();
  data.facts = {
    ...data.facts,
    salaries: [
      ...data.facts.salaries,
      { ...data.facts.salaries[0], id: 'outra', expectedOn: '2026-10-20' },
    ],
  };
  const rule = { accountId: 'demo-a', salaryDay: 5, salaryFrom: data.asOf, referenceCardId: null };
  assert.match(configuredSalaryPeriods(data, 'demo-a', rule).unavailableReason, /Mais de uma/);
});

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

test('D46: referência explícita escolhe somente cartão da conta e não troca ao perder referência', () => {
  const data = snapshot();
  const card = data.facts.cards[0];
  const multiple = {
    ...data,
    facts: {
      ...data.facts,
      cards: [...data.facts.cards, { ...card, id: 'segundo' }],
      invoices: [
        ...data.facts.invoices,
        {
          ...data.facts.invoices[0],
          id: 'outro-anterior',
          cardId: 'segundo',
          closesOn: '2026-10-10',
        },
        { ...data.facts.invoices[1], id: 'outro-atual', cardId: 'segundo', closesOn: '2026-11-10' },
      ],
    },
  };
  assert.deepEqual(current(savedCyclePeriods(multiple, card.accountId, 'card-cycle', 'segundo')), {
    start: '2026-10-11',
    end: '2026-11-10',
  });
  assert.deepEqual(current(savedCyclePeriods(multiple, card.accountId, 'card-cycle', card.id)), {
    start: '2026-10-03',
    end: '2026-11-02',
  });
  for (const [accountId, reference] of [
    [card.accountId, 'ausente'],
    ['demo-u', card.id],
  ])
    assert.ok(savedCyclePeriods(multiple, accountId, 'card-cycle', reference).unavailableReason);
  assert.ok(savedCyclePeriods(data, card.accountId, 'card-cycle', 'segundo').unavailableReason);
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
