import { computed, Injectable, signal } from '@angular/core';
import type { AccountCycleReference, FinancePreferences } from '../../../../shared/storage-api';

type PreferenceChanges = Partial<
  Pick<FinancePreferences, 'currencyMode' | 'lastAccountId' | 'periodMode'>
>;

/** Um único escritor no renderer; cada operação mescla apenas os seus campos. */
@Injectable({ providedIn: 'root' })
export class FinancePreferencesStore {
  readonly state = signal<'idle' | 'loading' | 'ready' | 'failed' | 'browser'>('idle');
  readonly value = signal<FinancePreferences | null>(null);
  readonly error = signal<string | null>(null);
  private readonly pending = signal(0);
  readonly saving = computed(() => this.pending() > 0);
  private initialPeriod: FinancePreferences['periodMode'] | null = null;
  private loading: Promise<boolean> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  get startupPeriod(): FinancePreferences['periodMode'] {
    return this.initialPeriod ?? 'calendar-month';
  }

  load(): Promise<boolean> {
    if (this.loading) return this.loading;
    if (this.state() === 'ready') return Promise.resolve(true);
    const api = window.finDesk?.storage;
    if (!api) {
      this.state.set('browser');
      return Promise.resolve(false);
    }
    this.state.set('loading');
    this.error.set(null);
    this.loading = (async () => {
      try {
        const result = await api.getPreferences();
        if (!result.ok) {
          this.error.set(result.error.message);
          this.state.set('failed');
          return false;
        }
        this.value.set(result.value);
        this.initialPeriod ??= result.value.periodMode;
        this.state.set('ready');
        return true;
      } catch {
        this.error.set('Não foi possível consultar as preferências.');
        this.state.set('failed');
        return false;
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  update(changes: PreferenceChanges): Promise<boolean> {
    return this.enqueue((current) => ({ ...current, ...changes }));
  }

  updateCycle(rule: AccountCycleReference): Promise<boolean> {
    return this.enqueue((current) => ({
      ...current,
      cycleReferences: [
        ...current.cycleReferences.filter((item) => item.accountId !== rule.accountId),
        rule,
      ],
    }));
  }

  private enqueue(merge: (current: FinancePreferences) => FinancePreferences): Promise<boolean> {
    this.pending.update((count) => count + 1);
    const operation = this.writeQueue.then(async () => {
      try {
        if (!(await this.load())) return false;
        const current = this.value();
        const api = window.finDesk?.storage;
        if (!current || !api) return false;
        const result = await api.savePreferences(merge(current));
        if (!result.ok) return false;
        this.value.set(result.value);
        return true;
      } catch {
        return false;
      } finally {
        this.pending.update((count) => count - 1);
      }
    });
    this.writeQueue = operation.then(() => undefined);
    return operation;
  }
}
