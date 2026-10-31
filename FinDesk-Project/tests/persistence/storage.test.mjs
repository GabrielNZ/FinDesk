import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const { DemoStore, DEFAULT_PREFERENCES } = require('../../out/desktop/storage/store.js');
const { StorageClient } = require('../../out/desktop/storage/client.js');
const {
  migrate,
  DEMO_MIGRATIONS,
  PREFERENCE_MIGRATIONS,
} = require('../../out/desktop/storage/migrations.js');
const {
  parsePreferences,
  parseStoredJson,
  validateRequest,
} = require('../../out/desktop/storage/contracts.js');
const { storageDirectory } = require('../../out/desktop/storage/paths.js');

async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'findesk-storage-'));
  t.after(async () => {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('findesk-storage-')
    )
      throw new Error('Limpeza fora do teste recusada.');
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return root;
}

test('FIN-047 / C30: seed idempotente, alterações persistidas e restauração preserva preferências/layout e outro arquivo', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  const original = store.readDemo();
  const changed = {
    ...original,
    facts: {
      ...original.facts,
      movements: original.facts.movements.map((m) =>
        m.id === 'mov-merc' ? { ...m, description: 'Minha descrição', categoryId: 'manual' } : m,
      ),
    },
  };
  const preferences = {
    version: 3,
    cycleReferences: [],
    currencyMode: 'USD',
    periodMode: 'calendar-month',
    lastAccountId: 'demo-u',
  };
  try {
    store.saveDemo(changed);
    store.savePreferences(preferences);
  } finally {
    store.close();
  }
  await writeFile(join(root, 'personal.sqlite'), 'sentinela pessoal fictícia');
  const prefs = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    prefs
      .prepare('INSERT INTO preferences VALUES (?, ?)')
      .run('layout.future', '{"marker":"preservar"}');
  } finally {
    prefs.close();
  }
  store = new DemoStore(root);
  try {
    assert.deepEqual(store.readDemo(), changed);
    assert.deepEqual(store.readPreferences(), preferences);
    assert.equal(store.readDemo().facts.movements.length, original.facts.movements.length);
    store.restoreDemo();
    assert.deepEqual(store.readDemo(), original);
    assert.deepEqual(store.readPreferences(), preferences);
  } finally {
    store.close();
  }
  assert.equal(await readFile(join(root, 'personal.sqlite'), 'utf8'), 'sentinela pessoal fictícia');
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    assert.equal(
      db.prepare('SELECT payload FROM preferences WHERE key = ?').get('layout.future').payload,
      '{"marker":"preservar"}',
    );
  } finally {
    db.close();
  }
});

test('F03a: layout reabre, restaura separado dos fatos/preferências e sobrevive à restauração demo', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  const {
    defaultCardLayout,
    reorderCard,
    resizeCard,
  } = require('../../out/application/card-layout.js');
  const layout = resizeCard(reorderCard(defaultCardLayout(), 'upcoming', 0), 'categories', 4, 7);
  const facts = store.readDemo();
  const prefs = store.readPreferences();
  try {
    assert.equal(store.readCardLayout(), null);
    assert.deepEqual(store.saveCardLayout(layout), layout);
    store.restoreDemo();
    assert.deepEqual(store.readCardLayout(), layout);
    assert.deepEqual(store.readPreferences(), prefs);
  } finally {
    store.close();
  }
  store = new DemoStore(root);
  try {
    assert.deepEqual(store.readCardLayout(), layout);
    assert.deepEqual(store.restoreCardLayout(), defaultCardLayout());
    assert.deepEqual(store.readPreferences(), prefs);
    assert.deepEqual(store.readDemo(), facts);
  } finally {
    store.close();
  }
});

test('F03a: falhas/versão futura do layout não substituem dados sem restauração explícita', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  const { defaultCardLayout, resizeCard } = require('../../out/application/card-layout.js');
  const initial = defaultCardLayout();
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    store.saveCardLayout(initial);
    db.exec(
      "CREATE TRIGGER reject_layout BEFORE UPDATE ON preferences WHEN OLD.key = 'layout.finance-general.v3' BEGIN SELECT RAISE(ABORT, 'privado'); END",
    );
    assert.throws(() => store.saveCardLayout(resizeCard(initial, 'categories', 12, 5)));
    assert.deepEqual(store.readCardLayout(), initial);
    db.exec('DROP TRIGGER reject_layout');
    const future = JSON.stringify({ ...initial, version: 99 });
    db.prepare("UPDATE preferences SET payload = ? WHERE key = 'layout.finance-general.v3'").run(
      future,
    );
    assert.throws(
      () => store.readCardLayout(),
      (error) => error.code === 'incompatible',
    );
    assert.throws(
      () => store.saveCardLayout(initial),
      (error) => error.code === 'incompatible',
    );
    assert.equal(
      db.prepare("SELECT payload FROM preferences WHERE key = 'layout.finance-general.v3'").get()
        .payload,
      future,
    );
    assert.deepEqual(store.restoreCardLayout(), initial);
  } finally {
    db.close();
    store.close();
  }
});

