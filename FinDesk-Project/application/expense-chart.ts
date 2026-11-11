import { expensePeriodDays } from './expense-analysis-periods';
import type { ExpenseChartPoint, ExpenseInsightChart } from './expense-analysis';
import { money, type Money } from '../domain/money';
import { adjacentCivilDate } from '../domain/civil-date';

/** O cursor usa dias equivalentes, mas cada linha conserva a sua data civil. */
export function expenseChartAtDay(chart: ExpenseInsightChart, day: number) {
  const count = Math.max(
    ...[chart.current, chart.previous].map((point) =>
      point.range ? expensePeriodDays(point.range) : 0,
    ),
    1,
  );
  const selected = Math.max(1, Math.min(count, Math.round(day)));
  const at = (point: ExpenseChartPoint) => {
    if (!point.range || selected > expensePeriodDays(point.range)) return null;
    let on = point.range.start;
    for (let index = 1; index < selected; index++) {
      const next = adjacentCivilDate(on, 1);
      if (!next) return null;
      on = next;
    }
    const value = point.series?.filter((entry) => entry.on <= on).at(-1)?.value ?? null;
    return { on, value, unavailable: point.unavailable };
  };
  return { day: selected, days: count, current: at(chart.current), previous: at(chart.previous) };
}

/** Somente geometria de apresentação; valores e cruzamentos continuam derivados dos fatos. */
export function expenseChartGeometry(chart: ExpenseInsightChart) {
  const max = Math.max(
    chart.current.value?.minorUnits ?? 0,
    chart.previous.value?.minorUnits ?? 0,
    1,
  );
  const unit = 10n ** BigInt(Math.max(0, String(max).length - 2));
  const rounded = ((BigInt(max) + unit - 1n) / unit) * unit;
  const scale = rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? rounded : BigInt(max);
  const currency = chart.current.value?.currency ?? chart.previous.value?.currency ?? 'BRL';
  const days = Math.max(
    ...[chart.current, chart.previous].map((p) => (p.range ? expensePeriodDays(p.range) : 0)),
    1,
  );
  const y = (value: Money) => 56 - Number((BigInt(value.minorUnits) * 5000n) / scale) / 100;
  const x = (day: number) => 4 + ((day - 1) / Math.max(days - 1, 1)) * 228;
  const path = (point: ExpenseChartPoint) => {
    if (!point.series || !point.range) return '';
    return (
      point.series
        .map(
          (p, index) =>
            `${index ? 'L' : 'M'}${x(expensePeriodDays({ start: point.range!.start, end: p.on })).toFixed(2)} ${y(p.value).toFixed(2)}`,
        )
        .join(' ') +
      (point.series.length === 1 ? ` L8 ${y(point.series[0]!.value).toFixed(2)}` : '')
    );
  };
  const current = path(chart.current),
    previous = path(chart.previous);
  const values = scale < 2n ? [scale, 0n] : [scale, scale / 2n, 0n];
  return {
    current,
    previous,
    area:
      current && chart.current.range
        ? current + ` L${x(expensePeriodDays(chart.current.range))} 56 L4 56Z`
        : '',
    yTicks: values.map((v) => ({
      value: money(Number(v), currency),
      position: (y(money(Number(v), currency)) / 64) * 100,
    })),
    xTicks: [...new Set([1, Math.ceil(days / 2), days])].map((day) => ({
      day,
      position: (x(day) / 240) * 100,
    })),
    dayPosition: (day: number) => (x(day) / 240) * 100,
    valuePosition: (value: Money) => (y(value) / 64) * 100,
  };
}
