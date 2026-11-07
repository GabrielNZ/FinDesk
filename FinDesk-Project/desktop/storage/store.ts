import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import {
  initialCategories,
  parseCategoryState,
  saveCategory,
  classifyMovement,
} from '../../application/categories';
import type { CategoryState } from '../../shared/categories';
import {
  parseCategoryRequest,
  parseClassificationRequest,
  parseMerchantRequest,
} from './contracts';
import { classifyMerchant } from '../../application/merchant-classification';
import {
  initialCategoryRules,
  parseCategoryRuleState,
  recordRuleArrivals,
  ruleCatalogue,
  saveCategoryRule,
  validateRuleCategories,
} from '../../application/category-rules';
import type { CategoryRuleState, RuleCatalogue } from '../../shared/category-rules';
import { parseRuleRequest } from './contracts';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { createDemoScenario } from '../../fixtures/financas/demo';
import type { DemoSnapshot, FinancePreferences, StorageInfo } from '../../shared/storage-api';
import { parsePreferences, parseStoredJson, StorageFailure, validateSnapshot } from './contracts';
import { DEMO_MIGRATIONS, migrate, PREFERENCE_MIGRATIONS } from './migrations';
import { defaultCardLayout, parseCardLayout } from '../../application/card-layout';
import type { CardLayout } from '../../shared/card-layout';
import { parseStatementLayout } from '../../application/statement-layout';
import type { StatementLayout } from '../../shared/statement-layout';

