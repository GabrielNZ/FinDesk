import type { Card, Invoice } from '../domain/finance-facts';
import { validateFacts } from '../domain/finance';
import { convertForDisplay, money, sumMoney, type ExchangeRate, type Money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { ALL_ACCOUNTS } from './finance-context';

export function walletCards(snapshot: DemoSnapshot, accountId: string): readonly Card[] {
  return snapshot.facts.cards.filter(
    (card) =>
      (accountId === ALL_ACCOUNTS || card.accountId === accountId) &&
      snapshot.facts.accounts.some((account) => account.id === card.accountId),
  );
}

export interface InvoiceReading {
  readonly invoice: Invoice;
  readonly knownSubtotal: Money | null;
  readonly itemCount: number;
  readonly categories: readonly InvoiceCategoryPart[];
}

export interface InvoiceCategoryPart {
  readonly categoryId: string | null;
  readonly amount: Money;
  readonly start: number;
  readonly end: number;
  readonly width: number;
  readonly share: string;
}

/** Não gera ciclos: cada entrada conserva o estado e as datas salvas da fonte. */
export function cardInvoices(
  snapshot: DemoSnapshot,
  accountId: string,
  cardId: string,
): readonly InvoiceReading[] {
  if (!walletCards(snapshot, accountId).some((card) => card.id === cardId)) return [];
  validateFacts(snapshot.facts);
  const card = snapshot.facts.cards.find((card) => card.id === cardId)!;
  const purchases = new Map(snapshot.facts.purchases.map((purchase) => [purchase.id, purchase]));
  return snapshot.facts.invoices
    .filter((invoice) => invoice.cardId === cardId)
    .sort(
      (a, b) =>
        a.dueOn.localeCompare(b.dueOn) ||
        a.closesOn.localeCompare(b.closesOn) ||
        a.id.localeCompare(b.id),
    )
    .map((invoice) => {
      const items = snapshot.facts.invoiceItems.filter((item) => item.invoiceId === invoice.id);
      let knownSubtotal: Money | null = null;
      if (items.length) {
        try {
          knownSubtotal = sumMoney(
            card.totalLimit.currency,
            items.map((item) => item.amount),
          );
        } catch {
          /* Precisão excedida: não oferecer subtotal parcial. */
        }
      }
      const categories: InvoiceCategoryPart[] = [];
      if (knownSubtotal && knownSubtotal.minorUnits > 0) {
        const totals = new Map<string | null, bigint>();
        for (const item of items) {
          const category = purchases.get(item.purchaseId)!.categoryId;
          totals.set(category, (totals.get(category) ?? 0n) + BigInt(item.amount.minorUnits));
        }
        const total = BigInt(knownSubtotal.minorUnits);
        let previous = 0n;
        const percentage = (value: bigint) => Number((value * 1000000n) / total) / 10000;
        for (const [categoryId, amount] of [...totals]
          .filter(([, amount]) => amount > 0n)
          .sort(([a, left], [b, right]) =>
            left === right ? (a ?? '').localeCompare(b ?? '') : left > right ? -1 : 1,
          )) {
          const start = percentage(previous);
          previous += amount;
          const end = percentage(previous);
          const tenths = (amount * 1000n + total / 2n) / total;
          categories.push({
            categoryId,
            amount: money(Number(amount), card.totalLimit.currency),
            start,
            end,
            width: end - start,
            share: `${tenths / 10n},${tenths % 10n}%`,
          });
        }
      }
      return { invoice, knownSubtotal, itemCount: items.length, categories };
    });
}

export function preferredInvoice(readings: readonly InvoiceReading[]): string | null {
  return (
    (
      readings.find((r) => r.invoice.status === 'closed') ??
      readings.find((r) => r.invoice.status === 'open') ??
      readings.find((r) => r.invoice.status === 'future') ??
      readings.at(-1)
    )?.invoice.id ?? null
  );
}

/** Conversão só para apresentação; os valores originais continuam no catálogo. */
export function presentCardMoney(
  value: Money | null,
  mode: FinancePreferences['currencyMode'],
  asOf: DemoSnapshot['asOf'],
  rate: ExchangeRate | null,
): Money | null {
  if (!value || mode === 'original' || value.currency === mode) return value;
  if (!rate || rate.on > asOf) return null;
  const usable =
    rate.from === value.currency && rate.to === mode
      ? rate
      : rate.to === value.currency && rate.from === mode
        ? {
            ...rate,
            from: rate.to,
            to: rate.from,
            numerator: rate.denominator,
            denominator: rate.numerator,
          }
        : null;
  if (!usable) return null;
  try {
    return convertForDisplay(value, usable).converted;
  } catch {
    return null;
  }
}
