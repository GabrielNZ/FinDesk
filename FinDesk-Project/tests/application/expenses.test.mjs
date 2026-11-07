import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createDemoScenario } = require('../../out/fixtures/financas/demo.js');
const { initialCategories, categorizedMovements } = require('../../out/application/categories.js');
const {
  initialMerchants,
  parseExpenseAmount,
  parseCreateExpense,
  planExpense,
  parseMerchantCatalogue,
} = require('../../out/application/expenses.js');
const { accountBalanceAt } = require('../../out/domain/finance.js');
const {
  planExpenseEdit,
  parseEditExpense,
  editableExpense,
} = require('../../out/application/expense-editing.js');
const scenario = createDemoScenario();
const snapshot = {
  formatVersion: 1,
  seedId: scenario.id,
  seedVersion: 1,
  asOf: scenario.clock.today(),
  timezone: scenario.timezone,
  facts: scenario.facts,
};
const input = {
  requestId: '00000000-0000-4000-8000-000000000001',
  accountId: 'demo-a',
  on: '2026-10-20',
  amountMinor: 2000,
  description: 'Café fictício',
  merchant: { mode: 'none' },
  classification: { mode: 'automatic' },
};
test('F06b: editar mantém ID/origem/ordem e move um único débito entre contas da mesma moeda', () => {
  const id = '00000000-0000-4000-8000-000000000002';
  const original = planExpense(
    snapshot,
    initialCategories(),
    initialMerchants(snapshot),
    input,
    id,
    'unused',
  );
  const before = JSON.stringify(original);
  const command = {
    ...input,
    movementId: id,
    expectedToken: 'a'.repeat(64),
    accountId: 'demo-b',
    amountMinor: 3500,
    description: 'Café corrigido',
    classification: { mode: 'keep' },
  };
  const edited = planExpenseEdit(
    original.snapshot,
    original.categories,
    original.merchants,
    command,
    'unused',
  );
  assert.equal(edited.snapshot.facts.movements.length, original.snapshot.facts.movements.length);
  assert.deepEqual(
    edited.snapshot.facts.movements.at(-1).origin,
    original.snapshot.facts.movements.at(-1).origin,
  );
  assert.equal(edited.snapshot.facts.movements.at(-1).id, id);
  assert.equal(
    accountBalanceAt(edited.snapshot.facts, 'demo-a', snapshot.asOf).minorUnits,
    accountBalanceAt(snapshot.facts, 'demo-a', snapshot.asOf).minorUnits,
  );
  assert.equal(
    accountBalanceAt(edited.snapshot.facts, 'demo-b', snapshot.asOf).minorUnits,
    accountBalanceAt(snapshot.facts, 'demo-b', snapshot.asOf).minorUnits - 3500,
  );
  assert.equal(JSON.stringify(original), before);
  const usd = planExpense(
    snapshot,
    initialCategories(),
    initialMerchants(snapshot),
    { ...input, accountId: 'demo-u' },
    id,
    'unused',
  );
  const usdEdit = planExpenseEdit(
    usd.snapshot,
    usd.categories,
    usd.merchants,
    { ...command, accountId: 'demo-u' },
    'unused',
  );
  assert.deepEqual(usdEdit.snapshot.facts.movements.at(-1).delta, {
    minorUnits: -3500,
    currency: 'USD',
  });
  for (const patch of [
    { accountId: 'demo-u' },
    { on: '2026-09-30' },
    { on: '2026-10-30' },
    { classification: { mode: 'manual', categoryId: 'missing' } },
  ])
    assert.throws(() =>
      planExpenseEdit(
        original.snapshot,
        original.categories,
        original.merchants,
        { ...command, ...patch },
        'unused',
      ),
    );
});
test('F06b: categoria mantida conserva origem da classificação e escolha manual é explícita', () => {
  const id = '00000000-0000-4000-8000-000000000002';
  const original = planExpense(
    snapshot,
    initialCategories(),
    initialMerchants(snapshot),
    { ...input, classification: { mode: 'manual', categoryId: 'casa' } },
    id,
    'unused',
  );
  const command = {
    ...input,
    movementId: id,
    expectedToken: 'a'.repeat(64),
    merchant: { mode: 'new', name: 'Nova padaria fictícia' },
    classification: { mode: 'keep' },
  };
  const kept = planExpenseEdit(
    original.snapshot,
    original.categories,
    original.merchants,
    command,
    'new-shop',
  );
  assert.deepEqual(kept.categories, original.categories);
  assert.equal(kept.snapshot.facts.movements.at(-1).merchantId, 'new-shop');
  assert.equal(kept.snapshot.facts.movements.at(-1).categoryId, null);
  const cleared = planExpenseEdit(
    original.snapshot,
    original.categories,
    original.merchants,
    { ...command, classification: { mode: 'manual', categoryId: null } },
    'new-shop',
  );
  assert.deepEqual(cleared.categories.classifications.at(-1), { movementId: id, categoryId: null });
});
test('F06b: somente despesa manual local e contrato fechado, sem moeda/origem/regra arbitrária', () => {
  assert.equal(editableExpense(snapshot.facts.movements[0]), false);
  const command = {
    ...input,
    movementId: '00000000-0000-4000-8000-000000000002',
    expectedToken: 'a'.repeat(64),
    classification: { mode: 'keep' },
  };
  for (const patch of [
    { expectedToken: '' },
    { movementId: 'x' },
    { classification: { mode: 'automatic' } },
    { classification: { mode: 'keep', categoryId: null } },
    { origin: { kind: 'manual' } },
    { currency: 'USD' },
    { sql: 'delete' },
  ])
    assert.throws(() => parseEditExpense({ ...command, ...patch }));
  const created = planExpense(
    snapshot,
    initialCategories(),
    initialMerchants(snapshot),
    input,
    command.movementId,
    'unused',
  );
  for (const origin of [
    { kind: 'file', sourceId: 'demo-statement', externalId: 'x' },
    { kind: 'manual', sourceId: 'other', externalId: 'x' },
  ]) {
    const changed = {
      ...created.snapshot,
      facts: {
        ...created.snapshot.facts,
        movements: created.snapshot.facts.movements.map((m) =>
          m.id === command.movementId ? { ...m, origin } : m,
        ),
      },
    };
    assert.throws(() =>
      planExpenseEdit(changed, created.categories, created.merchants, command, 'unused'),
    );
  }
});
test('F06a: valor decimal exato e contrato fechado recusam ausência/zero/excesso/campos arbitrários', () => {
  assert.equal(parseExpenseAmount('0,01'), 1);
  assert.equal(parseExpenseAmount('20.5'), 2050);
  assert.equal(parseExpenseAmount('90071992547409,91'), Number.MAX_SAFE_INTEGER);
  for (const value of ['', '0', '-1', '1,234', '1.000,00', '1e2', 'NaN', '90071992547409,92'])
    assert.throws(() => parseExpenseAmount(value));
  for (const patch of [
    { amountMinor: 0 },
    { amountMinor: 1.1 },
    { on: '2026-02-30' },
    { description: '\ntexto' },
    { description: '' },
    { requestId: 'x' },
    { sql: 'delete' },
    { merchant: { mode: 'new', name: '' } },
    { merchant: { mode: 'none', name: 'Uber' } },
    { classification: { mode: 'automatic', categoryId: null } },
  ])
    assert.throws(() => parseCreateExpense({ ...input, ...patch }));
});
test('F06a/D116: despesa é saída na moeda da conta, respeita abertura/referência e não muda outros fatos', () => {
  const before = JSON.stringify(snapshot);
  const categories = initialCategories(),
    merchants = initialMerchants(snapshot);
  const next = planExpense(snapshot, categories, merchants, input, 'new-cafe', 'new-merchant');
  assert.equal(
    accountBalanceAt(next.snapshot.facts, 'demo-a', snapshot.asOf).minorUnits,
    accountBalanceAt(snapshot.facts, 'demo-a', snapshot.asOf).minorUnits - 2000,
  );
  const usd = planExpense(
    snapshot,
    categories,
    merchants,
    { ...input, accountId: 'demo-u' },
    'new-usd',
    'unused',
  );
  assert.equal(usd.snapshot.facts.movements.at(-1).delta.currency, 'USD');
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(next.snapshot.facts.movements.slice(0, -1), snapshot.facts.movements);
  for (const patch of [
    { on: '2026-09-30' },
    { on: '2026-09-01' },
    { on: '2026-10-30' },
    { accountId: 'all' },
    { merchant: { mode: 'existing', id: 'missing' } },
    { classification: { mode: 'manual', categoryId: 'missing' } },
  ])
    assert.throws(() =>
      planExpense(snapshot, categories, merchants, { ...input, ...patch }, 'x', 'y'),
    );
});
test('F06a/D114: identidade explícita, novo estabelecimento e escolha manual null são distintos de ausência', () => {
  const cats = initialCategories(),
    merchants = initialMerchants(snapshot);
  const noMerchant = planExpense(
    snapshot,
    cats,
    merchants,
    { ...input, description: 'Uber' },
    'a',
    'b',
  );
  assert.equal(noMerchant.snapshot.facts.movements.at(-1).merchantId, null);
  const next = planExpense(
    snapshot,
    cats,
    merchants,
    {
      ...input,
      merchant: { mode: 'new', name: '  Padaria  fictícia ' },
      classification: { mode: 'manual', categoryId: null },
    },
    'a',
    'new-shop',
  );
  assert.equal(next.merchants.merchants.at(-1).name, 'Padaria fictícia');
  assert.equal(next.snapshot.facts.movements.at(-1).merchantId, 'new-shop');
  assert.deepEqual(next.categories.classifications, [{ movementId: 'a', categoryId: null }]);
  assert.equal(
    categorizedMovements(next.snapshot.facts.movements, next.categories, [
      { movementId: 'a', categoryId: 'casa' },
    ]).at(-1).categoryId,
    null,
  );
  assert.throws(() =>
    planExpense(
      snapshot,
      cats,
      merchants,
      { ...input, merchant: { mode: 'new', name: 'ÚBER' } },
      'a',
      'b',
    ),
  );
  assert.throws(() =>
    parseMerchantCatalogue({
      ...merchants,
      merchants: [...merchants.merchants, merchants.merchants[0]],
    }),
  );
});
