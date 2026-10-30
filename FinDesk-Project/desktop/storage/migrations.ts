import { DatabaseSync } from 'node:sqlite';
import {
  parseStoredJson,
  StorageFailure,
  upgradePreferencesV1,
  upgradePreferencesV2,
} from './contracts';

export interface Migration {
  readonly version: number;
  readonly sql: string;
  readonly apply?: (database: DatabaseSync) => void;
}
export const DEMO_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
  CREATE TABLE storage_identity (kind TEXT NOT NULL CHECK (kind = 'demo'), initialized INTEGER NOT NULL DEFAULT 0 CHECK (initialized IN (0, 1))) STRICT;
  INSERT INTO storage_identity (kind) VALUES ('demo');
  CREATE TABLE demo_state (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    payload TEXT NOT NULL CHECK (json_valid(payload))
  ) STRICT;
`,
  },
];
export const PREFERENCE_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
  CREATE TABLE storage_identity (kind TEXT NOT NULL CHECK (kind = 'preferences'), initialized INTEGER NOT NULL DEFAULT 0 CHECK (initialized IN (0, 1))) STRICT;
  INSERT INTO storage_identity (kind) VALUES ('preferences');
  CREATE TABLE preferences (
    key TEXT PRIMARY KEY,
    payload TEXT NOT NULL CHECK (json_valid(payload))
  ) STRICT;
`,
  },
  {
    version: 2,
    sql: '',
    apply(database) {
      const initialized = database.prepare('SELECT initialized FROM storage_identity').get()?.[
        'initialized'
      ];
      const row = database
        .prepare("SELECT payload FROM preferences WHERE key = 'finance.v1'")
        .get();
      if (initialized === 0 && !row) return;
      if (initialized !== 1 || !row) throw new StorageFailure('corrupt');
      let upgraded;
      try {
        upgraded = upgradePreferencesV1(parseStoredJson(row['payload']));
      } catch {
        throw new StorageFailure('corrupt');
      }
      database
        .prepare('UPDATE preferences SET key = ?, payload = ? WHERE key = ?')
        .run('finance.v2', JSON.stringify(upgraded), 'finance.v1');
    },
  },
  {
    version: 3,
    sql: '',
    apply(database) {
      const initialized = database.prepare('SELECT initialized FROM storage_identity').get()?.[
        'initialized'
      ];
      const row = database
        .prepare("SELECT payload FROM preferences WHERE key = 'finance.v2'")
        .get();
      if (initialized === 0 && !row) return;
      if (initialized !== 1 || !row) throw new StorageFailure('corrupt');
      try {
        const upgraded = upgradePreferencesV2(parseStoredJson(row['payload']));
        database
          .prepare('UPDATE preferences SET key = ?, payload = ? WHERE key = ?')
          .run('finance.v3', JSON.stringify(upgraded), 'finance.v2');
      } catch {
        throw new StorageFailure('corrupt');
      }
    },
  },
];

/** Uma transação para todas as migrações pendentes. Não há recuperação destrutiva. */
export function migrate(
  database: DatabaseSync,
  kind: 'demo' | 'preferences',
  migrations: readonly Migration[],
): void {
  if (!migrations.length || migrations.some((migration, index) => migration.version !== index + 1))
    throw new StorageFailure('incompatible');
  database.exec('BEGIN IMMEDIATE');
  try {
    const version = database.prepare('PRAGMA user_version').get()?.['user_version'];
    if (
      !Number.isSafeInteger(version) ||
      (version as number) < 0 ||
      (version as number) > migrations.length
    )
      throw new StorageFailure('incompatible');
    if (version === 0) {
      const tables = database
        .prepare("SELECT name FROM sqlite_master WHERE substr(name, 1, 7) != 'sqlite_'")
        .all();
      if (tables.length) throw new StorageFailure('incompatible');
    } else {
      const rows = database.prepare('SELECT kind FROM storage_identity').all();
      if (rows.length !== 1 || rows[0]?.['kind'] !== kind) throw new StorageFailure('incompatible');
    }
    for (const migration of migrations) {
      if (migration.version > (version as number)) {
        if (!Number.isSafeInteger(migration.version) || migration.version < 1)
          throw new StorageFailure('incompatible');
        database.exec(migration.sql);
        migration.apply?.(database);
        database.exec(`PRAGMA user_version = ${migration.version}`);
      }
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
