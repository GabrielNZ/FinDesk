import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
const {
  expenseChartAtDay,
  expenseChartGeometry,
} = require('../../out/application/expense-chart.js');
const { accountBalanceAt } = require('../../out/domain/finance.js');
const { normalizeAnalysisLayout } = require('../../out/application/card-layout.js');
const {
  analyzeExpenses,
  expenseStatementPreview,
} = require('../../out/application/expense-analysis.js');
const { previousExpenseMonths } = require('../../out/application/expense-analysis-periods.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const {
  defaultCardLayout,
  parseCardLayout,
  resizeCard,
  reorderCard,
  resolveCardLayout,
} = require('../../out/application/card-layout.js');
const range = { start: '2026-10-01', end: '2026-10-31' };
function data() {
  const scenario = createDemoScenario();
  return {
    formatVersion: 1,
    seedId: 'demo-financas-v1',
    seedVersion: 1,
    timezone: scenario.timezone,
    asOf: scenario.clock.today(),
    facts: scenario.facts,
  };
}
function expense(id, on, amount, categoryId, accountId = 'demo-a') {
  return {
    ...data().facts.movements.find((m) => m.id === 'mov-uber-1'),
    id,
    on,
    categoryId,
    accountId,
    delta: { minorUnits: -amount, currency: accountId === 'demo-u' ? 'USD' : 'BRL' },
    description: id,
  };
}
function history(movements) {
  const snapshot = data();
  return {
    ...snapshot,
    facts: {
      ...snapshot.facts,
      movements,
      accounts: snapshot.facts.accounts.map((a) => ({ ...a, openingOn: '2026-06-30' })),
      coverage: snapshot.facts.coverage.map((c) => ({
        ...c,
        range: { start: '2026-07-01', end: snapshot.asOf },
      })),
    },
  };
}
function analyze(snapshot, patch = {}) {
  return analyzeExpenses(snapshot, {
    accountId: 'demo-a',
    range,
    previous: previousExpenseMonths(range),
    filters: { search: '', kind: null, category: null },
    currencyMode: 'original',
    rate: DEMO_EXCHANGE_RATE,
    labels: { a: 'Alimentação', t: 'Transporte', x: 'Casa' },
    ...patch,
  });
}
const value = (result, id, currency = 'BRL') =>
  result.find((i) => i.id === id).values.find((v) => v.currency === currency);
test('F07a/D136: setembro v2 preserva todos os fatos e saldos anteriores, com aplicação idempotente', () => {
  const original = data(),
    bytes = JSON.stringify(original),
    next = withSeptemberHistory(original);
  assert.equal(next.seedVersion, 2);
  assert.equal(next.facts.movements.length, original.facts.movements.length + 13);
  assert.deepEqual(
    next.facts.movements.slice(0, original.facts.movements.length),
    original.facts.movements,
  );
  for (const a of original.facts.accounts)
    for (const on of ['2026-09-30', original.asOf])
      assert.deepEqual(
        accountBalanceAt(next.facts, a.id, on),
        accountBalanceAt(original.facts, a.id, on),
      );
  assert.equal(JSON.stringify(original), bytes);
  assert.equal(withSeptemberHistory(next), next);
  assert.throws(() =>
    withSeptemberHistory({
      ...original,
      facts: {
        ...original.facts,
        movements: [
          ...original.facts.movements,
          { ...original.facts.movements[0], id: 'demo-september-2026-a-e1' },
        ],
      },
    }),
  );
  assert.throws(() => withSeptemberHistory({ ...original, seedVersion: 99 }));
});
test('F07a/D135: escala numérica, segmentos diagonais e cruzamentos vêm dos dados em eixo comum', () => {
  const result = analyze(withSeptemberHistory(data())),
    chart = value(result, 'largest').chart,
    plot = expenseChartGeometry(chart);
  assert.equal(chart.previous.value.minorUnits, 32000);
  assert.equal(chart.current.value.minorUnits, 27980);
  assert.match(plot.current, /^M.* L/);
  assert.doesNotMatch(plot.current, /[HV]/);
  assert.equal(plot.yTicks.at(-1).value.minorUnits, 0);
  assert.ok(plot.yTicks[0].value.minorUnits >= 32000);
  assert.deepEqual(
    plot.xTicks.map((t) => t.day),
    [1, 15, 29],
  );
  const amount = (point, day) =>
    point.series.filter((p) => Number(p.on.slice(-2)) <= day).at(-1)?.value.minorUnits ?? 0;
  assert.ok(amount(chart.current, 5) < amount(chart.previous, 5));
  assert.ok(amount(chart.current, 21) > amount(chart.previous, 21));
  assert.ok(amount(chart.current, 29) < amount(chart.previous, 29));
});

