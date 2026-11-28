import { civilDate } from '../../domain/civil-date';
import { money } from '../../domain/money';
import { validateFacts } from '../../domain/finance';
import type { DemoSnapshot } from '../../shared/storage-api';

/** D184: recibos anteriores à abertura não reescrevem o saldo inicial ou movimentos. */
export function withCommitmentDetails(snapshot: DemoSnapshot): DemoSnapshot {
  if (snapshot.formatVersion === 4 && snapshot.seedVersion === 6) return snapshot;
  if (
    snapshot.formatVersion !== 3 ||
    snapshot.seedVersion !== 5 ||
    snapshot.facts.commitmentSeries !== undefined ||
    !snapshot.facts.commitments?.some(
      (row) => row.id === 'commitment-energy-demo' && row.paymentMovementId === 'mov-energia',
    )
  )
    throw new Error('Conflito na atualização fictícia dos detalhes.');
  const dates = [
    '2025-11-15',
    '2025-12-15',
    '2026-01-15',
    '2026-02-15',
    '2026-03-15',
    '2026-04-15',
    '2026-05-15',
    '2026-06-15',
    '2026-07-15',
  ];
  const next: DemoSnapshot = {
    ...snapshot,
    formatVersion: 4,
    seedVersion: 6,
    facts: {
      ...snapshot.facts,
      commitments: snapshot.facts.commitments.map((row) => ({
        ...row,
        seriesId: row.id === 'commitment-energy-demo' ? 'series-energy-demo' : null,
      })),
      commitmentSeries: [
        {
          id: 'series-energy-demo',
          accountId: 'demo-a',
          destination: 'Energia — demonstração',
          categoryId: 'casa',
          frequency: 'monthly',
          origin: {
            kind: 'file',
            sourceId: 'demo-commitment-history',
            externalId: 'series-energy-demo',
          },
          priorHistory: dates.map((on, index) => ({
            nature: 'observed' as const,
            id: `energy-prior-${index + 1}`,
            dueOn: civilDate(on),
            amount: money(index === 8 ? 11000 : 10000, 'BRL'),
            paidOn: civilDate(on),
            origin: {
              kind: 'file' as const,
              sourceId: 'demo-commitment-history',
              externalId: `energy-prior-${index + 1}`,
            },
          })),
        },
      ],
    },
  };
  validateFacts(next.facts);
  return next;
}
