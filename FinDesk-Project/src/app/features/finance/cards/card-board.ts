import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import {
  CARD_GRID,
  assistedCardHeight,
  previewCardDrop,
  type CardBox,
  type CardDropPreview,
  reorderCard,
  resizeCard,
  resolveCardLayout,
} from '../../../../../application/card-layout';
import type { CardLayout, CardPlacement, FinanceCardId } from '../../../../../shared/card-layout';
import { CardLayoutState } from './card-layout.service';
import { DashboardCard } from './dashboard-card';

interface Gesture {
  id: FinanceCardId;
  kind: 'move' | 'resize';
  pointerId: number;
  handle: HTMLElement;
  x: number;
  y: number;
  initial: CardLayout;
  rect: DOMRect;
  slots: readonly CardBox[];
  overlay: HTMLElement;
  lastX: number;
  lastY: number;
  lastScroll: number;
  lastFrame: number;
  canvasHeight: number;
  externalHeight: number;
  listeners: AbortController;
  scrollTop: number;
  moved: boolean;
  snapHeight: number | null;
}
interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'fd-card-board',
  imports: [DashboardCard],
  templateUrl: './card-board.html',
  styleUrl: './card-board.scss',
  host: {
    '(window:pointermove)': 'pointerMove($event)',
    '(window:pointerup)': 'pointerEnd($event)',
    '(window:pointercancel)': 'cancelGesture()',
    '(window:blur)': 'cancelGesture()',
    '(window:resize)': 'windowResize()',
    '(window:keydown.escape)': 'escape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardBoard {
  readonly state = inject(CardLayoutState);
  readonly focused = this.state.focused;
  readonly focusHeight = signal(360);
  readonly confirming = this.state.confirming;
  readonly heightAssist = signal<{ id: FinanceCardId; height: number } | null>(null);
  readonly preview = signal<CardLayout | null>(null);
  readonly boardWidth = signal(0);
  readonly drag = signal<{
    id: FinanceCardId;
    x: number;
    y: number;
    width: number;
    height: number;
    valid: boolean;
    mode: CardDropPreview['mode'];
    canvasHeight: number;
    offsetY: number;
  } | null>(null);
  readonly announcement = signal('');
  readonly cards = computed(() => (this.preview() ?? this.state.layout()).cards);
  readonly resolved = computed(() =>
    resolveCardLayout(this.preview() ?? this.state.layout(), this.boardWidth()),
  );
  readonly boardHeight = computed(() =>
    this.focused()
      ? this.focusHeight()
      : Math.max(this.resolved().height, this.drag()?.canvasHeight ?? 0),
  );
  readonly dropSlot = computed(() =>
    this.resolved().cards.find((box) => box.id === this.drag()?.id),
  );
  readonly headings: Record<FinanceCardId, string> = {
    categories: 'Categorias',
    evolution: 'Evolução',
    upcoming: 'Próximos compromissos',
  };
  readonly icons: Record<FinanceCardId, string> = {
    categories: 'pi-chart-bar',
    evolution: 'pi-chart-line',
    upcoming: 'pi-calendar',
  };
  readonly pending: Record<FinanceCardId, string> = {
    categories: 'Gráfico por categoria ainda não implementado.',
    evolution: 'Evolução dos gastos ainda não implementada.',
    upcoming: 'Lista de compromissos ainda não implementada.',
  };
  private readonly board = viewChild<ElementRef<HTMLElement>>('board');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private gesture: Gesture | null = null;
  private previousScroll = 0;
  private frame: number | null = null;
  private pendingPoint: Point | null = null;

  constructor() {
    this.state.active.set(true);
    void this.state.load();
    this.destroy.onDestroy(() => {
      this.cancelGesture();
      this.state.active.set(false);
      this.state.focused.set(null);
      this.state.confirming.set(false);
    });
    effect((cleanup) => {
      const board = this.board()?.nativeElement;
      if (!board) return;
      const observer = new ResizeObserver(([entry]) => {
        const width = entry?.contentRect.width ?? 0;
        if (Math.abs(width - this.boardWidth()) > 0.5) {
          this.cancelGesture();
          this.boardWidth.set(width);
        }
      });
      observer.observe(board);
      cleanup(() => observer.disconnect());
    });
  }
  placement(id: FinanceCardId): CardPlacement {
    return this.cards().find((card) => card.id === id)!;
  }
  boxFor(id: FinanceCardId): CardBox {
    return this.resolved().cards.find((box) => box.id === id)!;
  }
  private workspace(): HTMLElement | null {
    return this.element.nativeElement.closest<HTMLElement>('.workspace');
  }
  private item(id: FinanceCardId): HTMLElement | null {
    return this.element.nativeElement.querySelector<HTMLElement>('[data-card-id="' + id + '"]');
  }
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  start(event: PointerEvent, card: CardPlacement, kind: Gesture['kind']): void {
    if (
      event.button !== 0 ||
      this.focused() ||
      this.state.restoring() ||
      this.state.state() !== 'ready' ||
      this.confirming()
    )
      return;
    const item = this.item(card.id),
      board = this.board()?.nativeElement;
    if (!item || !board) return;
    if (kind === 'resize') event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.focus({ preventScroll: true });
    const scrollTop = this.workspace()?.scrollTop ?? 0;
    const listeners = new AbortController();
    this.gesture = {
      id: card.id,
      kind,
      pointerId: event.pointerId,
      handle,
      x: event.clientX,
      y: event.clientY,
      initial: this.state.layout(),
      rect: item.getBoundingClientRect(),
      slots: this.resolved().cards,
      overlay: item,
      lastX: event.clientX,
      lastY: event.clientY,
      lastScroll: scrollTop,
      lastFrame: 0,
      canvasHeight: this.resolved().height,
      externalHeight: (this.workspace()?.scrollHeight ?? 0) - this.resolved().height,
      listeners,
      scrollTop,
      moved: false,
      snapHeight: null,
    };
    this.workspace()?.addEventListener(
      'scroll',
      () => {
        if (this.gesture?.kind === 'move' && this.gesture.moved) this.queueFrame();
      },
      { signal: listeners.signal },
    );
  }
  pointerMove(event: PointerEvent): void {
    if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
    this.pendingPoint = { x: event.clientX, y: event.clientY };
    this.queueFrame();
  }
  private queueFrame(): void {
    if (!this.gesture || !this.pendingPoint) return;
    if (this.frame === null)
      this.frame = requestAnimationFrame((time) => {
        this.frame = null;
        if (!this.gesture || !this.pendingPoint) return;
        const factor = this.gesture.lastFrame
          ? this.clamp((time - this.gesture.lastFrame) / 16.67, 0.25, 2)
          : 1;
        this.gesture.lastFrame = time;
        if (this.applyPoint(this.pendingPoint, true, factor)) this.queueFrame();
      });
  }
  private applyPoint(point: Point, allowScroll = true, factor = 1): boolean {
    const gesture = this.gesture;
    if (!gesture) return false;
    const rawDy = point.y - gesture.y;
    const dx = point.x - gesture.x;
    if (!gesture.moved && Math.hypot(dx, rawDy) < 6) return false;
    gesture.lastX = point.x;
    gesture.lastY = point.y;
    if (!gesture.moved) {
      gesture.handle.setPointerCapture(gesture.pointerId);
      if (gesture.kind === 'move') {
        document.documentElement.classList.add('fd-card-dragging');
        gesture.overlay.classList.add('moving-card');
        Object.assign(gesture.overlay.style, {
          left: gesture.rect.x + dx + 'px',
          top: gesture.rect.y + rawDy + 'px',
          width: gesture.rect.width + 'px',
          height: gesture.rect.height + 'px',
        });
        gesture.overlay.setAttribute('popover', 'manual');
        gesture.overlay.showPopover();
      }
    }
    gesture.moved = true;
    const workspace = this.workspace();
    let scrolled = false;
    if (allowScroll && workspace && (gesture.kind === 'move' || Math.abs(rawDy) > 6)) {
      const box = workspace.getBoundingClientRect();
      if (point.x >= box.left && point.x <= box.right) {
        const depth =
          point.y > box.bottom - 40
            ? Math.min(1, (point.y - box.bottom + 40) / 40)
            : point.y < box.top + 40
              ? -Math.min(1, (box.top + 40 - point.y) / 40)
              : 0;
        const before = workspace.scrollTop;
        workspace.scrollTop += depth * 16 * factor;
        scrolled = Math.abs(workspace.scrollTop - before) > 0.1;
      }
    }
    gesture.lastScroll = workspace?.scrollTop ?? 0;
    const dy = rawDy + (workspace?.scrollTop ?? 0) - gesture.scrollTop;
    if (gesture.kind === 'resize') {
      const width = this.boardWidth();
      const original = gesture.initial.cards.find((card) => card.id === gesture.id)!;
      const minWidth = Math.min(CARD_GRID.minWidth, width);
      const columns =
        Math.abs(dx) < 0.5 || width < 2 * minWidth + CARD_GRID.gap
          ? original.columns
          : this.round(
              this.clamp(
                ((gesture.rect.width + dx + CARD_GRID.gap) * CARD_GRID.columns) /
                  (width + CARD_GRID.gap),
                CARD_GRID.minColumns,
                CARD_GRID.columns,
              ),
            );
      const desiredHeight = this.clamp(
        gesture.rect.height + dy,
        CARD_GRID.minRows * (CARD_GRID.rowHeight + CARD_GRID.gap) - CARD_GRID.gap,
        CARD_GRID.maxRows * (CARD_GRID.rowHeight + CARD_GRID.gap) - CARD_GRID.gap,
      );
      gesture.snapHeight =
        Math.abs(rawDy) >= 1
          ? assistedCardHeight(gesture.id, desiredHeight, gesture.slots, gesture.snapHeight)
          : null;
      this.heightAssist.set(
        gesture.snapHeight === null ? null : { id: gesture.id, height: gesture.snapHeight },
      );
      const rows = this.round(
        this.clamp(
          ((gesture.snapHeight ?? desiredHeight) + CARD_GRID.gap) /
            (CARD_GRID.rowHeight + CARD_GRID.gap),
          CARD_GRID.minRows,
          CARD_GRID.maxRows,
        ),
      );
      this.preview.set(
        resizeCard(gesture.initial, gesture.id, columns, rows, width, Math.abs(dx) >= 0.5),
      );
      return false;
    }
    const board = this.board()!.nativeElement.getBoundingClientRect();
    const viewport = workspace!.getBoundingClientRect();
    const valid =
      point.x >= Math.max(viewport.left, board.left - 24) &&
      point.x <= Math.min(viewport.right, board.right + 24) &&
      point.y >= Math.max(viewport.top, board.top - 16) &&
      point.y <= Math.min(viewport.bottom, board.bottom + 48);
    let mode: CardDropPreview['mode'] = 'origin';
    if (valid) {
      const drop = previewCardDrop(
        gesture.initial,
        gesture.id,
        gesture.slots,
        point.x - board.left,
        point.y - board.top,
        { left: gesture.rect.x + dx - board.left, width: this.boardWidth() },
      );
      mode = drop.mode;
      this.preview.set(drop.layout);
    } else this.preview.set(null);
    gesture.canvasHeight = Math.max(gesture.canvasHeight, this.resolved().height);
    // Antecipar na prévia a limitação de scroll que ocorrerá quando a área
    // temporária for retirada, para o destino não saltar ao soltar.
    const finalScrollMax = Math.max(
      0,
      gesture.externalHeight + this.resolved().height - viewport.height,
    );
    this.drag.set({
      id: gesture.id,
      x: gesture.rect.x + dx,
      y: gesture.rect.y + rawDy,
      width: gesture.rect.width,
      height: gesture.rect.height,
      valid,
      mode,
      canvasHeight: gesture.canvasHeight,
      offsetY: Math.max(0, (workspace?.scrollTop ?? 0) - finalScrollMax),
    });
    return scrolled;
  }
  pointerEnd(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (
      event.clientX !== gesture.lastX ||
      event.clientY !== gesture.lastY ||
      (this.workspace()?.scrollTop ?? 0) !== gesture.lastScroll
    )
      this.applyPoint({ x: event.clientX, y: event.clientY }, false);
    const next = this.preview();
    const commit = gesture.moved && (gesture.kind === 'resize' || this.drag()?.valid);
    if (commit && next) {
      this.state.commit(next);
      this.announce(gesture.id);
    }
    this.cancelGesture();
  }
  cancelGesture(): void {
    document.documentElement.classList.remove('fd-card-dragging');
    const gesture = this.gesture;
    this.gesture = null;
    gesture?.listeners.abort();
    const board = this.board()?.nativeElement;
    if (gesture) board?.classList.add('settling');
    if (gesture?.kind === 'move') {
      if (gesture.overlay.matches(':popover-open')) gesture.overlay.hidePopover();
      gesture.overlay.removeAttribute('popover');
      gesture.overlay.classList.remove('moving-card');
    }
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.pendingPoint = null;
    this.preview.set(null);
    this.drag.set(null);
    this.heightAssist.set(null);
    if (gesture?.handle.hasPointerCapture(gesture.pointerId))
      gesture.handle.releasePointerCapture(gesture.pointerId);
    if (gesture && !this.destroy.destroyed) {
      this.changeDetector.detectChanges();
      for (const box of this.resolved().cards) {
        const item = this.item(box.id);
        if (item)
          Object.assign(item.style, {
            left: box.x + 'px',
            top: box.y + 'px',
            width: box.width + 'px',
            height: box.height + 'px',
          });
      }
      // Resolver o estilo final antes de devolver as transições aos vizinhos.
      if (board) {
        void board.offsetHeight;
        requestAnimationFrame(() => board.classList.remove('settling'));
      }
    }
  }
  moveKey(event: KeyboardEvent, id: FinanceCardId): void {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) ||
      this.focused() ||
      this.state.restoring() ||
      this.confirming() ||
      this.gesture
    )
      return;
    event.preventDefault();
    if (event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const boxes = this.resolved().cards;
      const box = boxes.find((box) => box.id === id)!;
      const left = box.x + (event.key === 'ArrowLeft' ? -20 : 20);
      const drop = previewCardDrop(
        this.state.layout(),
        id,
        boxes,
        left + box.width / 2,
        box.y + box.height / 2,
        { left, width: this.boardWidth() },
      );
      if (drop.mode === 'place') {
        this.state.commit(drop.layout);
        this.announce(id);
      }
      return;
    }
    const index = this.cards().findIndex((item) => item.id === id);
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? this.cards().length - 1
          : this.clamp(
              index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1),
              0,
              this.cards().length - 1,
            );
    this.state.commit(reorderCard(this.state.layout(), id, target));
    this.announce(id);
    this.focusAfter('[data-focus-id="' + id + '"]');
  }
  resizeKey(event: KeyboardEvent, card: CardPlacement): void {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
      this.focused() ||
      this.state.restoring() ||
      this.confirming()
    )
      return;
    event.preventDefault();
    const columns = this.round(
      this.clamp(
        card.columns + (event.key === 'ArrowLeft' ? -0.25 : event.key === 'ArrowRight' ? 0.25 : 0),
        4,
        12,
      ),
    );
    const rows = this.round(
      this.clamp(
        card.rows + (event.key === 'ArrowUp' ? -0.25 : event.key === 'ArrowDown' ? 0.25 : 0),
        3,
        12,
      ),
    );
    this.state.commit(
      resizeCard(
        this.state.layout(),
        card.id,
        columns,
        rows,
        this.boardWidth(),
        ['ArrowLeft', 'ArrowRight'].includes(event.key),
      ),
    );
    this.announce(card.id);
  }
  toggleFocus(id: FinanceCardId): void {
    this.cancelGesture();
    const leaving = this.focused() === id;
    if (!leaving) {
      this.previousScroll = this.workspace()?.scrollTop ?? 0;
      if (this.workspace()) this.workspace()!.scrollTop = 0;
    }
    this.focused.set(leaving ? null : id);
    this.focusAfter('[data-focus-id="' + id + '"]');
    afterNextRender(
      () => {
        if (leaving && this.workspace()) this.workspace()!.scrollTop = this.previousScroll;
        else this.updateFocusHeight();
      },
      { injector: this.injector },
    );
  }
  windowResize(): void {
    this.cancelGesture();
    if (this.focused())
      afterNextRender(() => this.updateFocusHeight(), { injector: this.injector });
  }
  private updateFocusHeight(): void {
    const workspace = this.workspace(),
      board = this.board()?.nativeElement;
    if (workspace && board)
      this.focusHeight.set(
        Math.max(
          240,
          workspace.getBoundingClientRect().bottom - board.getBoundingClientRect().top - 24,
        ),
      );
  }
  escape(event: Event): void {
    if (this.gesture) {
      event.preventDefault();
      this.cancelGesture();
    } else if (document.querySelector(':popover-open')) return;
    else if (this.focused()) {
      event.preventDefault();
      this.toggleFocus(this.focused()!);
    }
  }
  private announce(id: FinanceCardId): void {
    this.announcement.set(this.headings[id] + ': layout ajustado.');
  }
  private focusAfter(selector: string): void {
    if (this.destroy.destroyed) return;
    afterNextRender(
      () =>
        this.element.nativeElement
          .querySelector<HTMLElement>(selector)
          ?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }
}
