/** Gesto de seleção, independente da organização do layout e dos dados financeiros. */
export class StatementDrag {
  private stop: (() => void) | null = null;

  constructor(
    private readonly zone: () => HTMLElement | undefined,
    private readonly onState: (id: string | null, valid: boolean) => void,
    private readonly onDrop: (id: string) => void,
    private readonly suppressClick: () => void,
  ) {}

  start(event: PointerEvent, id: string, label: string, amount: string, flow: number): void {
    if (event.button !== 0 || !event.isPrimary || event.pointerType === 'touch') return;
    this.cancel();
    const source = event.currentTarget as HTMLElement;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const origin = { x: event.clientX, y: event.clientY };
    let point = origin;
    let moving = false;
    let valid = false;
    let frame = 0;
    let ended = false;
    let ghost: HTMLDivElement | null = null;

    const paint = () => {
      frame = 0;
      if (!ghost) return;
      ghost.style.left = `${point.x + 14}px`;
      ghost.style.top = `${point.y + 14}px`;
      const box = this.zone()?.getBoundingClientRect();
      const next =
        !!box &&
        point.x >= Math.max(0, box.left) &&
        point.x <= Math.min(window.innerWidth, box.right) &&
        point.y >= Math.max(0, box.top) &&
        point.y <= Math.min(window.innerHeight, box.bottom);
      if (next !== valid) {
        valid = next;
        this.onState(id, valid);
      }
    };
    const finish = (commit: boolean) => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      frame = 0;
      if (moving) {
        paint();
        this.suppressClick();
      }
      const accepted = commit && moving && valid;
      controller.abort();
      if (ghost) {
        ghost.hidePopover();
        ghost.remove();
        ghost = null;
      }
      if (source.hasPointerCapture(event.pointerId)) source.releasePointerCapture(event.pointerId);
      document.body.classList.remove('fd-statement-dragging');
      this.onState(null, false);
      this.stop = null;
      if (accepted) this.onDrop(id);
    };
    this.stop = () => finish(false);
    window.addEventListener(
      'pointermove',
      (move) => {
        if (move.pointerId !== event.pointerId) return;
        point = { x: move.clientX, y: move.clientY };
        if (!moving && Math.hypot(point.x - origin.x, point.y - origin.y) < 6) return;
        move.preventDefault();
        if (!moving) {
          moving = true;
          source.setPointerCapture(event.pointerId);
          ghost = document.createElement('div');
          ghost.className = 'fd-statement-ghost';
          ghost.setAttribute('popover', 'manual');
          ghost.setAttribute('aria-hidden', 'true');
          const title = document.createElement('strong');
          title.textContent = label;
          const value = document.createElement('span');
          value.textContent = amount;
          if (flow) value.className = flow > 0 ? 'fd-flow-in' : 'fd-flow-out';
          ghost.append(title, value);
          ghost.style.left = `${point.x + 14}px`;
          ghost.style.top = `${point.y + 14}px`;
          document.body.append(ghost);
          ghost.showPopover();
          document.body.classList.add('fd-statement-dragging');
          this.onState(id, false);
        }
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
    window.addEventListener(
      'pointerout',
      (out) => {
        if (moving && out.pointerId === event.pointerId && !out.relatedTarget) finish(false);
      },
      options,
    );
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

  cancel(): void {
    this.stop?.();
  }
}
