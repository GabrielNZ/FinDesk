import { Injectable, signal } from '@angular/core';
import {
  defaultStatementLayout,
  parseStatementLayout,
} from '../../../../../application/statement-layout';
import type { StatementLayout } from '../../../../../shared/statement-layout';

@Injectable({ providedIn: 'root' })
export class StatementLayoutState {
  readonly value = signal<StatementLayout>(defaultStatementLayout());
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private loading: Promise<void> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;

  load(): Promise<void> {
    if (this.ready()) return Promise.resolve();
    if (this.loading) return this.loading;
    const api = window.finDesk?.storage;
    if (!api?.getStatementLayout) {
      this.error.set('Reabra o FinDesk para carregar o redimensionamento da lista.');
      return Promise.resolve();
    }
    this.error.set(null);
    this.loading = (async () => {
      try {
        const result = await api.getStatementLayout();
        if (!result.ok) throw new Error('Leitura indisponível.');
        this.value.set(
          result.value === null ? defaultStatementLayout() : parseStatementLayout(result.value),
        );
        this.ready.set(true);
      } catch {
        this.error.set(
          'Não foi possível ler o tamanho salvo da lista. Nenhum ajuste foi substituído.',
        );
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  save(value: StatementLayout): void {
    if (!this.ready()) return;
    const checked = parseStatementLayout(value);
    this.value.set(checked);
    this.error.set(null);
    this.saving.set(true);
    const revision = ++this.revision;
    this.queue = this.queue.then(async () => {
      try {
        const result = await window.finDesk!.storage.saveStatementLayout(checked);
        if (!result.ok) throw new Error('Gravação indisponível.');
      } catch {
        if (revision === this.revision) this.error.set('Tamanho aplicado, mas não foi salvo.');
      } finally {
        if (revision === this.revision) this.saving.set(false);
      }
    });
  }
}
