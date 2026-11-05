import { Injectable, signal } from '@angular/core';
import type { CashMovement } from '../../../../../domain/finance-facts';

export interface SelectedStatementGroup {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly memberIds: readonly string[];
}

/** Contexto de consulta da execução; não grava preferências nem fatos. */
@Injectable({ providedIn: 'root' })
export class StatementState {
  readonly area = signal<'statement' | 'grouping'>('statement');
  readonly openGroup = signal<string | null>(null);
  readonly focus = signal<'source' | 'selection' | null>(null);
  readonly search = signal('');
  readonly kind = signal<CashMovement['kind'] | null>(null);
  readonly category = signal<string | null>(null);
  readonly expanded = signal<string | null>(null);
  readonly view = signal<'cards' | 'list'>('cards');
  readonly selectedIds = signal<readonly string[]>([]);
  readonly selectedGroups = signal<readonly SelectedStatementGroup[]>([]);
  readonly collapsedSelectionGroups = signal<ReadonlySet<string>>(new Set());
  clear(): void {
    this.search.set('');
    this.kind.set(null);
    this.category.set(null);
  }
}