test('F03a: leitura v1 preserva bytes e próximo ajuste grava v3 sem apagar o legado', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  const { defaultCardLayout, resizeCard } = require('../../out/application/card-layout.js');
  const legacy = JSON.stringify({
    version: 1,
    area: 'finance-general',
    cards: defaultCardLayout().cards.map((card) => ({ ...card, rows: 4 })),
  });
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    db.prepare('INSERT INTO preferences VALUES (?, ?)').run('layout.finance-general.v1', legacy);
    const upgraded = store.readCardLayout();
    assert.equal(upgraded.version, 3);
    assert.equal(upgraded.priority, null);
    assert.equal(
      db.prepare('SELECT payload FROM preferences WHERE key = ?').get('layout.finance-general.v1')
        .payload,
      legacy,
    );
    const changed = resizeCard(upgraded, 'categories', 7.125, 4.138);
    store.saveCardLayout(changed);
    assert.deepEqual(store.readCardLayout(), changed);
    assert.equal(
      db.prepare('SELECT payload FROM preferences WHERE key = ?').get('layout.finance-general.v1')
        .payload,
      legacy,
    );
  } finally {
    db.close();
    store.close();
  }
});

test('F03a: worker exige contrato fechado de layout e confirmação específica para restaurar', async (t) => {
  const root = await temporary(t);
  const { defaultCardLayout } = require('../../out/application/card-layout.js');
  const layout = defaultCardLayout();
  for (const request of [
    { id: 1, operation: 'read-card-layout', payload: 'finance.v3' },
    { id: 1, operation: 'save-card-layout', payload: { ...layout, sql: 'privado' } },
    { id: 1, operation: 'restore-card-layout' },
    { id: 1, operation: 'restore-card-layout', payload: 'restore-demo-data' },
  ])
    assert.throws(() => validateRequest(request));
  const client = new StorageClient(root);
  try {
    assert.deepEqual(await client.getCardLayout(), { ok: true, value: null });
    assert.deepEqual(await client.saveCardLayout(layout), { ok: true, value: layout });
    assert.deepEqual(await client.restoreCardLayout(), { ok: true, value: layout });
  } finally {
    await client.close();
  }
});

test('F03a: layout v2 converte sem escrita e alinhamento v3 reabre preservando legado e fatos', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  const { defaultCardLayout } = require('../../out/application/card-layout.js');
  const legacy = JSON.stringify({ ...defaultCardLayout(), version: 2 });
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  const facts = store.readDemo();
  const preferences = store.readPreferences();
  try {
    db.prepare('INSERT INTO preferences VALUES (?, ?)').run('layout.finance-general.v2', legacy);
    const layout = store.readCardLayout();
    assert.equal(layout.version, 3);
    assert.equal(
      db.prepare('SELECT payload FROM preferences WHERE key = ?').get('layout.finance-general.v3'),
      undefined,
    );
    store.saveCardLayout({
      ...layout,
      cards: layout.cards.map((card, index) => (index === 0 ? { ...card, align: 0.5 } : card)),
    });
    assert.equal(
      db.prepare('SELECT payload FROM preferences WHERE key = ?').get('layout.finance-general.v2')
        .payload,
      legacy,
    );
    store.close();
    store = new DemoStore(root);
    assert.equal(store.readCardLayout().cards[0].align, 0.5);
    assert.deepEqual(store.readDemo(), facts);
    assert.deepEqual(store.readPreferences(), preferences);
    db.prepare('UPDATE preferences SET payload = ? WHERE key = ?').run(
      '{"version":99}',
      'layout.finance-general.v3',
    );
    assert.throws(
      () => store.readCardLayout(),
      (error) => error.code === 'incompatible',
    );
  } finally {
    db.close();
    store.close();
  }
});

