import { resizeStatementLayout } from '../../../../../application/statement-layout';
import type { StatementLayout } from '../../../../../shared/statement-layout';

export interface StatementResizeGeometry {
  width: number;
  height: number;
  available: number;
  gap: number;
  stacked: boolean;
}

export class StatementResize {
  private stop: (() => void) | null = null;
  constructor(
    private readonly layout: () => StatementLayout,
    private readonly geometry: () => StatementResizeGeometry | null,
    private readonly preview: (layout: StatementLayout) => void,
    private readonly commit: (layout: StatementLayout) => void,
    private readonly active: (active: boolean) => void,
  ) {}

  start(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary) return;
    const geometry = this.geometry();
    if (!geometry) return;
    this.cancel();
    event.preventDefault();
    event.stopPropagation();
    const original = this.layout();
    const source = event.currentTarget as HTMLElement;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    let point = { x: event.clientX, y: event.clientY };
    let frame = 0;
    let ended = false;
    let moved = false;
    let next = original;
    source.setPointerCapture(event.pointerId);
    const paint = () => {
      frame = 0;
      const dx = point.x - event.clientX;
      const dy = point.y - event.clientY;
      if (!moved && Math.hypot(dx, dy) < 1) return;
      if (!moved) {
        moved = true;
        this.active(true);
        document.body.classList.add('fd-statement-resizing');
      }
      next = resizeStatementLayout(original, geometry, dx, dy);
      this.preview(next);
    };
    const finish = (save: boolean) => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      frame = 0;
      if (save) paint();
      controller.abort();
      if (source.hasPointerCapture(event.pointerId)) source.releasePointerCapture(event.pointerId);
      document.body.classList.remove('fd-statement-resizing');
      this.active(false);
      this.stop = null;
      if (save && moved && JSON.stringify(next) !== JSON.stringify(original)) this.commit(next);
      else this.preview(original);
    };
    this.stop = () => finish(false);
    window.addEventListener(
      'pointermove',
      (move) => {
        if (move.pointerId !== event.pointerId) return;
        move.preventDefault();
        point = { x: move.clientX, y: move.clientY };
        if (!frame) frame = requestAnimationFrame(paint);
      },
      { ...options, passive: false },
    );
    window.addEventListener(
      'pointerup',
      (up) => {
        if (up.pointerId !== event.pointerId) return;
        point = { x: up.clientX, y: up.clientY };
        finish(true);
      },
      options,
    );
    window.addEventListener('pointercancel', () => finish(false), options);
    source.addEventListener('lostpointercapture', () => finish(false), options);
    window.addEventListener('blur', () => finish(false), options);
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

  key(event: KeyboardEvent): void {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-16, 0],
      ArrowRight: [16, 0],
      ArrowUp: [0, -16],
      ArrowDown: [0, 16],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    this.cancel();
    const geometry = this.geometry();
    if (!geometry) return;
    event.preventDefault();
    event.stopPropagation();
    const original = this.layout();
    const next = resizeStatementLayout(original, geometry, ...offset);
    if (JSON.stringify(next) !== JSON.stringify(original)) this.commit(next);
  }
  cancel(): void {
    this.stop?.();
  }
}
