import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  commitmentAmount,
  commitmentStatus,
  type CommitmentRow,
} from '../../../../../application/commitments';
import { formatMoney, formatCivilDate } from '../../../../../application/finance-context';
import { categorizedMovements } from '../../../../../application/categories';
import { cardInvoices, presentCardMoney } from '../../../../../application/card-invoices';
import { commitmentInsight } from '../../../../../application/commitment-insight';
import { invoiceVariation } from '../../../../../application/invoice-variation';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import type { Money } from '../../../../../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../../../../../shared/storage-api';
import { CategoryStore } from '../statement/category-store.service';

@Component({
  selector: 'fd-commitment-detail',
  templateUrl: './commitment-detail.html',
  styleUrl: './commitment-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommitmentDetail {
  readonly row = input<CommitmentRow | null>(null);
  readonly emptyMessage = input('Selecione um dia ou uma pendência para consultar o compromisso.');
  readonly snapshot = input.required<DemoSnapshot>();
  readonly currency = input.required<FinancePreferences['currencyMode']>();
  readonly catalogue = inject(CategoryStore);
  readonly date = formatCivilDate;
  readonly money = (amount: Money | null) => (amount ? formatMoney(amount) : 'Valor não informado');
  readonly shown = computed(() => {
    const row = this.row();
    return row
      ? commitmentAmount(row, this.currency(), this.snapshot().asOf, DEMO_EXCHANGE_RATE)
      : null;
  });
  readonly status = computed(() => {
    const row = this.row();
    return row ? commitmentStatus(row, this.snapshot().asOf) : '';
  });
  readonly insight = computed(() => {
    const row = this.row();
    return row ? commitmentInsight(this.snapshot(), row) : null;
  });
  readonly frequency = computed(() =>
    this.insight()?.series
      ? this.insight()!.series!.frequency === 'monthly'
        ? 'Mensal'
        : 'Anual'
      : 'Não informada',
  );
  readonly billDifference = computed(() =>
    presentCardMoney(
      this.insight()?.difference ?? null,
      this.currency(),
      this.snapshot().asOf,
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly account = computed(
    () =>
      this.snapshot().facts.accounts.find((account) => account.id === this.row()?.accountId)
        ?.name ?? 'Não informada',
  );
  readonly payment = computed(() => {
    const payment = this.row()?.payment,
      categories = this.catalogue.value();
    return payment && categories
      ? categorizedMovements([payment], categories, this.catalogue.rules()?.assignments ?? [])[0]
      : (payment ?? null);
  });
  readonly destination = computed(() => {
    const row = this.row(),
      payment = this.payment();
    return (
      this.insight()?.series?.destination ??
      (payment?.kind === 'expense' && payment.merchantId
        ? this.catalogue.merchantLabel(payment.merchantId)
        : row?.invoice
          ? row.name
          : 'Não informado')
    );
  });
  readonly categories = computed(() => {
    const row = this.row(),
      payment = this.payment();
    const ids = row?.invoice
      ? (cardInvoices(this.snapshot(), row.accountId, row.invoice.cardId)
          .find((reading) => reading.invoice.id === row.invoice!.id)
          ?.categories.map((part) => part.categoryId) ?? [])
      : payment?.kind === 'expense'
        ? [payment.categoryId]
        : this.insight()?.series
          ? [this.insight()!.series!.categoryId]
          : [];
    return [...new Set(ids)].map((id) => ({
      id: id ?? 'uncategorized',
      name:
        id === null
          ? 'Sem categoria'
          : (this.catalogue.category(id)?.name ?? 'Categoria não cadastrada'),
      icon: this.catalogue.category(id)?.icon ?? 'pi-tag',
      color: this.catalogue.category(id)?.color ?? '#a3aca9',
    }));
  });
  readonly variation = computed(() => {
    const row = this.row();
    return row?.invoice
      ? invoiceVariation(
          this.snapshot(),
          row.accountId,
          row.invoice.cardId,
          row.invoice.id,
          this.currency(),
          DEMO_EXCHANGE_RATE,
        )
      : null;
  });
  readonly payments = computed(() => {
    const row = this.row();
    return row?.invoice
      ? this.snapshot().facts.invoices.filter(
          (invoice) => invoice.cardId === row.invoice!.cardId && invoice.status === 'paid',
        ).length
      : (this.insight()?.paymentCount ?? 0);
  });
  signed(amount: Money) {
    return `${amount.minorUnits > 0 ? '+' : ''}${formatMoney(amount)}`;
  }
  constructor() {
    if (!this.catalogue.value()) void this.catalogue.load();
  }
}
