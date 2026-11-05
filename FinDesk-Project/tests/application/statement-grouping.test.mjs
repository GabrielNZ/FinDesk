import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  groupStatement,
  filterStatementGroup,
} = require('../../out/application/statement-grouping.js');
const {
  statementRows,
  filterStatement,
  statementAmount,
} = require('../../out/application/statement.js');
const { createDemoScenario, DEMO_EXCHANGE_RATE } = require('../../out/fixtures/financas/demo.js');
const { DEMO_MERCHANT_LABELS } = require('../../out/fixtures/financas/labels.js');
const { money } = require('../../out/domain/money.js');

function rows() {
  const demo = createDemoScenario();
  const snapshot = { seedId: 'demo-financas-v1', asOf: demo.clock.today(), facts: demo.facts };
  return statementRows(snapshot, 'all', { start: '2026-10-01', end: '2026-10-31' }).map((row) => ({
    ...row,
    amount: row.movement.delta,
  }));
}

test('F05a: categoria → estabelecimento → registros, todos os tipos e quantidades/totais coerentes', () => {
  const input = rows();
  const before = JSON.stringify(input);
  const tree = groupStatement(input, 'original', DEMO_MERCHANT_LABELS);
  assert.equal(tree.length, 8);
  assert.equal(
    tree.reduce((sum, group) => sum + group.count, 0),
    11,
  );
  const transport = tree.find((group) => group.label === 'Transporte');
  assert.equal(transport.level, 'category');
  assert.equal(transport.count, 2);
  assert.deepEqual(transport.totals, [{ currency: 'BRL', value: money(-6000, 'BRL') }]);
  assert.equal(transport.children.length, 1);
  assert.equal(transport.children[0].label, 'Uber');
  assert.deepEqual(
    transport.children[0].rows.map((row) => row.movement.id),
    ['mov-uber-1', 'mov-uber-2'],
  );
  for (const kind of ['income', 'own-transfer', 'invoice-payment', 'investment-contribution'])
    assert.equal(tree.filter((group) => group.filter.kind === kind).length, 1);
  assert.deepEqual(tree.find((group) => group.filter.kind === 'own-transfer').totals, [
    { currency: 'BRL', value: money(0, 'BRL') },
  ]);
  assert.equal(
    tree.filter((group) => group.level === 'category').reduce((sum, group) => sum + group.count, 0),
    6,
  );
  assert.equal(JSON.stringify(input), before);
});

test('F05a: duplicidade aparente preservada, ID repetido contado uma vez e homônimos não fundidos', () => {
  const input = rows().filter((row) => row.movement.id.startsWith('mov-uber'));
  const other = {
    ...input[0],
    movement: { ...input[0].movement, id: 'uber-another', merchantId: 'other' },
  };
  const tree = groupStatement([...input, input[0], other], 'original', {
    uber: 'Uber',
    other: 'Uber',
  });
  assert.equal(tree[0].count, 3);
  assert.equal(tree[0].children.length, 2);
  assert.notEqual(tree[0].children[0].id, tree[0].children[1].id);
  assert.equal(
    tree[0].children.every((group) => group.label === 'Uber'),
    true,
  );
  assert.deepEqual(tree[0].totals, [{ currency: 'BRL', value: money(-9000, 'BRL') }]);
});

test('F05a: Sem categoria/estabelecimento continuam visíveis e IDs incomuns não viram propriedades herdadas', () => {
  const sample = rows().find((row) => row.movement.kind === 'expense');
  const input = [
    { ...sample, movement: { ...sample.movement, id: 'none', categoryId: null, merchantId: null } },
    {
      ...sample,
      movement: {
        ...sample.movement,
        id: 'special',
        categoryId: 'constructor',
        merchantId: '__proto__',
      },
    },
    {
      ...sample,
      movement: {
        ...sample.movement,
        id: 'literal',
        categoryId: 'uncategorized',
        merchantId: null,
      },
    },
  ];
  const tree = groupStatement(input, 'original');
  assert.equal(tree.length, 3);
  const unknown = tree.find((group) => group.filter.categoryId === null);
  assert.equal(unknown.label, 'Sem categoria');
  assert.equal(unknown.children[0].label, 'Estabelecimento não informado');
  assert.equal(
    tree.find((group) => group.filter.categoryId === 'constructor').label,
    'constructor',
  );
  assert.equal(
    tree.find((group) => group.filter.categoryId === 'constructor').children[0].label,
    '__proto__',
  );
  assert.notEqual(unknown.id, tree.find((group) => group.filter.categoryId === 'uncategorized').id);
});

test('F05a: grupos seguem filtros sem alterar consulta e critérios não atravessam categorias/tipos', () => {
  const input = rows();
  const tree = groupStatement(input, 'original', DEMO_MERCHANT_LABELS);
  const transport = tree.find((group) => group.label === 'Transporte');
  const uber = transport.children[0];
  assert.equal(filterStatementGroup(input, uber.filter).length, 2);
  assert.equal(filterStatementGroup(input, { ...uber.filter, categoryId: 'casa' }).length, 0);
  assert.equal(filterStatementGroup(input, { level: 'kind', kind: 'invoice-payment' }).length, 1);
  const filtered = filterStatement(input, { search: 'Energia', kind: 'expense', category: null });
  assert.equal(groupStatement(filtered, 'original').length, 1);
  assert.equal(groupStatement(filtered, 'original')[0].count, 1);
  assert.deepEqual(groupStatement(filterStatementGroup(filtered, uber.filter), 'original'), []);
  assert.equal(filterStatementGroup(input, null).length, input.length);
});

test('F05a: moedas originais separadas, conversão por item e ausência de valor sem total parcial', () => {
  const row = rows().find((item) => item.movement.id === 'mov-uber-1');
  const usd = {
    ...row,
    movement: { ...row.movement, id: 'usd', accountId: 'demo-u', delta: money(-1234, 'USD') },
    amount: money(-1234, 'USD'),
  };
  const tree = groupStatement([row, usd], 'original');
  assert.deepEqual(tree[0].totals, [
    { currency: 'BRL', value: money(-3000, 'BRL') },
    { currency: 'USD', value: money(-1234, 'USD') },
  ]);
  const converted = [row, usd].map((item) => ({
    ...item,
    amount: statementAmount(item.movement.delta, 'BRL', DEMO_EXCHANGE_RATE, '2026-10-29'),
  }));
  assert.deepEqual(groupStatement(converted, 'BRL')[0].totals, [
    { currency: 'BRL', value: money(-9170, 'BRL') },
  ]);
  converted[1] = { ...converted[1], amount: null };
  assert.equal(groupStatement(converted, 'BRL')[0].totals[0].value, null);
  assert.equal(groupStatement(converted, 'BRL')[0].count, 2);
});
