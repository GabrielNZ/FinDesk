import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  filterStatement,
  statementRows,
  statementAmount,
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
import { groupStatement } from '../../../../../application/statement-grouping';
import { DEMO_MERCHANT_LABELS } from '../../../../../fixtures/financas/labels';
import { StatementGroups, groupToggleId, statementGroupIcon } from './statement-groups';
import { StatementSourceSwitch } from './statement-source-switch';
import { CategoryStore } from './category-store.service';
import { CategoryPanel } from './category-panel';
import { MerchantCategoryPanel } from './merchant-category-panel';
import type { MerchantQuery } from '../../../../../shared/categories';
import { categorizedMovements } from '../../../../../application/categories';

@Component({
  selector: 'fd-statement',
  imports: [
    StatementDetails,
    StatementGroups,
    StatementSourceSwitch,
    CategoryPanel,
    MerchantCategoryPanel,
    NgTemplateOutlet,
  ],
  host: { '(window:resize)': 'updateFocusBounds()' },
  templateUrl: './statement.html',
  styleUrl: './statement.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Statement {
  readonly context = inject(FinanceContext);
  readonly state = inject(StatementState);
  readonly layout = inject(StatementLayoutState);
  readonly catalogue = inject(CategoryStore);
  readonly categoryPanel = signal(false);
  readonly editingRow = signal<StatementRow | null>(null);
  readonly merchantRow = signal<StatementRow | null>(null);
  readonly merchantQuery = computed<MerchantQuery | null>(() => {
    const range = this.context.range();
    return range
      ? {
          accountId: this.context.accountId(),
          start: range.start,
          end: range.end,
          search: this.state.search(),
          kind: this.state.kind(),
          category: this.state.category(),
        }
      : null;
  });
  private categoryReturn: HTMLElement | null = null;
  readonly resizing = signal(false);
  readonly focusHeight = signal(400);
  readonly groupHeight = signal(400);
  private readonly injector = inject(Injector);
  private focusReturn: HTMLElement | null = null;
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
  readonly activeGroupDrag = signal<string | null>(null);
  readonly dropReady = signal(false);
  readonly announcement = signal('');
  private readonly selectionArea = viewChild<ElementRef<HTMLElement>>('selectionArea');
  private ignoreClickUntil = 0;
  private readonly drag = new StatementDrag(
    () => (this.categoryPanel() ? undefined : this.selectionArea()?.nativeElement),
    (id, valid) => {
      this.activeDrag.set(id);
      this.dropReady.set(valid);
    },
    (id) => this.select(id),
    () => {
      this.ignoreClickUntil = performance.now() + 150;
    },
  );
  private readonly groupDrag = new StatementDrag(
    () => (this.categoryPanel() ? undefined : this.selectionArea()?.nativeElement),
    (id, valid) => {
      this.activeGroupDrag.set(id);
      this.dropReady.set(valid);
    },
    (id) => this.selectGroup(id),
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
  readonly categoryLabel = (key: string) => this.catalogue.label(key);
  readonly formatMoney = formatMoney;
  readonly formatDate = formatCivilDate;
  readonly sourceLabels = { manual: 'Manual', file: 'Arquivo', integration: 'Integração' };
  readonly baseRows = computed(() => {
    const snapshot = this.context.snapshot();
    const range = this.context.range();
    const catalogue = this.catalogue.value();
    return snapshot && range && catalogue
      ? statementRows(
          {
            ...snapshot,
            facts: {
              ...snapshot.facts,
              movements: categorizedMovements(
                snapshot.facts.movements,
                catalogue,
                this.catalogue.rules()?.assignments,
              ),
            },
          },
          this.context.accountId(),
          range,
        )
      : [];
  });
  readonly categories = computed(() =>
    [...new Set(this.baseRows().flatMap((row) => (row.category ? [row.category] : [])))]
      .map((key) => ({ key, label: this.categoryLabel(key) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  );
  readonly rows = computed(() =>
    filterStatement(
      this.baseRows(),
      {
        search: this.state.search(),
        kind: this.state.kind(),
        category: this.state.category(),
      },
      this.catalogue.labels(),
    ).map((row) => ({
      ...row,
      amount: statementAmount(
        row.movement.delta,
        this.context.currencyMode(),
        DEMO_EXCHANGE_RATE,
        this.context.snapshot()!.asOf,
      ),
    })),
  );
  readonly tree = computed(() =>
    groupStatement(
      this.rows(),
      this.context.currencyMode(),
      DEMO_MERCHANT_LABELS,
      this.catalogue.labels(),
    ),
  );
  readonly expandedGroup = computed(
    () =>
      this.state.area() === 'grouping' &&
      this.tree().some((group) => group.id === this.state.openGroup()),
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
  readonly selectedBlocks = computed(() =>
    this.state
      .selectedGroups()
      .map((group) => {
        const ids = new Set(group.memberIds);
        const rows = this.selectedRows().filter((row) => ids.has(row.movement.id));
        const current = this.tree().find((item) => item.id === group.id);
        const categoryId = current?.filter.level !== 'kind' ? current?.filter.categoryId : null;
        const category = this.catalogue.categories().find((item) => item.id === categoryId);
        return {
          ...group,
          label: current?.label ?? group.label,
          icon: category?.icon ?? group.icon,
          color: category?.color,
          rows,
          totals: statementSelectionGrandTotals(rows, this.context.currencyMode()),
        };
      })
      .filter((group) => group.rows.length),
  );
  readonly looseSelectedRows = computed(() => {
    const grouped = new Set(
      this.selectedBlocks().flatMap((group) => group.rows.map((row) => row.movement.id)),
    );
    return this.selectedRows().filter((row) => !grouped.has(row.movement.id));
  });

  constructor() {
    effect(() => {
      this.context.snapshot();
      untracked(() => {
        void this.catalogue.load();
      });
    });
    effect(() => {
      this.state.view();
      this.state.area();
      this.state.focus();
      this.state.openGroup();
      this.categoryPanel();
      const rows = this.rows();
      const ids = this.state.selectedIds();
      const next = keepStatementSelection(ids, rows);
      if (next.length !== ids.length || next.some((id, i) => id !== ids[i]))
        this.state.selectedIds.set(next);
      const kept = new Set(next);
      const groups = this.state.selectedGroups();
      const nextGroups = groups
        .map((group) => {
          const members = new Set(
            this.tree()
              .find((item) => item.id === group.id)
              ?.rows.map((row) => row.movement.id) ?? [],
          );
          const memberIds = group.memberIds.filter((id) => kept.has(id) && members.has(id));
          return memberIds.length === group.memberIds.length ? group : { ...group, memberIds };
        })
        .filter((group) => group.memberIds.length);
      if (nextGroups.length !== groups.length || nextGroups.some((group, i) => group !== groups[i]))
        this.state.selectedGroups.set(nextGroups);
      untracked(() => {
        this.drag.cancel();
        this.groupDrag.cancel();
        this.resizer.cancel();
        afterNextRender(() => this.updateFocusBounds(), { injector: this.injector });
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.drag.cancel();
      this.groupDrag.cancel();
      this.resizer.cancel();
      this.state.focus.set(null);
    });
    void this.layout.load();
  }

  switchSource(area: 'statement' | 'grouping'): void {
    if (this.state.focus() === 'selection') this.state.focus.set(null);
    this.state.area.set(area);
    this.panel.set(null);
  }
  openCategories(row: StatementRow | null = null): void {
    if (this.catalogue.busy()) return;
    this.categoryReturn = document.activeElement as HTMLElement | null;
    this.editingRow.set(row);
    this.merchantRow.set(null);
    this.state.focus.set(null);
    this.categoryPanel.set(true);
    this.panel.set(null);
  }
  closeCategories(): void {
    this.categoryPanel.set(false);
    this.editingRow.set(null);
    this.merchantRow.set(null);
    afterNextRender(
      () => {
        (this.categoryReturn?.isConnected
          ? this.categoryReturn
          : this.grid()?.nativeElement
        )?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  openMerchant(row: StatementRow): void {
    if (this.catalogue.busy() || row.movement.kind !== 'expense' || !row.movement.merchantId)
      return;
    this.openCategories();
    this.merchantRow.set(row);
  }
  merchantApplied(count: number): void {
    this.announcement.set(
      count === 1 ? '1 despesa reclassificada.' : `${count} despesas reclassificadas.`,
    );
    this.closeCategories();
  }
  toggleGroup(id: string): void {
    if (performance.now() < this.ignoreClickUntil) return;
    this.updateFocusBounds();
    this.state.openGroup.update((current) => (current === id ? null : id));
  }
  movementIcon(row: StatementRow): string {
    return this.typeInfo[row.movement.kind].icon;
  }
  toggleFocus(target: 'source' | 'selection'): void {
    if (this.state.focus() === target) {
      this.state.focus.set(null);
      return;
    }
    this.focusReturn = document.activeElement as HTMLElement | null;
    this.state.focus.set(target);
    this.updateFocusBounds();
  }
  updateFocusBounds(): void {
    const panelTop = this.tablePanel()?.nativeElement.getBoundingClientRect().top;
    if (panelTop !== undefined)
      this.groupHeight.set(Math.max(320, window.innerHeight - Math.max(16, panelTop) - 28));
    if (!this.state.focus()) return;
    this.focusHeight.set(
      Math.max(
        320,
        window.innerHeight -
          Math.max(16, this.grid()?.nativeElement.getBoundingClientRect().top ?? 16) -
          28,
      ),
    );
  }
  escape(event: Event): void {
    if (this.categoryPanel()) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.catalogue.busy()) this.closeCategories();
      return;
    }
    if (this.panel()) {
      this.closePanel(event);
      return;
    }
    if (!this.state.focus()) {
      const id = this.state.openGroup();
      if (this.state.area() === 'grouping' && id) {
        event.preventDefault();
        event.stopPropagation();
        this.state.openGroup.set(null);
        document.getElementById(groupToggleId(id))?.focus({ preventScroll: true });
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.state.focus.set(null);
    this.focusReturn?.focus({ preventScroll: true });
  }

  startDrag(event: PointerEvent, row: StatementRow & { amount: Money | null }): void {
    this.groupDrag.cancel();
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
    this.groupDrag.cancel();
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
  startGroupDrag({ event, id }: { event: PointerEvent; id: string }): void {
    const group = this.tree().find((group) => group.id === id);
    if (!group) return;
    this.drag.cancel();
    const amount = group.totals
      .map((total) => (total.value ? formatMoney(total.value) : 'Indisponível'))
      .join(' · ');
    this.groupDrag.start(
      event,
      id,
      group.label,
      amount,
      group.totals.length === 1 ? (group.totals[0]!.value?.minorUnits ?? 0) : 0,
    );
  }
  selectGroup(id: string): void {
    const group = this.tree().find((group) => group.id === id);
    if (!group) return;
    const members = group.rows.map((row) => row.movement.id);
    this.state.selectedIds.update((ids) => [...new Set([...ids, ...members])]);
    this.state.selectedGroups.update((groups) => {
      const existing = groups.find((item) => item.id === id);
      const next = {
        id,
        label: group.label,
        icon: statementGroupIcon(group),
        memberIds: [...new Set([...(existing?.memberIds ?? []), ...members])],
      };
      return existing ? groups.map((item) => (item.id === id ? next : item)) : [...groups, next];
    });
    this.state.collapsedSelectionGroups.update((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    this.announcement.set(`${group.label} adicionado à seleção com ${members.length} lançamentos.`);
  }
  toggleSelectedGroup(id: string): void {
    this.state.collapsedSelectionGroups.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  selectedGroupContentId(id: string): string {
    return `selected-group-content-${encodeURIComponent(id)}`;
  }
  removeSelectedGroup(id: string): void {
    const removed = this.state.selectedGroups().find((group) => group.id === id);
    if (!removed) return;
    const others = this.state.selectedGroups().filter((group) => group.id !== id);
    const retained = new Set(others.flatMap((group) => group.memberIds));
    const members = new Set(removed.memberIds);
    this.state.selectedGroups.set(others);
    this.state.selectedIds.update((ids) =>
      ids.filter((member) => !members.has(member) || retained.has(member)),
    );
    this.announcement.set(`${removed.label} removido da seleção.`);
    this.selectionArea()?.nativeElement.focus({ preventScroll: true });
  }
  toggleSelection(id: string): void {
    if (this.selectedSet().has(id)) this.removeSelection(id);
    else this.select(id);
  }
  removeSelection(id: string, restoreFocus = false): void {
    this.state.selectedIds.update((ids) => ids.filter((item) => item !== id));
    this.announcement.set('Movimentação removida da seleção.');
    if (restoreFocus)
      (document.getElementById(`select-${id}`) ?? this.selectionArea()?.nativeElement)?.focus({
        preventScroll: true,
      });
  }
  clearSelection(): void {
    this.state.selectedGroups.set([]);
    this.state.collapsedSelectionGroups.set(new Set());
    this.state.selectedIds.set([]);
    this.announcement.set('Seleção limpa.');
    this.selectionArea()?.nativeElement.focus({ preventScroll: true });
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
