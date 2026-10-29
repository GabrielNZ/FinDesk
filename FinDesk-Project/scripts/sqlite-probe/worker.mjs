import assert from 'node:assert/strict';
import { parentPort, workerData, isMainThread } from 'node:worker_threads';
import { DatabaseSync, backup } from 'node:sqlite';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(workerData.probeRoot);
if (dirname(root) !== resolve(tmpdir()) || !basename(root).startsWith('findesk-sqlite-probe-'))
  throw new Error('Destino de prova inválido.');
assert.equal(isMainThread, false);
const filename = join(root, 'capability.sqlite');
const checks = [];
let database = new DatabaseSync(filename, {
  enableForeignKeyConstraints: true,
  allowExtension: false,
});
try {
  database.exec(`
    CREATE TABLE probe_account (id TEXT PRIMARY KEY) STRICT;
    CREATE TABLE probe_entry (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES probe_account(id), amount INTEGER NOT NULL, description TEXT NOT NULL) STRICT;
    INSERT INTO probe_account VALUES ('ficticia');
    PRAGMA user_version = 1;
  `);
  const literal = "Dado fictício'); DROP TABLE probe_entry; --";
  database
    .prepare('INSERT INTO probe_entry VALUES (?, ?, ?, ?)')
    .run('known', 'ficticia', 250020, literal);
  assert.equal(
    database.prepare('SELECT description FROM probe_entry WHERE id = ?').get('known').description,
    literal,
  );
  checks.push('escrita e leitura parametrizadas');

  database.exec('BEGIN IMMEDIATE');
  try {
    database
      .prepare('INSERT INTO probe_entry VALUES (?, ?, ?, ?)')
      .run('rollback', 'ficticia', 1, 'ficticio');
    database
      .prepare('INSERT INTO probe_entry VALUES (?, ?, ?, ?)')
      .run('known', 'ficticia', 2, 'duplicado');
    assert.fail('A restrição de unicidade deveria impedir o segundo insert.');
  } catch (error) {
    database.exec('ROLLBACK');
    assert.equal(error.code, 'ERR_SQLITE_ERROR');
  }
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM probe_entry').get().count, 1);
  checks.push('rollback preserva o estado anterior');

  assert.throws(
    () =>
      database
        .prepare('INSERT INTO probe_entry VALUES (?, ?, ?, ?)')
        .run('orphan', 'ausente', 1, 'ficticio'),
    /FOREIGN KEY/,
  );
  checks.push('chaves estrangeiras ativas');
  database
    .prepare('INSERT INTO probe_entry VALUES (?, ?, ?, ?)')
    .run('safe', 'ficticia', BigInt(Number.MAX_SAFE_INTEGER), 'limite seguro');
  assert.equal(
    database.prepare('SELECT amount FROM probe_entry WHERE id = ?').get('safe').amount,
    Number.MAX_SAFE_INTEGER,
  );
  database
    .prepare('INSERT INTO probe_entry VALUES (?, ?, ?, ?)')
    .run('unsafe', 'ficticia', 9007199254740993n, 'limite maior que o domínio');
  assert.throws(
    () => database.prepare('SELECT amount FROM probe_entry WHERE id = ?').get('unsafe'),
    { code: 'ERR_OUT_OF_RANGE' },
  );
  assert.equal(
    database
      .prepare('SELECT amount FROM probe_entry WHERE id = ?', { readBigInts: true })
      .get('unsafe').amount,
    9007199254740993n,
  );
  database.prepare('DELETE FROM probe_entry WHERE id = ?').run('unsafe');
  checks.push('inteiros seguros e leitura BigInt sem perda');

  database.close();
  database = new DatabaseSync(filename, {
    enableForeignKeyConstraints: true,
    allowExtension: false,
  });
  assert.equal(
    database.prepare('SELECT amount FROM probe_entry WHERE id = ?').get('known').amount,
    250020,
  );
  assert.equal(database.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  checks.push('reabertura, versão e integridade');

  const copyPath = join(root, 'consistent-copy.sqlite');
  await backup(database, copyPath);
  const copy = new DatabaseSync(copyPath, { readOnly: true, allowExtension: false });
  try {
    assert.equal(
      copy.prepare('SELECT amount FROM probe_entry WHERE id = ?').get('known').amount,
      250020,
    );
    assert.equal(copy.prepare('SELECT COUNT(*) AS count FROM probe_entry').get().count, 2);
  } finally {
    copy.close();
  }
  checks.push('cópia consistente pela API backup');
} finally {
  database.close();
}
parentPort.postMessage({ workerNode: process.versions.node, sqliteWorker: true, checks });
