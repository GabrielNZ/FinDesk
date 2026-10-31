import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { CardLayoutState } from './card-layout.service';

@Component({
  selector: 'fd-card-layout-action',
  template: `
    <button
      data-restore-layout
      type="button"
      [class.confirming]="state.confirming()"
      (click)="click()"
      (blur)="cancel()"
      [attr.aria-description]="
        state.confirming()
          ? 'Clique novamente para restaurar posições e tamanhos. Dados e filtros serão mantidos. Escape cancela.'
          : null
      "
      [disabled]="
        state.state() === 'loading' ||
        state.state() === 'browser' ||
        state.saving() ||
        state.restoring() ||
        !!state.focused()
      "
    >
      <span aria-live="polite">{{
        state.confirming() ? 'Restaurar layout?' : 'Restaurar layout'
      }}</span>
    </button>
    <span class="visually-hidden" role="status">{{ message() }}</span>
  `,
  styles: `
    :host {
      display: block;
      flex: 0 0 auto;
      min-width: 128px;
      text-align: right;
    }
    button {
      padding: 8px 12px;
      border: 1px solid var(--fd-border);
      border-radius: 8px;
      background: transparent;
      color: var(--fd-muted);
      font-size: 12px;
    }
    button:hover:not(:disabled) {
      background: var(--fd-surface-hover);
      color: var(--fd-text);
    }
    button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    button.confirming {
      border-color: var(--fd-accent);
      color: var(--fd-accent);
    }
  `,
  host: {
    '(document:pointerdown)': 'outside($event)',
    '(window:keydown.escape)': 'escape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardLayoutAction {
  readonly state = inject(CardLayoutState);
  readonly message = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  async click(): Promise<void> {
    if (!this.state.confirming()) {
      this.state.confirming.set(true);
      return;
    }
    if (await this.state.restore()) {
      this.state.confirming.set(false);
      this.message.set('Layout padrão restaurado.');
      this.element.nativeElement.querySelector('button')?.focus({ preventScroll: true });
    }
  }
  cancel(): void {
    if (!this.state.restoring()) this.state.confirming.set(false);
  }
  outside(event: PointerEvent): void {
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target))
      this.cancel();
  }
  escape(event: Event): void {
    if (!this.state.confirming() || this.state.restoring()) return;
    event.preventDefault();
    this.cancel();
    this.element.nativeElement.querySelector('button')?.focus({ preventScroll: true });
  }
}
