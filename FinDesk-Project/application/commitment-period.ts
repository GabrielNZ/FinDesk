import {
  adjacentCivilDate,
  civilDate,
  dateRange,
  type CivilDate,
  type DateRange,
} from '../domain/civil-date';

export type CommitmentPeriodMode = 'finance' | 'next-30-days';

/** FIN-032: consulta local, sem alterar Finanças ou consultar o relógio do computador. */
export function commitmentPeriod(
  mode: CommitmentPeriodMode,
  financeRange: DateRange | null,
  asOf: CivilDate,
): DateRange | null {
  civilDate(asOf);
  if (mode === 'finance')
    return financeRange ? dateRange(financeRange.start, financeRange.end) : null;
  if (mode !== 'next-30-days') throw new RangeError('Período de compromissos inválido.');
  let end = asOf;
  for (let day = 0; day < 29; day++) {
    const next = adjacentCivilDate(end, 1);
    if (next === null) return null;
    end = next;
  }
  return dateRange(asOf, end);
}