test('FIN-047 / C30: migração inicial e rollback de uma migração que falha preservam versão/dados', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrate(db, 'demo', DEMO_MIGRATIONS);
    db.prepare('INSERT INTO demo_state VALUES (1, ?)').run('{}');
    assert.throws(() =>
      migrate(db, 'demo', [
        ...DEMO_MIGRATIONS,
        {
          version: 3,
          cycleReferences: [],
          sql: 'ALTER TABLE demo_state ADD COLUMN temporary_value TEXT; DELETE FROM demo_state; INSERT INTO missing_table VALUES (1);',
        },
      ]),
    );
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    assert.equal(db.prepare('SELECT payload FROM demo_state').get().payload, '{}');
    assert.equal(
      db
        .prepare('PRAGMA table_info(demo_state)')
        .all()
        .some((c) => c.name === 'temporary_value'),
      false,
    );
  } finally {
    db.close();
  }
});

test('FIN-047 / C30: versão futura e formato desconhecido recusados sem recriar banco', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  store.close();
  const file = join(root, 'demo.sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA user_version = 99');
  db.close();
  const before = await readFile(file);
  assert.throws(
    () => new DemoStore(root),
    (error) => error.code === 'incompatible',
  );
  assert.deepEqual(await readFile(file), before);
  const otherRoot = await temporary(t);
  const otherFile = join(otherRoot, 'demo.sqlite');
  const other = new DatabaseSync(otherFile);
  other.exec("CREATE TABLE sqliteghost (value TEXT); INSERT INTO sqliteghost VALUES ('preservar')");
  other.close();
  const otherBefore = await readFile(otherFile);
  assert.throws(
    () => new DemoStore(otherRoot),
    (error) => error.code === 'incompatible',
  );
  assert.deepEqual(await readFile(otherFile), otherBefore);
});

test('FIN-047/048: seed ausente após inicialização e conteúdo inválido não são restaurados silenciosamente', async (t) => {
  const root = await temporary(t);
  const initial = new DemoStore(root);
  initial.close();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  db.exec('DELETE FROM demo_state');
  db.close();
  assert.throws(
    () => new DemoStore(root),
    (error) => error.code === 'corrupt',
  );
  const check = new DatabaseSync(join(root, 'demo.sqlite'));
  try {
    assert.equal(check.prepare('SELECT COUNT(*) AS count FROM demo_state').get().count, 0);
  } finally {
    check.close();
  }
  const brokenRoot = await temporary(t);
  const marker = Buffer.from('arquivo ficticio que nao e SQLite');
  await writeFile(join(brokenRoot, 'demo.sqlite'), marker);
  assert.throws(() => new DemoStore(brokenRoot));
  assert.deepEqual(await readFile(join(brokenRoot, 'demo.sqlite')), marker);
  assert.throws(
    () => parseStoredJson('{"centavos":9007199254740991.1}'),
    (error) => error.code === 'corrupt',
  );
});

test('FIN-047/048: estrutura financeira inválida e versão futura do agregado preservam os bytes armazenados', async (t) => {
  for (const incompatible of [false, true]) {
    const root = await temporary(t);
    const store = new DemoStore(root);
    const data = store.readDemo();
    store.close();
    if (incompatible) data.formatVersion = 2;
    else data.facts.movements[0].kind = 'unknown';
    const filename = join(root, 'demo.sqlite');
    const db = new DatabaseSync(filename);
    db.prepare('UPDATE demo_state SET payload = ?').run(JSON.stringify(data));
    db.close();
    const before = await readFile(filename);
    assert.throws(
      () => new DemoStore(root),
      (error) => error.code === (incompatible ? 'incompatible' : 'corrupt'),
    );
    assert.deepEqual(await readFile(filename), before);
  }
});

test('FIN-047 / C30: falha de escrita reverte a operação e preserva os fatos anteriores', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  const original = store.readDemo();
  const db = new DatabaseSync(join(root, 'demo.sqlite'));
  db.exec(
    "CREATE TRIGGER reject_update BEFORE UPDATE ON demo_state BEGIN SELECT RAISE(ABORT, 'falha simulada'); END",
  );
  try {
    assert.throws(() => store.restoreDemo(), /falha simulada/);
    assert.deepEqual(store.readDemo(), original);
    assert.deepEqual(store.readPreferences(), DEFAULT_PREFERENCES);
  } finally {
    db.close();
    store.close();
  }
});

