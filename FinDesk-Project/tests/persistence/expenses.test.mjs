import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire(import.meta.url);
const { DemoStore } = require('../../out/desktop/storage/store.js');
const { StorageClient } = require('../../out/desktop/storage/client.js');
const { validateRequest } = require('../../out/desktop/storage/contracts.js');
const { categorizedMovements } = require('../../out/application/categories.js');
const request = (patch = {}) => ({
  requestId: randomUUID(),
  accountId: 'demo-a',
  on: '2026-10-20',
  amountMinor: 2000,
  description: 'Café fictício',
  merchant: { mode: 'existing', id: 'uber' },
  classification: { mode: 'automatic' },
  ...patch,
});
async function profile(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-expenses-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-expenses-')
    )
      throw new Error('Perfil inválido.');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  return root;
}
test('F06a: entrada manual aplica regra, override prevalece, repetição não duplica e despesas iguais legítimas sobrevivem à reabertura', async (t) => {
  const root = await profile(t);
  let store = new DemoStore(root);
  try {
    const before = store.readDemo(),
      prefs = store.readPreferences();
    store.saveCategoryRule({
      merchantId: 'uber',
      categoryId: 'casa',
      active: true,
      expectedRevision: null,
    });
    const input = request();
    const first = store.createExpense(input);
    assert.equal(
      first.rules.assignments.find((a) => a.movementId === first.movementId).categoryId,
      'casa',
    );
    assert.equal(first.snapshot.facts.movements.at(-1).origin.kind, 'manual');
    assert.equal(first.snapshot.facts.movements.at(-1).categoryId, null);
    assert.equal(store.createExpense(input).movementId, first.movementId);
    assert.throws(() => store.createExpense({ ...input, amountMinor: 3000 }));
    const second = store.createExpense(request());
    assert.notEqual(second.movementId, first.movementId);
    const manual = store.createExpense(
      request({ accountId: 'demo-u', classification: { mode: 'manual', categoryId: null } }),
    );
    assert.equal(
      categorizedMovements(
        manual.snapshot.facts.movements,
        manual.categories,
        manual.rules.assignments,
      ).at(-1).categoryId,
      null,
    );
    assert.equal(manual.snapshot.facts.movements.at(-1).delta.currency, 'USD');
    assert.deepEqual(store.readPreferences(), prefs);
    store.close();
    store = new DemoStore(root);
    assert.equal(store.createExpense(input).movementId, first.movementId);
    assert.equal(store.readDemo().facts.movements.length, before.facts.movements.length + 3);
    store.restoreDemo();
    assert.deepEqual(store.readDemo(), before);
    assert.equal(store.getCategoryRules().assignments.length, 0);
  } finally {
    store.close();
  }
});
test('F06a: falha no recibo reverte fato/estabelecimento/categoria/regra e repetição salva uma vez; restauração também é atômica', async (t) => {
  const root = await profile(t),
    store = new DemoStore(root),
    db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    const tables = ['demo_state', 'category_state', 'category_rules', 'merchant_state'];
    const bytes = () =>
      tables.map((table) => db.prepare(`SELECT payload FROM ${table}`).get().payload);
    const before = bytes();
    const input = request({
      merchant: { mode: 'new', name: 'Padaria fictícia' },
      classification: { mode: 'manual', categoryId: 'alimentacao' },
    });
    db.exec(
      "CREATE TRIGGER fail_receipt AFTER INSERT ON expense_requests BEGIN SELECT RAISE(ABORT, 'falha simulada'); END",
    );
    assert.throws(() => store.createExpense(input));
    assert.deepEqual(bytes(), before);
    assert.equal(db.prepare('SELECT count(*) AS n FROM expense_requests').get().n, 0);
    db.exec('DROP TRIGGER fail_receipt');
    const result = store.createExpense(input);
    assert.equal(result.merchants.merchants.at(-1).name, 'Padaria fictícia');
    assert.equal(store.createExpense(input).movementId, result.movementId);
    const saved = bytes();
    db.exec(
      "CREATE TRIGGER fail_reset AFTER DELETE ON expense_requests BEGIN SELECT RAISE(ABORT, 'falha simulada'); END",
    );
    assert.throws(() => store.restoreDemo());
    assert.deepEqual(bytes(), saved);
    db.exec('DROP TRIGGER fail_reset');
    store.restoreDemo();
    assert.deepEqual(bytes(), before);
  } finally {
    db.close();
    store.close();
  }
});
test('F06a: migração v3 preserva payloads e catálogo ausente/corrompido/futuro não é recriado', async (t) => {
  const root = await profile(t);
  let store = new DemoStore(root);
  store.classifyMovement({ movementId: 'mov-uber-1', categoryId: null });
  store.close();
  let db = new DatabaseSync(join(root, 'demo.sqlite'));
  const before = ['demo_state', 'category_state', 'category_rules'].map(
    (table) => db.prepare(`SELECT payload FROM ${table}`).get().payload,
  );
  db.exec('DROP TABLE merchant_state; DROP TABLE expense_requests; PRAGMA user_version = 3');
  db.close();
  store = new DemoStore(root);
  assert.equal(store.info().schemaVersion, 4);
  store.close();
  db = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    assert.deepEqual(
      ['demo_state', 'category_state', 'category_rules'].map(
        (table) => db.prepare(`SELECT payload FROM ${table}`).get().payload,
      ),
      before,
    );
    const original = db.prepare('SELECT payload FROM merchant_state').get().payload;
    for (const payload of ['{}', '{"version":99,"merchants":[]}']) {
      db.prepare('UPDATE merchant_state SET payload = ?').run(payload);
      assert.throws(() => new DemoStore(root));
      assert.equal(db.prepare('SELECT payload FROM merchant_state').get().payload, payload);
    }
    db.prepare('UPDATE merchant_state SET payload = ?').run(original);
    db.exec('DELETE FROM merchant_state');
    assert.throws(() => new DemoStore(root));
    assert.equal(db.prepare('SELECT count(*) AS n FROM merchant_state').get().n, 0);
  } finally {
    db.close();
  }
});
test('F06a: worker valida comando fechado, datas/categorias/estabelecimentos e mantém idempotência', async (t) => {
  const root = await profile(t),
    client = new StorageClient(root);
  try {
    assert.equal((await client.ready).ok, true);
    const input = request();
    const first = await client.createExpense(input);
    assert.equal(first.ok, true);
    assert.equal((await client.createExpense(input)).value.movementId, first.value.movementId);
    for (const patch of [
      { on: '2026-10-30' },
      { accountId: 'all' },
      { classification: { mode: 'manual', categoryId: 'missing' } },
      { merchant: { mode: 'existing', id: 'missing' } },
      { sql: 'delete' },
    ])
      assert.equal((await client.createExpense({ ...request(), ...patch })).ok, false);
    assert.throws(() => validateRequest({ id: 1, operation: 'read-merchants', payload: {} }));
    assert.throws(() => validateRequest({ id: 1, operation: 'save-demo', payload: {} }));
    assert.equal((await client.getMerchants()).ok, true);
  } finally {
    await client.close();
  }
});
