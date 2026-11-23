import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CardBoard } from '../cards/card-board';
import { CARD_LAYOUT_AREA, CardLayoutState } from '../cards/card-layout.service';
import {
  expenseReportPlot,
  type ExpenseReports,
  type ExpenseReportLane,
  type ExpenseReportPeriod,
} from '../../../../../application/expense-reports';
import type { ExpenseStatementRequest } from '../../../../../application/expense-analysis';
import type { Category } from '../../../../../shared/categories';
import { categoryLabel } from '../../../../../application/statement';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';

@Component({
  selector: 'fd-expense-charts',
  imports: [CardBoard],
  providers: [CardLayoutState, { provide: CARD_LAYOUT_AREA, useValue: 'finance-charts' }],
  templateUrl: './expense-charts.html',
  styleUrl: './expense-charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseCharts {
  readonly reports = input.required<ExpenseReports>();
  readonly categories = input.required<readonly Category[]>();
  readonly labels = input.required<Readonly<Record<string, string>>>();
  readonly investigate = output<ExpenseStatementRequest>();
  readonly focusChanged = output<boolean>();
  readonly mode = signal<'daily' | 'accumulated'>('daily');
  readonly active = signal<{ currency: string; day: number } | null>(null);
  readonly money = formatMoney;
  readonly date = formatCivilDate;
  private readonly plots = computed(
    () =>
      new Map(
        this.reports().lanes.map(
          (lane) =>
            [lane.currency, expenseReportPlot(lane, this.mode() === 'accumulated')] as const,
        ),
      ),
  );
  plot(lane: ExpenseReportLane) {
    return this.plots().get(lane.currency)!;
  }
  category(id: string): string {
    return categoryLabel(id, this.labels());
  }
  categoryStyle(id: string) {
    return this.categories().find((c) => c.id === id);
  }
  range(period: ExpenseReportPeriod): string {
    return period.range
      ? `${this.date(period.range.start)} — ${this.date(period.range.end)}`
      : 'Intervalo indisponível';
  }
  unavailable(period: ExpenseReportPeriod): string {
    return period.unavailable === 'future'
      ? 'Período futuro'
      : period.unavailable === 'precision'
        ? 'Valores indisponíveis'
        : 'Histórico insuficiente';
  }
  day(lane: ExpenseReportLane): number {
    const count = this.plot(lane).count;
    return Math.min(
      count,
      Math.max(1, this.active()?.currency === lane.currency ? this.active()!.day : count),
    );
  }
  point(lane: ExpenseReportLane, previous: boolean) {
    return (previous ? lane.previous : lane.current).days[this.day(lane) - 1] ?? null;
  }
  pointer(event: MouseEvent, lane: ExpenseReportLane): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const count = this.plot(lane).count;
    const position = ((event.clientX - rect.left) / rect.width) * 240;
    const day = Math.round(1 + ((Math.max(4, Math.min(232, position)) - 4) / 228) * (count - 1));
    this.active.set({ currency: lane.currency, day });
  }
  clickPlot(event: MouseEvent, lane: ExpenseReportLane): void {
    this.pointer(event, lane);
    const plot = this.plot(lane);
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const current = this.point(lane, false),
      previous = this.point(lane, true);
    const at = (day: NonNullable<typeof current>) =>
      plot.valuePosition(this.mode() === 'accumulated' ? day.accumulated : day.value);
    const usePrevious =
      !!previous && (!current || Math.abs(y - at(previous)) < Math.abs(y - at(current)));
    this.inspect(lane, usePrevious, this.day(lane));
  }
  key(event: KeyboardEvent, lane: ExpenseReportLane): void {
    const count = this.plot(lane).count;
    let day = this.day(lane);
    switch (event.key) {
      case 'ArrowLeft':
        day = Math.max(1, day - 1);
        break;
      case 'ArrowRight':
        day = Math.min(count, day + 1);
        break;
      case 'Home':
        day = 1;
        break;
      case 'End':
        day = count;
        break;
      case 'Enter':
      case ' ':
        this.inspect(lane, event.shiftKey, day);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.active.set({ currency: lane.currency, day });
  }
  inspect(lane: ExpenseReportLane, previous: boolean, day: number, event?: MouseEvent): void {
    event?.stopPropagation();
    const item = (previous ? lane.previous : lane.current).days[day - 1];
    if (!item) return;
    this.active.set({ currency: lane.currency, day });
    this.investigate.emit({
      category: null,
      currency: lane.currency,
      range: { start: item.on, end: item.on },
      label: `Evolução · ${previous ? 'Anterior' : 'Atual'} · Despesas do dia`,
    });
  }
  inspectCategory(lane: ExpenseReportLane, category: string): void {
    if (lane.observed.range)
      this.investigate.emit({
        category,
        currency: lane.currency,
        range: lane.observed.range,
        label: 'Gastos por categoria',
      });
  }
}
