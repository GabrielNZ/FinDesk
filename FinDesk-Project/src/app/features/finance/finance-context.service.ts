import { computed, Injectable, signal } from '@angular/core';
import { calendarMonth, type CivilDate } from '../../../../domain/civil-date';
import {
  ALL_ACCOUNTS,
  moveCalendarMonth,
  presentAccountBalance,
} from '../../../../application/finance-context';
import { DEMO_EXCHANGE_RATE } from '../../../../fixtures/financas/demo';
import type { DemoSnapshot, FinancePreferences } from '../../../../shared/storage-api';
import { savedCyclePeriods, type CycleMode } from '../../../../application/finance-periods';

export type PeriodMode = FinancePreferences['periodMode'];

@Injectable({ providedIn: 'root' })
export class FinanceContext {
  readonly state = signal<'loading' | 'ready' | 'failed' | 'browser'>('loading');
  readonly snapshot = signal<DemoSnapshot | null>(null);
  readonly accountId = signal('');
  readonly currencyMode = signal<FinancePreferences['currencyMode']>('original');
  readonly month = signal<CivilDate | null>(null);
  readonly periodMode = signal<PeriodMode>('calendar-month');
  private readonly cycleKeys = signal<Partial<Record<CycleMode, string>>>({});
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  private readonly preferences = signal<FinancePreferences | null>(null);
  private loading = false;
  private hasContext = false;
  private writeQueue: Promise<void> = Promise.resolve();
  private revision = 0;