test('F07a/D141: cursor usa a data civil de cada linha e o acumulado real de cada dia', () => {
  const chart = value(analyze(withSeptemberHistory(data())), 'largest').chart;
  const start = expenseChartAtDay(chart, 1);
  assert.equal(start.days, 29);
  assert.deepEqual(
    [
      start.current.on,
      start.current.value.minorUnits,
      start.previous.on,
      start.previous.value.minorUnits,
    ],
    ['2026-10-01', 0, '2026-09-01', 0],
  );
  const end = expenseChartAtDay(chart, 29);
  assert.deepEqual(
    [end.current.on, end.current.value.minorUnits, end.previous.on, end.previous.value.minorUnits],
    ['2026-10-29', 27980, '2026-09-29', 32000],
  );
  assert.deepEqual(expenseChartAtDay(chart, 999), end);
  const absent = expenseChartAtDay(
    { ...chart, previous: { ...chart.previous, series: null, unavailable: 'history' } },
    29,
  );
  assert.equal(absent.previous.on, '2026-09-29');
  assert.equal(absent.previous.value, null);
});
test('F07a/D135: compactação preserva ordem/largura/alinhamento e alturas personalizadas', () => {
  const old = {
    ...defaultCardLayout('finance-analysis'),
    cards: defaultCardLayout('finance-analysis').cards.map((c, i) => ({
      ...c,
      columns: 6,
      align: 0.4,
      rows: i ? 3.25 : 5,
    })),
  };
  const next = normalizeAnalysisLayout(old);
  assert.equal(next.cards[0].rows, 5);
  assert.equal(next.cards[1].rows, 3.75);
  assert.deepEqual(
    next.cards.map((c) => [c.id, c.columns, c.align]),
    old.cards.map((c) => [c.id, c.columns, c.align]),
  );
  const general = defaultCardLayout();
  assert.equal(normalizeAnalysisLayout(general), general);
});
test('F07a/D132: gráfico usa anterior real, distingue ausência de zero e recorta sem mudar o maior gasto', () => {
  const base = analyze(data());
  assert.equal(value(base, 'largest').chart.current.value.minorUnits, 27980);
  assert.equal(value(base, 'largest').chart.previous.value, null);
  assert.equal(value(base, 'largest').chart.previous.unavailable, 'history');
  const distinct = analyze(
    history([expense('atual', '2026-10-08', 10000, 'x'), expense('ant', '2026-09-08', 90000, 'x')]),
  );
  assert.equal(value(distinct, 'usual').reference.minorUnits, 30000);
  assert.equal(value(distinct, 'usual').chart.previous.value.minorUnits, 90000);
  const zero = analyze(history([expense('atual', '2026-10-08', 10000, 'x')]));
  assert.equal(value(zero, 'largest').chart.previous.value.minorUnits, 0);
  assert.equal(value(zero, 'largest').chart.previous.unavailable, null);
  const partial = history([
    expense('28', '2027-03-28', 100, 'x'),
    expense('29', '2027-03-29', 1000, 'x'),
    expense('ant', '2027-02-28', 200, 'x'),
  ]);
  partial.asOf = '2027-03-29';
  partial.facts.coverage = partial.facts.coverage.map((c) => ({
    ...c,
    range: { start: '2026-07-01', end: partial.asOf },
  }));
  const march = { start: '2027-03-01', end: '2027-03-31' };
  const winner = value(
    analyze(partial, { range: march, previous: previousExpenseMonths(march) }),
    'largest',
  );
  assert.equal(winner.current.minorUnits, 1100);
  assert.equal(winner.chart.current.value.minorUnits, 100);
  assert.equal(winner.chart.previous.value.minorUnits, 200);
  assert.equal(winner.chart.current.range.end, '2027-03-28');
  assert.equal(winner.chart.shortened, true);
});
test('F07a/D134: curva acumula os gastos de cada dia e conserva o total com trechos horizontais', () => {
  const snapshot = history([
    expense('dia5-a', '2026-10-05', 3000, 'a'),
    expense('dia5-b', '2026-10-05', 2000, 'a'),
    expense('dia10', '2026-10-10', 3000, 'a'),
    expense('outra-cat', '2026-10-12', 1000, 'x'),
    expense('ant5', '2026-09-05', 1000, 'a'),
    expense('ant10', '2026-09-10', 2000, 'a'),
  ]);
  const chart = value(analyze(snapshot), 'largest').chart;
  assert.deepEqual(
    chart.current.series.map((p) => [p.on, p.value.minorUnits]),
    [
      ['2026-10-01', 0],
      ['2026-10-04', 0],
      ['2026-10-05', 5000],
      ['2026-10-09', 5000],
      ['2026-10-10', 8000],
      ['2026-10-29', 8000],
    ],
  );
  assert.deepEqual(
    chart.previous.series.map((p) => [p.on, p.value.minorUnits]),
    [
      ['2026-09-01', 0],
      ['2026-09-04', 0],
      ['2026-09-05', 1000],
      ['2026-09-09', 1000],
      ['2026-09-10', 3000],
      ['2026-09-29', 3000],
    ],
  );
  assert.deepEqual(chart.current.series.at(-1).value, chart.current.value);
  assert.deepEqual(chart.previous.series.at(-1).value, chart.previous.value);
});
test('F07a/D134: série ausente não vira zero; zero observado e conversão por item preservam precisão', () => {
  assert.equal(value(analyze(data()), 'largest').chart.previous.series, null);
  const snapshot = history([
    expense('usd1', '2026-10-05', 1, 'a', 'demo-u'),
    expense('usd2', '2026-10-10', 1, 'a', 'demo-u'),
  ]);
  const chart = value(
    analyze(snapshot, { accountId: 'all', currencyMode: 'BRL' }),
    'largest',
  ).chart;
  assert.deepEqual(
    chart.previous.series.map((p) => [p.on, p.value.minorUnits]),
    [
      ['2026-09-01', 0],
      ['2026-09-29', 0],
    ],
  );
  assert.equal(chart.current.series.at(-1).value.minorUnits, 10);
  assert.equal(chart.current.value.minorUnits, 10);
  for (let i = 1; i < chart.current.series.length; i++)
    assert.ok(
      chart.current.series[i].value.minorUnits >= chart.current.series[i - 1].value.minorUnits,
    );
});
test('F07a: demo atual informa maior gasto real e histórico ausente; futuro/zero/sem despesas são diferentes', () => {
  const snapshot = data(),
    original = JSON.stringify(snapshot),
    result = analyze(snapshot);
  assert.equal(value(result, 'largest').category, 'entretenimento');
  assert.equal(value(result, 'largest').current.minorUnits, 27980);
  for (const id of ['increase', 'decrease', 'usual'])
    assert.equal(value(result, id).status, 'history');
  assert.equal(
    value(analyze(snapshot, { filters: { search: '', kind: 'income', category: null } }), 'largest')
      .status,
    'empty',
  );
  assert.equal(
    value(
      analyze(snapshot, { range: { start: '2026-11-01', end: '2026-11-30' }, previous: [range] }),
      'largest',
    ).status,
    'future',
  );
  assert.equal(JSON.stringify(snapshot), original);
});
test('F07a/D130: impacto monetário supera percentual; maior distância da média pode ser abaixo', () => {
  const snapshot = history([
      expense('t-atual', '2026-10-08', 48000, 't'),
      expense('a-atual', '2026-10-08', 2000, 'a'),
      expense('t-anterior', '2026-09-08', 40000, 't'),
      expense('a-anterior', '2026-09-08', 1000, 'a'),
      expense('x-anterior', '2026-09-08', 90000, 'x'),
      expense('x-agosto', '2026-08-08', 90000, 'x'),
      expense('x-julho', '2026-07-08', 90000, 'x'),
    ]),
    result = analyze(snapshot);
  assert.equal(value(result, 'increase').category, 't');
  assert.equal(value(result, 'increase').difference.minorUnits, 8000);
  assert.equal(value(result, 'increase').percent, '+20,0%');
  assert.equal(value(result, 'decrease').category, 'x');
  assert.equal(value(result, 'decrease').current.minorUnits, 0);
  assert.equal(value(result, 'usual').category, 'x');
  assert.equal(value(result, 'usual').difference.minorUnits, -90000);
  assert.equal(value(result, 'usual').percent, '−100,0%');
});
test('F07a: média arredonda uma vez, base zero não divide, variação zero não ganha e empates usam nome', () => {
  const snapshot = history([
      expense('a', '2026-10-08', 100, 'a'),
      expense('t', '2026-10-08', 100, 't'),
      expense('ref-a', '2026-09-08', 1, 'a'),
      expense('ref-t', '2026-09-08', 1, 't'),
      expense('a-agosto', '2026-08-08', 1, 'a'),
      expense('t-agosto', '2026-08-08', 1, 't'),
    ]),
    result = analyze(snapshot);
  assert.equal(value(result, 'usual').reference.minorUnits, 1);
  assert.equal(value(result, 'usual').difference.minorUnits, 99);
  assert.equal(value(result, 'largest').ties, 2);
  assert.equal(value(result, 'largest').category, 'a');
  const zero = analyze(history([expense('nova', '2026-10-08', 100, 'a')]));
  assert.equal(value(zero, 'increase').percent, null);
  assert.equal(value(zero, 'increase').reference.minorUnits, 0);
  assert.equal(value(zero, 'decrease').status, 'empty');
  assert.equal(value(analyze(history([])), 'usual').status, 'empty');
});
test('F07a/D131: consulta é aplicada a todas as referências, sem misturar moedas ou converter ausências em zero', () => {
  const snapshot = history([
    expense('Uber atual', '2026-10-08', 2000, 't'),
    expense('Outros', '2026-10-08', 8000, 't'),
    expense('Uber anterior', '2026-09-08', 1000, 't'),
    expense('Outro anterior', '2026-09-08', 100000, 't'),
    expense('Dólar', '2026-10-08', 3000, 'a', 'demo-u'),
  ]);
  assert.equal(
    value(analyze(snapshot, { filters: { search: 'uber', kind: null, category: 't' } }), 'increase')
      .difference.minorUnits,
    1000,
  );
  const result = analyze(snapshot, { accountId: 'all' });
  assert.equal(value(result, 'largest', 'BRL').current.minorUnits, 10000);
  assert.equal(value(result, 'largest', 'USD').current.minorUnits, 3000);
  assert.equal(
    value(analyze(snapshot, { accountId: 'all', currencyMode: 'BRL' }), 'largest').current
      .minorUnits,
    15000,
  );
  assert.equal(
    value(analyze(snapshot, { accountId: 'all', currencyMode: 'BRL', rate: null }), 'largest')
      .status,
    'precision',
  );
  const incomplete = {
    ...snapshot,
    facts: {
      ...snapshot.facts,
      coverage: snapshot.facts.coverage.filter((c) => c.accountId !== 'demo-u'),
    },
  };
  const checked = analyze(incomplete, { accountId: 'all' });
  assert.equal(value(checked, 'largest', 'BRL').status, 'known');
  assert.equal(value(checked, 'largest', 'USD').status, 'coverage');
});
test('F07a: soma exata, IDs únicos, precisão excedida sem soma parcial e habitual exige três cobertos', () => {
  const tiny = analyze(history([expense('centavo', '2026-10-08', 1, 'a')]), {
    currencyMode: 'USD',
  });
  assert.equal(value(tiny, 'largest', 'USD').status, 'rounded-zero');
  const m = expense('a', '2026-10-08', Number.MAX_SAFE_INTEGER, 'a');
  assert.equal(
    value(analyze(history([m, m])), 'largest').current.minorUnits,
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(value(analyze(history([m, { ...m, id: 'b' }])), 'largest').status, 'precision');
  const snapshot = history([expense('a', '2026-10-08', 100, 'a')]);
  snapshot.facts.coverage = snapshot.facts.coverage.map((c) => ({
    ...c,
    range: { start: '2026-09-01', end: snapshot.asOf },
  }));
  assert.equal(value(analyze(snapshot), 'increase').status, 'known');
  assert.equal(value(analyze(snapshot), 'usual').status, 'history');
});
test('F07a: layout usa área/IDs próprios com resize/reordenação existentes sem aceitar cruzamento de áreas', () => {
  const layout = defaultCardLayout('finance-analysis');
  assert.equal(layout.cards.length, 4);
  assert.deepEqual(parseCardLayout(layout, 'finance-analysis'), layout);
  assert.throws(() => parseCardLayout(layout, 'finance-general'));
  assert.throws(() => parseCardLayout({ ...layout, version: 2 }));
  assert.throws(() =>
    parseCardLayout({ ...layout, cards: [...layout.cards.slice(0, 3), layout.cards[0]] }),
  );
  assert.equal(reorderCard(layout, 'usual', 0).cards[0].id, 'usual');
  const resized = resizeCard(layout, 'largest', 6, 4, 1300);
  assert.equal(resized.cards[0].rows, 4);
  assert.equal(resolveCardLayout(resized, 700).cards.length, 4);
});
test('F07a/D133: extrato flutuante respeita categoria, moeda, período e consulta sem mutar a base', () => {
  const snapshot = history([
    expense('brl', '2026-10-08', 100, 'transporte'),
    expense('usd', '2026-10-08', 100, 'transporte', 'demo-u'),
    expense('outra', '2026-10-08', 200, 'casa'),
    expense('anterior', '2026-09-08', 400, 'transporte'),
  ]);
  const before = JSON.stringify(snapshot);
  const query = {
    accountId: 'all',
    range,
    previous: previousExpenseMonths(range),
    filters: { search: '', kind: null, category: null },
    currencyMode: 'original',
    rate: DEMO_EXCHANGE_RATE,
    labels: {},
  };
  const request = { category: 'transporte', currency: 'BRL', range, label: 'Maior gasto' };
  const preview = expenseStatementPreview(snapshot, query, request);
  assert.deepEqual(
    preview.rows.map((row) => row.movement.id),
    ['brl'],
  );
  assert.equal(preview.total.minorUnits, 100);
  assert.equal(JSON.stringify(snapshot), before);
  const converted = expenseStatementPreview(snapshot, { ...query, currencyMode: 'BRL' }, request);
  assert.equal(converted.total.minorUnits, 600);
  assert.equal(converted.converted, true);
  assert.equal(
    expenseStatementPreview(
      snapshot,
      { ...query, filters: { search: 'ausente', kind: null, category: null } },
      request,
    ).rows.length,
    0,
  );
  assert.equal(
    expenseStatementPreview(snapshot, { ...query, currencyMode: 'BRL', rate: null }, request).total,
    null,
  );
});
