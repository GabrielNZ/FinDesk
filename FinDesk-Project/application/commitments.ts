import { civilDate, containsDate, type CivilDate, type DateRange } from '../domain/civil-date';
import { validateFacts } from '../domain/finance';
import type { CashMovement, CommitmentOccurrence, Invoice, Origin } from '../domain/finance-facts';
import { sumMoney, type Currency, type ExchangeRate, type Money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { ALL_ACCOUNTS } from './finance-context';
import { cardInvoices, presentCardMoney } from './card-invoices';

export type CommitmentFilter = 'all' | 'upcoming' | 'overdue' | 'paid';
export type CommitmentStatus = Exclude<CommitmentFilter, 'all'> | 'credit';
export interface CommitmentRow {
  readonly id: string;
  readonly name: string;
  readonly accountId: string;
  readonly dueOn: CivilDate;
  readonly amount: Money | null;
  readonly currency: Currency;
  readonly partial: boolean;
  readonly status: CommitmentStatus;
  readonly origin: Origin | null;
  readonly payment: CashMovement | null;
  readonly invoice: Invoice | null;
  readonly occurrence: CommitmentOccurrence | null;
}
export interface CommitmentTotals {
  readonly values: readonly Money[];
  readonly credits: readonly Money[];
  readonly missing: number;
  readonly partial: number;
  readonly unavailable: boolean;
}
export interface CommitmentQuery {
  readonly range: DateRange;
  readonly periodRows: readonly CommitmentRow[];
  readonly rows: readonly CommitmentRow[];
  readonly previous: readonly CommitmentRow[];
}

/** D181: vínculos explícitos; fatura é uma obrigação, sem repetir compras/assinaturas. */
export function commitments(
  snapshot: DemoSnapshot,
  accountId: string,
  range: DateRange | null,
  filter: CommitmentFilter = 'all',
  day: CivilDate | null = null,
): CommitmentQuery | null {
  validateFacts(snapshot.facts);
  civilDate(snapshot.asOf);
  if (!['all', 'upcoming', 'overdue', 'paid'].includes(filter))
    throw new RangeError('Filtro inválido.');
  if (day !== null) civilDate(day);
  if (
    !range ||
    !snapshot.facts.accounts.some((a) => accountId === ALL_ACCOUNTS || a.id === accountId)
  )
    return null;
  containsDate(range, snapshot.asOf);
  const status = (dueOn: CivilDate, amount: Money | null, paid: boolean): CommitmentStatus =>
    paid
      ? 'paid'
      : amount !== null && amount.minorUnits < 0
        ? 'credit'
        : dueOn < snapshot.asOf
          ? 'overdue'
          : 'upcoming';
  const rows: CommitmentRow[] = (snapshot.facts.commitments ?? [])
    .filter((row) => accountId === ALL_ACCOUNTS || row.accountId === accountId)
    .map((row) => {
      const payment = snapshot.facts.movements.find((m) => m.id === row.paymentMovementId) ?? null;
      return {
        id: `bill:${row.id}`,
        name: row.name,
        accountId: row.accountId,
        dueOn: row.dueOn,
        amount: row.amount,
        currency: snapshot.facts.accounts.find((a) => a.id === row.accountId)!.openingBalance
          .currency,
        partial: false,
        status: status(row.dueOn, row.amount, payment !== null),
        origin: row.origin,
        payment,
        invoice: null,
        occurrence: row,
      };
    });
  for (const card of snapshot.facts.cards) {
    if (accountId !== ALL_ACCOUNTS && card.accountId !== accountId) continue;
    for (const reading of cardInvoices(snapshot, accountId, card.id)) {
      const invoice = reading.invoice;
      const amount = invoice.confirmedTotal ?? reading.knownSubtotal;
      rows.push({
        id: `invoice:${invoice.id}`,
        name: `Fatura · final ${card.lastDigits}`,
        accountId: card.accountId,
        dueOn: invoice.dueOn,
        amount,
        currency: card.totalLimit.currency,
        partial: invoice.confirmedTotal === null,
        status: status(invoice.dueOn, amount, invoice.status === 'paid'),
        origin: null,
        payment: snapshot.facts.movements.find((m) => m.id === invoice.paidByMovementId) ?? null,
        invoice,
        occurrence: null,
      });
    }
  }
  rows.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id.localeCompare(b.id));
  const periodRows = rows.filter(
    (row) => containsDate(range, row.dueOn) && (filter === 'all' || row.status === filter),
  );
  return {
    range,
    periodRows,
    rows: periodRows.filter((row) => day === null || row.dueOn === day),
    previous: rows.filter((row) => row.status === 'overdue' && row.dueOn < range.start),
  };
}

/** Subtotal dos itens selecionados; pagos mantêm estado e créditos são separados. */
export function commitmentTotals(
  rows: readonly CommitmentRow[],
  mode: FinancePreferences['currencyMode'],
  asOf: CivilDate,
  rate: ExchangeRate | null,
): CommitmentTotals {
  const missing = rows.filter((row) => row.amount === null).length;
  const partial = rows.filter((row) => row.partial && row.amount !== null).length;
  const convert = (credit: boolean): Money[] => {
    const groups = new Map<Currency, Money[]>();
    for (const row of rows) {
      if (!row.amount || (row.status === 'credit') !== credit) continue;
      groups.set(row.currency, [...(groups.get(row.currency) ?? []), row.amount]);
    }
    const converted = [...groups].map(([currency, amounts]) => {
      const value = presentCardMoney(sumMoney(currency, amounts), mode, asOf, rate);
      if (!value) throw new RangeError('Conversão indisponível.');
      return value;
    });
    if (mode === 'original' || !converted.length) return converted;
    return [sumMoney(mode, converted)];
  };
  try {
    return { values: convert(false), credits: convert(true), missing, partial, unavailable: false };
  } catch {
    return { values: [], credits: [], missing, partial, unavailable: true };
  }
}

export function commitmentAmount(
  row: CommitmentRow,
  mode: FinancePreferences['currencyMode'],
  asOf: CivilDate,
  rate: ExchangeRate | null,
): Money | null {
  return presentCardMoney(row.amount, mode, asOf, rate);
}

export function commitmentStatus(row: CommitmentRow, asOf: CivilDate): string {
  return row.status === 'paid'
    ? 'Pago'
    : row.status === 'credit'
      ? 'Crédito na fatura'
      : row.status === 'overdue'
        ? 'Vencido — pagamento não identificado'
        : row.dueOn === asOf
          ? 'Vence hoje'
          : 'A vencer';
}
