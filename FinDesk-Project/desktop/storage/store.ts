import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { createDemoScenario } from '../../fixtures/financas/demo';
import type { DemoSnapshot, FinancePreferences, StorageInfo } from '../../shared/storage-api';
import { parsePreferences, parseStoredJson, StorageFailure, validateSnapshot } from './contracts';
import { DEMO_MIGRATIONS, migrate, PREFERENCE_MIGRATIONS } from './migrations';

export const DEFAULT_PREFERENCES: FinancePreferences = Object.freeze({
  version: 2,
  currencyMode: 'original',
  periodMode: 'calendar-month',
  lastAccountId: null,
});

function freshDemo(): DemoSnapshot {
  const scenario = createDemoScenario();
  return {
    formatVersion: 1,
    seedId: 'demo-financas-v1',
    seedVersion: 1,
    asOf: scenario.clock.today(),
    timezone: scenario.timezone,
    facts: scenario.facts,
  };
}

function transaction<T>(database: DatabaseSync, operation: () => T): T {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

/** Backend interno; nunca recebe caminho, SQL ou fatos arbitrários do renderer. */
export class DemoStore {
  private demo: DatabaseSync | undefined;
  private preferences: DatabaseSync | undefined;

  constructor(directory: string) {
    if (!isAbsolute(directory)) throw new StorageFailure('unavailable');
    try {
      mkdirSync(directory, { recursive: true });
      this.demo = new DatabaseSync(join(directory, 'demo.sqlite'), {
        allowExtension: false,
        enableForeignKeyConstraints: true,
        timeout: 3000,
      });
      this.preferences = new DatabaseSync(join(directory, 'preferences.sqlite'), {
        allowExtension: false,
        enableForeignKeyConstraints: true,
        timeout: 3000,
      });
      migrate(this.demo, 'demo', DEMO_MIGRATIONS);
      migrate(this.preferences, 'preferences', PREFERENCE_MIGRATIONS);
      transaction(this.demo, () => {
        const row = this.demo!.prepare('SELECT payload FROM demo_state WHERE singleton = 1').get();
        const initialized = this.demo!.prepare('SELECT initialized FROM storage_identity').get()?.[
          'initialized'
        ];
        if (initialized === 0 && !row) {
          this.demo!.prepare('INSERT INTO demo_state VALUES (1, ?)').run(
            JSON.stringify(freshDemo()),
          );
          this.demo!.exec('UPDATE storage_identity SET initialized = 1');
        } else if (initialized === 1 && row) validateSnapshot(parseStoredJson(row['payload']));
        else throw new StorageFailure('corrupt');
      });
      transaction(this.preferences, () => {
        const row = this.preferences!.prepare(
          "SELECT payload FROM preferences WHERE key = 'finance.v2'",
        ).get();
        const initialized = this.preferences!.prepare(
          'SELECT initialized FROM storage_identity',
        ).get()?.['initialized'];
        if (initialized === 0 && !row) {
          this.preferences!.prepare('INSERT INTO preferences VALUES (?, ?)').run(
            'finance.v2',
            JSON.stringify(DEFAULT_PREFERENCES),
          );
          this.preferences!.exec('UPDATE storage_identity SET initialized = 1');
        } else if (initialized === 1 && row) this.readPreferences();
        else throw new StorageFailure('corrupt');
      });
    } catch (error) {
      this.close();
      throw error;
    }
  }

  info(): StorageInfo {
    this.requireOpen();
    return { environment: 'demo', schemaVersion: 1 };
  }

  private requireOpen(): [DatabaseSync, DatabaseSync] {
    if (!this.demo?.isOpen || !this.preferences?.isOpen) throw new StorageFailure('closed');
    return [this.demo, this.preferences];
  }

  readDemo(): DemoSnapshot {
    const [demo] = this.requireOpen();
    const row = demo.prepare('SELECT payload FROM demo_state WHERE singleton = 1').get();
    if (!row) throw new StorageFailure('corrupt');
    return validateSnapshot(parseStoredJson(row['payload']));
  }

  /** Porta interna para futuros casos de uso; não é uma operação IPC pública. */
  saveDemo(snapshot: DemoSnapshot): DemoSnapshot {
    const [demo] = this.requireOpen();
    const checked = validateSnapshot(snapshot);
    const payload = JSON.stringify(checked);
    validateSnapshot(parseStoredJson(payload));
    transaction(demo, () => {
      const result = demo
        .prepare('UPDATE demo_state SET payload = ? WHERE singleton = 1')
        .run(payload);
      if (Number(result.changes) !== 1) throw new StorageFailure('corrupt');
    });
    return this.readDemo();
  }

  restoreDemo(): DemoSnapshot {
    return this.saveDemo(freshDemo());
  }

  readPreferences(): FinancePreferences {
    const [, preferences] = this.requireOpen();
    const row = preferences
      .prepare("SELECT payload FROM preferences WHERE key = 'finance.v2'")
      .get();
    if (!row) throw new StorageFailure('corrupt');
    try {
      return parsePreferences(parseStoredJson(row['payload']));
    } catch {
      throw new StorageFailure('corrupt');
    }
  }

  savePreferences(value: unknown): FinancePreferences {
    const checked = parsePreferences(value);
    const [, preferences] = this.requireOpen();
    transaction(preferences, () => {
      const result = preferences
        .prepare('UPDATE preferences SET payload = ? WHERE key = ?')
        .run(JSON.stringify(checked), 'finance.v2');
      if (Number(result.changes) !== 1) throw new StorageFailure('corrupt');
    });
    return this.readPreferences();
  }

  close(): void {
    if (this.demo?.isOpen) this.demo.close();
    if (this.preferences?.isOpen) this.preferences.close();
  }
}
