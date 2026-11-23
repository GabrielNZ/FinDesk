import { adjacentCivilDate, type CivilDate, type DateRange } from '../domain/civil-date';
import { money, type Currency, type Money } from '../domain/money';
import type { DemoSnapshot } from '../shared/storage-api';
import { ALL_ACCOUNTS } from './finance-context';
import { expenseStatementPreview, type ExpenseAnalysisQuery } from './expense-analysis';
import { assessExpenseCoverage, planExpensePeriods } from './expense-analysis-periods';
import { categoryLabel } from './statement';
import { expenseChartGeometry } from './expense-chart';

export interface ExpenseReportDay {
  readonly on: CivilDate;
  readonly value: Money;
  readonly accumulated: Money;
}
export interface ExpenseReportPeriod {
  readonly range: DateRange | null;
  readonly total: Money | null;
  readonly days: readonly ExpenseReportDay[];
  readonly unavailable: 'future' | 'history' | 'precision' | null;
}
export interface ExpenseCategoryBar {
  readonly category: string;
  readonly value: Money;
  readonly share: string | null;
  readonly width: number;
}
export interface ExpenseReportLane {
  readonly currency: Currency;
  readonly observed: ExpenseReportPeriod;
  readonly categories: readonly ExpenseCategoryBar[];
  readonly current: ExpenseReportPeriod;
  readonly previous: ExpenseReportPeriod;
}
export interface ExpenseReports {
  readonly shortened: boolean;
  readonly lanes: readonly ExpenseReportLane[];
}
function exact(value: bigint, currency: Currency): Money {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError('Precisão excedida.');
  return money(Number(value), currency);
}

/** Só leitura: despesas efetivas, valores exatos e cobertura por moeda antes de agregar. */
export function reportExpenses(
  snapshot: DemoSnapshot,
  query: ExpenseAnalysisQuery,
): ExpenseReports {
  const accounts = snapshot.facts.accounts.filter(
    (a) => query.accountId === ALL_ACCOUNTS || a.id === query.accountId,
  );
  const currencies: Currency[] =
    query.currencyMode === 'original'
      ? [...new Set(accounts.map((a) => a.openingBalance.currency))].sort()
      : [query.currencyMode];
  const plan = planExpensePeriods(query.range, snapshot.asOf, query.previous, 1);
  const lanes = currencies.map((currency): ExpenseReportLane => {
    const period = (range: DateRange | null): ExpenseReportPeriod => {
      const empty = { range, total: null, days: [] };
      if (!range)
        return { ...empty, unavailable: plan.unavailable === 'future' ? 'future' : 'history' };
      const relevant = accounts.filter(
        (a) => query.currencyMode !== 'original' || a.openingBalance.currency === currency,
      );
      if (
        !relevant.length ||
        relevant.some((a) => !assessExpenseCoverage(snapshot, a.id, range).covered)
      )
        return { ...empty, unavailable: 'history' };
      try {
        const preview = expenseStatementPreview(snapshot, query, {
          category: null,
          currency,
          range,
          label: '',
        });
        if (!preview.total) throw new RangeError('Valor indisponível.');
        const daily = new Map<CivilDate, bigint>();
        for (const row of preview.rows) {
          if (!row.amount || row.amount.minorUnits > 0) throw new RangeError('Despesa inválida.');
          daily.set(
            row.movement.on,
            (daily.get(row.movement.on) ?? 0n) - BigInt(row.amount.minorUnits),
          );
        }
        const days: ExpenseReportDay[] = [];
        let accumulated = 0n;
        for (
          let on: CivilDate | null = range.start;
          on && on <= range.end;
          on = adjacentCivilDate(on, 1)
        ) {
          const value = daily.get(on) ?? 0n;
          accumulated += value;
          days.push({
            on,
            value: exact(value, currency),
            accumulated: exact(accumulated, currency),
          });
          if (on === range.end) break;
        }
        return { range, total: preview.total, days, unavailable: null };
      } catch {
        return { ...empty, unavailable: 'precision' };
      }
    };
    let observed = period(plan.observed);
    const categories: ExpenseCategoryBar[] = [];
    if (observed.total && observed.range) {
      try {
        const preview = expenseStatementPreview(snapshot, query, {
          category: null,
          currency,
          range: observed.range,
          label: '',
        });
        const totals = new Map<string, bigint>();
        for (const row of preview.rows) {
          if (!row.amount || row.amount.minorUnits > 0) throw new RangeError('Valor indisponível.');
          const category = row.category!;
          totals.set(category, (totals.get(category) ?? 0n) - BigInt(row.amount.minorUnits));
        }
        const total = BigInt(observed.total.minorUnits);
        const largest = [...totals.values()].reduce((a, b) => (a > b ? a : b), 0n);
        for (const [category, amount] of totals) {
          const tenths = total ? (amount * 1000n + total / 2n) / total : null;
          categories.push({
            category,
            value: exact(amount, currency),
            share: tenths === null ? null : `${tenths / 10n},${tenths % 10n}%`,
            width: largest ? Number((amount * 10000n) / largest) / 100 : 0,
          });
        }
        categories.sort(
          (a, b) =>
            b.value.minorUnits - a.value.minorUnits ||
            categoryLabel(a.category, query.labels).localeCompare(
              categoryLabel(b.category, query.labels),
              'pt-BR',
            ) ||
            a.category.localeCompare(b.category),
        );
      } catch {
        observed = { ...observed, total: null, days: [], unavailable: 'precision' };
        categories.length = 0;
      }
    }
    return {
      currency,
      observed,
      categories,
      current: period(plan.comparison?.current ?? plan.observed),
      previous: period(plan.comparison?.references[0] ?? null),
    };
  });
  return { shortened: plan.comparison?.shortened ?? false, lanes };
}

