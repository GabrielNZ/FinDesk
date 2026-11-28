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
const { StorageClient } = require('../../out/desktop/storage/client.js');
const { invoiceRegisteredAmounts } = require('../../out/domain/card-refunds.js');
const { defaultCardLayout } = require('../../out/application/card-layout.js');
const { validateSnapshot } = require('../../out/desktop/storage/contracts.js');

async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-refund-store-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-refund-store-')
    )
      throw new Error('Perfil de teste inválido.');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return root;
}
function legacy(snapshot) {
  const facts = { ...snapshot.facts };
  delete facts.cardRefunds;
  delete facts.commitments;
  delete facts.commitmentSeries;
  return { ...snapshot, formatVersion: 1, seedVersion: 3, facts };
}
function auxiliary(db) {
  return JSON.stringify(
    [
      'category_state',
      'category_rules',
      'merchant_state',
      'expense_requests',
      'expense_edits',
      'expense_trash',
      'expense_lifecycle_requests',
    ].map((table) => db.prepare(`SELECT * FROM ${table}`).all()),
  );
}

test('D177: formato v1/seed v3 migra atomicamente, preserva fatos/auxiliares/layouts e reabre sem duplicação', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  let db;
  try {
    store.createExpense({
      requestId: randomUUID(),
      accountId: 'demo-a',
      on: '2026-10-22',
      amountMinor: 1200,
      description: 'Preservar estorno',
      merchant: { mode: 'none' },
      classification: { mode: 'manual', categoryId: 'casa' },
    });
    const layout = store.saveInvoiceCardsLayout(defaultCardLayout('finance-invoices'));
    const preferences = store.savePreferences({ ...store.readPreferences(), currencyMode: 'USD' });
    const before = legacy(store.readDemo());
    store.close();
    db = new DatabaseSync(join(root, 'demo.sqlite'));
    db.prepare('UPDATE demo_state SET payload=?').run(JSON.stringify(before));
    const aux = auxiliary(db);
    store = new DemoStore(root);
    const after = store.readDemo();
    assert.equal(after.formatVersion, 4);
    assert.equal(after.seedVersion, 6);
    assert.equal(after.facts.cardRefunds.length, 1);
    for (const key of Object.keys(before.facts))
      assert.deepEqual(after.facts[key], before.facts[key]);
    assert.equal(invoiceRegisteredAmounts(after.facts, 'fat-nov').net.minorUnits, 23324);
    assert.equal(auxiliary(db), aux);
    assert.deepEqual(store.readInvoiceCardsLayout(), layout);
    assert.deepEqual(store.readPreferences(), preferences);
    const bytes = db.prepare('SELECT payload FROM demo_state').get().payload;
    store.close();
    store = new DemoStore(root);
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    assert.deepEqual(store.readDemo(), after);
    const restored = store.restoreDemo();
    assert.equal(restored.facts.cardRefunds.length, 1);
    assert.equal(restored.seedVersion, 6);
    assert.deepEqual(store.readPreferences(), preferences);
    assert.deepEqual(store.readInvoiceCardsLayout(), layout);
  } finally {
    store.close();
    db?.close();
  }
});

test('falha da atualização preserva bytes legados e auxiliares; retomada inclui só um crédito', async (t) => {
  const root = await temporary(t);
  const first = new DemoStore(root);
  const before = legacy(first.readDemo());
  first.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    const bytes = JSON.stringify(before);
    db.prepare('UPDATE demo_state SET payload=?').run(bytes);
    const aux = auxiliary(db);
    db.exec(
      "CREATE TRIGGER fail_refund BEFORE UPDATE ON demo_state WHEN json_extract(NEW.payload,'$.seedVersion')=4 BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    assert.equal(auxiliary(db), aux);
    db.exec('DROP TRIGGER fail_refund');
    const store = new DemoStore(root);
    try {
      assert.equal(store.readDemo().facts.cardRefunds.length, 1);
    } finally {
      store.close();
    }
  } finally {
    db.close();
  }
});

test('parser versionado recusa estorno futuro, extras e contratos misturados; worker entrega crédito observado', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  const data = store.readDemo();
  store.close();
  assert.doesNotThrow(() => validateSnapshot(legacy(data)));
  for (const change of [
    (s) => {
      delete s.facts.cardRefunds;
    },
    (s) => {
      s.formatVersion = 1;
    },
    (s) => {
      s.seedVersion = 3;
    },
    (s) => {
      s.facts.cardRefunds[0].on = '2026-10-30';
    },
    (s) => {
      s.facts.cardRefunds[0].extra = true;
    },
    (s) => {
      s.facts.cardRefunds.push({ ...s.facts.cardRefunds[0] });
    },
  ]) {
    const value = structuredClone(data);
    change(value);
    assert.throws(
      () => validateSnapshot(value),
      (error) => error.code === 'corrupt',
    );
  }
  const client = new StorageClient(root);
  try {
    const result = await client.getDemo();
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, data);
  } finally {
    await client.close();
  }
});
