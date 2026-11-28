import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire(import.meta.url);
const { DemoStore } = require('../../out/desktop/storage/store.js');
const { defaultCardLayout } = require('../../out/application/card-layout.js');

async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-wallet-store-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-wallet-store-')
    )
      throw new Error('Perfil inválido.');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return root;
}
function oldWallet(snapshot) {
  const legacyFacts = { ...snapshot.facts };
  delete legacyFacts.cardRefunds;
  delete legacyFacts.commitments;
  delete legacyFacts.commitmentSeries;
  return {
    ...snapshot,
    formatVersion: 1,
    seedVersion: 2,
    facts: {
      ...legacyFacts,
      cards: snapshot.facts.cards.filter((c) => c.id !== 'card-demo-extra'),
      purchases: snapshot.facts.purchases.filter((p) => p.id !== 'compra-extra-demo'),
      invoices: snapshot.facts.invoices.filter((i) => i.cardId !== 'card-demo-extra'),
      invoiceItems: snapshot.facts.invoiceItems.filter((i) => i.id !== 'item-extra-nov'),
    },
  };
}
const preservedTables = [
  'category_state',
  'category_rules',
  'merchant_state',
  'expense_requests',
  'expense_edits',
  'expense_trash',
  'expense_lifecycle_requests',
];
function auxiliary(db) {
  return JSON.stringify(preservedTables.map((table) => db.prepare(`SELECT * FROM ${table}`).all()));
}

test('F08a/D150: atualização v2→v3 preserva fatos, manuais/excluídas/recibos/categorias/regras e layouts; reabertura idempotente', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  let db;
  try {
    const manual = store.createExpense({
      requestId: randomUUID(),
      accountId: 'demo-a',
      on: '2026-10-22',
      amountMinor: 1234,
      description: 'Preservar carteira',
      merchant: { mode: 'none' },
      classification: { mode: 'manual', categoryId: 'casa' },
    }).movementId;
    const deleted = store.createExpense({
      requestId: randomUUID(),
      accountId: 'demo-a',
      on: '2026-10-23',
      amountMinor: 5678,
      description: 'Excluída da carteira',
      merchant: { mode: 'none' },
      classification: { mode: 'manual', categoryId: 'casa' },
    }).movementId;
    store.deleteExpense({
      requestId: randomUUID(),
      movementId: deleted,
      expectedToken: store.getExpenseEdit(deleted).token,
    });
    store.saveCategoryRule({
      merchantId: 'uber',
      categoryId: 'casa',
      active: true,
      expectedRevision: null,
    });
    store.classifyMovement({ movementId: 'mov-merc', categoryId: 'casa' });
    const prefs = store.savePreferences({
      ...store.readPreferences(),
      lastAccountId: 'demo-a',
      currencyMode: 'USD',
      cycleReferences: [
        { accountId: 'demo-a', salaryDay: null, salaryFrom: null, referenceCardId: 'card-demo' },
      ],
    });
    const general = store.saveCardLayout(defaultCardLayout()),
      charts = store.saveExpenseChartsLayout(defaultCardLayout('finance-charts'));
    const legacy = oldWallet(store.readDemo()),
      token = store.getExpenseEdit(manual).token;
    store.close();
    db = new DatabaseSync(join(root, 'demo.sqlite'));
    db.prepare('UPDATE demo_state SET payload=?').run(JSON.stringify(legacy));
    const before = auxiliary(db);
    store = new DemoStore(root);
    const next = store.readDemo();
    assert.equal(next.seedVersion, 6);
    assert.equal(next.facts.cards.length, legacy.facts.cards.length + 1);
    assert.equal(auxiliary(db), before);
    for (const key of ['movements', 'accounts', 'salaries', 'subscriptions', 'coverage'])
      assert.deepEqual(next.facts[key], legacy.facts[key]);
    for (const key of ['cards', 'purchases', 'invoices', 'invoiceItems'])
      assert.deepEqual(next.facts[key].slice(0, legacy.facts[key].length), legacy.facts[key]);
    assert.deepEqual(store.readPreferences(), prefs);
    assert.deepEqual(store.readCardLayout(), general);
    assert.deepEqual(store.readExpenseChartsLayout(), charts);
    assert.equal(store.getExpenseEdit(manual).token, token);
    assert.equal(store.getExpenseTrash().trash[0].movement.id, deleted);
    store.close();
    store = new DemoStore(root);
    assert.deepEqual(store.readDemo(), next);
    assert.equal(auxiliary(db), before);
    store.restoreDemo();
    assert.equal(store.readDemo().seedVersion, 6);
    assert.equal(store.readDemo().facts.cards.length, 2);
    assert.deepEqual(store.readPreferences(), prefs);
    assert.deepEqual(store.readCardLayout(), general);
    assert.deepEqual(store.readExpenseChartsLayout(), charts);
  } finally {
    store.close();
    db?.close();
  }
});

test('F08a/D150: falha na atualização e colisão preservam bytes da seed anterior sem restauração', async (t) => {
  const root = await temporary(t),
    first = new DemoStore(root);
  const legacy = oldWallet(first.readDemo());
  first.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    const bytes = JSON.stringify(legacy);
    db.prepare('UPDATE demo_state SET payload=?').run(bytes);
    const before = auxiliary(db);
    db.exec(
      "CREATE TRIGGER fail_wallet BEFORE UPDATE ON demo_state WHEN json_extract(NEW.payload,'$.seedVersion')=3 BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    assert.equal(auxiliary(db), before);
    db.exec('DROP TRIGGER fail_wallet');
    const collision = {
      ...legacy,
      facts: {
        ...legacy.facts,
        cards: [
          ...legacy.facts.cards,
          { ...legacy.facts.cards[0], id: 'card-demo-extra', lastDigits: '9999' },
        ],
      },
    };
    const collisionBytes = JSON.stringify(collision);
    db.prepare('UPDATE demo_state SET payload=?').run(collisionBytes);
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, collisionBytes);
    assert.equal(auxiliary(db), before);
    db.prepare('UPDATE demo_state SET payload=?').run(bytes);
    const store = new DemoStore(root);
    try {
      assert.equal(store.readDemo().seedVersion, 6);
    } finally {
      store.close();
    }
  } finally {
    db.close();
  }
});
