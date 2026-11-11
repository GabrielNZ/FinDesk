import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { FinanceCardId } from '../../../../../shared/card-layout';
import type { DateRange } from '../../../../../domain/civil-date';
import type {
  ExpenseInsight,
  ExpenseInsightValue,
  ExpenseChartPoint,
  ExpenseStatementRequest,
} from '../../../../../application/expense-analysis';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import { expensePeriodDays } from '../../../../../application/expense-analysis-periods';
import { categoryLabel } from '../../../../../application/statement';
import { expenseChartAtDay, expenseChartGeometry } from '../../../../../application/expense-chart';
import type { Category } from '../../../../../shared/categories';
import { CardBoard } from '../cards/card-board';
import { CARD_LAYOUT_AREA, CardLayoutState } from '../cards/card-layout.service';

@Component({
  selector: 'fd-expense-analyses',
  imports: [CardBoard],
  providers: [CardLayoutState, { provide: CARD_LAYOUT_AREA, useValue: 'finance-analysis' }],
  templateUrl: './expense-analyses.html',
  styleUrl: './expense-analyses.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseAnalyses {
  readonly insights = input<readonly ExpenseInsight[]>([]);
  readonly labels = input<Readonly<Record<string, string>>>({});
  readonly categories = input<readonly Category[]>([]);
  readonly statementRequested = output<ExpenseStatementRequest>();
  readonly money = formatMoney;
  readonly days = expensePeriodDays;
  readonly geometry = expenseChartGeometry;
  readonly hover = signal<{ key: string; day: number } | null>(null);
  private chartKey(insight: ExpenseInsight, value: ExpenseInsightValue): string {
    return `${insight.id}:${value.currency}`;
  }
  hoverDay(insight: ExpenseInsight, value: ExpenseInsightValue): number | null {
    const active = this.hover();
    return active?.key === this.chartKey(insight, value) ? active.day : null;
  }
  chartAtDay = expenseChartAtDay;
  moveChart(event: PointerEvent, insight: ExpenseInsight, value: ExpenseInsightValue): void {
    if (!value.chart) return;
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if (!rect.width) return;
    const days = expenseChartAtDay(value.chart, 1).days;
    const x = ((event.clientX - rect.left) / rect.width) * 240;
    const day = 1 + ((Math.max(4, Math.min(232, x)) - 4) / 228) * (days - 1);
    this.hover.set({ key: this.chartKey(insight, value), day: Math.round(day) });
  }
  chartKeydown(event: KeyboardEvent, insight: ExpenseInsight, value: ExpenseInsightValue): void {
    if (!value.chart) return;
    const days = expenseChartAtDay(value.chart, 1).days;
    const current = this.hoverDay(insight, value);
    let day: number;
    switch (event.key) {
      case 'ArrowLeft':
        day = Math.max(1, (current ?? days) - 1);
        break;
      case 'ArrowRight':
        day = Math.min(days, (current ?? 0) + 1);
        break;
      case 'Home':
        day = 1;
        break;
      case 'End':
        day = days;
        break;
      case 'Escape':
        this.hover.set(null);
        event.stopPropagation();
        return;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.hover.set({ key: this.chartKey(insight, value), day });
  }
  clearChart(): void {
    this.hover.set(null);
  }
  insight(id: FinanceCardId) {
    return this.insights().find((i) => i.id === id);
  }
  category(id: string) {
    return categoryLabel(id, this.labels());
  }
  categoryStyle(id: string) {
    return this.categories().find((category) => category.id === id);
  }
  range(value: DateRange): string {
    return `${formatCivilDate(value.start)} — ${formatCivilDate(value.end)}`;
  }
  pointValue(point: ExpenseChartPoint): string {
    return point.value
      ? this.money(point.value)
      : point.unavailable === 'precision'
        ? 'Indisponível'
        : 'Sem histórico';
  }
  arrowId(insight: ExpenseInsight, value: ExpenseInsightValue, previous = false): string {
    return `expense-trend-arrow-${insight.id}-${value.currency}${previous ? '-previous' : ''}`;
  }
  description(insight: ExpenseInsight, value: ExpenseInsightValue): string {
    const windows = insight.window;
    const parts = windows
      ? [
          `Atual da análise: ${this.range(windows.current)} (${this.days(windows.current)} dias).`,
          ...windows.references.map(
            (range) => `Referência: ${this.range(range)} (${this.days(range)} dias).`,
          ),
        ]
      : [];
    if (value.reference)
      parts.push(
        `${insight.id === 'usual' ? 'Média de três' : 'Anterior'}: ${this.money(value.reference)}.`,
      );
    if (value.chart) {
      parts.push('Gastos acumulados por dia; linha horizontal nos dias sem despesa.');
      for (const [label, point] of [
        ['Anterior', value.chart.previous],
        ['Atual', value.chart.current],
      ] as const)
        parts.push(
          `${label} do gráfico: ${this.pointValue(point)}${point.range ? `, ${this.range(point.range)}` : ''}.`,
        );
      if (value.chart.shortened)
        parts.push(
          'Gráfico recortado em dias equivalentes; o total destacado pode usar mais dias.',
        );
    }
    return parts.join(' ');
  }
  status(insight: ExpenseInsight, value: ExpenseInsightValue): string {
    return {
      future: 'Período futuro',
      history: 'Histórico insuficiente',
      coverage: 'Cobertura insuficiente',
      precision: 'Valor indisponível',
      'rounded-zero': 'Despesas arredondadas a zero',
      empty:
        insight.id === 'largest'
          ? 'Sem despesas na consulta'
          : insight.id === 'increase'
            ? 'Nenhum aumento'
            : insight.id === 'decrease'
              ? 'Nenhuma redução'
              : 'Sem desvio do habitual',
      known: '',
    }[value.status];
  }
  select(insight: ExpenseInsight, value: ExpenseInsightValue): void {
    if (value.category && insight.window)
      this.statementRequested.emit({
        category: value.category,
        currency: value.currency,
        range: insight.window.current,
        label: insight.label,
      });
  }
}
