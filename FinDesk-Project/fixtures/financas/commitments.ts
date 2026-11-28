import { civilDate } from '../../domain/civil-date';
import { validateFacts } from '../../domain/finance';
import { money } from '../../domain/money';
import type { DemoSnapshot } from '../../shared/storage-api';

/** D181: ocorrências finitas; energia referencia o débito existente, sem novo caixa. */
export function withCommitments(snapshot: DemoSnapshot): DemoSnapshot {
  if (snapshot.formatVersion === 3 && snapshot.seedVersion === 5) return snapshot;
  if (
    snapshot.formatVersion !== 2 ||
    snapshot.seedVersion !== 4 ||
    snapshot.facts.commitments !== undefined
  )
    throw new Error('Versão fictícia incompatível com compromissos.');
  const rows: readonly [string, string, string, number, string | null][] = [
    ['commitment-previous-demo', 'Despesa avulsa', '2026-09-28', 7500, null],
    ['commitment-energy-demo', 'Energia', '2026-10-15', 12000, 'mov-energia'],
    ['commitment-rent-demo', 'Aluguel', '2026-11-05', 90000, null],
    ['commitment-one-off-demo', 'Despesa avulsa', '2026-11-08', 15000, null],
  ];
  const next: DemoSnapshot = {
    ...snapshot,
    formatVersion: 3,
    seedVersion: 5,
    facts: {
      ...snapshot.facts,
      commitments: rows.map(([id, name, dueOn, amount, payment]) => ({
        id,
        name,
        accountId: 'demo-a',
        dueOn: civilDate(dueOn),
        amount: money(amount, 'BRL'),
        paymentMovementId: payment,
        origin: { kind: 'file' as const, sourceId: 'demo-commitments', externalId: id },
      })),
    },
  };
  validateFacts(next.facts);
  return next;
}
