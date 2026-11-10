import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import {
  defaultCardLayout,
  parseCardLayout,
  normalizeAnalysisLayout,
} from '../../../../../application/card-layout';
import type { CardArea, CardLayout, FinanceCardId } from '../../../../../shared/card-layout';
export const CARD_LAYOUT_AREA = new InjectionToken<CardArea>('card-layout-area', {
  providedIn: 'root',
  factory: () => 'finance-general',
});

@Injectable({ providedIn: 'root' })
export class CardLayoutState {
  readonly area = inject(CARD_LAYOUT_AREA);
  readonly state = signal<'loading' | 'ready' | 'failed' | 'browser'>('loading');
  readonly layout = signal<CardLayout>(defaultCardLayout(this.area));
  readonly saving = signal(false);
  readonly restoring = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly active = signal(false);
  readonly focused = signal<FinanceCardId | null>(null);
  readonly confirming = signal(false);
  private initialized = false;
  private loading: Promise<void> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;

  load(): Promise<void> {
    if (this.loading) return this.loading;
    if (this.initialized) return Promise.resolve();
    const api = window.finDesk?.storage;
    if (!api?.getCardLayout) {
      this.state.set('browser');
      return Promise.resolve();
    }
    this.state.set('loading');
    this.error.set(null);
    this.loading = (async () => {
      try {
        const result = await (this.area === 'finance-analysis'
          ? api.getExpenseAnalysisLayout()
          : api.getCardLayout());
        if (!result.ok) {
          this.error.set(result.error.message);
          this.state.set('failed');
          return;
        }
        this.layout.set(
          result.value === null
            ? defaultCardLayout(this.area)
            : normalizeAnalysisLayout(parseCardLayout(result.value, this.area)),
        );
        this.initialized = true;
        this.state.set('ready');
      } catch {
        this.error.set('Não foi possível consultar o layout. Nenhum ajuste foi substituído.');
        this.state.set('failed');
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  commit(value: CardLayout): void {
    if (this.state() !== 'ready' || this.restoring()) return;
    const layout = parseCardLayout(value, this.area);
    if (JSON.stringify(layout) === JSON.stringify(this.layout()) && !this.saveError()) return;
    this.layout.set(layout);
    const revision = ++this.revision;
    this.saving.set(true);
    this.saveError.set(null);
    this.queue = this.queue.then(async () => {
      try {
        const api = window.finDesk!.storage;
        const result = await (this.area === 'finance-analysis'
          ? api.saveExpenseAnalysisLayout(layout)
          : api.saveCardLayout(layout));
        if (revision === this.revision && !result.ok) this.failedSave();
      } catch {
        if (revision === this.revision) this.failedSave();
      } finally {
        if (revision === this.revision) this.saving.set(false);
      }
    });
  }

  private failedSave(): void {
    this.saveError.set('Não foi possível salvar o layout. Alterações valem apenas nesta execução.');
  }

  async restore(): Promise<boolean> {
    if (this.restoring()) return false;
    this.restoring.set(true);
    this.saveError.set(null);
    await this.queue;
    this.saveError.set(null);
    try {
      const api = window.finDesk!.storage;
      const result = await (this.area === 'finance-analysis'
        ? api.saveExpenseAnalysisLayout(defaultCardLayout(this.area))
        : api.restoreCardLayout('restore-card-layout'));
      if (!result.ok) {
        this.saveError.set('Não foi possível restaurar o layout. Seus ajustes foram mantidos.');
        return false;
      }
      this.layout.set(parseCardLayout(result.value, this.area));
      this.error.set(null);
      this.initialized = true;
      this.state.set('ready');
      return true;
    } catch {
      this.saveError.set('Não foi possível restaurar o layout. Seus ajustes foram mantidos.');
      return false;
    } finally {
      this.restoring.set(false);
    }
  }
}
