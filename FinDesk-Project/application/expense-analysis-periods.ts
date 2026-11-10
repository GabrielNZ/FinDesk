import {
  calendarMonth,
  civilDate,
  dateRange,
  type CivilDate,
  type DateRange,
} from '../domain/civil-date';
import type { DemoSnapshot } from '../shared/storage-api';
import { ALL_ACCOUNTS, moveCalendarMonth } from './finance-context';

const DAY_MS = 86_400_000;

function dayIndex(value: CivilDate): number {
  return new Date(`${civilDate(value)}T00:00:00.000Z`).getTime() / DAY_MS;
}

export function expensePeriodDays(range: DateRange): number {
  dateRange(range.start, range.end);
  return dayIndex(range.end) - dayIndex(range.start) + 1;
}

function prefix(range: DateRange, days: number): DateRange {
  const end = civilDate(
    new Date((dayIndex(range.start) + days - 1) * DAY_MS).toISOString().slice(0, 10),
  );
  return dateRange(range.start, end);
}

/** Meses civis anteriores, mais recente primeiro; não cria ciclos de salário/cartão. */
export function previousExpenseMonths(current: DateRange): readonly DateRange[] {
  const month = calendarMonth(current.start);
  if (current.start !== month.start || current.end !== month.end)
    throw new RangeError('A referência de calendário exige um mês completo.');
  return [1, 2, 3].flatMap((offset) => {
    const before = moveCalendarMonth(current.start, -offset);
    return before ? [calendarMonth(before)] : [];
  });
}

export interface ExpenseComparisonWindow {
  readonly current: DateRange;
  readonly references: readonly DateRange[];
  readonly partial: boolean;
  readonly shortened: boolean;
}

export interface ExpensePeriodPlan {
  readonly observed: DateRange | null;
  readonly comparison: ExpenseComparisonWindow | null;
  readonly unavailable: 'future' | 'missing-periods' | null;
}

/** D127/D128: intervalos explícitos; nenhum total ou histórico é inferido. */
export function planExpensePeriods(
  current: DateRange,
  asOf: CivilDate,
  previous: readonly DateRange[],
  referenceCount: 1 | 3,
): ExpensePeriodPlan {
  dateRange(current.start, current.end);
  civilDate(asOf);
  if (referenceCount !== 1 && referenceCount !== 3)
    throw new RangeError('Quantidade de referências inválida.');
  if (current.start > asOf) return { observed: null, comparison: null, unavailable: 'future' };
  const observed = dateRange(current.start, current.end < asOf ? current.end : asOf);
  const references = previous.slice(0, referenceCount);
  if (references.length !== referenceCount)
    return { observed, comparison: null, unavailable: 'missing-periods' };
  let following = current;
  for (const range of references) {
    dateRange(range.start, range.end);
    if (dayIndex(following.start) - dayIndex(range.end) !== 1)
      return { observed, comparison: null, unavailable: 'missing-periods' };
    following = range;
  }
  const partial = current.end >= asOf;
  const days = Math.min(expensePeriodDays(observed), ...references.map(expensePeriodDays));
  const compared = partial ? prefix(observed, days) : observed;
  return {
    observed,
    comparison: {
      current: compared,
      references: partial ? references.map((range) => prefix(range, days)) : references,
      partial,
      shortened: compared.end < observed.end,
    },
    unavailable: null,
  };
}

export interface ExpenseCoverage {
  readonly covered: boolean;
  readonly missingAccountIds: readonly string[];
}

/** Falta de cobertura não prova gasto zero, mesmo sem movimentos no intervalo. */
export function assessExpenseCoverage(
  snapshot: DemoSnapshot,
  accountId: string,
  range: DateRange,
): ExpenseCoverage {
  dateRange(range.start, range.end);
  const accounts = snapshot.facts.accounts.filter(
    (account) => accountId === ALL_ACCOUNTS || account.id === accountId,
  );
  if (!accounts.length) return { covered: false, missingAccountIds: [accountId] };
  const missingAccountIds = accounts
    .filter((account) => {
      if (range.start <= account.openingOn || range.end > snapshot.asOf) return true;
      const coverage = snapshot.facts.coverage.filter((item) => item.accountId === account.id);
      const sources = [...new Set(coverage.map((item) => item.sourceId))];
      if (!sources.length) return true;
      return sources.some((sourceId) => {
        const intervals = coverage
          .filter((item) => item.sourceId === sourceId && item.status === 'current')
          .map((item) => ({ start: dayIndex(item.range.start), end: dayIndex(item.range.end) }))
          .sort((a, b) => a.start - b.start);
        let next = dayIndex(range.start);
        const end = dayIndex(range.end);
        for (const interval of intervals) {
          if (interval.start > next) break;
          if (interval.end >= next) next = interval.end + 1;
          if (next > end) return false;
        }
        return true;
      });
    })
    .map((account) => account.id);
  return { covered: !missingAccountIds.length, missingAccountIds };
}
