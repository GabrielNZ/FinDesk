import type { FinanceFacts } from './finance-facts';
import { validateFacts } from './finance';
import { money, type Money } from './money';

export interface InvoiceAmounts {
  readonly purchases: Money;
  readonly refunds: Money;
  readonly net: Money;
  readonly itemCount: number;
  readonly refundCount: number;
}

function exact(value: bigint, currency: Money['currency']): Money {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
    throw new RangeError('Operação excede a precisão monetária.');
  return money(Number(value), currency);
}

/** D176: nenhum fato é reescrito; crédito afeta somente a fatura vinculada. */
export function invoiceRegisteredAmounts(facts: FinanceFacts, invoiceId: string): InvoiceAmounts {
  validateFacts(facts);
  const invoice = facts.invoices.find((row) => row.id === invoiceId);
  if (!invoice) throw new RangeError('Fatura inexistente.');
  const currency = facts.cards.find((row) => row.id === invoice.cardId)!.totalLimit.currency;
  const items = facts.invoiceItems.filter((row) => row.invoiceId === invoiceId);
  const refunds = (facts.cardRefunds ?? []).filter((row) => row.invoiceId === invoiceId);
  const gross = items.reduce((total, row) => total + BigInt(row.amount.minorUnits), 0n);
  const credits = refunds.reduce((total, row) => total + BigInt(row.amount.minorUnits), 0n);
  return {
    purchases: exact(gross, currency),
    refunds: exact(credits, currency),
    net: exact(gross - credits, currency),
    itemCount: items.length,
    refundCount: refunds.length,
  };
}
