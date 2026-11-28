import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  invoicePurchases,
  type InvoicePurchaseRow,
} from '../../../../../application/invoice-purchases';
import { presentCardMoney } from '../../../../../application/card-invoices';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import { sumMoney, type Money } from '../../../../../domain/money';
import type { Invoice, Purchase } from '../../../../../domain/finance-facts';
import type { DemoSnapshot, FinancePreferences } from '../../../../../shared/storage-api';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import { CategoryStore } from '../statement/category-store.service';

@Component({
  selector: 'fd-invoice-purchases',
  templateUrl: './invoice-purchases.html',
  styleUrl: './invoice-purchases.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'escape($event)' },
})
export class InvoicePurchaseList {
  readonly merchantId = input<string | null>(null);
  readonly filterCleared = output<void>();
  readonly snapshot = input.required<DemoSnapshot>();
  readonly accountId = input.required<string>();
  readonly cardId = input.required<string>();
  readonly invoiceId = input.required<string>();
  readonly currency = input.required<FinancePreferences['currencyMode']>();
  readonly catalogue = inject(CategoryStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly expanded = signal<string | null>(null);
  readonly query = computed(() =>
    invoicePurchases(this.snapshot(), this.accountId(), this.cardId(), this.invoiceId()),
  );
  readonly rows = computed(
    () =>
      this.query()?.rows.filter(
        (row) => this.merchantId() === null || row.purchase.merchantId === this.merchantId(),
      ) ?? [],
  );
  readonly subtotal = computed(() => {
    const query = this.query();
    if (!query || !this.rows().length) return null;
    if (this.merchantId() === null) return query.knownTotal;
    try {
      return sumMoney(
        query.card.totalLimit.currency,
        this.rows().map((row) => row.amount),
      );
    } catch {
      return null;
    }
  });
  readonly differentTotal = computed(() => {
    const query = this.query();
    return (
      query?.knownTotal &&
      query.invoice.confirmedTotal &&
      query.knownTotal.minorUnits !== query.invoice.confirmedTotal.minorUnits
    );
  });
  readonly original = formatMoney;
  readonly date = formatCivilDate;
  constructor() {
    effect(() => {
      this.accountId();
      this.cardId();
      this.invoiceId();
      this.merchantId();
      this.prepareCollapse();
      this.expanded.set(null);
    });
    if (!this.catalogue.value()) void this.catalogue.load();
  }
  money(amount: Money | null): string {
    const value = presentCardMoney(
      amount,
      this.currency(),
      this.snapshot().asOf,
      DEMO_EXCHANGE_RATE,
    );
    return value ? formatMoney(value) : 'Valor indisponível';
  }
  converted(amount: Money): boolean {
    return this.currency() !== 'original' && this.currency() !== amount.currency;
  }
  category(purchase: Purchase) {
    return (
      this.catalogue.category(purchase.categoryId) ?? {
        name: purchase.categoryId === null ? 'Sem categoria' : 'Categoria não cadastrada',
        icon: 'pi-tag',
        color: '#a3aca9',
      }
    );
  }
  installment(row: InvoicePurchaseRow): string {
    if (row.refund) return 'Estorno';
    return row.purchase.installmentCount === 1
      ? 'À vista'
      : `${row.item!.installmentNumber} de ${row.purchase.installmentCount}`;
  }
  status(invoice: Invoice): string {
    return { paid: 'Paga', closed: 'Fechada', open: 'Em formação', future: 'Futura' }[
      invoice.status
    ];
  }
  month(invoice: Invoice): string {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${invoice.dueOn}T12:00:00Z`));
  }
  source(purchase: Pick<Purchase, 'origin'>): string {
    return { manual: 'Cadastro manual', file: 'Arquivo', integration: 'Integração' }[
      purchase.origin.kind
    ];
  }
  toggle(row: InvoicePurchaseRow): void {
    this.prepareCollapse();
    this.expanded.update((id) => (id === row.id ? null : row.id));
  }
  private prepareCollapse(): void {
    const panel = this.element.nativeElement.querySelector<HTMLElement>(
      '.purchase-detail-row:not(.purchase-row-leave) .purchase-reveal',
    );
    if (!panel) return;
    panel.style.setProperty('--purchase-close-height', `${panel.getBoundingClientRect().height}px`);
    const row = panel.closest<HTMLElement>('.purchase-detail-row');
    if (row) {
      row.style.setProperty('--purchase-close-opacity', getComputedStyle(panel).opacity);
      row.inert = true;
      row.setAttribute('aria-hidden', 'true');
    }
    panel.querySelector('.purchase-details')?.removeAttribute('id');
  }
  clearFilter(): void {
    this.filterCleared.emit();
    this.element.nativeElement.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }
  escape(event: Event): void {
    const id = this.expanded();
    if (!id) {
      if (this.merchantId() !== null) {
        event.preventDefault();
        event.stopPropagation();
        this.clearFilter();
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const index = this.rows().findIndex((row) => row.id === id);
    this.prepareCollapse();
    this.expanded.set(null);
    const buttons =
      this.element.nativeElement.querySelectorAll<HTMLButtonElement>('.purchase-toggle');
    buttons[index]?.focus({ preventScroll: true });
  }
}
