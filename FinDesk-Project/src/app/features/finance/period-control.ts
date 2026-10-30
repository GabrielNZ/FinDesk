import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { formatCivilDate } from '../../../../application/finance-context';
import { FinanceContext, type PeriodMode } from './finance-context.service';

@Component({
  selector: 'fd-period-control',
  templateUrl: './period-control.html',
  styleUrl: './period-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodControl {
  readonly context = inject(FinanceContext);
  readonly date = formatCivilDate;
  readonly expanded = signal(false);
  private readonly expansionToggle = viewChild<ElementRef<HTMLButtonElement>>('expansionToggle');
  readonly modes: readonly { mode: PeriodMode; label: string; icon: string }[] = [
    { mode: 'calendar-month', label: 'Mês calendário', icon: 'pi-calendar' },
    { mode: 'salary-cycle', label: 'Entre salários', icon: '' },
    { mode: 'card-cycle', label: 'Entre fechamentos', icon: 'pi-credit-card' },
  ];

  constructor() {
    effect(() => {
      this.context.periodMode();
      this.expanded.set(false);
    });
  }

  activeIndex(): number {
    return this.modes.findIndex((item) => item.mode === this.context.periodMode());
  }

  selectMode(mode: PeriodMode): void {
    if (this.context.periodUnavailableReason(mode)) return;
    this.context.selectPeriodMode(mode);
    this.expanded.set(false);
  }

  toggleExpansion(): void {
    this.expanded.update((expanded) => !expanded);
  }

  closeExpansion(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.expanded.set(false);
    this.expansionToggle()?.nativeElement.focus({ preventScroll: true });
  }

  expansionLabel(): string {
    const target =
      this.context.periodMode() === 'calendar-month'
        ? 'seleção do mês'
        : this.context.periodMode() === 'salary-cycle'
          ? 'intervalo salarial'
          : 'intervalo do cartão';
    return `${this.expanded() ? 'Recolher' : 'Expandir'} ${target}`;
  }

  rangeDescription(): string {
    const range = this.context.range();
    return range ? `${this.date(range.start)} – ${this.date(range.end)}` : '';
  }

  periodTitle(): string {
    const mode = this.context.periodMode();
    const range = this.context.range();
    if (!range) return '';
    if (mode === 'salary-cycle') return 'Entre salários';
    const month = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${mode === 'card-cycle' ? range.end : range.start}T12:00:00Z`));
    const title = month[0]!.toUpperCase() + month.slice(1);
    return mode === 'card-cycle' ? `Fechamento · ${this.date(range.end).slice(0, 5)}` : title;
  }

  navigationLabel(offset: -1 | 1): string {
    return this.context.periodMode() === 'calendar-month'
      ? offset === -1
        ? 'Mês anterior'
        : 'Próximo mês'
      : offset === -1
        ? 'Ciclo anterior'
        : 'Próximo ciclo';
  }

  moveFocus(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const group = event.currentTarget as HTMLElement;
    const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button'));
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus({ preventScroll: true });
  }
}
