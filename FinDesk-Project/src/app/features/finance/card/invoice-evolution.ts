import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import {
  invoiceEvolution,
  type InvoiceEvolutionColumn,
} from '../../../../../application/invoice-evolution';
import type { DemoSnapshot, FinancePreferences } from '../../../../../shared/storage-api';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import type { Money } from '../../../../../domain/money';

@Component({
  selector: 'fd-invoice-evolution',
  templateUrl: './invoice-evolution.html',
  styleUrl: './invoice-evolution.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'dismiss($event)' },
})
export class InvoiceEvolutionChart {
  readonly snapshot = input.required<DemoSnapshot>();
  readonly accountId = input.required<string>();
  readonly cardId = input.required<string>();
  readonly currency = input.required<FinancePreferences['currencyMode']>();
  readonly selectedId = input.required<string>();
  readonly selected = output<string>();
  readonly hoverId = signal<string | null>(null);
  readonly focusedId = signal<string | null>(null);
  private readonly dismissed = signal(false);
  readonly activeId = computed(() =>
    this.dismissed() ? null : (this.hoverId() ?? this.focusedId()),
  );
  readonly focusId = signal<string | null>(null);
  readonly plot = computed(() =>
    invoiceEvolution(
      this.snapshot(),
      this.accountId(),
      this.cardId(),
      this.currency(),
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly current = computed(() =>
    this.plot()?.invoices.find((row) => row.key === this.selectedId()),
  );
  readonly active = computed(() =>
    this.plot()?.invoices.find((row) => row.key === this.activeId()),
  );
  readonly hasConversion = computed(
    () => this.plot()?.invoices.some((row) => this.converted(row)) ?? false,
  );
  readonly money = (value: Money | null) => (value ? formatMoney(value) : 'Valor indisponível');
  readonly date = formatCivilDate;
  constructor() {
    effect(() => {
      this.accountId();
      this.cardId();
      this.hoverId.set(null);
      this.focusedId.set(null);
      this.dismissed.set(false);
      this.focusId.set(untracked(this.selectedId));
    });
  }
  month(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(
      new Date(`${value}-01T12:00:00Z`),
    );
  }
  status(row: InvoiceEvolutionColumn): string {
    return { paid: 'Paga', closed: 'Fechada', open: 'Em formação', future: 'Futura' }[
      row.reading.invoice.status
    ];
  }
  basis(row: InvoiceEvolutionColumn): string {
    return row.basis === 'confirmed'
      ? 'Confirmado'
      : row.basis === 'known'
        ? 'Conhecido'
        : 'Sem valor informado';
  }
  label(row: InvoiceEvolutionColumn): string {
    return `${this.month(row.month)} de ${row.month.slice(0, 4)}, vencimento ${this.date(row.reading.invoice.dueOn)}, ${this.money(row.value)}, ${this.basis(row)}, ${this.status(row)}`;
  }
  tick(value: Money): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: value.currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value.minorUnits / 100);
  }
  converted(row: InvoiceEvolutionColumn): boolean {
    return !!row.original && !!row.value && row.original.currency !== row.value.currency;
  }
  choose(row: InvoiceEvolutionColumn): void {
    this.focusId.set(row.key);
    this.selected.emit(row.key);
  }
  hover(id: string): void {
    this.hoverId.set(id);
    this.dismissed.set(false);
  }
  focus(id: string): void {
    this.focusId.set(id);
    this.focusedId.set(id);
    this.dismissed.set(false);
  }
  dismiss(event: Event): void {
    if (!this.active()) return;
    this.dismissed.set(true);
    event.preventDefault();
  }
  key(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const hadTip = !!this.active();
      this.dismiss(event);
      if (hadTip) event.stopPropagation();
      return;
    }
    const rows = this.plot()?.invoices ?? [];
    const index = Math.max(
      0,
      rows.findIndex((row) => row.key === this.focusId()),
    );
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? rows.length - 1
          : event.key === 'ArrowRight'
            ? Math.min(index + 1, rows.length - 1)
            : event.key === 'ArrowLeft'
              ? Math.max(0, index - 1)
              : null;
    if (next === null || !rows[next]) return;
    event.preventDefault();
    event.stopPropagation();
    this.focusId.set(rows[next].key);
    const container = event.currentTarget as HTMLElement;
    const button = container.querySelectorAll<HTMLButtonElement>('.invoice-column')[next];
    button?.focus({ preventScroll: true });
    if (button) {
      const rect = button.getBoundingClientRect(),
        bounds = container.getBoundingClientRect();
      if (rect.left < bounds.left) container.scrollLeft -= bounds.left - rect.left;
      if (rect.right > bounds.right) container.scrollLeft += rect.right - bounds.right;
    }
  }
}
