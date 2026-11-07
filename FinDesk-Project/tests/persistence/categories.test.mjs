import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire(import.meta.url);
const { DemoStore } = require('../../out/desktop/storage/store.js');
const { StorageClient } = require('../../out/desktop/storage/client.js');
const { validateRequest } = require('../../out/desktop/storage/contracts.js');
const { migrate, DEMO_MIGRATIONS } = require('../../out/desktop/storage/migrations.js');
const { initialCategories } = require('../../out/application/categories.js');
const {
  previewMerchantClassification,
} = require('../../out/application/merchant-classification.js');
function merchantInput(snapshot, state, patch = {}) {
  const query = {
    accountId: 'demo-a',
    start: '2026-10-01',
    end: '2026-10-31',
    search: 'uber',
    kind: null,
    category: null,
  };
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
    ).map((p) => p.expected),
  };
}

test('F05b.2: lote reabre, preserva manuais/fatos/preferências e falha reverte todas as classificações', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  try {
    const snapshot = store.readDemo(),
      prefs = store.readPreferences();
    store.classifyMovement({ movementId: 'mov-uber-1', categoryId: null });
    const state = store.readCategories();
    const input = merchantInput(snapshot, state, { includeManual: true });
    const db = new DatabaseSync(join(root, 'demo.sqlite'));
    try {
      db.exec(
        "CREATE TRIGGER fail_batch AFTER UPDATE ON category_state BEGIN SELECT RAISE(ABORT, 'falha simulada'); END",
      );
      assert.throws(() => store.classifyMerchant(input));
      assert.deepEqual(store.readCategories(), state);
      db.exec('DROP TRIGGER fail_batch');
    } finally {
      db.close();
    }
    const saved = store.classifyMerchant(input);
    assert.equal(saved.classifications.length, 2);
    assert.equal(
      saved.classifications.every((c) => c.categoryId === 'casa'),
      true,
    );
    assert.deepEqual(store.readDemo(), snapshot);
    assert.deepEqual(store.readPreferences(), prefs);
    store.close();
    store = new DemoStore(root);
    assert.deepEqual(store.readCategories(), saved);
    assert.deepEqual(store.readDemo(), snapshot);
    assert.deepEqual(store.readPreferences(), prefs);
    store.restoreDemo();
    assert.deepEqual(store.readCategories(), initialCategories());
  } finally {
    store.close();
  }
});

test('F05b.2: worker valida consulta, conjunto da prévia, identidade e preservação manual sem gravar parcialmente', async (t) => {
  const root = await temporary(t);
  const client = new StorageClient(root);
  try {
    const { value: snapshot } = await client.getDemo();
    const { value: state } = await client.getCategories();
    const input = merchantInput(snapshot, state);
    for (const patch of [
      { path: 'x' },
      { merchantId: '' },
      { expected: [...input.expected, { movementId: 'mov-sal', categoryId: null, manual: false }] },
      { query: { ...input.query, category: 'alimentacao' } },
      { merchantId: 'energia' },
      { expected: input.expected.slice(1) },
    ]) {
      assert.equal(
        (await client.classifyMerchant({ ...input, ...patch })).error.code,
        'invalid-request',
      );
      assert.deepEqual((await client.getCategories()).value, state);
    }
    await client.classifyMovement({ movementId: 'mov-uber-1', categoryId: null });
    const manual = (await client.getCategories()).value;
    assert.equal((await client.classifyMerchant(input)).error.code, 'invalid-request');
    const current = merchantInput(snapshot, manual);
    assert.equal((await client.classifyMerchant(current)).ok, true);
    assert.equal(
      (await client.getCategories()).value.classifications.find(
        (c) => c.movementId === 'mov-uber-1',
      ).categoryId,
      null,
    );
    assert.deepEqual((await client.getDemo()).value, snapshot);
    assert.throws(() =>
      validateRequest({ id: 1, operation: 'classify-merchant', payload: { ...input, sql: 'x' } }),
    );
  } finally {
    await client.close();
  }
});
const input = { id: null, name: 'Saúde', icon: 'pi-heart', color: '#8fb8de' };
async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), 'findesk-categories-'));
  t.after(async () => {
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('findesk-categories-')
    )
      throw new Error('Diretório inválido.');
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('F05b.1: migração da demo v1 preserva fatos/preferências e inicializa catálogo uma única vez', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  const facts = store.readDemo(),
    prefs = store.readPreferences();
  store.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  db.exec('DROP TABLE category_state; PRAGMA user_version = 1');
  db.close();
  store = new DemoStore(root);
  const next = store.saveCategory(input);
  store.classifyMovement({ movementId: 'mov-uber-1', categoryId: next.categories.at(-1).id });
  const classifications = store.readCategories();
  assert.deepEqual(store.readDemo(), facts);
  assert.deepEqual(store.readPreferences(), prefs);
  store.close();
  store = new DemoStore(root);
  try {
    assert.deepEqual(store.readCategories(), classifications);
    store.restoreDemo();
    assert.deepEqual(store.readCategories(), initialCategories());
    assert.deepEqual(store.readDemo(), facts);
    assert.deepEqual(store.readPreferences(), prefs);
  } finally {
    store.close();
  }
});

