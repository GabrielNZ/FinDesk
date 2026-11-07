import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  initialCategories,
  parseCategoryState,
  parseSaveCategory,
  parseClassification,
  saveCategory,
  classifyMovement,
  categorizedMovements,
} = require('../../out/application/categories.js');
const { createDemoScenario } = require('../../out/fixtures/financas/demo.js');
const { statementRows, filterStatement } = require('../../out/application/statement.js');
const { statementSelectionGrandTotals } = require('../../out/application/statement.js');
const { groupStatement } = require('../../out/application/statement-grouping.js');
const {
  initialCategoryRules,
  saveCategoryRule,
  recordRuleArrivals,
  parseRuleCatalogue,
  parseCategoryRuleState,
  parseSaveCategoryRule,
  ruleCatalogue,
} = require('../../out/application/category-rules.js');

function futureExpense(id, patch = {}) {
  const base = createDemoScenario().facts.movements.find((m) => m.id === 'mov-uber-1');
  return { ...base, id, origin: { ...base.origin, externalId: id }, ...patch };
}
function changeRule(state, patch = {}) {
  return saveCategoryRule(
    state,
    {
      merchantId: 'uber',
      categoryId: 'casa',
      active: true,
      expectedRevision: state.rules.find((r) => r.merchantId === 'uber')?.revision ?? null,
      ...patch,
    },
    initialCategories(),
    createDemoScenario().facts.movements,
  );
}

test('F05b.3/D108–D110: novos IDs de todas as contas/datas recebem regra; manuais prevalecem e origem fica intacta', () => {
  const facts = createDemoScenario().facts;
  const initial = initialCategoryRules(facts.movements);
  const rule = changeRule(initial);
  assert.deepEqual(rule.assignments, []);
  const arrivals = [
    ...facts.movements,
    futureExpense('old-usd', {
      accountId: 'demo-u',
      on: '2026-09-12',
      delta: { minorUnits: -1300, currency: 'USD' },
    }),
    futureExpense('without-rule', { merchantId: 'mercado', categoryId: 'alimentacao' }),
    futureExpense('unknown-category', { merchantId: null, categoryId: null }),
  ];
  const original = JSON.stringify(arrivals);
  const state = recordRuleArrivals(rule, arrivals);
  assert.equal(state.assignments.length, 1);
  assert.equal(state.assignments[0].movementId, 'old-usd');
  let presented = categorizedMovements(arrivals, initialCategories(), state.assignments);
  assert.equal(presented.find((m) => m.id === 'old-usd').categoryId, 'casa');
  assert.equal(presented.find((m) => m.id === 'mov-uber-1').categoryId, 'transporte');
  assert.equal(presented.find((m) => m.id === 'without-rule').categoryId, 'alimentacao');
  assert.equal(presented.find((m) => m.id === 'unknown-category').categoryId, null);
  const manual = classifyMovement(
    initialCategories(),
    { movementId: 'old-usd', categoryId: null },
    arrivals,
  );
  presented = categorizedMovements(arrivals, manual, state.assignments);
  assert.equal(presented.find((m) => m.id === 'old-usd').categoryId, null);
  assert.equal(JSON.stringify(arrivals), original);
  assert.deepEqual(recordRuleArrivals(state, arrivals), state);
  const sourceUpdated = arrivals.map((m) =>
    m.id === 'old-usd' ? { ...m, categoryId: 'entretenimento' } : m,
  );
  assert.equal(
    categorizedMovements(sourceUpdated, initialCategories(), state.assignments).find(
      (m) => m.id === 'old-usd',
    ).categoryId,
    'casa',
  );
});

