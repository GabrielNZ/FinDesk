import { adjacentCivilDate, type CivilDate, type DateRange } from '../domain/civil-date';
import { money, type Currency, type ExchangeRate, type Money } from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { ALL_ACCOUNTS } from './finance-context';
import {
  assessExpenseCoverage,
  planExpensePeriods,
  type ExpenseComparisonWindow,
} from './expense-analysis-periods';
import {
  categoryLabel,
  filterStatement,
  statementAmount,
  statementRows,
  type StatementFilters,
  type StatementRow,
} from './statement';

export const EXPENSE_INSIGHTS = [
  ['largest', 'Maior gasto'],
  ['increase', 'Maior aumento'],
  ['decrease', 'Maior redução'],
  ['usual', 'Desvio do habitual'],
] as const;
export type ExpenseInsightId = (typeof EXPENSE_INSIGHTS)[number][0];
export interface ExpenseChartPoint {
  readonly series: readonly { readonly on: CivilDate; readonly value: Money }[] | null;
  readonly range: DateRange | null;
  readonly value: Money | null;
  readonly unavailable: 'history' | 'precision' | null;
}
export interface ExpenseInsightChart {
  readonly current: ExpenseChartPoint;
  readonly previous: ExpenseChartPoint;
  readonly shortened: boolean;
}
export interface ExpenseInsightValue {
  readonly chart: ExpenseInsightChart | null;
  readonly currency: Currency;
  readonly status:
    'known' | 'future' | 'history' | 'coverage' | 'precision' | 'empty' | 'rounded-zero';
  readonly category: string | null;
  readonly current: Money | null;
  readonly reference: Money | null;
  readonly difference: Money | null;
  readonly percent: string | null;
  readonly ties: number;
  readonly missingAccounts: readonly string[];
}
export interface ExpenseInsight {
  readonly id: ExpenseInsightId;
  readonly label: string;
  readonly window: ExpenseComparisonWindow | null;
  readonly values: readonly ExpenseInsightValue[];
}
export interface ExpenseAnalysisQuery {
  readonly accountId: string;
  readonly range: DateRange;
  readonly previous: readonly DateRange[];
  readonly filters: StatementFilters;
  readonly currencyMode: FinancePreferences['currencyMode'];
  readonly rate: ExchangeRate | null;
  readonly labels: Readonly<Record<string, string>>;
}
export interface ExpenseStatementRequest {
  readonly category: string;
  readonly currency: Currency;
  readonly range: DateRange;
  readonly label: string;
}
export interface ExpenseStatementPreview {
  readonly request: ExpenseStatementRequest;
  readonly categoryLabel: string;
  readonly rows: readonly (StatementRow & { readonly amount: Money | null })[];
  readonly total: Money | null;
  readonly converted: boolean;
}
/** Consulta isolada do modal: não altera filtros, Seleção, fatos ou regras. */
export function expenseStatementPreview(
  snapshot: DemoSnapshot,
  query: ExpenseAnalysisQuery,
  request: ExpenseStatementRequest,
): ExpenseStatementPreview {
  const seen = new Set<string>();
  const rows = filterStatement(
    statementRows(snapshot, query.accountId, request.range),
    query.filters,
    query.labels,
  )
    .filter((row) => {
      if (
        row.movement.kind !== 'expense' ||
        row.category !== request.category ||
        seen.has(row.movement.id) ||
        (query.currencyMode === 'original' && row.movement.delta.currency !== request.currency)
      )
        return false;
      seen.add(row.movement.id);
      return true;
    })
    .map((row) => ({
      ...row,
      amount: statementAmount(row.movement.delta, query.currencyMode, query.rate, snapshot.asOf),
    }));
  let total: Money | null = null;
  try {
    total = exact(
      rows.reduce((sum, row) => {
        if (
          !row.amount ||
          row.amount.currency !== request.currency ||
          !Number.isSafeInteger(row.amount.minorUnits)
        )
          throw new RangeError('Valor indisponível.');
        return sum - BigInt(row.amount.minorUnits);
      }, 0n),
      request.currency,
    );
  } catch {
    /* Não apresentar subtotal parcial. */
  }
  return {
    request,
    categoryLabel: categoryLabel(request.category, query.labels),
    rows,
    total,
    converted: rows.some(
      (row) => row.amount && row.amount.currency !== row.movement.delta.currency,
    ),
  };
}
function exact(value: bigint, currency: Currency): Money {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
    throw new RangeError('Precisão excedida.');
  return money(Number(value), currency);
}
function percentage(difference: Money, reference: Money): string | null {
  if (!reference.minorUnits) return null;
  const magnitude = BigInt(Math.abs(difference.minorUnits)) * 1000n;
  const denominator = BigInt(reference.minorUnits);
  const tenths =
    magnitude / denominator + ((magnitude % denominator) * 2n >= denominator ? 1n : 0n);
  const sign = difference.minorUnits < 0 ? '−' : difference.minorUnits > 0 ? '+' : '';
  return `${sign}${tenths / 10n},${tenths % 10n}%`;
}
/** Snapshot já classificado; só consulta fatos ativos e nunca grava ou reaplica regras. */
export function analyzeExpenses(
  snapshot: DemoSnapshot,
  query: ExpenseAnalysisQuery,
): readonly ExpenseInsight[] {
  const accounts = snapshot.facts.accounts.filter(
    (a) => query.accountId === ALL_ACCOUNTS || a.id === query.accountId,
  );
  const currencies: Currency[] =
    query.currencyMode === 'original'
      ? [...new Set(accounts.map((a) => a.openingBalance.currency))].sort()
      : [query.currencyMode];
  const sum = (range: DateRange, currency: Currency): Map<string, bigint> => {
    const result = new Map<string, bigint>(),
      seen = new Set<string>();
    for (const row of filterStatement(
      statementRows(snapshot, query.accountId, range),
      query.filters,
      query.labels,
    )) {
      const m = row.movement;
      if (m.kind !== 'expense' || seen.has(m.id)) continue;
      seen.add(m.id);
      if (query.currencyMode === 'original' && m.delta.currency !== currency) continue;
      const amount = statementAmount(m.delta, query.currencyMode, query.rate, snapshot.asOf);
      if (
        !amount ||
        amount.currency !== currency ||
        !Number.isSafeInteger(amount.minorUnits) ||
        amount.minorUnits > 0
      )
        throw new RangeError('Valor indisponível.');
      result.set(row.category!, (result.get(row.category!) ?? 0n) - BigInt(amount.minorUnits));
    }
    for (const total of result.values()) exact(total, currency);
    return result;
  };
  const chartPlan = planExpensePeriods(query.range, snapshot.asOf, query.previous, 1);
  const chart = (category: string, currency: Currency): ExpenseInsightChart => {
    const point = (range: DateRange | null): ExpenseChartPoint => {
      const relevant = accounts.filter(
        (a) => query.currencyMode !== 'original' || a.openingBalance.currency === currency,
      );
      if (
        !range ||
        !relevant.length ||
        relevant.some((a) => !assessExpenseCoverage(snapshot, a.id, range).covered)
      )
        return { range, value: null, unavailable: 'history', series: null };
      try {
        const preview = expenseStatementPreview(snapshot, query, {
          category,
          currency,
          range,
          label: '',
        });
        if (!preview.total) throw new RangeError('Valor indisponível.');
        const days = new Map<CivilDate, bigint>();
        for (const row of preview.rows) {
          if (!row.amount || row.amount.minorUnits > 0) throw new RangeError('Despesa inválida.');
          days.set(
            row.movement.on,
            (days.get(row.movement.on) ?? 0n) - BigInt(row.amount.minorUnits),
          );
        }
        let accumulated = 0n;
        const series = [{ on: range.start, value: money(0, currency) }];
        for (const [on, daily] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
          const before = adjacentCivilDate(on, -1);
          if (before && before >= range.start && series.at(-1)!.on < before)
            series.push({ on: before, value: exact(accumulated, currency) });
          accumulated += daily;
          const current = { on, value: exact(accumulated, currency) };
          if (series.at(-1)!.on === on) series[series.length - 1] = current;
          else series.push(current);
        }
        if (series.at(-1)?.on !== range.end) series.push({ on: range.end, value: preview.total });
        return { range, value: preview.total, unavailable: null, series };
      } catch {
        return { range, value: null, unavailable: 'precision', series: null };
      }
    };
    return {
      current: point(chartPlan.comparison?.current ?? chartPlan.observed),
      previous: point(chartPlan.comparison?.references[0] ?? null),
      shortened: chartPlan.comparison?.shortened ?? false,
    };
  };
  return EXPENSE_INSIGHTS.map(([id, label]) => {
    const plan = planExpensePeriods(
      query.range,
      snapshot.asOf,
      query.previous,
      id === 'usual' ? 3 : 1,
    );
    const window: ExpenseComparisonWindow | null =
      id === 'largest' && plan.observed
        ? {
            current: plan.observed,
            references: [],
            partial: query.range.end >= snapshot.asOf,
            shortened: false,
          }
        : plan.comparison;
    const values = currencies.map((currency): ExpenseInsightValue => {
      const empty: ExpenseInsightValue = {
        chart: null,
        currency,
        status: 'empty',
        category: null,
        current: null,
        reference: null,
        difference: null,
        percent: null,
        ties: 0,
        missingAccounts: [],
      };
      if (!window)
        return { ...empty, status: plan.unavailable === 'future' ? 'future' : 'history' };
      const missingAccounts = accounts
        .filter(
          (a) =>
            (query.currencyMode !== 'original' || a.openingBalance.currency === currency) &&
            [window.current, ...window.references].some(
              (range) => !assessExpenseCoverage(snapshot, a.id, range).covered,
            ),
        )
        .map((a) => a.id);
      if (!accounts.length || missingAccounts.length)
        return { ...empty, status: id === 'largest' ? 'coverage' : 'history', missingAccounts };
      try {
        const current = sum(window.current, currency),
          references = window.references.map((range) => sum(range, currency));
        const categories = new Set([
          ...current.keys(),
          ...references.flatMap((values) => [...values.keys()]),
        ]);
        const candidates = [...categories]
          .map((category) => {
            const total = references.reduce(
              (sum, values) => sum + (values.get(category) ?? 0n),
              0n,
            );
            const count = BigInt(references.length || 1);
            const reference = exact(
              total / count + ((total % count) * 2n >= count ? 1n : 0n),
              currency,
            );
            const value = exact(current.get(category) ?? 0n, currency);
            const difference = exact(
              BigInt(value.minorUnits) - BigInt(reference.minorUnits),
              currency,
            );
            const metric =
              id === 'largest'
                ? value.minorUnits
                : id === 'decrease'
                  ? -difference.minorUnits
                  : id === 'usual'
                    ? Math.abs(difference.minorUnits)
                    : difference.minorUnits;
            return { category, value, reference, difference, metric };
          })
          .filter((candidate) => candidate.metric > 0)
          .sort(
            (a, b) =>
              b.metric - a.metric ||
              categoryLabel(a.category, query.labels).localeCompare(
                categoryLabel(b.category, query.labels),
                'pt-BR',
              ) ||
              a.category.localeCompare(b.category),
          );
        const winner = candidates[0];
        if (!winner)
          return id === 'largest' && current.size ? { ...empty, status: 'rounded-zero' } : empty;
        return {
          ...empty,
          status: 'known',
          category: winner.category,
          chart: chart(winner.category, currency),
          current: winner.value,
          reference: id === 'largest' ? null : winner.reference,
          difference: id === 'largest' ? null : winner.difference,
          percent: id === 'largest' ? null : percentage(winner.difference, winner.reference),
          ties: candidates.filter((c) => c.metric === winner.metric).length,
        };
      } catch {
        return { ...empty, status: 'precision' };
      }
    });
    return { id, label, window, values };
  });
}
