import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';

type StatementArea = 'statement' | 'grouping';

@Component({
  selector: 'fd-statement-source-switch',
  templateUrl: './statement-source-switch.html',
  styleUrl: './statement-source-switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementSourceSwitch {
  readonly area = input<StatementArea>('statement');
  readonly areaChanged = output<StatementArea>();
  readonly position = signal({ x: 0, width: 0 });
  readonly ready = signal(false);
  readonly dragging = signal(false);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly injector = inject(Injector);
  private stop: (() => void) | null = null;
  private ignoreClickUntil = 0;

  constructor() {
    effect(() => {
      this.area();
      untracked(() => {
        this.stop?.();
        afterNextRender(() => this.sync(), { injector: this.injector });
      });
    });
    let observer: ResizeObserver | undefined;
    afterNextRender(() => {
      observer = new ResizeObserver(() => {
        if (!this.dragging()) this.sync();
      });
      const track = this.track()?.nativeElement;
      if (track) observer.observe(track);
      this.sync();
    });
    inject(DestroyRef).onDestroy(() => {
      this.stop?.();
      observer?.disconnect();
    });
  }

  private button(area: StatementArea): HTMLElement | null {
    return this.track()?.nativeElement.querySelector(`#finance-source-${area}`) ?? null;
  }
  private sync(area = this.area()): void {
    const button = this.button(area);
    if (!button) return;
    this.position.set({ x: button.offsetLeft, width: button.offsetWidth });
    this.ready.set(true);
  }
  choose(area: StatementArea): void {
    if (performance.now() < this.ignoreClickUntil) {
      this.ignoreClickUntil = 0;
      return;
    }
    this.areaChanged.emit(area);
  }
  navigate(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const area =
      event.key === 'Home'
        ? 'statement'
        : event.key === 'End'
          ? 'grouping'
          : this.area() === 'statement'
            ? 'grouping'
            : 'statement';
    this.areaChanged.emit(area);
    this.button(area)?.focus({ preventScroll: true });
  }
  start(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary) return;
    this.ignoreClickUntil = 0;
    const track = this.track()?.nativeElement;
    if (!track) return;
    this.stop?.();
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const rect = track.getBoundingClientRect();
    const original = this.area();
    const offset = Math.max(
      0,
      Math.min(this.position().width, event.clientX - rect.left - this.position().x),
    );
    let moving = false;
    let ended = false;
    let next = original;
    const paint = (x: number) => {
      const local = x - rect.left;
      next = local < this.button('grouping')!.offsetLeft ? 'statement' : 'grouping';
      const width = this.button(next)!.offsetWidth;
      this.position.set({
        x: Math.max(0, Math.min(rect.width - width, local - offset)),
        width,
      });
    };
    const finish = (commit: boolean) => {
      if (ended) return;
      ended = true;
      controller.abort();
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      this.dragging.set(false);
      this.stop = null;
      if (moving) this.ignoreClickUntil = performance.now() + 150;
      this.sync(commit && moving ? next : original);
      if (commit && moving) {
        this.areaChanged.emit(next);
        this.button(next)?.focus({ preventScroll: true });
      }
    };
    this.stop = () => finish(false);
    window.addEventListener(
      'pointermove',
      (move) => {
        if (move.pointerId !== event.pointerId) return;
        if (!moving) {
          const dx = Math.abs(move.clientX - event.clientX),
            dy = Math.abs(move.clientY - event.clientY);
          if (dy > 6 && dy > dx) {
            finish(false);
            return;
          }
          if (dx < 6) return;
          moving = true;
          this.dragging.set(true);
          track.setPointerCapture(event.pointerId);
        }
        move.preventDefault();
        paint(move.clientX);
      },
      { ...options, passive: false },
    );
    window.addEventListener(
      'pointerup',
      (up) => {
        if (up.pointerId !== event.pointerId) return;
        if (moving) paint(up.clientX);
        finish(true);
      },
      options,
    );
    window.addEventListener('pointercancel', () => finish(false), options);
    window.addEventListener('blur', () => finish(false), options);
    track.addEventListener('lostpointercapture', () => finish(false), options);
    window.addEventListener(
      'keydown',
      (key) => {
        if (key.key !== 'Escape') return;
        key.preventDefault();
        key.stopImmediatePropagation();
        finish(false);
      },
      { ...options, capture: true },
    );
  }
}
