import {
  ChangeDetectionStrategy,
  afterRenderEffect,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import {
  invoiceEvolution,
  type InvoiceEvolutionColumn,
} from '../../../../../application/invoice-evolution';
import type { DemoSnapshot, FinancePreferences } from '../../../../../shared/storage-api';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import type { Money } from '../../../../../domain/money';
import { invoiceVariation } from '../../../../../application/invoice-variation';

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
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly chartArea = viewChild<ElementRef<HTMLElement>>('chartArea');
  private readonly tip = viewChild<ElementRef<HTMLElement>>('tip');
  readonly tipPosition = signal<{ id: string; left: number; top: number } | null>(null);
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
  readonly variation = computed(() =>
    invoiceVariation(
      this.snapshot(),
      this.accountId(),
      this.cardId(),
      this.selectedId(),
      this.currency(),
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly hasConversion = computed(
    () => this.plot()?.invoices.some((row) => this.converted(row)) ?? false,
  );
  readonly money = (value: Money | null) => (value ? formatMoney(value) : 'Valor indisponível');
  readonly date = formatCivilDate;
  signedMoney(value: Money): string {
    return `${value.minorUnits > 0 ? '+' : ''}${formatMoney(value)}`;
  }
  variationReason(reason: NonNullable<ReturnType<typeof invoiceVariation>>['unavailable']): string {
    switch (reason) {
      case 'no-previous':
        return 'Sem fatura anterior';
      case 'ambiguous':
        return 'Referência anterior ambígua';
      case 'no-items':
        return 'Comparação sem valor informado';
      case 'precision':
        return 'Comparação fora da precisão disponível';
      default:
        return 'Conversão da variação indisponível';
    }
  }
  constructor() {
    effect(() => {
      this.accountId();
      this.cardId();
      this.hoverId.set(null);
      this.focusedId.set(null);
      this.dismissed.set(false);
      this.focusId.set(untracked(this.selectedId));
    });
    afterRenderEffect((cleanup) => {
      const panel = this.panel()?.nativeElement;
      const area = this.chartArea()?.nativeElement;
      const tip = this.tip()?.nativeElement;
      const row = this.active();
      if (!panel || !area || !tip || !row) return;
      const column = Array.from(area.querySelectorAll<HTMLElement>('.invoice-column')).find(
        (node) => node.dataset['invoiceId'] === row.key,
      );
      const bar = column?.querySelector<HTMLElement>('.column-fill, .column-missing');
      const scroller = column?.closest<HTMLElement>('.chart-scroller');
      if (!bar || !scroller) return;
      const update = () => {
        const bounds = panel.getBoundingClientRect();
        const plot = area.getBoundingClientRect();
        const fill = bar.getBoundingClientRect();
        const visible = scroller.getBoundingClientRect();
        if (fill.right <= visible.left || fill.left >= visible.right) {
          this.tipPosition.set(null);
          return;
        }
        const size = tip.getBoundingClientRect();
        const center =
          (Math.max(fill.left, visible.left) + Math.min(fill.right, visible.right)) / 2;
        const left = Math.max(
          bounds.left + 8,
          Math.min(center - size.width / 2, bounds.right - size.width - 8),
        );
        const top = Math.max(bounds.top + 8, fill.top - size.height - 10);
        this.tipPosition.set({ id: row.key, left: left - plot.left, top: top - plot.top });
      };
      update();
      const observer = new ResizeObserver(update);
      for (const node of [panel, area, tip, bar]) observer.observe(node);
      scroller.addEventListener('scroll', update, { passive: true });
      cleanup(() => {
        observer.disconnect();
        scroller.removeEventListener('scroll', update);
      });
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