test('F05b.1: worker rejeita alterações arbitrárias e conta inválida, grava só o comando individual', async (t) => {
  const root = await temporary(t);
  const client = new StorageClient(root);
  try {
    const facts = await client.getDemo();
    assert.deepEqual(await client.getCategories(), { ok: true, value: initialCategories() });
    for (const payload of [
      { ...input, path: 'x' },
      { ...input, color: 'red' },
      { ...input, id: 'missing' },
      { ...input, name: 'Casa' },
    ])
      assert.equal((await client.saveCategory(payload)).error.code, 'invalid-request');
    const created = await client.saveCategory(input);
    assert.equal(created.ok, true);
    const categoryId = created.value.categories.at(-1).id;
    for (const payload of [
      { movementId: 'mov-sal', categoryId },
      { movementId: 'missing', categoryId },
      { movementId: 'mov-uber-1', categoryId: 'missing' },
      { movementId: 'mov-uber-1', categoryId, sql: 'x' },
    ])
      assert.equal((await client.classifyMovement(payload)).error.code, 'invalid-request');
    assert.equal(
      (await client.classifyMovement({ movementId: 'mov-uber-1', categoryId })).ok,
      true,
    );
    assert.deepEqual(await client.getDemo(), facts);
    assert.throws(() => validateRequest({ id: 1, operation: 'read-categories', payload: 'sql' }));
  } finally {
    await client.close();
  }
});

test('F05b.1: falha de classificação ou restauração reverte os dados e personalizações juntos', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  const original = store.readDemo();
  store.saveDemo({
    ...original,
    facts: {
      ...original.facts,
      movements: original.facts.movements.map((item, index) =>
        index === 0 ? { ...item, description: 'Fato fictício preservado' } : item,
      ),
    },
  });
  store.saveCategory(input);
  const before = store.readDemo(),
    categories = store.readCategories();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    db.exec(
      "CREATE TRIGGER fail_category BEFORE UPDATE ON category_state BEGIN SELECT RAISE(ABORT,'falha simulada'); END;",
    );
    assert.throws(() => store.classifyMovement({ movementId: 'mov-energia', categoryId: null }));
    assert.deepEqual(store.readCategories(), categories);
    assert.throws(() => store.restoreDemo());
    assert.deepEqual(store.readDemo(), before);
    assert.deepEqual(store.readCategories(), categories);
    db.exec('DROP TRIGGER fail_category');
    store.restoreDemo();
    assert.deepEqual(store.readDemo(), original);
    assert.deepEqual(store.readCategories(), initialCategories());
  } finally {
    db.close();
    store.close();
  }
});

test('F05b.1: catálogo ausente, corrompido ou futuro não é recriado ao abrir; migração faz rollback', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  store.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    const original = db.prepare('SELECT payload FROM category_state').get().payload;
    for (const payload of [
      JSON.stringify({ version: 2, categories: [], classifications: [] }),
      JSON.stringify({ version: 1, categories: 'invalid', classifications: [] }),
    ]) {
      db.prepare('UPDATE category_state SET payload = ?').run(payload);
      assert.throws(() => new DemoStore(root));
      assert.equal(db.prepare('SELECT payload FROM category_state').get().payload, payload);
    }
    db.exec('DELETE FROM category_state');
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT count(*) AS n FROM category_state').get().n, 0);
    db.prepare('INSERT INTO category_state VALUES (1,?)').run(original);
  } finally {
    db.close();
  }
  const memory = new DatabaseSync(':memory:');
  try {
    migrate(memory, 'demo', DEMO_MIGRATIONS.slice(0, 1));
    assert.throws(() =>
      migrate(memory, 'demo', [
        DEMO_MIGRATIONS[0],
        {
          version: 2,
          sql: DEMO_MIGRATIONS[1].sql,
          apply() {
            throw new Error('Falha simulada');
          },
        },
      ]),
    );
    assert.equal(memory.prepare('PRAGMA user_version').get().user_version, 1);
    assert.equal(
      memory.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='category_state'").get().n,
      0,
    );
  } finally {
    memory.close();
  }
});
