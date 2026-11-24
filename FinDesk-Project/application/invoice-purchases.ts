import type { Card, Invoice, InvoiceItem, Purchase } from '../domain/finance-facts';
import type { CivilDate } from '../domain/civil-date';
import { sumMoney, type Money } from '../domain/money';
import type { DemoSnapshot } from '../shared/storage-api';
import { cardInvoices } from './card-invoices';

export interface ScheduledInstallment {
  readonly item: InvoiceItem;
  readonly invoice: Invoice;
  readonly current: boolean;
}
export interface InvoicePurchaseRow {
  readonly item: InvoiceItem;
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
  const rows = snapshot.facts.invoiceItems
    .filter((item) => item.invoiceId === invoiceId)
    .map((item): InvoicePurchaseRow => {
      const purchase = purchases.get(item.purchaseId)!;
      const schedule = [...schedules.get(purchase.id)!].sort(
        (a, b) => a.item.installmentNumber - b.item.installmentNumber,
      );
      const after = schedule.filter((entry) => entry.invoice.dueOn > reading.invoice.dueOn);
      const dates = schedule.map((entry) => entry.invoice.dueOn).sort();
      return {
        item,
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
        b.purchase.purchasedOn.localeCompare(a.purchase.purchasedOn) ||
        a.purchase.id.localeCompare(b.purchase.id) ||
        a.item.installmentNumber - b.item.installmentNumber,
    );
  return { card, invoice: reading.invoice, rows, knownTotal: reading.knownSubtotal };
}
