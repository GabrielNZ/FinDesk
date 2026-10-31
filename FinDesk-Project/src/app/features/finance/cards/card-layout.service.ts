import { Injectable, signal } from '@angular/core';
import { defaultCardLayout, parseCardLayout } from '../../../../../application/card-layout';
import type { CardLayout, FinanceCardId } from '../../../../../shared/card-layout';

@Injectable({ providedIn: 'root' })
export class CardLayoutState {
  readonly state = signal<'loading' | 'ready' | 'failed' | 'browser'>('loading');
  readonly layout = signal<CardLayout>(defaultCardLayout());
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
        const result = await api.getCardLayout();
        if (!result.ok) {
          this.error.set(result.error.message);
          this.state.set('failed');
          return;
        }
        this.layout.set(
          result.value === null ? defaultCardLayout() : parseCardLayout(result.value),
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
    const layout = parseCardLayout(value);
    if (JSON.stringify(layout) === JSON.stringify(this.layout()) && !this.saveError()) return;
    this.layout.set(layout);
    const revision = ++this.revision;
    this.saving.set(true);
    this.saveError.set(null);
    this.queue = this.queue.then(async () => {
      try {
        const result = await window.finDesk!.storage.saveCardLayout(layout);
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
      const result = await window.finDesk!.storage.restoreCardLayout('restore-card-layout');
      if (!result.ok) {
        this.saveError.set('Não foi possível restaurar o layout. Seus ajustes foram mantidos.');
        return false;
      }
      this.layout.set(parseCardLayout(result.value));
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