test('FIN-047/051: contratos recusam SQL/caminho, extras e confirmação ausente; diretórios de teste isolados', () => {
  const preferences = {
    version: 3,
    cycleReferences: [],
    currencyMode: 'BRL',
    periodMode: 'calendar-month',
    lastAccountId: null,
  };
  assert.deepEqual(parsePreferences(preferences), preferences);
  for (const bad of [
    null,
    { ...preferences, sql: 'DELETE FROM demo_state' },
    { ...preferences, periodMode: 'arbitrario' },
    { ...preferences, currencyMode: 'EUR' },
    { ...preferences, lastAccountId: '' },
    { ...preferences, lastAccountId: 7 },
    { ...preferences, lastAccountId: 'x'.repeat(161) },
    { version: 1, currencyMode: 'BRL', periodMode: 'calendar-month' },
  ])
    assert.throws(() => parsePreferences(bad));
  for (const bad of [
    { id: 1, operation: 'exec', payload: 'SQL' },
    { id: 1, operation: 'restore-demo' },
    { id: 1, operation: 'read-demo', payload: '/file' },
    { id: 1, operation: 'close', path: '/file' },
  ])
    assert.throws(() => validateRequest(bad));
  assert.equal(
    storageDirectory(false, '/unused', resolve('local')).endsWith(join('FinDesk', 'data')),
    true,
  );
  assert.throws(() => storageDirectory(false, '/unused', undefined));
  assert.throws(() => storageDirectory(true, resolve('profile'), undefined));
});

test('FIN-047: worker serializa gravações, responde validação inválida e encerra sem aceitar nova operação', async (t) => {
  const root = await temporary(t);
  const client = new StorageClient(root);
  try {
    assert.equal((await client.getStatus()).ok, true);
    await Promise.all(
      ['USD', 'original', 'BRL'].map((currencyMode) =>
        client.savePreferences({
          version: 3,
          cycleReferences: [],
          currencyMode,
          periodMode: 'calendar-month',
          lastAccountId: 'demo-b',
        }),
      ),
    );
    assert.equal((await client.getPreferences()).value.currencyMode, 'BRL');
    const invalid = await client.savePreferences({
      version: 3,
      cycleReferences: [],
      lastAccountId: null,
      currencyMode: 'EUR',
      periodMode: 'calendar-month',
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.code, 'invalid-request');
  } finally {
    await client.close();
  }
  assert.equal((await client.getPreferences()).error.code, 'closed');
  const blocked = join(root, 'not-a-directory');
  await writeFile(blocked, 'ficticio');
  const failed = new StorageClient(blocked);
  try {
    assert.equal((await failed.getStatus()).ok, false);
  } finally {
    await failed.close();
  }
});

test('FIN-010/047 / D31: migração v1 conserva moeda/ciclo, fatos e outros namespaces e reabre conta lembrada', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  const changed = store.readDemo();
  changed.facts.movements[0].description = 'Fato fictício preservado pela migração';
  store.saveDemo(changed);
  store.close();
  const prefs = new DatabaseSync(join(root, 'preferences.sqlite'));
  prefs.exec('DELETE FROM preferences; PRAGMA user_version = 1');
  prefs
    .prepare('INSERT INTO preferences VALUES (?, ?)')
    .run(
      'finance.v1',
      JSON.stringify({ version: 1, currencyMode: 'USD', periodMode: 'salary-cycle' }),
    );
  prefs.prepare('INSERT INTO preferences VALUES (?, ?)').run('layout.future', '{"keep":true}');
  prefs.close();
  store = new DemoStore(root);
  try {
    assert.deepEqual(store.readDemo(), changed);
    assert.deepEqual(store.readPreferences(), {
      version: 3,
      cycleReferences: [],
      currencyMode: 'USD',
      periodMode: 'salary-cycle',
      lastAccountId: null,
    });
    store.savePreferences({ ...store.readPreferences(), lastAccountId: 'demo-u' });
  } finally {
    store.close();
  }
  store = new DemoStore(root);
  try {
    assert.equal(store.readPreferences().lastAccountId, 'demo-u');
  } finally {
    store.close();
  }
  const verified = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    assert.equal(verified.prepare('PRAGMA user_version').get().user_version, 3);
    assert.equal(
      verified.prepare("SELECT payload FROM preferences WHERE key = 'layout.future'").get().payload,
      '{"keep":true}',
    );
    assert.equal(
      verified.prepare("SELECT COUNT(*) AS count FROM preferences WHERE key = 'finance.v1'").get()
        .count,
      0,
    );
  } finally {
    verified.close();
  }
});

