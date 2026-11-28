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
const { defaultCardLayout } = require('../../out/application/card-layout.js');
const { validateSnapshot } = require('../../out/desktop/storage/contracts.js');
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-commitment-store-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-commitment-store-')
    )
      throw new Error('Perfil inválido.');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return root;
}
function legacy(snapshot) {
  const facts = { ...snapshot.facts };
  delete facts.commitments;
  delete facts.commitmentSeries;
  return { ...snapshot, formatVersion: 2, seedVersion: 4, facts };
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

test('D181: formato 2/seed 4 evolui sem alterar fatos/caixa/auxiliares e reabre idempotentemente', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root),
    db;
  try {
    store.createExpense({
      requestId: randomUUID(),
      accountId: 'demo-a',
      on: '2026-10-22',
      amountMinor: 321,
      description: 'Preservar compromissos',
      merchant: { mode: 'none' },
      classification: { mode: 'manual', categoryId: 'casa' },
    });
    const preferences = store.saveCommitmentPreferences({
      version: 1,
      period: 'next-30-days',
      view: 'calendar',
    });
    const layout = store.saveCommitmentCardsLayout(defaultCardLayout('finance-commitments'));
    const general = store.saveCardLayout(defaultCardLayout());
    const before = legacy(store.readDemo());
    store.close();
    db = new DatabaseSync(join(root, 'demo.sqlite'));
    db.prepare('UPDATE demo_state SET payload=?').run(JSON.stringify(before));
    const aux = auxiliary(db);
    store = new DemoStore(root);
    const after = store.readDemo();
    assert.equal(after.formatVersion, 4);
    assert.equal(after.seedVersion, 6);
    assert.equal(after.facts.commitments.length, 4);
    assert.equal(after.facts.commitments.filter((row) => row.paymentMovementId).length, 1);
    for (const key of Object.keys(before.facts))
      assert.deepEqual(after.facts[key], before.facts[key]);
    assert.equal(auxiliary(db), aux);
    assert.deepEqual(store.readCommitmentPreferences(), preferences);
    assert.deepEqual(store.readCommitmentCardsLayout(), layout);
    assert.deepEqual(store.readCardLayout(), general);
    const bytes = db.prepare('SELECT payload FROM demo_state').get().payload;
    store.close();
    store = new DemoStore(root);
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    assert.deepEqual(store.readDemo(), after);
    store.restoreDemo();
    assert.equal(store.readDemo().facts.commitments.length, 4);
    assert.deepEqual(store.readCommitmentPreferences(), preferences);
    assert.deepEqual(store.readCommitmentCardsLayout(), layout);
    assert.deepEqual(store.readCardLayout(), general);
  } finally {
    store.close();
    db?.close();
  }
});

test('falha da seed e vínculos inválidos preservam payload anterior; parser continua versionado', async (t) => {
  const root = await temporary(t),
    first = new DemoStore(root),
    current = first.readDemo(),
    before = legacy(current);
  first.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    const bytes = JSON.stringify(before);
    db.prepare('UPDATE demo_state SET payload=?').run(bytes);
    const aux = auxiliary(db);
    db.exec(
      "CREATE TRIGGER fail_commitments BEFORE UPDATE ON demo_state WHEN json_extract(NEW.payload,'$.seedVersion')=5 BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, bytes);
    assert.equal(auxiliary(db), aux);
    db.exec('DROP TRIGGER fail_commitments');
    for (const change of [
      (s) => {
        s.facts.commitments[1].paymentMovementId = 'mov-fat-out';
      },
      (s) => {
        s.facts.commitments[0].extra = true;
      },
      (s) => {
        delete s.facts.commitments;
      },
      (s) => {
        s.formatVersion = 2;
      },
    ]) {
      const bad = structuredClone(current);
      change(bad);
      assert.throws(() => validateSnapshot(bad));
      const payload = JSON.stringify(bad);
      db.prepare('UPDATE demo_state SET payload=?').run(payload);
      assert.throws(() => new DemoStore(root));
      assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, payload);
    }
    db.prepare('UPDATE demo_state SET payload=?').run(bytes);
    const store = new DemoStore(root);
    try {
      assert.equal(store.readDemo().facts.commitments.length, 4);
    } finally {
      store.close();
    }
  } finally {
    db.close();
  }
});

test('preferência/layout isolados, contrato fechado no worker e falha de gravação preservam dados', async (t) => {
  const root = await temporary(t),
    store = new DemoStore(root);
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    const before = store.readDemo(),
      global = store.readPreferences();
    assert.equal(store.readCommitmentCardsLayout(), null);
    assert.deepEqual(store.readCommitmentPreferences(), {
      version: 1,
      period: 'finance',
      view: 'split',
    });
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM preferences WHERE key IN ('commitments.v1','layout.finance-commitments.v1')",
        )
        .get().n,
      0,
    );
    const prefs = store.saveCommitmentPreferences({
      version: 1,
      period: 'next-30-days',
      view: 'list',
    });
    const layout = store.saveCommitmentCardsLayout(defaultCardLayout('finance-commitments'));
    db.exec(
      "CREATE TRIGGER fail_preferences BEFORE UPDATE ON preferences WHEN NEW.key IN ('commitments.v1','layout.finance-commitments.v1') BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    assert.throws(() => store.saveCommitmentPreferences({ ...prefs, view: 'calendar' }));
    assert.throws(() =>
      store.saveCommitmentCardsLayout({ ...layout, cards: [...layout.cards].reverse() }),
    );
    assert.deepEqual(store.readCommitmentPreferences(), prefs);
    assert.deepEqual(store.readCommitmentCardsLayout(), layout);
    assert.deepEqual(store.readDemo(), before);
    assert.deepEqual(store.readPreferences(), global);
    db.exec('DROP TRIGGER fail_preferences');
    store.close();
    const client = new StorageClient(root);
    try {
      assert.deepEqual((await client.getCommitmentCardsLayout()).value, layout);
      assert.deepEqual((await client.getCommitmentPreferences()).value, prefs);
      assert.equal((await client.saveCommitmentCardsLayout(defaultCardLayout())).ok, false);
      assert.equal((await client.saveCommitmentPreferences({ ...prefs, sql: 'x' })).ok, false);
      assert.equal((await client.saveCommitmentPreferences({ ...prefs, version: 99 })).ok, false);
    } finally {
      await client.close();
    }
  } finally {
    store.close();
    db.close();
  }
});

test('conteúdo futuro de preferências/layout não é sobrescrito por salvar ou restaurar', async (t) => {
  const root = await temporary(t),
    store = new DemoStore(root);
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    for (const [key, value, read, write] of [
      [
        'commitments.v1',
        { version: 99, period: 'finance', view: 'split' },
        () => store.readCommitmentPreferences(),
        () => store.saveCommitmentPreferences({ version: 1, period: 'finance', view: 'split' }),
      ],
      [
        'layout.finance-commitments.v1',
        { ...defaultCardLayout('finance-commitments'), version: 99 },
        () => store.readCommitmentCardsLayout(),
        () => store.saveCommitmentCardsLayout(defaultCardLayout('finance-commitments')),
      ],
    ]) {
      const bytes = JSON.stringify(value);
      db.prepare('INSERT INTO preferences VALUES (?,?)').run(key, bytes);
      assert.throws(read, (error) => error.code === 'incompatible');
      assert.throws(write);
      store.restoreDemo();
      assert.equal(
        db.prepare('SELECT payload FROM preferences WHERE key=?').get(key).payload,
        bytes,
      );
    }
  } finally {
    store.close();
    db.close();
  }
});
