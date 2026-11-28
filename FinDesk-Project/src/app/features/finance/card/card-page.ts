import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
  type OnDestroy,
} from '@angular/core';
import {
  cardInvoices,
  preferredInvoice,
  presentCardMoney,
  walletCards,
} from '../../../../../application/card-invoices';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import type { InvoiceReading } from '../../../../../application/card-invoices';
import type { Card } from '../../../../../domain/finance-facts';
import type { Money } from '../../../../../domain/money';
import { DEMO_EXCHANGE_RATE } from '../../../../../fixtures/financas/demo';
import { FinanceContext } from '../finance-context.service';
import { CardConsultation } from './card-consultation.service';
import { InvoiceCategories } from './invoice-categories';
import { InvoicePurchaseList } from './invoice-purchases';
import { InvoiceEvolutionChart } from './invoice-evolution';
import { CardBoard } from '../cards/card-board';
import { CARD_LAYOUT_AREA, CardLayoutState } from '../cards/card-layout.service';
import { CardLayoutAction } from '../cards/card-layout-action';

@Component({
  selector: 'fd-card-page',
  imports: [
    InvoiceCategories,
    InvoicePurchaseList,
    InvoiceEvolutionChart,
    CardBoard,
    CardLayoutAction,
  ],
  providers: [CardLayoutState, { provide: CARD_LAYOUT_AREA, useValue: 'finance-invoices' }],
  templateUrl: './card-page.html',
  styleUrl: './card-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPage implements OnDestroy {
  readonly context = inject(FinanceContext);
  readonly consultation = inject(CardConsultation);
  readonly cards = computed(() => {
    const snapshot = this.context.snapshot();
    return snapshot ? walletCards(snapshot, this.context.accountId()) : [];
  });
  readonly selectedCard = computed(
    () =>
      this.cards().find(
        (card) => card.id === this.consultation.cards()[this.context.accountId()],
      ) ??
      this.cards()[0] ??
      null,
  );
  readonly invoices = computed(() => {
    const snapshot = this.context.snapshot(),
      card = this.selectedCard();
    return snapshot && card ? cardInvoices(snapshot, this.context.accountId(), card.id) : [];
  });
  readonly selected = computed(() => {
    const card = this.selectedCard();
    const id = card ? this.consultation.invoices()[card.id] : null;
    return (
      this.invoices().find((row) => row.invoice.id === id) ??
      this.invoices().find((row) => row.invoice.id === preferredInvoice(this.invoices())) ??
      null
    );
  });
  readonly index = computed(() =>
    this.invoices().findIndex((row) => row.invoice.id === this.selected()?.invoice.id),
  );
  readonly merchantFilter = signal<string | null>(null);
  constructor() {
    effect(() => {
      this.context.accountId();
      this.selectedCard();
      this.selected();
      this.merchantFilter.set(null);
    });
  }
  readonly dragging = signal<{ id: string; x: number; y: number } | null>(null);
  readonly limitHover = signal<'used' | 'available' | null>(null);
  readonly limitFocus = signal<'used' | 'available' | null>(null);
  private readonly limitPointer = signal<number | null>(null);
  private readonly limitDismissed = signal(false);
  readonly activeLimit = computed(() =>
    this.limitDismissed() ? null : (this.limitHover() ?? this.limitFocus()),
  );
  readonly limitAnchor = computed(() => {
    const used = this.usedPercent() ?? 0;
    return this.limitHover() && this.limitPointer() !== null
      ? this.limitPointer()!
      : this.activeLimit() === 'used'
        ? used / 2
        : used + (100 - used) / 2;
  });
  pointLimit(event: PointerEvent, entering = false): void {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!bounds.width) return;
    const position = Math.max(
      0,
      Math.min(100, ((event.clientX - bounds.left) * 100) / bounds.width),
    );
    const part = position < (this.usedPercent() ?? 0) ? 'used' : 'available';
    this.limitPointer.set(position);
    if (entering || this.limitHover() !== part) this.showLimit(part);
    else this.limitHover.set(part);
  }
  leaveLimit(): void {
    this.limitHover.set(null);
    this.limitPointer.set(null);
  }
  showLimit(part: 'used' | 'available'): void {
    this.limitHover.set(part);
    this.limitDismissed.set(false);
  }
  focusLimit(event: FocusEvent, part: 'used' | 'available'): void {
    if ((event.currentTarget as HTMLElement).matches(':focus-visible')) this.leaveLimit();
    this.limitFocus.set(part);
    this.limitDismissed.set(false);
  }
  private gesture: {
    id: string;
    x: number;
    y: number;
    pointer: number;
    target: HTMLElement;
    moved: boolean;
    lift: number | null;
  } | null = null;
  private suppressClick = false;
  readonly date = formatCivilDate;
  readonly originalMoney = formatMoney;
  readonly converted = computed(
    () =>
      this.context.currencyMode() !== 'original' &&
      this.context.currencyMode() !== this.selectedCard()?.totalLimit.currency,
  );
  readonly usedPercent = computed(() => {
    const card = this.selectedCard();
    return card && card.totalLimit.minorUnits > 0
      ? Math.min(
          100,
          Number(
            (BigInt(card.usedLimit.minorUnits) * 10000n) / BigInt(card.totalLimit.minorUnits),
          ) / 100,
        )
      : null;
  });
  money(value: Money | null): string {
    const snapshot = this.context.snapshot();
    const shown =
      snapshot &&
      presentCardMoney(value, this.context.currencyMode(), snapshot.asOf, DEMO_EXCHANGE_RATE);
    return shown ? formatMoney(shown) : 'Valor indisponível';
  }
  accountName(card: Card): string {
    return (
      this.context
        .snapshot()
        ?.facts.accounts.find((account) => account.id === card.accountId)
        ?.name.split(' · demonstração')[0] ?? 'Cartão'
    );
  }
  cardTop(card: Card): number {
    return this.selectedCard()?.id === card.id
      ? (this.cards().length - 1) * 70 + 22
      : this.cards()
          .filter((entry) => entry.id !== this.selectedCard()?.id)
          .indexOf(card) *
          60 +
          34;
  }
  month(row: InvoiceReading, full = false): string {
    return new Intl.DateTimeFormat('pt-BR', {
      month: full ? 'long' : 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${row.invoice.dueOn}T12:00:00Z`));
  }
  status(row: InvoiceReading): string {
    return { paid: 'Paga', closed: 'Fechada', open: 'Em formação', future: 'Futura' }[
      row.invoice.status
    ];
  }
  chooseInvoice(row: InvoiceReading): void {
    const card = this.selectedCard();
    if (card && this.invoices().includes(row))
      this.consultation.selectInvoice(card.id, row.invoice.id);
  }
  chooseFromChart(id: string): void {
    const card = this.selectedCard();
    if (!card || !this.invoices().some((row) => row.invoice.id === id)) return;
    this.consultation.selectInvoice(card.id, id);
  }
  move(offset: number): void {
    const next = this.invoices()[this.index() + offset];
    if (next) this.chooseInvoice(next);
  }
  chooseCard(card: Card): void {
    if (this.cards().includes(card))
      this.consultation.selectCard(this.context.accountId(), card.id);
  }
  click(card: Card): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.chooseCard(card);
  }
  key(event: KeyboardEvent, card: Card): void {
    const index = this.cards().indexOf(card);
    const next =
      event.key === 'Home'
        ? this.cards()[0]
        : event.key === 'End'
          ? this.cards().at(-1)
          : ['ArrowRight', 'ArrowDown'].includes(event.key)
            ? this.cards()[index + 1]
            : ['ArrowLeft', 'ArrowUp'].includes(event.key)
              ? this.cards()[index - 1]
              : null;
    if (!['Home', 'End', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key))
      return;
    event.preventDefault();
    event.stopPropagation();
    if (next) {
      this.chooseCard(next);
      (event.currentTarget as HTMLElement).parentElement
        ?.querySelector<HTMLElement>(`[data-wallet-id="${next.id}"]`)
        ?.focus({ preventScroll: true });
    }
  }
  down(event: PointerEvent, card: Card): void {
    if (event.button !== 0 || !event.isPrimary) return;
    this.cancel();
    this.suppressClick = false;
    const target = event.currentTarget as HTMLElement;
    this.gesture = {
      id: card.id,
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
      target,
      moved: false,
      lift: null,
    };
    target.setPointerCapture(event.pointerId);
  }
  motion(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (!this.cards().some((card) => card.id === gesture.id)) {
      this.cancel();
      return;
    }
    const x = event.clientX - gesture.x,
      y = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(x, y) >= 8) {
      gesture.lift = new DOMMatrixReadOnly(getComputedStyle(gesture.target).transform).m42;
      gesture.moved = true;
    }
    if (gesture.moved) {
      event.preventDefault();
      this.dragging.set({
        id: gesture.id,
        x: Math.max(-32, Math.min(32, x)),
        y: Math.max(-40, Math.min(80, y)) + (gesture.lift ?? 0),
      });
    }
  }
  up(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (gesture.moved) {
      const bounds = gesture.target.parentElement!.getBoundingClientRect();
      const card = this.cards().find((card) => card.id === gesture.id);
      if (
        card &&
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom
      )
        this.chooseCard(card);
      this.suppressClick = true;
    }
    this.cancel();
  }
  @HostListener('document:keydown.escape', ['$event'])
  escape(event: Event): void {
    if (this.activeLimit()) {
      event.preventDefault();
      this.limitDismissed.set(true);
    }
    if (this.gesture) {
      event.preventDefault();
      this.suppressClick = true;
      this.cancel();
    }
  }
  @HostListener('window:blur')
  cancel(): void {
    const gesture = this.gesture;
    this.gesture = null;
    this.dragging.set(null);
    this.leaveLimit();
    this.limitFocus.set(null);
    if (gesture?.target.hasPointerCapture(gesture.pointer))
      gesture.target.releasePointerCapture(gesture.pointer);
  }
  ngOnDestroy(): void {
    this.cancel();
  }
}