test('F05b.3/D112: editar/pausar/reativar conserva atribuições antigas e reentrada não muda o passado', () => {
  const base = createDemoScenario().facts.movements;
  let state = changeRule(initialCategoryRules(base));
  state = recordRuleArrivals(state, [...base, futureExpense('first')]);
  state = changeRule(state, { categoryId: 'alimentacao' });
  state = recordRuleArrivals(state, [futureExpense('second')]);
  state = changeRule(state, { categoryId: 'alimentacao', active: false });
  state = recordRuleArrivals(state, [futureExpense('paused')]);
  state = changeRule(state, { categoryId: 'alimentacao', active: true });
  state = recordRuleArrivals(state, [futureExpense('paused'), futureExpense('third')]);
  assert.deepEqual(
    state.assignments.map((a) => [a.movementId, a.categoryId, a.ruleRevision]),
    [
      ['first', 'casa', 1],
      ['second', 'alimentacao', 2],
      ['third', 'alimentacao', 4],
    ],
  );
  state = changeRule(state, { categoryId: null });
  state = recordRuleArrivals(state, [futureExpense('explicit-null')]);
  assert.equal(
    categorizedMovements(
      [futureExpense('explicit-null')],
      initialCategories(),
      state.assignments,
    )[0].categoryId,
    null,
  );
});

test('F05b.3: contratos fechados, revisões obsoletas, atribuições sem regra e registros inválidos são recusados', () => {
  const state = changeRule(initialCategoryRules(createDemoScenario().facts.movements));
  assert.throws(() => changeRule(state, { expectedRevision: null }));
  assert.throws(() => changeRule(state, { merchantId: 'missing', expectedRevision: null }));
  assert.throws(() => changeRule(state, { categoryId: 'missing' }));
  for (const patch of [
    { path: 'x' },
    { active: 1 },
    { expectedRevision: 0 },
    { categoryId: '' },
    { merchantId: null },
  ])
    assert.throws(() =>
      parseSaveCategoryRule({
        merchantId: 'uber',
        categoryId: 'casa',
        active: true,
        expectedRevision: null,
        ...patch,
      }),
    );
  assert.throws(() => parseRuleCatalogue({ ...ruleCatalogue(state), version: 2 }));
  assert.throws(() => parseCategoryRuleState({ ...state, knownMovementIds: ['x', 'x'] }));
  assert.throws(() =>
    parseCategoryRuleState({
      ...state,
      assignments: [
        { movementId: 'unknown', merchantId: 'uber', categoryId: 'casa', ruleRevision: 1 },
      ],
    }),
  );
  assert.throws(() =>
    parseRuleCatalogue({ ...ruleCatalogue(state), rules: [...state.rules, state.rules[0]] }),
  );
  assert.throws(() =>
    parseRuleCatalogue({
      ...ruleCatalogue(state),
      assignments: [
        { movementId: 'new', merchantId: 'missing', categoryId: null, ruleRevision: 1 },
      ],
    }),
  );
});

test('F05b.3: lote usa categorias automáticas na busca/prévia sem confundi-las com overrides manuais', () => {
  const facts = createDemoScenario().facts;
  const rule = changeRule(
    initialCategoryRules(facts.movements.filter((m) => m.id !== 'mov-uber-1')),
  );
  const automatic = recordRuleArrivals(rule, facts.movements).assignments;
  const snapshot = { seedId: 'demo-financas-v1', facts };
  const state = initialCategories();
  const query = {
    accountId: 'demo-a',
    start: '2026-10-01',
    end: '2026-10-31',
    search: 'casa',
    kind: null,
    category: 'casa',
  };
  const preview = previewMerchantClassification(
    snapshot,
    state,
    query,
    'uber',
    'alimentacao',
    false,
    automatic,
  );
  assert.equal(preview.length, 1);
  assert.equal(preview[0].status, 'change');
  assert.equal(preview[0].expected.manual, false);
  const next = classifyMerchant(
    snapshot,
    state,
    {
      merchantId: 'uber',
      categoryId: 'alimentacao',
      includeManual: false,
      query,
      expected: preview.map((p) => p.expected),
    },
    automatic,
  );
  assert.equal(
    categorizedMovements(facts.movements, next, automatic).find((m) => m.id === 'mov-uber-1')
      .categoryId,
    'alimentacao',
  );
});
const {
  previewMerchantClassification,
  classifyMerchant,
  parseClassifyMerchant,
} = require('../../out/application/merchant-classification.js');

