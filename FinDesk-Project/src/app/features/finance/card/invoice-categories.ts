import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { InvoiceReading } from '../../../../../application/card-invoices';
import { presentCardMoney } from '../../../../../application/card-invoices';
import { formatMoney } from '../../../../../application/finance-context';
import type { CivilDate } from '../../../../../domain/civil-date';
import type { Money } from '../../../../../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../../../../../shared/storage-api';
import { invoiceMerchants } from '../../../../../application/invoice-merchants';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import { CategoryStore } from '../statement/category-store.service';

@Component({
  selector: 'fd-invoice-categories',
  templateUrl: './invoice-categories.html',
  styleUrl: './invoice-categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceCategories {
  readonly snapshot = input.required<DemoSnapshot>();
  readonly accountId = input.required<string>();
  readonly cardId = input.required<string>();
  readonly merchantFilter = input<string | null>(null);
  readonly merchantSelected = output<string>();
  readonly mode = signal<'categories' | 'merchants'>('categories');
  readonly reading = input.required<InvoiceReading>();
  readonly currency = input.required<FinancePreferences['currencyMode']>();
  readonly asOf = input.required<CivilDate>();
  readonly catalogue = inject(CategoryStore);
  readonly hover = signal<number | null>(null);
  readonly focus = signal<number | null>(null);
  private readonly pointer = signal<number | null>(null);
  private readonly dismissed = signal(false);
  readonly activeIndex = computed(() => (this.dismissed() ? null : (this.hover() ?? this.focus())));
  readonly merchants = computed(() =>
    invoiceMerchants(
      this.snapshot(),
      this.accountId(),
      this.cardId(),
      this.reading().invoice.id,
      this.currency(),
      DEMO_EXCHANGE_RATE,
    ),
  );
  readonly parts = computed(() => {
    if (this.mode() === 'categories')
      return this.reading().categories.map((part) => ({
        ...part,
        key: part.categoryId ?? 'uncategorized',
        merchantId: null as string | null,
        meta: this.category(part.categoryId),
      }));
    const total = this.reading().knownSubtotal;
    if (!total || total.minorUnits <= 0) return [];
    let cumulative = 0n;
    return (this.merchants()?.parts ?? [])
      .filter((part) => part.original.minorUnits > 0)
      .map((part) => {
        const start = Number((cumulative * 1000000n) / BigInt(total.minorUnits)) / 10000;
        cumulative += BigInt(part.original.minorUnits);
        const end = Number((cumulative * 1000000n) / BigInt(total.minorUnits)) / 10000;
        return {
          key: part.merchantId,
          merchantId: part.merchantId,
          categoryId: null,
          amount: part.original,
          start,
          end,
          width: end - start,
          share: part.share!,
          meta: {
            name: this.catalogue.merchantLabel(part.merchantId),
            icon: 'pi-shopping-cart',
            color: this.merchantColor(part.merchantId),
          },
        };
      });
  });
  readonly active = computed(() => this.parts()[this.activeIndex() ?? -1] ?? null);
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
      this.parts().some((part) => !this.present(part.amount)),
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
    effect(() => {
      this.mode();
      this.reading();
      this.leave();
      this.focus.set(null);
      this.dismissed.set(false);
    });
  }
  private merchantColor(id: string): string {
    const colors = ['#a9c8b5', '#b6a3cf', '#d6b385', '#84b6d4', '#cf9e9e'];
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return colors[hash % colors.length]!;
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
    if (!bounds.width || !this.parts().length) return;
    const position = Math.max(
      0,
      Math.min(100, ((event.clientX - bounds.left) * 100) / bounds.width),
    );
    const index = this.parts().findIndex((part) => position < part.end);
    const next = index < 0 ? this.parts().length - 1 : index;
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
    const parts = this.parts();
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
