import { DatabaseSync } from 'node:sqlite';
import { StorageFailure } from './contracts';

export interface Migration {
  readonly version: number;
  readonly sql: string;
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
        database.exec(`PRAGMA user_version = ${migration.version}`);
      }
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
