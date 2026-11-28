import { subtractMoney, type ExchangeRate, type Money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { cardInvoices, presentCardMoney, type InvoiceReading } from './card-invoices';

export interface InvoiceVariation {
  readonly reference: InvoiceReading | null;
  readonly partial: boolean;
  readonly original: Money | null;
  readonly value: Money | null;
  readonly percentage: string | null;
  readonly unavailable:
    'no-previous' | 'ambiguous' | 'no-items' | 'precision' | 'conversion' | null;
}

/** Diferença nominal por vencimento; valores conhecidos não projetam uma cobrança final. */
export function invoiceVariation(
  snapshot: DemoSnapshot,
  accountId: string,
  cardId: string,
  selectedId: string,
  currency: FinancePreferences['currencyMode'],
  rate: ExchangeRate | null,
): InvoiceVariation | null {
  const rows = cardInvoices(snapshot, accountId, cardId);
  const current = rows.find((row) => row.invoice.id === selectedId);
  if (!current) return null;
  const result: InvoiceVariation = {
    reference: null,
    partial: false,
    original: null,
    value: null,
    percentage: null,
    unavailable: null,
  };
  // Empates de vencimento não comprovam ordem, mesmo com fechamentos/IDs distintos.
  if (rows.some((row) => row !== current && row.invoice.dueOn === current.invoice.dueOn))
    return { ...result, unavailable: 'ambiguous' };
  const previousDate = rows.filter((row) => row.invoice.dueOn < current.invoice.dueOn).at(-1)
    ?.invoice.dueOn;
  if (!previousDate) return { ...result, unavailable: 'no-previous' };
  const candidates = rows.filter((row) => row.invoice.dueOn === previousDate);
  if (candidates.length !== 1) return { ...result, unavailable: 'ambiguous' };
  const reference = candidates[0]!;
  const left = current.invoice.confirmedTotal ?? current.knownSubtotal;
  const right = reference.invoice.confirmedTotal ?? reference.knownSubtotal;
  const base = {
    ...result,
    reference,
    partial: current.invoice.confirmedTotal === null || reference.invoice.confirmedTotal === null,
  };
  if (!left || !right)
    return {
      ...base,
      unavailable:
        (!left && current.itemCount + current.refundCount > 0) ||
        (!right && reference.itemCount + reference.refundCount > 0)
          ? 'precision'
          : 'no-items',
    };
  let original: Money;
  try {
    original = subtractMoney(left, right);
  } catch {
    return { ...base, unavailable: 'precision' };
  }
  const value = presentCardMoney(original, currency, snapshot.asOf, rate);
  // Uma casa decimal com arredondamento exato, afastando empates de zero.
  const denominator = BigInt(right.minorUnits);
  const numerator = BigInt(original.minorUnits) * 1000n;
  const magnitude = numerator < 0n ? -numerator : numerator;
  const tenths = denominator <= 0n ? null : (magnitude + denominator / 2n) / denominator;
  const percentage =
    tenths === null
      ? null
      : `${tenths === 0n ? '' : numerator < 0n ? '−' : '+'}${tenths / 10n},${tenths % 10n}%`;
  return { ...base, original, value, percentage, unavailable: value ? null : 'conversion' };
}
