import { Injectable, signal } from '@angular/core';
import type { CashMovement } from '../../../../../domain/finance-facts';

/** Contexto de consulta da execução; não grava preferências nem fatos. */
@Injectable({ providedIn: 'root' })
export class StatementState {
  readonly search = signal('');
  readonly kind = signal<CashMovement['kind'] | null>(null);
  readonly category = signal<string | null>(null);
  readonly expanded = signal<string | null>(null);
  readonly view = signal<'cards' | 'list'>('cards');
  readonly selectedIds = signal<readonly string[]>([]);
  clear(): void {
    this.search.set('');
    this.kind.set(null);
    this.category.set(null);
  }
}
