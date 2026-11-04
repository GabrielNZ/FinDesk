import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';
import {
  filterStatement,
  statementRows,
  statementAmount,
  categoryLabel,
  MOVEMENT_TYPES,
  keepStatementSelection,
  statementSelectionTotals,
  statementSelectionGrandTotals,
  type StatementRow,
} from '../../../../../application/statement';
import { formatMoney, formatCivilDate } from '../../../../../application/finance-context';
import type { CivilDate } from '../../../../../domain/civil-date';
import type { Money } from '../../../../../domain/money';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import { FinanceContext } from '../finance-context.service';
import { StatementState } from './statement-state.service';
import { StatementDetails } from './statement-details';
import { StatementDrag } from './statement-drag';
import { StatementLayoutState } from './statement-layout.service';
import { StatementResize } from './statement-resize';

@Component({
  selector: 'fd-statement',
  imports: [StatementDetails],
  templateUrl: './statement.html',
  styleUrl: './statement.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Statement {
  readonly context = inject(FinanceContext);
  readonly state = inject(StatementState);
  readonly layout = inject(StatementLayoutState);
  readonly resizing = signal(false);
  readonly resizeFloor = signal<number | null>(null);
  private readonly grid = viewChild<ElementRef<HTMLElement>>('statementGrid');
  private readonly tablePanel = viewChild<ElementRef<HTMLElement>>('tablePanel');
  private readonly tableScroll = viewChild<ElementRef<HTMLElement>>('tableScroll');
  readonly resizer = new StatementResize(
    () => this.layout.value(),
    () => {
      const grid = this.grid()?.nativeElement;
      const panel = this.tablePanel()?.nativeElement;
      const scroll = this.tableScroll()?.nativeElement;
      if (!grid || !panel || !scroll || !this.layout.ready()) return null;
      const style = getComputedStyle(grid);
      return {
        width: panel.getBoundingClientRect().width,
        height: scroll.getBoundingClientRect().height,
        available: grid.getBoundingClientRect().width,
        gap: parseFloat(style.columnGap) || 0,
        stacked: style.gridTemplateColumns.split(' ').length < 2,
      };
    },
    (value) => {
      if (this.resizing())
        this.resizeFloor.update((height) =>
          Math.max(height ?? 0, this.grid()?.nativeElement.getBoundingClientRect().height ?? 0),
        );
      this.layout.value.set(value);
    },
    (value) => this.layout.save(value),
    (active) => {
      this.resizeFloor.set(
        active ? (this.grid()?.nativeElement.getBoundingClientRect().height ?? null) : null,
      );
      this.resizing.set(active);
    },
  );
  readonly panel = signal<'kind' | 'category' | null>(null);
  readonly activeDrag = signal<string | null>(null);
  readonly dropReady = signal(false);
  readonly announcement = signal('');
  private readonly selectionArea = viewChild<ElementRef<HTMLElement>>('selectionArea');
  private ignoreClickUntil = 0;
  private readonly drag = new StatementDrag(
    () => this.selectionArea()?.nativeElement,
    (id, valid) => {
      this.activeDrag.set(id);
      this.dropReady.set(valid);
    },
    (id) => this.select(id),
    () => {
      this.ignoreClickUntil = performance.now() + 150;
    },
  );
  private readonly kindToggle = viewChild<ElementRef<HTMLButtonElement>>('kindToggle');
  private readonly categoryToggle = viewChild<ElementRef<HTMLButtonElement>>('categoryToggle');
  readonly types = Object.entries(MOVEMENT_TYPES).map(([key, value]) => ({
    key: key as keyof typeof MOVEMENT_TYPES,
    ...value,
  }));
  readonly typeInfo = MOVEMENT_TYPES;
  readonly categoryLabel = categoryLabel;
  readonly formatMoney = formatMoney;
  readonly formatDate = formatCivilDate;
  readonly sourceLabels = { manual: 'Manual', file: 'Arquivo', integration: 'Integração' };
  readonly baseRows = computed(() => {
    const snapshot = this.context.snapshot();
    const range = this.context.range();
    return snapshot && range ? statementRows(snapshot, this.context.accountId(), range) : [];
  });
  readonly categories = computed(() =>
    [...new Set(this.baseRows().flatMap((row) => (row.category ? [row.category] : [])))]
      .map((key) => ({ key, label: categoryLabel(key) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  );
  readonly rows = computed(() =>
    filterStatement(this.baseRows(), {
      search: this.state.search(),
      kind: this.state.kind(),
      category: this.state.category(),
    }).map((row) => ({
      ...row,
      amount: statementAmount(
        row.movement.delta,
        this.context.currencyMode(),
        DEMO_EXCHANGE_RATE,
        this.context.snapshot()!.asOf,
      ),
    })),
  );
  readonly groups = computed(() => {
    const rows = this.rows();
    const groups: { on: CivilDate; rows: typeof rows }[] = [];
    for (const row of rows) {
      let group = groups[groups.length - 1];
      if (!group || group.on !== row.movement.on) {
        group = { on: row.movement.on, rows: [] };
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  });
  readonly filtered = computed(
    () => !!this.state.search().trim() || !!this.state.kind() || !!this.state.category(),
  );
  readonly converted = computed(() =>
    this.rows().some((row) => row.amount && row.amount.currency !== row.movement.delta.currency),
  );
  readonly selectedSet = computed(() => new Set(this.state.selectedIds()));
  readonly selectedRows = computed(() =>
    this.rows().filter((row) => this.selectedSet().has(row.movement.id)),
  );
  readonly totals = computed(() =>
    statementSelectionTotals(this.selectedRows(), this.context.currencyMode()),
  );
  readonly grandTotals = computed(() =>
    statementSelectionGrandTotals(this.selectedRows(), this.context.currencyMode()),
  );

  constructor() {
    effect(() => {
      this.state.view();
      const rows = this.rows();
      const ids = this.state.selectedIds();
      const next = keepStatementSelection(ids, rows);
      if (next.length !== ids.length || next.some((id, i) => id !== ids[i]))
        this.state.selectedIds.set(next);
      untracked(() => {
        this.drag.cancel();
        this.resizer.cancel();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.drag.cancel();
      this.resizer.cancel();
    });
    void this.layout.load();
  }

  startDrag(event: PointerEvent, row: StatementRow & { amount: Money | null }): void {
    this.drag.start(
      event,
      row.movement.id,
      row.description,
      row.amount ? formatMoney(row.amount) : 'Conversão indisponível',
      row.movement.delta.minorUnits,
    );
  }
  startResize(event: PointerEvent): void {
    this.drag.cancel();
    this.resizer.start(event);
  }
  startTableDrag(event: PointerEvent, row: StatementRow & { amount: Money | null }): void {
    const target = event.target as HTMLElement;
    const control = target.closest('button, input, a, select, textarea');
    if (control && !control.classList.contains('movement-summary')) return;
    this.startDrag(event, row);
  }
  select(id: string): void {
    const row = this.rows().find((item) => item.movement.id === id);
    if (!row || this.selectedSet().has(id)) return;
    this.state.selectedIds.update((ids) => [...ids, id]);
    this.announcement.set(`${row.description} adicionado à seleção.`);
  }
  toggleSelection(id: string): void {
    if (this.selectedSet().has(id)) this.removeSelection(id);
    else this.select(id);
  }
  removeSelection(id: string, restoreFocus = false): void {
    this.state.selectedIds.update((ids) => ids.filter((item) => item !== id));
    this.announcement.set('Movimentação removida da seleção.');
    if (restoreFocus) document.getElementById(`select-${id}`)?.focus();
  }
  clearSelection(): void {
    this.state.selectedIds.set([]);
    this.announcement.set('Seleção limpa.');
    this.selectionArea()?.nativeElement.focus();
  }
  togglePanel(panel: 'kind' | 'category'): void {
    this.panel.update((current) => (current === panel ? null : panel));
  }
  closePanel(event: Event): void {
    const panel = this.panel();
    if (!panel) return;
    event.stopPropagation();
    this.panel.set(null);
    (panel === 'kind' ? this.kindToggle() : this.categoryToggle())?.nativeElement.focus();
  }
  toggleDetails(id: string): void {
    if (performance.now() < this.ignoreClickUntil) return;
    this.state.expanded.update((current) => (current === id ? null : id));
  }
}
