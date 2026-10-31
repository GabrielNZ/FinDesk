import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CardPlacement } from '../../../../../shared/card-layout';

@Component({
  selector: 'fd-dashboard-card',
  templateUrl: './dashboard-card.html',
  styleUrl: './dashboard-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCard {
  readonly placement = input.required<CardPlacement>();
  readonly heading = input.required<string>();
  readonly focused = input(false);
  readonly disabled = input(false);
  readonly moveStart = output<PointerEvent>();
  readonly resizeStart = output<PointerEvent>();
  readonly moveKey = output<KeyboardEvent>();
  readonly resizeKey = output<KeyboardEvent>();
  readonly focusRequested = output<void>();

  private interactive(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      !!target.closest(
        'button, a, input, textarea, select, [contenteditable="true"], [role="slider"], [data-card-interactive]',
      )
    );
  }
  startMove(event: PointerEvent): void {
    if (this.interactive(event.target) || this.disabled() || this.focused()) return;
    const target = event.target as HTMLElement;
    if (
      target.scrollHeight > target.clientHeight &&
      event.clientX >= target.getBoundingClientRect().right - 14
    )
      return;
    this.moveStart.emit(event);
  }
  doubleClick(event: MouseEvent): void {
    if (this.interactive(event.target) || this.disabled()) return;
    event.preventDefault();
    this.focusRequested.emit();
  }
  key(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || this.disabled()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.focusRequested.emit();
    } else if (event.shiftKey) this.resizeKey.emit(event);
    else this.moveKey.emit(event);
  }
}
