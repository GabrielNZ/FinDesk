import { civilDate } from '../../domain/civil-date';
import { validateFacts } from '../../domain/finance';
import { money } from '../../domain/money';
import type { DemoSnapshot } from '../../shared/storage-api';

/** D177: acrescenta o crédito autorizado, sem reescrever compra, agenda ou caixa. */
export function withCardRefund(snapshot: DemoSnapshot): DemoSnapshot {
  if (snapshot.formatVersion === 2 && snapshot.seedVersion === 4) return snapshot;
  if (
    snapshot.formatVersion !== 1 ||
    snapshot.seedVersion !== 3 ||
    snapshot.asOf < '2026-10-28' ||
    snapshot.facts.cardRefunds !== undefined
  )
    throw new Error('Versão fictícia incompatível com a atualização de estornos.');
  const purchase = snapshot.facts.purchases.find((row) => row.id === 'compra-6x');
  const invoice = snapshot.facts.invoices.find((row) => row.id === 'fat-nov');
  if (
    !purchase ||
    !invoice ||
    purchase.cardId !== 'card-demo' ||
    invoice.cardId !== purchase.cardId ||
    purchase.total.currency !== 'BRL' ||
    purchase.total.minorUnits !== 120000
  )
    throw new Error('Conflito na atualização fictícia dos estornos.');
  const next: DemoSnapshot = {
    ...snapshot,
    formatVersion: 2,
    seedVersion: 4,
    facts: {
      ...snapshot.facts,
      cardRefunds: [
        {
          nature: 'observed',
          id: 'refund-loja-nov-demo',
          purchaseId: purchase.id,
          invoiceId: invoice.id,
          on: civilDate('2026-10-28'),
          amount: money(5000, 'BRL'),
          origin: {
            kind: 'file',
            sourceId: 'demo-statement',
            externalId: 'refund-loja-nov-demo',
          },
        },
      ],
    },
  };
  validateFacts(next.facts);
  return next;
}
