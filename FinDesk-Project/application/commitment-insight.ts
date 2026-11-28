import { validateFacts } from '../domain/finance';
import { subtractMoney, type Money } from '../domain/money';
import type { CommitmentSeries } from '../domain/finance-facts';
import type { CivilDate } from '../domain/civil-date';
import type { DemoSnapshot } from '../shared/storage-api';
import type { CommitmentRow } from './commitments';
export interface CommitmentInsight {
  readonly series: CommitmentSeries | null;
  readonly paymentCount: number;
  readonly previous: { readonly dueOn: CivilDate; readonly amount: Money | null } | null;
  readonly difference: Money | null;
  readonly percentage: string | null;
  readonly unavailable: 'no-series' | 'no-previous' | 'ambiguous' | 'no-value' | 'precision' | null;
}
/** D184: série explícita, registro anterior observado e contagem com evidência de pagamento. */
export function commitmentInsight(snapshot: DemoSnapshot, row: CommitmentRow): CommitmentInsight {
  validateFacts(snapshot.facts);
  const occurrence = snapshot.facts.commitments?.find((item) => item.id === row.occurrence?.id);
  const series =
    snapshot.facts.commitmentSeries?.find((item) => item.id === occurrence?.seriesId) ?? null;
  const base: CommitmentInsight = {
    series,
    paymentCount: row.payment && row.payment.on <= snapshot.asOf ? 1 : 0,
    previous: null,
    difference: null,
    percentage: null,
    unavailable: 'no-series',
  };
  if (!series) return base;
  const occurrences = (snapshot.facts.commitments ?? []).filter(
    (item) => item.seriesId === series.id,
  );
  const paymentCount =
    series.priorHistory.filter((item) => item.paidOn !== null && item.paidOn <= snapshot.asOf)
      .length +
    occurrences.filter((item) =>
      snapshot.facts.movements.some(
        (movement) => movement.id === item.paymentMovementId && movement.on <= snapshot.asOf,
      ),
    ).length;
  const records = [...series.priorHistory, ...occurrences];
  if (records.filter((item) => item.dueOn === row.dueOn).length > 1)
    return { ...base, paymentCount, unavailable: 'ambiguous' };
  const previousDate = records
    .filter((item) => item.dueOn < row.dueOn)
    .map((item) => item.dueOn)
    .sort()
    .at(-1);
  if (!previousDate) return { ...base, paymentCount, unavailable: 'no-previous' };
  const candidates = records.filter((item) => item.dueOn === previousDate);
  if (candidates.length !== 1) return { ...base, paymentCount, unavailable: 'ambiguous' };
  const previous = candidates[0]!;
  if (!row.amount || !previous.amount)
    return { ...base, paymentCount, previous, unavailable: 'no-value' };
  try {
    const difference = subtractMoney(row.amount, previous.amount);
    const denominator = BigInt(previous.amount.minorUnits),
      numerator = BigInt(difference.minorUnits) * 1000n;
    const magnitude = numerator < 0n ? -numerator : numerator;
    const tenths = denominator <= 0n ? null : (magnitude + denominator / 2n) / denominator;
    const percentage =
      tenths === null
        ? null
        : `${tenths === 0n ? '' : numerator < 0n ? '−' : '+'}${tenths / 10n},${tenths % 10n}%`;
    return { series, paymentCount, previous, difference, percentage, unavailable: null };
  } catch {
    return { ...base, paymentCount, previous, unavailable: 'precision' };
  }
}
