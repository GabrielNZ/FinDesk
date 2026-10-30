import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ChoiceSymbolView, type ChoiceSymbol } from './choice-symbol';

export interface CircleChoice {
  readonly value: string;
  readonly label: string;
  readonly symbol: ChoiceSymbol;
  readonly disabled?: boolean;
}

/** Círculos soltos no top layer nativo: sem painel visual ou transporte de dados. */
@Component({
  selector: 'fd-circle-selector',
  imports: [ChoiceSymbolView],
  templateUrl: './circle-selector.html',
  styleUrl: './circle-selector.scss',
  host: {
    '(window:resize)': 'close(false)',
    '(window:blur)': 'close(false)',
    '(focusout)': 'onFocusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CircleSelector {
  readonly pickerId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly CircleChoice[]>();
  readonly value = input.required<string>();
  readonly chosen = output<string>();
  readonly open = signal(false);
  readonly activeValue = signal('');
  readonly top = signal(0);
  readonly left = signal(0);
  readonly nameWidth = signal(220);
  readonly selected = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );
  readonly choices = computed(() =>
    this.options().filter((option) => option.value !== this.value()),
  );
  readonly unavailable = computed(() => !this.choices().some((option) => !option.disabled));
  private readonly panel = viewChild<ElementRef<HTMLDivElement>>('panel');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private keyboardOpening = false;

  constructor() {
    const onScroll = (event: Event) => {
      if (!this.panel()?.nativeElement.contains(event.target as Node)) this.close(false);
    };
    document.addEventListener('scroll', onScroll, true);
    this.destroy.onDestroy(() => document.removeEventListener('scroll', onScroll, true));
  }

  place(): void {
    const box = this.trigger()?.nativeElement.getBoundingClientRect();
    if (!box) return;
    const height = this.choices().length * 56 - 12;
    this.top.set(Math.max(12, Math.min(box.bottom + 12, innerHeight - height - 16)));
    this.left.set(box.right - 44);
    this.nameWidth.set(Math.min(220, Math.max(80, box.right - 44 - 24)));
    this.activeValue.set(this.choices().find((option) => !option.disabled)?.value ?? '');
  }

  onToggle(event: Event): void {
    const showing = (event as ToggleEvent).newState === 'open';
    this.open.set(showing);
    if (showing && this.keyboardOpening) {
      this.keyboardOpening = false;
      this.focusActive();
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (this.unavailable()) return;
    this.place();
    if (this.panel()?.nativeElement.matches(':popover-open')) this.focusActive();
    else {
      this.keyboardOpening = true;
      this.panel()?.nativeElement.showPopover();
    }
  }

  onListKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = this.choices().filter((option) => !option.disabled);
    const index = Math.max(
      0,
      options.findIndex((option) => option.value === this.activeValue()),
    );
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    const option = options[next];
    if (option) {
      this.activeValue.set(option.value);
      this.focusActive();
    }
  }

  choose(option: CircleChoice): void {
    if (option.disabled) return;
    this.chosen.emit(option.value);
    this.close(true);
  }

  close(restoreFocus: boolean): void {
    const panel = this.panel()?.nativeElement;
    if (panel?.matches(':popover-open')) panel.hidePopover();
    this.open.set(false);
    if (restoreFocus) this.trigger()?.nativeElement.focus({ preventScroll: true });
  }

  onFocusOut(event: FocusEvent): void {
    // Durante focusout, activeElement pode ser body: usar o próximo alvo do foco.
    if (
      event.relatedTarget instanceof Node &&
      !this.element.nativeElement.contains(event.relatedTarget)
    )
      this.close(false);
  }

  private focusActive(): void {
    const buttons =
      this.panel()?.nativeElement.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const button = Array.from(buttons ?? []).find(
      (item) => item.dataset['value'] === this.activeValue(),
    );
    button?.focus({ preventScroll: true });
  }
}