const query = {
  accountId: 'demo-a',
  start: '2026-10-01',
  end: '2026-10-31',
  search: '',
  kind: null,
  category: null,
};
function merchantInput(snapshot, state, patch = {}) {
  const input = { merchantId: 'uber', categoryId: 'casa', includeManual: false, query, ...patch };
  return {
    ...input,
    expected: previewMerchantClassification(
      snapshot,
      state,
      input.query,
      input.merchantId,
      input.categoryId,
      input.includeManual,
    ).map((item) => item.expected),
  };
}

test('F05b.2/D105: lote obedece conta, período, busca, tipo e categoria sem unir estabelecimentos', () => {
  const scenario = createDemoScenario();
  const first = scenario.facts.movements.find((m) => m.id === 'mov-uber-1');
  const snapshot = {
    seedId: 'demo-financas-v1',
    facts: {
      ...scenario.facts,
      movements: [
        ...scenario.facts.movements,
        { ...first, id: 'out-month', on: '2026-09-30' },
        { ...first, id: 'out-account', accountId: 'other' },
        { ...first, id: 'homonym', merchantId: 'different-uber' },
        { ...first, id: 'no-merchant', merchantId: null },
      ],
    },
  };
  const state = initialCategories();
  const original = JSON.stringify(snapshot);
  const base = merchantInput(snapshot, state);
  assert.equal(base.expected.length, 2);
  const changed = classifyMerchant(snapshot, state, base);
  assert.deepEqual(changed.classifications.map((c) => c.movementId).sort(), [
    'mov-uber-1',
    'mov-uber-2',
  ]);
  for (const filters of [{ search: 'energia' }, { kind: 'income' }, { category: 'alimentacao' }])
    assert.equal(
      merchantInput(snapshot, state, { query: { ...query, ...filters } }).expected.length,
      0,
    );
  const one = {
    ...snapshot,
    facts: {
      ...snapshot.facts,
      movements: snapshot.facts.movements.map((m) =>
        m.id === 'mov-uber-2' ? { ...m, categoryId: 'alimentacao' } : m,
      ),
    },
  };
  assert.equal(
    merchantInput(one, state, { query: { ...query, category: 'transporte', search: 'uber' } })
      .expected.length,
    1,
  );
  const narrow = merchantInput(snapshot, state, {
    query: { ...query, start: '2026-10-22', end: '2026-10-31' },
  });
  assert.equal(narrow.expected.length, 0);
  assert.equal(JSON.stringify(snapshot), original);
});

test('F05b.2: Todas as contas mantém moedas/IDs separados e prévia não soma BRL com USD', () => {
  const facts = createDemoScenario().facts;
  const expense = facts.movements.find((m) => m.id === 'mov-uber-1');
  const snapshot = {
    seedId: 'demo-financas-v1',
    facts: {
      ...facts,
      movements: [
        ...facts.movements,
        {
          ...expense,
          id: 'uber-usd',
          accountId: 'demo-u',
          delta: { minorUnits: -1200, currency: 'USD' },
        },
      ],
    },
  };
  const state = initialCategories();
  const input = merchantInput(snapshot, state, { query: { ...query, accountId: 'all' } });
  const preview = previewMerchantClassification(
    snapshot,
    state,
    input.query,
    'uber',
    'casa',
    false,
  );
  const totals = statementSelectionGrandTotals(
    preview.map(({ row }) => ({ ...row, amount: row.movement.delta })),
    'original',
  );
  assert.deepEqual(totals.map((t) => [t.currency, t.value.minorUnits]).sort(), [
    ['BRL', -6000],
    ['USD', -1200],
  ]);
  assert.equal(classifyMerchant(snapshot, state, input).classifications.length, 3);
});

