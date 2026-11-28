import type { Card, CardRefund, Invoice, InvoiceItem, Purchase } from '../domain/finance-facts';
import type { CivilDate } from '../domain/civil-date';
import { money, sumMoney, type Money } from '../domain/money';
import type { DemoSnapshot } from '../shared/storage-api';
import { cardInvoices } from './card-invoices';

export interface ScheduledInstallment {
  readonly item: InvoiceItem;
  readonly invoice: Invoice;
  readonly current: boolean;
}
export interface InvoicePurchaseRow {
  readonly id: string;
  readonly item: InvoiceItem | null;
  readonly refund: CardRefund | null;
  readonly amount: Money;
  readonly on: CivilDate;
  readonly purchase: Purchase;
  readonly schedule: readonly ScheduledInstallment[];
  readonly knownScheduleTotal: Money;
  readonly missingInstallments: number;
  readonly complete: boolean;
  readonly afterCount: number;
  readonly afterKnownTotal: Money;
  readonly lastKnownDueOn: CivilDate | null;
}
export interface InvoicePurchases {
  readonly card: Card;
  readonly invoice: Invoice;
  readonly rows: readonly InvoicePurchaseRow[];
  readonly knownTotal: Money | null;
}

/** Consulta dos vínculos salvos: não gera parcelas, reclassifica compras ou altera caixa. */
export function invoicePurchases(
  snapshot: DemoSnapshot,
  accountId: string,
  cardId: string,
  invoiceId: string,
): InvoicePurchases | null {
  // Reutiliza as fronteiras de conta/cartão, validação e precisão do subtotal da F08a.
  const reading = cardInvoices(snapshot, accountId, cardId).find(
    (row) => row.invoice.id === invoiceId,
  );
  if (!reading) return null;
  const card = snapshot.facts.cards.find((entry) => entry.id === cardId)!;
  const purchases = new Map(snapshot.facts.purchases.map((purchase) => [purchase.id, purchase]));
  const invoices = new Map(snapshot.facts.invoices.map((invoice) => [invoice.id, invoice]));
  const schedules = new Map<string, ScheduledInstallment[]>();
  for (const item of snapshot.facts.invoiceItems) {
    const purchase = purchases.get(item.purchaseId)!;
    if (purchase.cardId !== cardId) continue;
    const schedule = schedules.get(item.purchaseId) ?? [];
    schedule.push({
      item,
      invoice: invoices.get(item.invoiceId)!,
      current: item.invoiceId === invoiceId,
    });
    schedules.set(item.purchaseId, schedule);
  }
  const entries = [
    ...snapshot.facts.invoiceItems
      .filter((item) => item.invoiceId === invoiceId)
      .map((item) => ({
        item,
        refund: null,
        id: `item-${item.id}`,
        purchaseId: item.purchaseId,
        amount: item.amount,
        on: purchases.get(item.purchaseId)!.purchasedOn,
      })),
    ...(snapshot.facts.cardRefunds ?? [])
      .filter((refund) => refund.invoiceId === invoiceId)
      .map((refund) => ({
        item: null,
        refund,
        id: `refund-${refund.id}`,
        purchaseId: refund.purchaseId,
        amount: money(-refund.amount.minorUnits, refund.amount.currency),
        on: refund.on,
      })),
  ];
  const rows = entries
    .map((entry): InvoicePurchaseRow => {
      const purchase = purchases.get(entry.purchaseId)!;
      const schedule = [...(schedules.get(purchase.id) ?? [])].sort(
        (a, b) => a.item.installmentNumber - b.item.installmentNumber,
      );
      const after = schedule.filter((entry) => entry.invoice.dueOn > reading.invoice.dueOn);
      const dates = schedule.map((entry) => entry.invoice.dueOn).sort();
      return {
        id: entry.id,
        item: entry.item,
        refund: entry.refund,
        amount: entry.amount,
        on: entry.on,
        purchase,
        schedule,
        knownScheduleTotal: sumMoney(
          purchase.total.currency,
          schedule.map((entry) => entry.item.amount),
        ),
        missingInstallments: purchase.installmentCount - schedule.length,
        complete: purchase.scheduleCoverage === 'complete',
        afterCount: after.length,
        afterKnownTotal: sumMoney(
          purchase.total.currency,
          after.map((entry) => entry.item.amount),
        ),
        lastKnownDueOn: dates.at(-1) ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.on.localeCompare(a.on) ||
        a.purchase.id.localeCompare(b.purchase.id) ||
        a.id.localeCompare(b.id),
    );
  return { card, invoice: reading.invoice, rows, knownTotal: reading.knownSubtotal };
}