test('F02b.3: migração v2 e referências preservam preferências/fatos na reabertura e restauração', async (t) => {
  const root = await temporary(t);
  let store = new DemoStore(root);
  const facts = store.readDemo();
  store.close();
  const db = new DatabaseSync(join(root, 'preferences.sqlite'));
  db.exec('DELETE FROM preferences; PRAGMA user_version = 2');
  db.prepare('INSERT INTO preferences VALUES (?, ?)').run(
    'finance.v2',
    JSON.stringify({
      version: 2,
      currencyMode: 'USD',
      periodMode: 'salary-cycle',
      lastAccountId: 'demo-u',
    }),
  );
  db.prepare('INSERT INTO preferences VALUES (?, ?)').run('layout.future', '{"keep":true}');
  db.close();
  store = new DemoStore(root);
  const rule = {
    accountId: 'demo-a',
    salaryDay: 31,
    salaryFrom: facts.asOf,
    referenceCardId: facts.facts.cards[0].id,
  };
  try {
    assert.deepEqual(store.readPreferences(), {
      version: 3,
      cycleReferences: [],
      currencyMode: 'USD',
      periodMode: 'salary-cycle',
      lastAccountId: 'demo-u',
    });
    store.savePreferences({ ...store.readPreferences(), cycleReferences: [rule] });
    store.restoreDemo();
    assert.deepEqual(store.readPreferences().cycleReferences, [rule]);
    assert.deepEqual(store.readDemo(), facts);
  } finally {
    store.close();
  }
  store = new DemoStore(root);
  try {
    assert.deepEqual(store.readPreferences().cycleReferences, [rule]);
  } finally {
    store.close();
  }
  const verified = new DatabaseSync(join(root, 'preferences.sqlite'));
  try {
    assert.equal(verified.prepare('PRAGMA user_version').get().user_version, 3);
    assert.equal(
      verified.prepare("SELECT payload FROM preferences WHERE key = 'layout.future'").get().payload,
      '{"keep":true}',
    );
  } finally {
    verified.close();
  }
});

test('F02b.3: contrato e backend recusam referência de outra conta, datas/dias inválidos e extras', async (t) => {
  const root = await temporary(t);
  const store = new DemoStore(root);
  try {
    const prefs = store.readPreferences();
    const facts = store.readDemo();
    const rule = {
      accountId: 'demo-a',
      salaryDay: 5,
      salaryFrom: facts.asOf,
      referenceCardId: facts.facts.cards[0].id,
    };
    for (const invalid of [
      { ...rule, salaryDay: 32 },
      { ...rule, salaryDay: 1.5 },
      { ...rule, salaryFrom: '2026-02-31' },
      { ...rule, salaryDay: null },
      { ...rule, salaryFrom: null },
      { ...rule, sql: 'privado' },
    ])
      assert.throws(() => parsePreferences({ ...prefs, cycleReferences: [invalid] }));
    assert.throws(() => parsePreferences({ ...prefs, cycleReferences: [rule, rule] }));
    for (const invalid of [
      { ...rule, accountId: 'demo-u' },
      { ...rule, accountId: 'ausente' },
      { ...rule, salaryFrom: '2025-01-01' },
    ])
      assert.throws(() => store.savePreferences({ ...prefs, cycleReferences: [invalid] }));
    assert.deepEqual(store.readPreferences(), prefs);
    store.savePreferences({ ...prefs, cycleReferences: [rule] });
    const db = new DatabaseSync(join(root, 'preferences.sqlite'));
    try {
      db.exec(
        "CREATE TRIGGER reject_preferences BEFORE UPDATE ON preferences BEGIN SELECT RAISE(ABORT, 'privado'); END",
      );
      assert.throws(() =>
        store.savePreferences({ ...prefs, cycleReferences: [{ ...rule, salaryDay: 10 }] }),
      );
      assert.deepEqual(store.readPreferences().cycleReferences, [rule]);
    } finally {
      db.close();
    }
    assert.deepEqual(store.readDemo(), facts);
  } finally {
    store.close();
  }
});

test('FIN-047/048: migração recusa preferências antigas inválidas sem avançar versão ou perder seu conteúdo', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrate(db, 'preferences', PREFERENCE_MIGRATIONS.slice(0, 1));
    const payload = JSON.stringify({
      version: 1,
      currencyMode: 'EUR',
      periodMode: 'calendar-month',
    });
    db.prepare('INSERT INTO preferences VALUES (?, ?)').run('finance.v1', payload);
    db.exec('UPDATE storage_identity SET initialized = 1');
    assert.throws(
      () => migrate(db, 'preferences', PREFERENCE_MIGRATIONS),
      (error) => error.code === 'corrupt',
    );
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    assert.equal(
      db.prepare("SELECT payload FROM preferences WHERE key = 'finance.v1'").get().payload,
      payload,
    );
  } finally {
    db.close();
  }
});