test('F05b.2/D106: preserva manuais, inclusive null, e inclusão explícita altera somente a prévia confirmada', () => {
  const snapshot = { seedId: 'demo-financas-v1', facts: createDemoScenario().facts };
  let state = classifyMovement(
    initialCategories(),
    { movementId: 'mov-uber-1', categoryId: null },
    snapshot.facts.movements,
  );
  const original = JSON.stringify(state);
  const input = merchantInput(snapshot, state);
  const preview = previewMerchantClassification(snapshot, state, query, 'uber', 'casa', false);
  assert.equal(preview.filter((item) => item.status === 'preserved').length, 1);
  const next = classifyMerchant(snapshot, state, input);
  assert.deepEqual(
    next.classifications.find((c) => c.movementId === 'mov-uber-1'),
    { movementId: 'mov-uber-1', categoryId: null },
  );
  assert.equal(next.classifications.find((c) => c.movementId === 'mov-uber-2').categoryId, 'casa');
  const included = classifyMerchant(
    snapshot,
    state,
    merchantInput(snapshot, state, { includeManual: true }),
  );
  assert.equal(included.classifications.filter((c) => c.categoryId === 'casa').length, 2);
  assert.equal(JSON.stringify(state), original);
  state = classifyMovement(
    state,
    { movementId: 'mov-uber-1', categoryId: 'casa' },
    snapshot.facts.movements,
  );
  assert.equal(
    previewMerchantClassification(snapshot, state, query, 'uber', 'casa', true).filter(
      (p) => p.status === 'unchanged',
    ).length,
    1,
  );
  const cleared = classifyMerchant(
    snapshot,
    included,
    merchantInput(snapshot, included, { categoryId: null, includeManual: true }),
  );
  assert.equal(
    cleared.classifications.every((c) => c.categoryId === null),
    true,
  );
});

test('F05b.2: recusa prévia obsoleta/incompleta, categoria/conta inválida e contratos arbitrários', () => {
  const snapshot = { seedId: 'demo-financas-v1', facts: createDemoScenario().facts };
  const state = initialCategories();
  const input = merchantInput(snapshot, state);
  const changed = classifyMovement(
    state,
    { movementId: 'mov-uber-1', categoryId: 'alimentacao' },
    snapshot.facts.movements,
  );
  assert.throws(() => classifyMerchant(snapshot, changed, input), /consulta mudou/);
  assert.throws(() =>
    classifyMerchant(snapshot, state, { ...input, expected: input.expected.slice(1) }),
  );
  assert.throws(() => classifyMerchant(snapshot, state, { ...input, categoryId: 'missing' }));
  assert.throws(() =>
    classifyMerchant(snapshot, state, { ...input, query: { ...query, accountId: 'missing' } }),
  );
  assert.throws(() =>
    classifyMerchant(snapshot, state, { ...input, query: { ...query, search: 'energia' } }),
  );
  for (const patch of [
    { merchantId: '' },
    { includeManual: 1 },
    { expected: [] },
    { expected: [input.expected[0], input.expected[0]] },
    { sql: 'delete' },
    { query: { ...query, end: '2026-02-30' } },
    { query: { ...query, path: 'x' } },
    { expected: [{ ...input.expected[0], extra: true }] },
  ])
    assert.throws(() => parseClassifyMerchant({ ...input, ...patch }));
});