  readonly account = computed(() =>
    this.snapshot()?.facts.accounts.find((account) => account.id === this.accountId()),
  );
  readonly accountLabel = computed(() =>
    this.accountId() === ALL_ACCOUNTS
      ? 'Todas as contas'
      : (this.account()?.name ?? 'Selecione uma conta'),
  );
  readonly hasSelection = computed(() =>
    this.accountId() === ALL_ACCOUNTS ? !!this.snapshot()?.facts.accounts.length : !!this.account(),
  );
  readonly salaryPeriods = computed(() => this.cycleCatalogue('salary-cycle'));
  readonly cardPeriods = computed(() => this.cycleCatalogue('card-cycle'));
  readonly savedPeriod = computed(() => {
    const mode = this.periodMode();
    if (mode === 'calendar-month') return null;
    const catalogue = mode === 'salary-cycle' ? this.salaryPeriods() : this.cardPeriods();
    const saved = this.cycleKeys()[mode];
    return (
      catalogue?.periods.find((period) => period.key === saved) ??
      catalogue?.periods.find((period) => period.key === catalogue.currentKey) ??
      null
    );
  });
  readonly range = computed(() =>
    this.periodMode() === 'calendar-month'
      ? this.month()
        ? calendarMonth(this.month()!)
        : null
      : (this.savedPeriod()?.range ?? null),
  );
  readonly balance = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot || !this.hasSelection()) return null;
    try {
      return presentAccountBalance(
        snapshot,
        this.accountId(),
        this.currencyMode(),
        DEMO_EXCHANGE_RATE,
      );
    } catch {
      return null;
    }
  });
  readonly hasCard = computed(
    () =>
      this.snapshot()?.facts.cards.some(
        (card) => this.accountId() === ALL_ACCOUNTS || card.accountId === this.accountId(),
      ) ?? false,
  );

  async load(): Promise<void> {
    if (this.loading) return;
    const api = window.finDesk?.storage;
    if (!api) {
      this.state.set('browser');
      return;
    }
    this.loading = true;
    this.state.set('loading');
    this.error.set(null);
    try {
      await this.writeQueue;
      const [demo, prefs] = await Promise.all([api.getDemo(), api.getPreferences()]);
      if (!demo.ok || !prefs.ok) {
        this.error.set(!demo.ok ? demo.error.message : !prefs.ok ? prefs.error.message : null);
        this.state.set('failed');
        return;
      }
      this.snapshot.set(demo.value);
      this.preferences.set(prefs.value);
      if (!this.hasContext) {
        this.accountId.set(
          prefs.value.lastAccountId ??
            (demo.value.facts.accounts.some((account) => account.id === 'demo-a') ? 'demo-a' : ''),
        );
        this.currencyMode.set(prefs.value.currencyMode);
        this.month.set(calendarMonth(demo.value.asOf).start);
        this.hasContext = true;
      }
      this.ensureAvailablePeriod();
      this.state.set('ready');
    } catch {
      this.error.set('Não foi possível consultar os dados de demonstração.');
      this.state.set('failed');
    } finally {
      this.loading = false;
    }
  }

  selectAccount(value: string): void {
    if (
      this.state() !== 'ready' ||
      (value !== ALL_ACCOUNTS &&
        !this.snapshot()?.facts.accounts.some((account) => account.id === value))
    )
      return;
    this.accountId.set(value);
    this.ensureAvailablePeriod();
    this.save();
  }

  selectCurrency(value: string): void {
    if (this.state() !== 'ready' || !['original', 'BRL', 'USD'].includes(value)) return;
    this.currencyMode.set(value as FinancePreferences['currencyMode']);
    this.save();
  }

  moveMonth(offset: number): void {
    const month = this.month();
    const next = month && moveCalendarMonth(month, offset);
    if (next) this.month.set(next);
  }

  canMoveMonth(offset: number): boolean {
    return !!this.month() && !!moveCalendarMonth(this.month()!, offset);
  }

  periodUnavailableReason(mode: PeriodMode): string | null {
    if (mode === 'calendar-month') return null;
    const catalogue = mode === 'salary-cycle' ? this.salaryPeriods() : this.cardPeriods();
    return catalogue ? catalogue.unavailableReason : 'Dados do período indisponíveis.';
  }

  selectPeriodMode(mode: PeriodMode): void {
    if (this.state() !== 'ready' || this.periodUnavailableReason(mode)) return;
    this.periodMode.set(mode);
  }

  canMovePeriod(offset: -1 | 1): boolean {
    if (this.periodMode() === 'calendar-month') return this.canMoveMonth(offset);
    const catalogue =
      this.periodMode() === 'salary-cycle' ? this.salaryPeriods() : this.cardPeriods();
    const index =
      catalogue?.periods.findIndex((period) => period.key === this.savedPeriod()?.key) ?? -1;
    return index >= 0 && !!catalogue?.periods[index + offset];
  }

  movePeriod(offset: -1 | 1): void {
    if (!this.canMovePeriod(offset)) return;
    const mode = this.periodMode();
    if (mode === 'calendar-month') {
      this.moveMonth(offset);
      return;
    }
    const catalogue = mode === 'salary-cycle' ? this.salaryPeriods() : this.cardPeriods();
    const index =
      catalogue?.periods.findIndex((period) => period.key === this.savedPeriod()?.key) ?? -1;
    const next = catalogue?.periods[index + offset];
    if (next) this.cycleKeys.update((keys) => ({ ...keys, [mode]: next.key }));
  }

  private cycleCatalogue(mode: CycleMode) {
    const snapshot = this.snapshot();
    return snapshot ? savedCyclePeriods(snapshot, this.accountId(), mode) : null;
  }

  private ensureAvailablePeriod(): void {
    if (this.periodUnavailableReason(this.periodMode())) this.periodMode.set('calendar-month');
  }

  private save(): void {
    const api = window.finDesk?.storage;
    const preferences = this.preferences();
    if (!api || !preferences) return;
    const payload: FinancePreferences = {
      ...preferences,
      lastAccountId: this.accountId() || null,
      currencyMode: this.currencyMode(),
    };
    const revision = ++this.revision;
    this.saving.set(true);
    this.saveError.set(null);
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const result = await api.savePreferences(payload);
        if (revision === this.revision) {
          if (result.ok) {
            this.preferences.set(result.value);
            this.saveError.set(null);
          } else
            this.saveError.set(
              'Não foi possível salvar a seleção. Ela vale apenas nesta execução.',
            );
        }
      } catch {
        if (revision === this.revision)
          this.saveError.set('Não foi possível salvar a seleção. Ela vale apenas nesta execução.');
      } finally {
        if (revision === this.revision) this.saving.set(false);
      }
    });
  }
}
