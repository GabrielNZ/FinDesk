import type { InvoiceItem, Purchase } from '../domain/finance-facts';
import { sumMoney, type ExchangeRate, type Money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { cardInvoices, presentCardMoney, type InvoiceReading } from './card-invoices';

export type FutureItemKind = 'installment' | 'recurring' | 'other';
export interface FutureItem {
  readonly item: InvoiceItem;
  readonly purchase: Purchase;
  readonly kind: FutureItemKind;
  readonly value: Money | null;
}
export interface FutureInvoice {
  readonly reading: InvoiceReading;
  readonly original: Money | null;
  readonly value: Money | null;
  readonly items: readonly FutureItem[];
  readonly percent: number;
  readonly unavailable: 'no-items' | 'precision' | 'conversion' | null;
}
export interface CardFuture {
  readonly reference: InvoiceReading;
  readonly invoices: readonly FutureInvoice[];
  readonly original: Money | null;
  readonly value: Money | null;
  readonly missingInvoices: number;
  readonly incompletePurchases: number;
  readonly unavailable: 'no-items' | 'precision' | 'conversion' | null;
}

/** Recorte posterior por vencimento: itens registrados, sem gerar cobrança/recorrência. */
export function cardFuture(
  snapshot: DemoSnapshot,
  accountId: string,
  cardId: string,
  invoiceId: string,
  currency: FinancePreferences['currencyMode'],
  rate: ExchangeRate | null,
): CardFuture | null {
  const readings = cardInvoices(snapshot, accountId, cardId);
  const reference = readings.find((row) => row.invoice.id === invoiceId);
  if (!reference) return null;
  const card = snapshot.facts.cards.find((row) => row.id === cardId)!;
  const purchases = new Map(snapshot.facts.purchases.map((row) => [row.id, row]));
  const subsequent = readings.filter((row) => row.invoice.dueOn > reference.invoice.dueOn);
  const largest = subsequent.reduce(
    (max, row) => Math.max(max, row.knownSubtotal?.minorUnits ?? 0),
    0,
  );
  const present = (amount: Money | null) => presentCardMoney(amount, currency, snapshot.asOf, rate);
  const invoices = subsequent.map((reading): FutureInvoice => {
    const original = reading.knownSubtotal;
    const value = present(original);
    const items = snapshot.facts.invoiceItems
      .filter((item) => item.invoiceId === reading.invoice.id)
      .map((item): FutureItem => {
        const purchase = purchases.get(item.purchaseId)!;
        return {
          item,
          purchase,
          kind:
            purchase.installmentCount > 1
              ? 'installment'
              : purchase.subscriptionId !== null
                ? 'recurring'
                : 'other',
          value: present(item.amount),
        };
      })
      .sort(
        (a, b) =>
          b.purchase.purchasedOn.localeCompare(a.purchase.purchasedOn) ||
          a.item.id.localeCompare(b.item.id),
      );
    return {
      reading,
      original,
      value,
      items,
      percent:
        original && largest > 0
          ? Number((BigInt(original.minorUnits) * 1000000n) / BigInt(largest)) / 10000
          : 0,
      unavailable:
        original === null
          ? reading.itemCount
            ? 'precision'
            : 'no-items'
          : !value
            ? 'conversion'
            : null,
    };
  });
  let original: Money | null = null;
  const known = invoices.flatMap((row) => (row.original ? [row.original] : []));
  const unsafe = invoices.some((row) => row.unavailable === 'precision');
  if (known.length && !unsafe) {
    try {
      original = sumMoney(card.totalLimit.currency, known);
    } catch {
      /* Sem subtotal parcial enganoso. */
    }
  }
  const value = present(original);
  return {
    reference,
    invoices,
    original,
    value,
    missingInvoices: invoices.filter((row) => row.reading.itemCount === 0).length,
    incompletePurchases: snapshot.facts.purchases.filter(
      (purchase) => purchase.cardId === cardId && purchase.scheduleCoverage === 'partial',
    ).length,
    unavailable:
      original === null
        ? unsafe || known.length
          ? 'precision'
          : 'no-items'
        : !value
          ? 'conversion'
          : null,
  };
}