/** Geometria compartilhada com os minigráficos; escala diária usa o pico, não o total mensal. */
export function expenseReportPlot(lane: ExpenseReportLane, accumulated: boolean) {
  const point = (period: ExpenseReportPeriod) => {
    const series = period.total
      ? period.days.map((day) => ({ on: day.on, value: accumulated ? day.accumulated : day.value }))
      : null;
    const peak = series?.reduce((max, day) => Math.max(max, day.value.minorUnits), 0) ?? null;
    return {
      range: period.range,
      series,
      value: peak === null ? null : money(peak, lane.currency),
      unavailable:
        period.unavailable === 'precision'
          ? ('precision' as const)
          : period.unavailable
            ? ('history' as const)
            : null,
    };
  };
  const geometry = expenseChartGeometry({
    current: point(lane.current),
    previous: point(lane.previous),
    shortened: false,
  });
  const count = geometry.xTicks.at(-1)?.day ?? 1;
  const expenseDays = new Set<number>();
  for (const period of [lane.current, lane.previous])
    period.days.forEach((day, index) => {
      if (day.value.minorUnits > 0) expenseDays.add(index + 1);
    });
  const xTicks = [...new Set([...geometry.xTicks.map((tick) => tick.day), ...expenseDays])]
    .sort((a, b) => a - b)
    .map((day) => ({
      day,
      position: geometry.dayPosition(day),
      hasExpense: expenseDays.has(day),
    }));
  const width = Math.min(5, 100 / Math.max(count - 1, 1));
  const bars = (period: ExpenseReportPeriod) =>
    period.days.map((day, index) => ({
      ...day,
      day: index + 1,
      x: geometry.dayPosition(index + 1) * 2.4,
      y: geometry.valuePosition(day.value) * 0.64,
      height: Math.max(0, 56 - geometry.valuePosition(day.value) * 0.64),
    }));
  return {
    ...geometry,
    count,
    xTicks,
    width,
    currentBars: bars(lane.current),
    previousBars: bars(lane.previous),
  };
}