export const DEFAULT_PREFERENCES: FinancePreferences = Object.freeze({
  version: 3,
  cycleReferences: [],
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
          "SELECT payload FROM preferences WHERE key = 'finance.v3'",
        ).get();
        const initialized = this.preferences!.prepare(
          'SELECT initialized FROM storage_identity',
        ).get()?.['initialized'];
        if (initialized === 0 && !row) {
          this.preferences!.prepare('INSERT INTO preferences VALUES (?, ?)').run(
            'finance.v3',
            JSON.stringify(DEFAULT_PREFERENCES),
          );
          this.preferences!.exec('UPDATE storage_identity SET initialized = 1');
        } else if (initialized === 1 && row) this.readPreferences();
        else throw new StorageFailure('corrupt');
      });
      this.readCategories();
      this.readRuleState();
    } catch (error) {
      this.close();
      throw error;
    }
  }

  info(): StorageInfo {
    this.requireOpen();
    return { environment: 'demo', schemaVersion: 3 };
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
      const rules = recordRuleArrivals(this.readRuleState(), checked.facts.movements);
      const result = demo
        .prepare('UPDATE demo_state SET payload = ? WHERE singleton = 1')
        .run(payload);
      if (Number(result.changes) !== 1) throw new StorageFailure('corrupt');
      this.writeRuleState(rules);
    });
    return this.readDemo();
  }

  restoreDemo(): DemoSnapshot {
    const [demo] = this.requireOpen();
    transaction(demo, () => {
      const fresh = freshDemo();
      const facts = demo
        .prepare('UPDATE demo_state SET payload = ? WHERE singleton = 1')
        .run(JSON.stringify(fresh));
      const categories = demo
        .prepare('UPDATE category_state SET payload = ? WHERE singleton = 1')
        .run(JSON.stringify(initialCategories()));
      if (Number(facts.changes) !== 1 || Number(categories.changes) !== 1)
        throw new StorageFailure('corrupt');
      this.writeRuleState(initialCategoryRules(fresh.facts.movements));
    });
    return this.readDemo();
  }

  readCategories(): CategoryState {
    const [demo] = this.requireOpen();
    const row = demo.prepare('SELECT payload FROM category_state WHERE singleton = 1').get();
    if (!row) throw new StorageFailure('corrupt');
    const raw = parseStoredJson(row['payload']);
    if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== 1)
      throw new StorageFailure('incompatible');
    try {
      return parseCategoryState(raw);
    } catch {
      throw new StorageFailure('corrupt');
    }
  }

  saveCategory(value: unknown): CategoryState {
    const input = parseCategoryRequest(value);
    return this.changeCategories((state) => saveCategory(state, input, randomUUID()));
  }

  classifyMovement(value: unknown): CategoryState {
    const input = parseClassificationRequest(value);
    return this.changeCategories((state) =>
      classifyMovement(state, input, this.readDemo().facts.movements),
    );
  }

  classifyMerchant(value: unknown): CategoryState {
    const input = parseMerchantRequest(value);
    return this.changeCategories((state) =>
      classifyMerchant(this.readDemo(), state, input, this.readRuleState().assignments),
    );
  }

  private readRuleState(): CategoryRuleState {
    const [demo] = this.requireOpen();
    const row = demo.prepare('SELECT payload FROM category_rules WHERE singleton = 1').get();
    if (!row) throw new StorageFailure('corrupt');
    const raw = parseStoredJson(row['payload']);
    if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== 1)
      throw new StorageFailure('incompatible');
    try {
      const state = parseCategoryRuleState(raw);
      validateRuleCategories(state, this.readCategories());
      const known = new Set(state.knownMovementIds);
      if (this.readDemo().facts.movements.some((m) => !known.has(m.id)))
        throw new Error('Registro de entrada incompleto.');
      return state;
    } catch {
      throw new StorageFailure('corrupt');
    }
  }
  private writeRuleState(state: CategoryRuleState): void {
    const [demo] = this.requireOpen();
    const result = demo
      .prepare('UPDATE category_rules SET payload = ? WHERE singleton = 1')
      .run(JSON.stringify(state));
    if (Number(result.changes) !== 1) throw new StorageFailure('corrupt');
  }
  getCategoryRules(): RuleCatalogue {
    return ruleCatalogue(this.readRuleState());
  }
  saveCategoryRule(value: unknown): RuleCatalogue {
    const input = parseRuleRequest(value);
    const [demo] = this.requireOpen();
    return transaction(demo, () => {
      const state = this.readRuleState();
      let next: CategoryRuleState;
      try {
        next = saveCategoryRule(
          state,
          input,
          this.readCategories(),
          this.readDemo().facts.movements,
        );
      } catch {
        throw new StorageFailure('invalid-request');
      }
      this.writeRuleState(next);
      return ruleCatalogue(next);
    });
  }

  private changeCategories(change: (state: CategoryState) => CategoryState): CategoryState {
    const [demo] = this.requireOpen();
    return transaction(demo, () => {
      const current = this.readCategories();
      let next: CategoryState;
      try {
        next = change(current);
      } catch {
        throw new StorageFailure('invalid-request');
      }
      const result = demo
        .prepare('UPDATE category_state SET payload = ? WHERE singleton = 1')
        .run(JSON.stringify(next));
      if (Number(result.changes) !== 1) throw new StorageFailure('corrupt');
      return next;
    });
  }

  readPreferences(): FinancePreferences {
    const [, preferences] = this.requireOpen();
    const row = preferences
      .prepare("SELECT payload FROM preferences WHERE key = 'finance.v3'")
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
    const previous = this.readPreferences();
    const snapshot = this.readDemo();
    for (const rule of checked.cycleReferences) {
      const before = previous.cycleReferences.find((item) => item.accountId === rule.accountId);
      if (JSON.stringify(before) === JSON.stringify(rule)) continue;
      if (
        !snapshot.facts.accounts.some((account) => account.id === rule.accountId) ||
        (rule.referenceCardId &&
          !snapshot.facts.cards.some(
            (card) => card.id === rule.referenceCardId && card.accountId === rule.accountId,
          )) ||
        (rule.salaryDay !== null &&
          (rule.salaryDay !== before?.salaryDay || rule.salaryFrom !== before?.salaryFrom) &&
          rule.salaryFrom !== snapshot.asOf)
      )
        throw new StorageFailure('invalid-request');
    }
    const [, preferences] = this.requireOpen();
    transaction(preferences, () => {
      const result = preferences
        .prepare('UPDATE preferences SET payload = ? WHERE key = ?')
        .run(JSON.stringify(checked), 'finance.v3');
      if (Number(result.changes) !== 1) throw new StorageFailure('corrupt');
    });
    return this.readPreferences();
  }

  close(): void {
    if (this.demo?.isOpen) this.demo.close();
    if (this.preferences?.isOpen) this.preferences.close();
  }

  readCardLayout(): CardLayout | null {
    const [, preferences] = this.requireOpen();
    const row = preferences
      .prepare(
        "SELECT payload FROM preferences WHERE key IN ('layout.finance-general.v3', 'layout.finance-general.v2', 'layout.finance-general.v1') ORDER BY key DESC LIMIT 1",
      )
      .get();
    if (!row) return null;
    const raw = parseStoredJson(row['payload']);
    if (
      raw &&
      typeof raw === 'object' &&
      'version' in raw &&
      raw.version !== 1 &&
      raw.version !== 2 &&
      raw.version !== 3
    )
      throw new StorageFailure('incompatible');
    try {
      return parseCardLayout(raw);
    } catch {
      throw new StorageFailure('corrupt');
    }
  }

  readStatementLayout(): StatementLayout | null {
    const [, preferences] = this.requireOpen();
    const row = preferences
      .prepare("SELECT payload FROM preferences WHERE key = 'layout.finance-statement.v1'")
      .get();
    if (!row) return null;
    const raw = parseStoredJson(row['payload']);
    if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== 1)
      throw new StorageFailure('incompatible');
    try {
      return parseStatementLayout(raw);
    } catch {
      throw new StorageFailure('corrupt');
    }
  }

  saveStatementLayout(value: unknown): StatementLayout {
    const checked = parseStatementLayout(value);
    this.readStatementLayout();
    const [, preferences] = this.requireOpen();
    transaction(preferences, () => {
      preferences
        .prepare(
          "INSERT INTO preferences (key, payload) VALUES ('layout.finance-statement.v1', ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload",
        )
        .run(JSON.stringify(checked));
    });
    return this.readStatementLayout()!;
  }

  saveCardLayout(value: unknown): CardLayout {
    const checked = parseCardLayout(value);
    this.readCardLayout();
    return this.writeCardLayout(checked);
  }

  private writeCardLayout(checked: CardLayout): CardLayout {
    const [, preferences] = this.requireOpen();
    transaction(preferences, () => {
      preferences
        .prepare(
          "INSERT INTO preferences (key, payload) VALUES ('layout.finance-general.v3', ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload",
        )
        .run(JSON.stringify(checked));
    });
    return this.readCardLayout()!;
  }

  restoreCardLayout(): CardLayout {
    return this.writeCardLayout(defaultCardLayout());
  }
}
