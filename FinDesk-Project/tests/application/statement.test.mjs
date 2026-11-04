import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  statementRows,
  filterStatement,
  statementAmount,
  categoryKey,
  categoryLabel,
  keepStatementSelection,
  statementSelectionTotals,
  statementSelectionGrandTotals,
} = require('../../out/application/statement.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { money } = require('../../out/domain/money.js');
const {
  defaultStatementLayout,
  parseStatementLayout,
  resizeStatementLayout,
} = require('../../out/application/statement-layout.js');
function snapshot() {
  const demo = createDemoScenario();
  return { seedId: 'demo-financas-v1', asOf: demo.clock.today(), facts: demo.facts };
}
const month = { start: '2026-10-01', end: '2026-10-31' };
const emptyFilters = { search: '', kind: null, category: null };

test('F04a/D87: layout da lista usa contrato fechado, dimensões finitas e área própria', () => {
  const layout = defaultStatementLayout();
  assert.deepEqual(parseStatementLayout(layout), layout);
  for (const invalid of [
    null,
    [],
    {},
    { ...layout, version: 2 },
    { ...layout, area: 'finance-general' },
    { ...layout, sql: 'select' },
    { ...layout, listShare: NaN },
    { ...layout, listShare: Infinity },
    { ...layout, listShare: 0 },
    { ...layout, listHeight: -1 },
    { ...layout, listHeight: 1700 },
    { ...layout, listHeight: '300' },
  ])
    assert.throws(() => parseStatementLayout(invalid));
});

test('F04a/D87: resize contínuo preserva seleção lateral, altura automática e preferência em janela estreita', () => {
  const layout = defaultStatementLayout();
  const geometry = { width: 600, height: 500, available: 1000, gap: 20, stacked: false };
  const resized = resizeStatementLayout(layout, geometry, 40.5, -25.25);
  assert.equal(resized.listShare, 640.5 / 980);
  assert.equal(resized.listHeight, 474.75);
  assert.equal(resizeStatementLayout(layout, geometry, 20, 0).listHeight, null);
  assert.equal(resizeStatementLayout(layout, geometry, 99999, 99999).listShare, 740 / 980);
  assert.equal(resizeStatementLayout(layout, geometry, -99999, -99999).listHeight, 160);
  assert.equal(
    resizeStatementLayout(layout, { ...geometry, stacked: true }, -80, 0).listShare,
    layout.listShare,
  );
  assert.deepEqual(layout, defaultStatementLayout());
});

test('F04a: consulta somente caixa, preserva fatos, duas transferências e duplicidade aparente', () => {
  const data = snapshot();
  const before = JSON.stringify(data);
  const all = statementRows(data, 'all', month);
  assert.equal(all.length, 11);
  assert.equal(statementRows(data, 'demo-a', month).length, 10);
  assert.equal(statementRows(data, 'demo-u', month).length, 0);
  assert.equal(all.filter((r) => r.movement.kind === 'own-transfer').length, 2);
  assert.equal(all.filter((r) => r.description === 'Uber').length, 2);
  assert.equal(all[0].movement.id, 'mov-aporte');
  assert.ok(all.every((row, i) => !i || all[i - 1].movement.on >= row.movement.on));
  assert.equal(JSON.stringify(data), before);
});

test('F04a: limites inclusivos, intervalos de ciclo e conta inválida não vazam dados', () => {
  const data = snapshot();
  const day = statementRows(data, 'demo-a', { start: '2026-10-10', end: '2026-10-10' });
  assert.deepEqual(
    day.map((r) => r.movement.id),
    ['mov-fat-out', 'mov-merc'],
  );
  const cycle = statementRows(data, 'demo-a', { start: '2026-10-03', end: '2026-11-02' });
  assert.equal(cycle.length, 9);
  assert.equal(statementRows(data, 'missing', month).length, 0);
});

test('F04a: busca normaliza acentos/caixa e combina palavras, tipo e categoria', () => {
  const rows = statementRows(snapshot(), 'demo-a', month);
  assert.equal(filterStatement(rows, { ...emptyFilters, search: ' SALARIO ' }).length, 1);
  assert.equal(
    filterStatement(rows, {
      ...emptyFilters,
      search: 'uber transporte',
      kind: 'expense',
      category: 'transporte',
    }).length,
    2,
  );
  assert.equal(
    filterStatement(rows, { ...emptyFilters, search: 'uber', kind: 'income' }).length,
    0,
  );
  assert.equal(filterStatement(rows, { ...emptyFilters, category: 'entretenimento' }).length, 2);
  assert.equal(filterStatement(rows, { ...emptyFilters, search: 'mov-aporte' }).length, 1);
});

test('F04a: Sem categoria inclui só despesas ausentes; tipo financeiro não vira categoria', () => {
  const data = snapshot();
  const base = data.facts.movements.find((m) => m.kind === 'expense');
  const uncategorized = { ...base, id: 'no-category', categoryId: null };
  data.facts = { ...data.facts, movements: [...data.facts.movements, uncategorized] };
  const rows = statementRows(data, 'all', month);
  assert.equal(filterStatement(rows, { ...emptyFilters, category: 'uncategorized' }).length, 1);
  assert.equal(categoryKey(data.facts.movements[0]), null);
  assert.equal(categoryLabel('uncategorized'), 'Sem categoria');
  assert.equal(categoryLabel('categoria-local-desconhecida'), 'categoria-local-desconhecida');
  for (const kind of ['own-transfer', 'invoice-payment', 'investment-contribution']) {
    assert.equal(rows.find((r) => r.movement.kind === kind).category, null);
  }
});

test('F04a: moeda original, conversão exata/inversa e ausência de cotação sem zero inventado', () => {
  const brl = money(-20000, 'BRL');
  assert.equal(statementAmount(brl, 'original', null, '2026-10-29'), brl);
  assert.deepEqual(
    statementAmount(brl, 'USD', DEMO_EXCHANGE_RATE, '2026-10-29'),
    money(-4000, 'USD'),
  );
  assert.deepEqual(
    statementAmount(money(1234, 'USD'), 'BRL', DEMO_EXCHANGE_RATE, '2026-10-29'),
    money(6170, 'BRL'),
  );
  assert.equal(statementAmount(brl, 'USD', null, '2026-10-29'), null);
  assert.equal(statementAmount(brl, 'USD', DEMO_EXCHANGE_RATE, '2026-10-28'), null);
  assert.equal(
    statementAmount(brl, 'USD', { ...DEMO_EXCHANGE_RATE, numerator: 0 }, '2026-10-29'),
    null,
  );
  assert.deepEqual(brl, money(-20000, 'BRL'));
});

test('F04a: rótulo da demo nunca substitui descrição de outra fonte/seed', () => {
  const data = snapshot();
  data.seedId = 'other';
  assert.equal(
    statementRows(data, 'demo-a', month).find((r) => r.movement.id === 'mov-sal').description,
    'mov-sal',
  );
  data.seedId = 'demo-financas-v1';
  data.facts = {
    ...data.facts,
    movements: data.facts.movements.map((m) => ({
      ...m,
      origin: { ...m.origin, sourceId: 'other' },
    })),
  };
  assert.equal(
    statementRows(data, 'demo-a', month).find((r) => r.movement.id === 'mov-sal').description,
    'mov-sal',
  );
});

test('F04a/D82: seleção elimina IDs repetidos/fora da consulta e não os restaura ao limpar filtros', () => {
  const rows = statementRows(snapshot(), 'demo-a', month);
  const ids = ['mov-uber-1', 'mov-uber-1', 'mov-uber-2', 'missing'];
  const filtered = filterStatement(rows, { ...emptyFilters, search: 'mov-uber-1' });
  assert.deepEqual(keepStatementSelection(ids, filtered), ['mov-uber-1']);
  assert.deepEqual(keepStatementSelection(keepStatementSelection(ids, filtered), rows), [
    'mov-uber-1',
  ]);
});

test('F04a/D81: totais exatos por tipo/moeda, sem duplicar IDs nem classificar liquidações como despesas', () => {
  const rows = statementRows(snapshot(), 'all', month).map((row) => ({
    ...row,
    amount: row.movement.delta,
  }));
  const before = JSON.stringify(rows);
  const totals = statementSelectionTotals([...rows, rows[0]], 'original');
  const result = Object.fromEntries(totals.map((total) => [total.kind, total.value?.minorUnits]));
  assert.deepEqual(result, {
    expense: 63980,
    income: 300000,
    'transfer-out': 40000,
    'transfer-in': 40000,
    'invoice-payment': 26000,
    'investment-contribution': 20000,
  });
  assert.equal(
    totals.reduce((sum, total) => sum + total.count, 0),
    11,
  );
  const sample = rows.find((row) => row.movement.kind === 'expense');
  const usd = {
    ...sample,
    movement: { ...sample.movement, id: 'usd-expense', delta: money(-1000, 'USD') },
    amount: money(-1000, 'USD'),
  };
  assert.deepEqual(
    statementSelectionTotals([sample, usd], 'original').map((total) => total.currency),
    ['BRL', 'USD'],
  );
  const converted = [sample, usd].map((row) => ({
    ...row,
    amount: statementAmount(row.movement.delta, 'BRL', DEMO_EXCHANGE_RATE, '2026-10-29'),
  }));
  assert.equal(
    statementSelectionTotals(converted, 'BRL')[0].value.minorUnits,
    Math.abs(sample.amount.minorUnits) + 5000,
  );
  assert.equal(JSON.stringify(rows), before);
});

test('F04a: conversão ausente ou soma excedida não exibe subtotal parcial', () => {
  const row = statementRows(snapshot(), 'demo-a', month).find(
    (item) => item.movement.kind === 'expense',
  );
  const rows = [
    { ...row, amount: null },
    { ...row, movement: { ...row.movement, id: 'other' }, amount: money(-100, 'USD') },
  ];
  assert.equal(statementSelectionTotals(rows, 'USD')[0].value, null);
  assert.equal(statementSelectionGrandTotals(rows, 'USD')[0].value, null);
  assert.equal(statementSelectionTotals([...rows].reverse(), 'USD')[0].value, null);
  const huge = { ...row, amount: money(-Number.MAX_SAFE_INTEGER, 'BRL') };
  assert.equal(
    statementSelectionTotals(
      [huge, { ...huge, movement: { ...huge.movement, id: 'too-much' } }],
      'BRL',
    )[0].value,
    null,
  );
});

test('F04a/D88: exemplo de quatro itens soma −619,90 e mantém despesas em 159,90', () => {
  const ids = new Set(['mov-aporte', 'mov-energia', 'mov-mensal', 'mov-fat-out']);
  const rows = statementRows(snapshot(), 'demo-a', month)
    .filter((row) => ids.has(row.movement.id))
    .map((row) => ({ ...row, amount: row.movement.delta }));
  assert.equal(rows.length, 4);
  const before = JSON.stringify(rows);
  assert.deepEqual(statementSelectionGrandTotals([...rows, rows[0]], 'original'), [
    { currency: 'BRL', value: money(-61990, 'BRL') },
  ]);
  assert.equal(
    statementSelectionTotals(rows, 'original').find((item) => item.kind === 'expense').value
      .minorUnits,
    15990,
  );
  assert.deepEqual(
    statementSelectionGrandTotals(
      rows.filter((row) => row.movement.id !== 'mov-fat-out'),
      'original',
    ),
    [{ currency: 'BRL', value: money(-35990, 'BRL') }],
  );
  assert.equal(JSON.stringify(rows), before);
});

test('F04a/D88: total respeita sinais/moedas, compensação exata e indisponibilidade', () => {
  const rows = statementRows(snapshot(), 'all', month).map((row) => ({
    ...row,
    amount: row.movement.delta,
  }));
  const transfers = rows.filter((row) => row.movement.kind === 'own-transfer');
  assert.deepEqual(statementSelectionGrandTotals(transfers, 'original'), [
    { currency: 'BRL', value: money(0, 'BRL') },
  ]);
  assert.deepEqual(statementSelectionGrandTotals([], 'original'), []);
  const sample = rows[0];
  const mixed = [
    {
      ...sample,
      movement: { ...sample.movement, id: 'inflow', delta: money(10000, 'BRL') },
      amount: money(10000, 'BRL'),
    },
    {
      ...sample,
      movement: { ...sample.movement, id: 'outflow', delta: money(-2000, 'BRL') },
      amount: money(-2000, 'BRL'),
    },
    {
      ...sample,
      movement: { ...sample.movement, id: 'usd', delta: money(-1000, 'USD') },
      amount: money(-1000, 'USD'),
    },
  ];
  assert.deepEqual(statementSelectionGrandTotals(mixed, 'original'), [
    { currency: 'BRL', value: money(8000, 'BRL') },
    { currency: 'USD', value: money(-1000, 'USD') },
  ]);
  assert.deepEqual(
    statementSelectionGrandTotals(
      mixed.map((row) => ({
        ...row,
        amount: statementAmount(row.movement.delta, 'BRL', DEMO_EXCHANGE_RATE, '2026-10-29'),
      })),
      'BRL',
    ),
    [{ currency: 'BRL', value: money(3000, 'BRL') }],
  );
  const large = [Number.MAX_SAFE_INTEGER, 1, -Number.MAX_SAFE_INTEGER].map((value, index) => ({
    ...sample,
    movement: { ...sample.movement, id: `large-${index}` },
    amount: money(value, 'BRL'),
  }));
  assert.deepEqual(statementSelectionGrandTotals(large, 'BRL'), [
    { currency: 'BRL', value: money(1, 'BRL') },
  ]);
  assert.equal(statementSelectionGrandTotals(large.slice(0, 2), 'BRL')[0].value, null);
});
