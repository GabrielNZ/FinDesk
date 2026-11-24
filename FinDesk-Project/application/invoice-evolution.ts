import { money, type ExchangeRate, type Money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { cardInvoices, presentCardMoney, walletCards, type InvoiceReading } from './card-invoices';

export interface InvoiceEvolutionColumn {
  readonly kind: 'invoice';
  readonly key: string;
  readonly month: string;
  readonly reading: InvoiceReading;
  readonly original: Money | null;
  readonly value: Money | null;
  readonly basis: 'confirmed' | 'known' | null;
  readonly unavailable: 'no-items' | 'precision' | 'conversion' | null;
  readonly height: number;
}
export interface InvoiceEvolutionGap {
  readonly kind: 'gap';
  readonly key: string;
  readonly month: string;
  readonly endMonth: string;
  readonly count: number;
}
export interface InvoiceEvolution {
  readonly columns: readonly (InvoiceEvolutionColumn | InvoiceEvolutionGap)[];
  readonly invoices: readonly InvoiceEvolutionColumn[];
  readonly ticks: readonly Money[];
}
const monthIndex = (month: string) =>
  Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
const monthLabel = (index: number) =>
  `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;

/** Uma coluna por vínculo salvo. Lacunas indicam ausência, sem criar faturas ou somar meses. */
export function invoiceEvolution(
  snapshot: DemoSnapshot,
  accountId: string,
  cardId: string,
  currency: FinancePreferences['currencyMode'],
  rate: ExchangeRate | null,
): InvoiceEvolution | null {
  const card = walletCards(snapshot, accountId).find((entry) => entry.id === cardId);
  if (!card) return null;
  const rows = cardInvoices(snapshot, accountId, cardId).map((reading) => {
    const original = reading.invoice.confirmedTotal ?? reading.knownSubtotal;
    const value = presentCardMoney(original, currency, snapshot.asOf, rate);
    return {
      kind: 'invoice' as const,
      key: reading.invoice.id,
      month: reading.invoice.dueOn.slice(0, 7),
      reading,
      original,
      value,
      basis:
        reading.invoice.confirmedTotal !== null
          ? ('confirmed' as const)
          : original
            ? ('known' as const)
            : null,
      unavailable: !original
        ? reading.itemCount
          ? ('precision' as const)
          : ('no-items' as const)
        : !value
          ? ('conversion' as const)
          : null,
    };
  });
  const largest = rows.reduce(
    (max, row) => (row.value ? Math.max(max, row.value.minorUnits) : max),
    0,
  );
  const maximum = BigInt(Math.max(largest, 100));
  const magnitude = 10n ** BigInt(maximum.toString().length - 1);
  const step = [1n, 2n, 3n, 4n, 5n, 6n, 8n, 10n].find((value) => value * magnitude >= maximum)!;
  const nice = step * magnitude;
  const upper = nice > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : nice;
  const unit = currency === 'original' ? card.totalLimit.currency : currency;
  const invoices: InvoiceEvolutionColumn[] = rows.map((row) => ({
    ...row,
    height: row.value ? Number((BigInt(row.value.minorUnits) * 10000n) / upper) / 100 : 0,
  }));
  const columns: (InvoiceEvolutionColumn | InvoiceEvolutionGap)[] = [];
  let previous: number | null = null;
  for (const row of invoices) {
    const index = monthIndex(row.month);
    if (previous !== null && index - previous > 1) {
      const month = monthLabel(previous + 1),
        endMonth = monthLabel(index - 1);
      columns.push({
        kind: 'gap',
        key: `gap-${month}-${endMonth}`,
        month,
        endMonth,
        count: index - previous - 1,
      });
    }
    columns.push(row);
    previous = index;
  }
  return {
    columns,
    invoices,
    ticks: [3n, 2n, 1n, 0n].map((step) => money(Number((upper * step) / 3n), unit)),
  };
}
