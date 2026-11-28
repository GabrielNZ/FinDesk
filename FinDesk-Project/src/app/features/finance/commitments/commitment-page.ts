import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FinanceContext } from '../finance-context.service';
import { CardBoard } from '../cards/card-board';
import { CardLayoutAction } from '../cards/card-layout-action';
import { CARD_LAYOUT_AREA, CardLayoutState } from '../cards/card-layout.service';
import { CommitmentDetail } from './commitment-detail';
import { commitmentPeriod } from '../../../../../application/commitment-period';
import {
  commitments,
  commitmentAmount,
  commitmentTotals,
  commitmentStatus,
  type CommitmentFilter,
  type CommitmentRow,
} from '../../../../../application/commitments';
import { formatMoney } from '../../../../../application/finance-context';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import type { Money } from '../../../../../domain/money';
import { commitmentCalendar } from '../../../../../application/commitment-calendar';
import {
  DEFAULT_COMMITMENT_PREFERENCES,
  parseCommitmentPreferences,
} from '../../../../../application/commitment-preferences';
import { formatCivilDate, moveCalendarMonth } from '../../../../../application/finance-context';
import {
  adjacentCivilDate,
  calendarMonth,
  civilDate,
  containsDate,
  type CivilDate,
} from '../../../../../domain/civil-date';
import type { CommitmentPreferences } from '../../../../../shared/commitments';
@Component({
  selector: 'fd-commitment-page',
  imports: [CardBoard, CardLayoutAction, CommitmentDetail],
  providers: [CardLayoutState, { provide: CARD_LAYOUT_AREA, useValue: 'finance-commitments' }],
  templateUrl: './commitment-page.html',
  styleUrl: './commitment-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommitmentPage {
  readonly context = inject(FinanceContext);
  readonly layout = inject(CardLayoutState);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly preferences = signal(DEFAULT_COMMITMENT_PREFERENCES);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;
  readonly filter = signal<CommitmentFilter>('all');
  readonly day = signal<CivilDate | null>(null);
  readonly pendingId = signal<string | null>(null);
  readonly itemIndex = signal(0);
  readonly month = signal<CivilDate | null>(null);
  readonly calendarFocus = signal<CivilDate | null>(null);
  readonly date = formatCivilDate;
  readonly filters = [
    { value: 'all' as const, label: 'Todos' },
    { value: 'upcoming' as const, label: 'A vencer' },
    { value: 'overdue' as const, label: 'Vencidos' },
    { value: 'paid' as const, label: 'Pagos' },
  ];
  readonly views = [
    { value: 'list' as const, label: 'Detalhes' },
    { value: 'calendar' as const, label: 'Calendário' },
    { value: 'split' as const, label: 'Lado a lado' },
  ];
  private readonly periodMode = computed(() => this.preferences().period);
  readonly range = computed(() => {
    const snapshot = this.context.snapshot();
    return snapshot
      ? commitmentPeriod(this.periodMode(), this.context.range(), snapshot.asOf)
      : null;
  });
  readonly query = computed(() => {
    const snapshot = this.context.snapshot();
    return snapshot
      ? commitments(snapshot, this.context.accountId(), this.range(), this.filter(), this.day())
      : null;
  });
  readonly cells = computed(() =>
    this.month() && this.range()
      ? commitmentCalendar(this.month()!, this.range()!, this.query()?.periodRows ?? [])
      : [],
  );
  readonly selectedRows = computed(() =>
    this.pendingId() !== null
      ? (this.query()?.previous.filter((row) => row.id === this.pendingId()) ?? [])
      : this.day() !== null
        ? (this.query()?.rows ?? [])
        : [],
  );
  readonly selectedIndex = computed(() =>
    Math.min(this.itemIndex(), Math.max(0, this.selectedRows().length - 1)),
  );
  readonly selected = computed(() => this.selectedRows()[this.selectedIndex()] ?? null);
  readonly previousTotal = computed(() =>
    commitmentTotals(
      this.query()?.previous ?? [],
      this.context.currencyMode(),
      this.context.snapshot()!.asOf,
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly periodTotal = computed(() =>
    commitmentTotals(
      this.query()?.periodRows ?? [],
      this.context.currencyMode(),
      this.context.snapshot()!.asOf,
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly money = (value: Money | null) => (value ? formatMoney(value) : 'Valor não informado');
  amount(row: CommitmentRow) {
    return this.money(
      commitmentAmount(
        row,
        this.context.currencyMode(),
        this.context.snapshot()!.asOf,
        DEMO_EXCHANGE_RATE,
      ),
    );
  }
  status(row: CommitmentRow) {
    return commitmentStatus(row, this.context.snapshot()!.asOf);
  }
  readonly weeks = computed(() =>
    Array.from({ length: 6 }, (_, index) => this.cells().slice(index * 7, index * 7 + 7)),
  );
  readonly tabDay = computed(
    () =>
      [
        this.calendarFocus(),
        this.day(),
        this.context.snapshot()?.asOf,
        this.cells().find((cell) => cell.enabled)?.on,
      ].find((date) => this.cells().some((cell) => cell.on === date && cell.enabled)) ?? null,
  );
  readonly only = computed(() =>
    this.preferences().view === 'list'
      ? ('commitment-agenda' as const)
      : this.preferences().view === 'calendar'
        ? ('commitment-calendar' as const)
        : null,
  );
  constructor() {
    void this.load();
    effect(() => {
      const range = this.range();
      this.context.accountId();
      this.day.set(null);
      this.pendingId.set(null);
      this.itemIndex.set(0);
      this.calendarFocus.set(null);
      this.month.set(range ? calendarMonth(range.start).start : null);
    });
  }
  async load() {
    this.error.set(null);
    this.ready.set(false);
    try {
      const result = await window.finDesk!.storage.getCommitmentPreferences();
      if (!result.ok) {
        this.error.set(result.error.message);
        return;
      }
      this.preferences.set(parseCommitmentPreferences(result.value));
      this.ready.set(true);
    } catch {
      this.error.set('Não foi possível carregar as preferências de Compromissos.');
    }
  }
  save(change: Partial<Pick<CommitmentPreferences, 'view' | 'period'>>) {
    const next = parseCommitmentPreferences({ ...this.preferences(), ...change });
    this.preferences.set(next);
    this.layout.focused.set(null);
    const revision = ++this.revision;
    this.saveError.set(null);
    this.queue = this.queue.then(async () => {
      try {
        const result = await window.finDesk!.storage.saveCommitmentPreferences(next);
        if (!result.ok && revision === this.revision)
          this.saveError.set('Não foi possível salvar. A escolha vale apenas nesta execução.');
      } catch {
        if (revision === this.revision)
          this.saveError.set('Não foi possível salvar. A escolha vale apenas nesta execução.');
      }
    });
  }
  monthLabel() {
    const month = this.month();
    return month
      ? new Intl.DateTimeFormat('pt-BR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${month}T12:00:00Z`))
      : '';
  }
  viewKey(event: KeyboardEvent, view: CommitmentPreferences['view']) {
    const index = this.views.findIndex((option) => option.value === view);
    const next =
      event.key === 'ArrowRight'
        ? Math.min(index + 1, this.views.length - 1)
        : event.key === 'ArrowLeft'
          ? Math.max(index - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? this.views.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.save({ view: this.views[next]!.value });
    const buttons =
      this.element.nativeElement.querySelectorAll<HTMLButtonElement>('.view-options button');
    buttons[next]?.focus({ preventScroll: true });
  }
  canMove(offset: number) {
    const month = this.month(),
      range = this.range();
    const next = month && moveCalendarMonth(month, offset);
    if (!next || !range) return false;
    const bounds = calendarMonth(next);
    return bounds.start <= range.end && bounds.end >= range.start;
  }
  move(offset: number) {
    if (this.canMove(offset)) {
      this.month.set(moveCalendarMonth(this.month()!, offset));
      this.calendarFocus.set(null);
    }
  }
  select(on: CivilDate) {
    this.calendarFocus.set(on);
    this.pendingId.set(null);
    this.itemIndex.set(0);
    this.day.set(this.day() === on ? null : on);
    if (this.preferences().view === 'calendar') this.save({ view: 'split' });
  }
  selectPending(row: CommitmentRow) {
    this.day.set(null);
    this.itemIndex.set(0);
    this.pendingId.set(row.id);
    if (this.preferences().view === 'calendar') this.save({ view: 'split' });
  }
  clear() {
    this.day.set(null);
    this.pendingId.set(null);
    this.itemIndex.set(0);
  }
  clearDetail(event: Event) {
    if (this.day() === null && this.pendingId() === null) return;
    event.preventDefault();
    event.stopPropagation();
    const day = this.day(),
      pending = this.pendingId();
    this.clear();
    afterNextRender(
      () => {
        if (this.preferences().view === 'list') {
          const views =
            this.element.nativeElement.querySelectorAll<HTMLButtonElement>('.view-options button');
          views[1]?.focus({ preventScroll: true });
          return;
        }
        Array.from(
          this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
            '[data-calendar-date], [data-pending-id]',
          ),
        )
          .find((button) =>
            day !== null
              ? button.dataset['calendarDate'] === day
              : button.dataset['pendingId'] === pending,
          )
          ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  moveItem(offset: number) {
    const active = this.element.nativeElement.ownerDocument.activeElement;
    this.itemIndex.set(
      Math.max(0, Math.min(this.selectedRows().length - 1, this.selectedIndex() + offset)),
    );
    afterNextRender(
      () => {
        if (!(active instanceof HTMLButtonElement) || !active.disabled) return;
        Array.from(
          this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
            '.selection-navigation button',
          ),
        )
          .find((button) => !button.disabled)
          ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  itemKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    this.moveItem(event.key === 'ArrowLeft' ? -1 : 1);
  }
  key(event: KeyboardEvent, on: CivilDate) {
    const weekday = (new Date(`${on}T12:00:00Z`).getUTCDay() + 6) % 7;
    const offset = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    }[event.key];
    if (event.key === 'Escape' && this.day()) {
      event.preventDefault();
      event.stopPropagation();
      this.day.set(null);
      return;
    }
    if (offset === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    let next: CivilDate | null = civilDate(on);
    for (let step = 0; step < Math.abs(offset) && next; step++)
      next = adjacentCivilDate(next, offset < 0 ? -1 : 1);
    if (!next || !this.range() || !containsDate(this.range()!, next)) return;
    this.calendarFocus.set(next);
    this.month.set(calendarMonth(next).start);
    const target = next;
    afterNextRender(
      () =>
        Array.from(
          this.element.nativeElement.querySelectorAll<HTMLButtonElement>('[data-calendar-date]'),
        )
          .find((node) => node.dataset['calendarDate'] === target)
          ?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }
}
