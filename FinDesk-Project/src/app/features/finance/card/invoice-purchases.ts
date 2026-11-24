import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  invoicePurchases,
  type InvoicePurchaseRow,
} from '../../../../../application/invoice-purchases';
import { presentCardMoney } from '../../../../../application/card-invoices';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import type { Money } from '../../../../../domain/money';
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
    return row.purchase.installmentCount === 1
      ? 'À vista'
      : `${row.item.installmentNumber} de ${row.purchase.installmentCount}`;
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
  source(purchase: Purchase): string {
    return { manual: 'Cadastro manual', file: 'Arquivo', integration: 'Integração' }[
      purchase.origin.kind
    ];
  }
  toggle(row: InvoicePurchaseRow): void {
    this.expanded.update((id) => (id === row.item.id ? null : row.item.id));
  }
  escape(event: Event): void {
    const id = this.expanded();
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    const index = this.query()?.rows.findIndex((row) => row.item.id === id) ?? -1;
    this.expanded.set(null);
    const buttons =
      this.element.nativeElement.querySelectorAll<HTMLButtonElement>('.purchase-toggle');
    buttons[index]?.focus({ preventScroll: true });
  }
}
