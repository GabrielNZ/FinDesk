import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { reportExpenses, expenseReportPlot } = require('../../out/application/expense-reports.js');
const { money } = require('../../out/domain/money.js');
const { expenseStatementPreview } = require('../../out/application/expense-analysis.js');
const { previousExpenseMonths } = require('../../out/application/expense-analysis-periods.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { withSeptemberHistory } = require('../../out/fixtures/financas/comparison-history.js');
function data() {
  const scenario = createDemoScenario();
  return withSeptemberHistory({
    formatVersion: 1,
    seedId: 'demo-financas-v1',
    seedVersion: 1,
    timezone: scenario.timezone,
    asOf: scenario.clock.today(),
    facts: scenario.facts,
  });
}
const range = { start: '2026-10-01', end: '2026-10-31' };
const query = {
  accountId: 'demo-a',
  range,
  previous: previousExpenseMonths(range),
  filters: { search: '', kind: null, category: null },
  currencyMode: 'original',
  rate: DEMO_EXCHANGE_RATE,
  labels: {},
};
const report = (snapshot = data(), patch = {}) => reportExpenses(snapshot, { ...query, ...patch });
test('F07b: categorias somam o observado, ordenam por valor e excluem outros tipos sem alterar fatos', () => {
  const snapshot = data(),
    before = JSON.stringify(snapshot),
    lane = report(snapshot).lanes[0];
  const expenses = snapshot.facts.movements.filter(
    (m) =>
      m.accountId === 'demo-a' &&
      m.kind === 'expense' &&
      m.on >= range.start &&
      m.on <= snapshot.asOf,
  );
  assert.equal(
    lane.observed.total.minorUnits,
    expenses.reduce((sum, m) => sum - m.delta.minorUnits, 0),
  );
  assert.equal(
    lane.categories.reduce((sum, b) => sum + b.value.minorUnits, 0),
    lane.observed.total.minorUnits,
  );
  assert.ok(
    lane.categories.every((b, i, a) => !i || a[i - 1].value.minorUnits >= b.value.minorUnits),
  );
  assert.equal(lane.categories[0].width, 100);
  assert.ok(lane.categories.every((b) => /^\d+,\d%$/.test(b.share)));
  assert.equal(JSON.stringify(snapshot), before);
});
test('F07b: série diária e acumulada têm centavos exatos, dias sem despesa e final igual ao total', () => {
  const lane = report().lanes[0];
  assert.equal(lane.current.days.length, 29);
  assert.equal(lane.previous.days.length, 29);
  let accumulated = 0;
  for (const day of lane.current.days) {
    accumulated += day.value.minorUnits;
    assert.equal(day.accumulated.minorUnits, accumulated);
  }
  assert.equal(accumulated, lane.current.total.minorUnits);
  assert.ok(lane.current.days.some((day) => day.value.minorUnits === 0));
  assert.equal(lane.previous.days.at(-1).on, '2026-09-29');
  const daily = expenseReportPlot(lane, false),
    total = expenseReportPlot(lane, true);
  assert.ok(daily.yTicks[0].value.minorUnits < total.yTicks[0].value.minorUnits);
  assert.ok(daily.currentBars.every((b) => b.height >= 0 && b.height <= 50));
  assert.match(total.current, /^M.* L/);
});
test('F07b: eixo marca cada dia com despesa em qualquer série, inclusive no acumulado', () => {
  const original = report().lanes[0];
  const current = {
    ...original.current,
    days: original.current.days.map((day, index) =>
      index === 6 ? { ...day, value: money(1234, original.currency) } : day,
    ),
  };
  const lane = { ...original, current };
  const spendingDays = new Set(
    [current, lane.previous].flatMap((period) =>
      period.days.flatMap((day, index) => (day.value.minorUnits > 0 ? [index + 1] : [])),
    ),
  );
  for (const accumulated of [false, true]) {
    const ticks = expenseReportPlot(lane, accumulated).xTicks;
    assert.deepEqual(
      ticks.map((tick) => tick.day),
      [...new Set([1, 15, 29, ...spendingDays])].sort((a, b) => a - b),
    );
    assert.equal(ticks.find((tick) => tick.day === 7)?.hasExpense, true);
    assert.ok(ticks.every((tick) => tick.hasExpense === spendingDays.has(tick.day)));
  }
});
test('F07b: filtros valem para categorias e ambas as referências; vazio observado é zero', () => {
  const original = report().lanes[0],
    category = original.categories[0].category;
  const lane = report(data(), { filters: { ...query.filters, category } }).lanes[0];
  assert.deepEqual(
    lane.categories.map((b) => b.category),
    [category],
  );
  assert.equal(lane.categories[0].share, '100,0%');
  const empty = report(data(), { filters: { ...query.filters, kind: 'income' } }).lanes[0];
  assert.equal(empty.observed.total.minorUnits, 0);
  assert.deepEqual(empty.categories, []);
  assert.ok(empty.current.days.every((d) => d.value.minorUnits === 0));
});
test('F07b: cobertura ausente não vira zero; futuro e precisão/conversão indisponíveis são explícitos', () => {
  const snapshot = data();
  const missing = report({ ...snapshot, facts: { ...snapshot.facts, coverage: [] } }).lanes[0];
  assert.equal(missing.observed.unavailable, 'history');
  assert.equal(missing.observed.total, null);
  assert.deepEqual(missing.current.days, []);
  assert.deepEqual(missing.categories, []);
  const futureRange = { start: '2026-11-01', end: '2026-11-30' };
  assert.equal(
    report(snapshot, { range: futureRange, previous: previousExpenseMonths(futureRange) }).lanes[0]
      .observed.unavailable,
    'future',
  );
  assert.equal(
    report(snapshot, { currencyMode: 'USD', rate: null }).lanes[0].observed.unavailable,
    'precision',
  );
});
test('F07b: moedas originais separadas e conversão identificável preservam os totais de origem', () => {
  const { ALL_ACCOUNTS } = require('../../out/application/finance-context.js');
  const all = report(data(), { accountId: ALL_ACCOUNTS }).lanes;
  assert.deepEqual(
    all.map((l) => l.currency),
    ['BRL', 'USD'],
  );
  const usd = report(data(), { accountId: 'demo-u' }).lanes[0];
  assert.equal(
    all.find((l) => l.currency === 'USD').observed.total.minorUnits,
    usd.observed.total.minorUnits,
  );
  const brl = report(data(), { accountId: 'demo-u', currencyMode: 'BRL' }).lanes[0];
  assert.equal(brl.observed.total.minorUnits, usd.observed.total.minorUnits * 5);
});
test('F07b: encerrados preservam durações distintas; dias após o fim não ganham zero inventado', () => {
  const snapshot = data(),
    closed = { start: '2026-09-01', end: '2026-09-30' };
  const extended = {
    ...snapshot,
    facts: {
      ...snapshot.facts,
      accounts: snapshot.facts.accounts.map((a) => ({ ...a, openingOn: '2026-07-31' })),
      coverage: snapshot.facts.coverage.map((c) => ({
        ...c,
        range: { start: '2026-08-01', end: snapshot.asOf },
      })),
    },
  };
  const lane = report(extended, { range: closed, previous: previousExpenseMonths(closed) })
    .lanes[0];
  assert.equal(lane.current.days.length, 30);
  assert.equal(lane.previous.days.length, 31);
  assert.equal(lane.current.days[30], undefined);
});
test('F07b: modal de data aceita todas as categorias daquele dia e conserva filtros/moeda', () => {
  const snapshot = data(),
    lane = report(snapshot).lanes[0];
  const day = lane.current.days.find((d) => d.value.minorUnits > 0);
  const request = {
    category: null,
    currency: 'BRL',
    range: { start: day.on, end: day.on },
    label: 'Dia',
  };
  const preview = expenseStatementPreview(snapshot, query, request);
  assert.equal(preview.categoryLabel, 'Despesas do dia');
  assert.equal(preview.total.minorUnits, day.value.minorUnits);
  assert.ok(preview.rows.every((r) => r.movement.on === day.on && r.movement.kind === 'expense'));
  const old = expenseStatementPreview(snapshot, query, {
    ...request,
    category: preview.rows[0].category,
  });
  assert.ok(old.rows.every((r) => r.category === preview.rows[0].category));
});

test('F07b: IDs repetidos não duplicam gastos e soma insegura de categorias não produz total parcial', () => {
  const snapshot = data(),
    base = snapshot.facts.movements.find((m) => m.id === 'mov-uber-1');
  const pair = [
    { ...base, id: 'one' },
    { ...base, id: 'two' },
  ];
  const duplicate = report({
    ...snapshot,
    facts: { ...snapshot.facts, movements: [pair[0], pair[0], pair[1]] },
  }).lanes[0];
  assert.equal(duplicate.observed.total.minorUnits, -base.delta.minorUnits * 2);
  const unsafe = ['casa', 'transporte', 'alimentacao'].map((categoryId, index) => ({
    ...base,
    id: `big-${index}`,
    categoryId,
    delta: { currency: 'BRL', minorUnits: -3_100_000_000_000_000 },
  }));
  const overflow = report({ ...snapshot, facts: { ...snapshot.facts, movements: unsafe } })
    .lanes[0];
  assert.equal(overflow.observed.unavailable, 'precision');
  assert.equal(overflow.observed.total, null);
  assert.deepEqual(overflow.categories, []);
});
test('F07b: janela estreita usa a largura disponível sem converter a preferência salva', () => {
  const {
    defaultCardLayout,
    resolveCardLayout,
    parseCardLayout,
  } = require('../../out/application/card-layout.js');
  const layout = defaultCardLayout('finance-charts'),
    before = JSON.stringify(layout);
  const wide = resolveCardLayout(layout, 1036),
    narrow = resolveCardLayout(layout, 673);
  assert.equal(wide.cards[0].y, wide.cards[1].y);
  assert.ok(wide.cards[1].width > wide.cards[0].width);
  assert.ok(narrow.cards.every((c) => c.width === 673));
  assert.ok(narrow.cards[1].y >= narrow.cards[0].y + narrow.cards[0].height);
  assert.equal(JSON.stringify(layout), before);
  assert.throws(() =>
    parseCardLayout(
      { ...layout, cards: [...layout.cards, { id: 'upcoming', columns: 12, rows: 4 }] },
      'finance-charts',
    ),
  );
});

test('F07b: participação arredonda uma vez, inclui Sem categoria e não força soma de percentuais', () => {
  const snapshot = data(),
    base = snapshot.facts.movements.find((m) => m.id === 'mov-uber-1');
  const movements = [
    { ...base, id: 'cent-one', categoryId: null, delta: { currency: 'BRL', minorUnits: -1 } },
    {
      ...base,
      id: 'cent-fifteen',
      categoryId: 'casa',
      delta: { currency: 'BRL', minorUnits: -15 },
    },
  ];
  const lane = report({ ...snapshot, facts: { ...snapshot.facts, movements } }).lanes[0];
  assert.equal(lane.observed.total.minorUnits, 16);
  const unclassified = lane.categories.find((b) => b.value.minorUnits === 1);
  assert.equal(unclassified.share, '6,3%');
  assert.equal(lane.categories.find((b) => b.category === 'casa').share, '93,8%');
  const { categoryLabel } = require('../../out/application/statement.js');
  assert.equal(categoryLabel(unclassified.category, {}), 'Sem categoria');
});
