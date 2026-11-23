import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { InvoiceReading } from '../../../../../application/card-invoices';
import { presentCardMoney } from '../../../../../application/card-invoices';
import { formatMoney } from '../../../../../application/finance-context';
import type { CivilDate } from '../../../../../domain/civil-date';
import type { Money } from '../../../../../domain/money';
import type { FinancePreferences } from '../../../../../shared/storage-api';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import { CategoryStore } from '../statement/category-store.service';

@Component({
  selector: 'fd-invoice-categories',
  templateUrl: './invoice-categories.html',
  styleUrl: './invoice-categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceCategories {
  readonly reading = input.required<InvoiceReading>();
  readonly currency = input.required<FinancePreferences['currencyMode']>();
  readonly asOf = input.required<CivilDate>();
  readonly catalogue = inject(CategoryStore);
  readonly hover = signal<number | null>(null);
  readonly focus = signal<number | null>(null);
  private readonly pointer = signal<number | null>(null);
  private readonly dismissed = signal(false);
  readonly activeIndex = computed(() => (this.dismissed() ? null : (this.hover() ?? this.focus())));
  readonly active = computed(() => this.reading().categories[this.activeIndex() ?? -1] ?? null);
  readonly anchor = computed(() => {
    const part = this.active();
    return this.hover() !== null && this.pointer() !== null
      ? this.pointer()!
      : part
        ? (part.start + part.end) / 2
        : 50;
  });
  readonly converted = computed(
    () =>
      this.currency() !== 'original' && this.currency() !== this.reading().knownSubtotal?.currency,
  );
  readonly unavailable = computed(
    () =>
      (this.reading().itemCount > 0 && !this.reading().knownSubtotal) ||
      this.reading().categories.some((part) => !this.present(part.amount)),
  );
  readonly differentTotal = computed(() => {
    const row = this.reading();
    return (
      row.invoice.confirmedTotal !== null &&
      row.knownSubtotal !== null &&
      row.invoice.confirmedTotal.minorUnits !== row.knownSubtotal.minorUnits
    );
  });
  readonly originalMoney = formatMoney;
  constructor() {
    if (!this.catalogue.value()) void this.catalogue.load();
  }
  present(amount: Money | null) {
    return presentCardMoney(amount, this.currency(), this.asOf(), DEMO_EXCHANGE_RATE);
  }
  money(amount: Money | null): string {
    const value = this.present(amount);
    return value ? formatMoney(value) : 'Valor indisponível';
  }
  category(id: string | null) {
    return (
      this.catalogue.category(id) ?? {
        name: id === null ? 'Sem categoria' : 'Categoria não cadastrada',
        icon: 'pi-tag',
        color: '#a3aca9',
      }
    );
  }
  point(event: PointerEvent, entering = false): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!bounds.width || !this.reading().categories.length) return;
    const position = Math.max(
      0,
      Math.min(100, ((event.clientX - bounds.left) * 100) / bounds.width),
    );
    const index = this.reading().categories.findIndex((part) => position < part.end);
    const next = index < 0 ? this.reading().categories.length - 1 : index;
    this.pointer.set(position);
    if (entering || next !== this.hover()) this.dismissed.set(false);
    this.hover.set(next);
  }
  leave(): void {
    this.hover.set(null);
    this.pointer.set(null);
  }
  focusPart(event: FocusEvent, index: number): void {
    if ((event.currentTarget as HTMLElement).matches(':focus-visible')) this.leave();
    this.focus.set(index);
    this.dismissed.set(false);
  }
  key(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.active()) {
      this.dismissed.set(true);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const parts = this.reading().categories;
    const index = this.focus() ?? this.hover() ?? 0;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? parts.length - 1
          : event.key === 'ArrowLeft'
            ? Math.max(0, index - 1)
            : event.key === 'ArrowRight'
              ? Math.min(parts.length - 1, index + 1)
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.leave();
    this.focus.set(next);
    this.dismissed.set(false);
    const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
      '.category-segment',
    );
    buttons[next]?.focus({ preventScroll: true });
  }
}