test('F05b.1: catálogo valida campos fechados, nomes/ícones/cores e identidades estáveis', () => {
  const initial = initialCategories();
  const before = JSON.stringify(initial);
  const input = { id: null, name: '  Saúde  pessoal ', icon: 'pi-heart', color: '#8fb8de' };
  const created = saveCategory(initial, input, 'new-health');
  assert.equal(created.categories.at(-1).name, 'Saúde pessoal');
  const renamed = saveCategory(created, { ...input, id: 'new-health', name: 'Saúde' }, 'unused');
  assert.equal(renamed.categories.at(-1).id, 'new-health');
  assert.equal(renamed.categories.at(-1).name, 'Saúde');
  assert.equal(JSON.stringify(initial), before);
  for (const patch of [
    { name: '' },
    { name: 'Sem categoria' },
    { name: 'X'.repeat(61) },
    { name: 'A\nB' },
    { icon: 'pi-evil script' },
    { color: 'url(remote)' },
    { path: 'secret' },
  ])
    assert.throws(() => parseSaveCategory({ ...input, ...patch }));
  assert.throws(() => saveCategory(created, { ...input, name: 'SAUDE PESSOAL' }, 'other'));
  assert.throws(() => saveCategory(created, { ...input, id: 'missing' }, 'other'));
  assert.throws(() => parseCategoryState({ ...initial, version: 2 }));
  assert.throws(() =>
    parseCategoryState({ ...initial, categories: [...initial.categories, initial.categories[0]] }),
  );
  assert.throws(() =>
    parseClassification({ movementId: 'mov-energia', categoryId: null, sql: 'delete' }),
  );
});

test('F05b.1: classificação individual prevalece sem alterar fatos, IDs, dinheiro ou outros lançamentos', () => {
  const scenario = createDemoScenario();
  const movements = scenario.facts.movements;
  const original = JSON.stringify(movements);
  const state = classifyMovement(
    initialCategories(),
    { movementId: 'mov-uber-1', categoryId: 'casa' },
    movements,
  );
  const next = categorizedMovements(movements, state);
  assert.equal(next.find((item) => item.id === 'mov-uber-1').categoryId, 'casa');
  assert.equal(next.find((item) => item.id === 'mov-uber-2').categoryId, 'transporte');
  const before = movements.find((item) => item.id === 'mov-uber-1');
  assert.deepEqual(
    next.find((item) => item.id === before.id),
    { ...before, categoryId: 'casa' },
  );
  const cleared = classifyMovement(
    state,
    { movementId: 'mov-uber-1', categoryId: null },
    movements,
  );
  assert.equal(cleared.classifications.length, 1);
  assert.equal(
    categorizedMovements(movements, cleared).find((item) => item.id === before.id).categoryId,
    null,
  );
  assert.equal(JSON.stringify(movements), original);
  for (const movementId of ['missing', 'mov-sal', 'mov-tr-a', 'mov-aporte', 'mov-fat-out'])
    assert.throws(() => classifyMovement(state, { movementId, categoryId: 'casa' }, movements));
  assert.throws(() =>
    classifyMovement(state, { movementId: 'mov-energia', categoryId: 'missing' }, movements),
  );
});

test('F05b.1: busca, Sem categoria e agrupamento usam nomes/classificações atuais sem alterar total', () => {
  const scenario = createDemoScenario();
  let state = saveCategory(
    initialCategories(),
    { id: 'transporte', name: 'Mobilidade', icon: 'pi-globe', color: '#8bc9c5' },
    'unused',
  );
  state = classifyMovement(
    state,
    { movementId: 'mov-uber-1', categoryId: null },
    scenario.facts.movements,
  );
  const snapshot = {
    seedId: 'demo-financas-v1',
    facts: { ...scenario.facts, movements: categorizedMovements(scenario.facts.movements, state) },
  };
  const rows = statementRows(snapshot, 'all', { start: '2026-10-01', end: '2026-10-31' });
  const labels = Object.fromEntries(state.categories.map((item) => [item.id, item.name]));
  assert.equal(
    filterStatement(rows, { search: 'mobilidade', kind: null, category: null }, labels).length,
    1,
  );
  assert.equal(
    filterStatement(rows, { search: '', kind: null, category: 'uncategorized' }, labels)[0].movement
      .id,
    'mov-uber-1',
  );
  const groups = groupStatement(
    rows.map((row) => ({ ...row, amount: row.movement.delta })),
    'original',
    {},
    labels,
  );
  assert.equal(
    groups.find((group) => group.label === 'Mobilidade').totals[0].value.minorUnits,
    -3000,
  );
  assert.equal(
    groups.find((group) => group.label === 'Sem categoria').totals[0].value.minorUnits,
    -3000,
  );
});
