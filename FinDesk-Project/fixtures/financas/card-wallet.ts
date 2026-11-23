import { civilDate } from '../../domain/civil-date';
import { validateFacts } from '../../domain/finance';
import { money } from '../../domain/money';
import type { DemoSnapshot } from '../../shared/storage-api';

/** D150: somente fatos novos do segundo cartão; caixa e personalizações permanecem intactos. */
export function withSecondCard(snapshot: DemoSnapshot): DemoSnapshot {
  if (snapshot.seedVersion === 3) return snapshot;
  if (snapshot.seedVersion !== 2) throw new Error('Versão fictícia incompatível.');
  const facts = snapshot.facts;
  if (
    !facts.accounts.some((a) => a.id === 'demo-a' && a.openingBalance.currency === 'BRL') ||
    facts.cards.some((c) => c.id === 'card-demo-extra') ||
    facts.purchases.some((p) => p.id === 'compra-extra-demo') ||
    facts.invoices.some((i) => ['fat-extra-nov', 'fat-extra-dez'].includes(i.id)) ||
    facts.invoiceItems.some((i) => i.id === 'item-extra-nov')
  )
    throw new Error('Conflito na atualização fictícia da carteira.');
  const brl = (minor: number) => money(minor, 'BRL');
  const next: DemoSnapshot = {
    ...snapshot,
    seedVersion: 3,
    facts: {
      ...facts,
      cards: [
        ...facts.cards,
        {
          id: 'card-demo-extra',
          accountId: 'demo-a',
          lastDigits: '1111',
          totalLimit: brl(150000),
          usedLimit: brl(8990),
          availableLimit: brl(141010),
          limitSource: 'manual fictícia',
        },
      ],
      purchases: [
        ...facts.purchases,
        {
          id: 'compra-extra-demo',
          cardId: 'card-demo-extra',
          purchasedOn: civilDate('2026-10-24'),
          total: brl(8990),
          installmentCount: 1,
          scheduleCoverage: 'complete',
          categoryId: 'casa',
          merchantId: 'loja',
          subscriptionId: null,
          origin: { kind: 'manual', sourceId: 'demo-financas-v1', externalId: 'compra-extra-demo' },
        },
      ],
      invoices: [
        ...facts.invoices,
        {
          id: 'fat-extra-nov',
          cardId: 'card-demo-extra',
          closesOn: civilDate('2026-11-05'),
          dueOn: civilDate('2026-11-12'),
          status: 'open',
          confirmedTotal: null,
          paidByMovementId: null,
        },
        {
          id: 'fat-extra-dez',
          cardId: 'card-demo-extra',
          closesOn: civilDate('2026-12-05'),
          dueOn: civilDate('2026-12-12'),
          status: 'future',
          confirmedTotal: null,
          paidByMovementId: null,
        },
      ],
      invoiceItems: [
        ...facts.invoiceItems,
        {
          id: 'item-extra-nov',
          invoiceId: 'fat-extra-nov',
          purchaseId: 'compra-extra-demo',
          installmentNumber: 1,
          amount: brl(8990),
          nature: 'observed',
        },
      ],
    },
  };
  validateFacts(next.facts);
  return next;
}
