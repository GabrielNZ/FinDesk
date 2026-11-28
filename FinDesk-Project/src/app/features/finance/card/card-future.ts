import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  cardFuture,
  type FutureInvoice,
  type FutureItem,
} from '../../../../../application/card-future';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import type { Money } from '../../../../../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../../../../../shared/storage-api';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import { CategoryStore } from '../statement/category-store.service';

@Component({
  selector: 'fd-card-future',
  templateUrl: './card-future.html',
  styleUrl: './card-future.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'key($event)' },
})
export class CardFuturePanel {
  readonly snapshot = input.required<DemoSnapshot>();
  readonly accountId = input.required<string>();
  readonly cardId = input.required<string>();
  readonly invoiceId = input.required<string>();
  readonly currency = input.required<FinancePreferences['currencyMode']>();
  readonly catalogue = inject(CategoryStore);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly expanded = signal<string | null>(null);
  readonly query = computed(() =>
    cardFuture(
      this.snapshot(),
      this.accountId(),
      this.cardId(),
      this.invoiceId(),
      this.currency(),
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly detail = computed(
    () => this.query()?.invoices.find((row) => row.reading.invoice.id === this.expanded()) ?? null,
  );
  readonly date = formatCivilDate;
  readonly money = (value: Money | null) => (value ? formatMoney(value) : 'Valor indisponível');
  constructor() {
    effect(() => {
      this.accountId();
      this.cardId();
      this.invoiceId();
      this.prepareClose();
      this.expanded.set(null);
    });
    if (!this.catalogue.value()) void this.catalogue.load();
  }
  month(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }
  status(row: FutureInvoice) {
    return { paid: 'Paga', closed: 'Fechada', open: 'Em formação', future: 'Futura' }[
      row.reading.invoice.status
    ];
  }
  kind(item: FutureItem) {
    return { installment: 'Parcelamento', recurring: 'Recorrência registrada', other: 'À vista' }[
      item.kind
    ];
  }
  converted(value: Money | null): boolean {
    return value !== null && this.currency() !== 'original' && this.currency() !== value.currency;
  }
  choose(id: string) {
    this.prepareClose();
    this.expanded.update((current) => (current === id ? null : id));
  }
  close() {
    const id = this.expanded();
    this.prepareClose();
    this.expanded.set(null);
    Array.from(
      this.element.nativeElement.querySelectorAll<HTMLButtonElement>('[data-future-invoice]'),
    )
      .find((button) => button.dataset['futureInvoice'] === id)
      ?.focus({ preventScroll: true });
  }
  private prepareClose() {
    const panel = this.element.nativeElement.querySelector<HTMLElement>(
      '.future-reveal:not(.future-leave)',
    );
    if (!panel) return;
    panel.style.setProperty('--future-close-height', `${panel.getBoundingClientRect().height}px`);
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.querySelector('.future-detail')?.removeAttribute('id');
  }
  key(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.expanded()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    const buttons = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLButtonElement>('[data-future-invoice]'),
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : event.key === 'ArrowDown'
            ? Math.min(index + 1, buttons.length - 1)
            : event.key === 'ArrowUp'
              ? Math.max(index - 1, 0)
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    buttons[next]?.focus({ preventScroll: true });
  }
}
