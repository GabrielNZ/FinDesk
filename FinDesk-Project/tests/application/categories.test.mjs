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
const { groupStatement } = require('../../out/application/statement-grouping.js');

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
