import type { Money, ExchangeRate } from '../domain/money';
import { money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { cardInvoices, presentCardMoney, type InvoiceReading } from './card-invoices';

export interface InvoiceMerchantPart {
  readonly merchantId: string;
  readonly itemIds: readonly string[];
  readonly categoryIds: readonly (string | null)[];
  readonly original: Money;
  readonly value: Money | null;
  readonly share: string | null;
  readonly percent: number | null;
}

export interface InvoiceMerchants {
  readonly reading: InvoiceReading;
  readonly parts: readonly InvoiceMerchantPart[];
  readonly value: Money | null;
  readonly unavailable: 'no-items' | 'precision' | 'conversion' | null;
}

/** Compõe somente os itens desta fatura, sem fundir compras ou inferir identidade por nome. */
export function invoiceMerchants(
  snapshot: DemoSnapshot,
  accountId: string,
  cardId: string,
  invoiceId: string,
  currency: FinancePreferences['currencyMode'],
  rate: ExchangeRate | null,
): InvoiceMerchants | null {
  const reading = cardInvoices(snapshot, accountId, cardId).find(
    (row) => row.invoice.id === invoiceId,
  );
  if (!reading) return null;
  const total = reading.purchasesSubtotal;
  if (!total)
    return {
      reading,
      parts: [],
      value: null,
      unavailable: reading.itemCount ? 'precision' : 'no-items',
    };
  const purchases = new Map(snapshot.facts.purchases.map((purchase) => [purchase.id, purchase]));
  const groups = new Map<
    string,
    { amount: bigint; itemIds: string[]; categoryIds: Set<string | null> }
  >();
  for (const item of snapshot.facts.invoiceItems) {
    if (item.invoiceId !== invoiceId) continue;
    const purchase = purchases.get(item.purchaseId)!;
    const group = groups.get(purchase.merchantId) ?? {
      amount: 0n,
      itemIds: [],
      categoryIds: new Set<string | null>(),
    };
    group.amount += BigInt(item.amount.minorUnits);
    group.itemIds.push(item.id);
    group.categoryIds.add(purchase.categoryId);
    groups.set(purchase.merchantId, group);
  }
  const denominator = BigInt(total.minorUnits);
  const parts = [...groups]
    .sort(([a, left], [b, right]) =>
      left.amount === right.amount ? a.localeCompare(b) : left.amount > right.amount ? -1 : 1,
    )
    .map(([merchantId, group]): InvoiceMerchantPart => {
      // Cada grupo não negativo cabe no subtotal já validado como seguro.
      const original = money(Number(group.amount), total.currency);
      const tenths =
        denominator > 0n ? (group.amount * 1000n + denominator / 2n) / denominator : null;
      return {
        merchantId,
        itemIds: [...group.itemIds].sort(),
        categoryIds: [...group.categoryIds].sort((a, b) => (a ?? '').localeCompare(b ?? '')),
        original,
        value: presentCardMoney(original, currency, snapshot.asOf, rate),
        share: tenths === null ? null : `${tenths / 10n},${tenths % 10n}%`,
        percent: denominator > 0n ? Number((group.amount * 1000000n) / denominator) / 10000 : null,
      };
    });
  const value = presentCardMoney(total, currency, snapshot.asOf, rate);
  return {
    reading,
    parts,
    value,
    unavailable: !value || parts.some((part) => !part.value) ? 'conversion' : null,
  };
}
