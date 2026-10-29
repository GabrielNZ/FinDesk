import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { dockTarget, isHorizontal, type NavigationPosition } from './navigation-geometry';

interface DockGesture {
  pointerId: number;
  target: HTMLElement;
  startX: number;
  startY: number;
  frame: DOMRect;
  moved: boolean;
  listeners: AbortController;
}

/** Reposicionamento e recolhimento da navegação. Sem redimensionamento manual ou persistência. */
@Injectable({ providedIn: 'root' })
export class NavigationLayout {
  readonly position = signal<NavigationPosition>('left');
  readonly collapsed = signal(window.matchMedia('(max-width: 760px)').matches);
  readonly viewport = signal({ width: window.innerWidth, height: window.innerHeight });
  readonly sideWidth = computed(() => (this.viewport().width <= 1100 ? 200 : 228));
  readonly horizontal = computed(() => isHorizontal(this.position()));
  readonly compactLabels = computed(
    () => this.collapsed() || (this.horizontal() && this.viewport().width < 1100),
  );
  readonly size = computed(() =>
    this.horizontal() ? (this.collapsed() ? 56 : 88) : this.collapsed() ? 72 : this.sideWidth(),
  );
  readonly dragging = signal(false);
  readonly animatingToggle = signal(false);
  readonly candidate = signal<NavigationPosition | null>(null);
  readonly previewSize = computed(() => {
    const edge = this.candidate();
    return edge
      ? isHorizontal(edge)
        ? this.collapsed()
          ? 56
          : 88
        : this.collapsed()
          ? 72
          : this.sideWidth()
      : 0;
  });
  readonly toggleIcon = computed(() => {
    const inward: Record<NavigationPosition, string> = {
      left: 'right',
      right: 'left',
      top: 'down',
      bottom: 'up',
    };
    const outward: Record<NavigationPosition, string> = {
      left: 'left',
      right: 'right',
      top: 'up',
      bottom: 'down',
    };
    return `pi pi-angle-double-${(this.collapsed() ? inward : outward)[this.position()]}`;
  });

  private gesture: DockGesture | null = null;
  private ignoreClickUntil = 0;
  private animationTimer: number | undefined;

  constructor() {
    const lifetime = new AbortController();
    window.addEventListener(
      'resize',
      () => {
        this.finishGesture(false);
        this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
      },
      { signal: lifetime.signal },
    );
    inject(DestroyRef).onDestroy(() => {
      this.finishGesture(false);
      this.stopAnimation();
      lifetime.abort();
    });
  }

  toggleCollapsed(): void {
    this.stopAnimation();
    this.animatingToggle.set(true);
    this.collapsed.update((value) => !value);
    this.animationTimer = window.setTimeout(() => this.animatingToggle.set(false), 220);
  }

  moveTo(position: NavigationPosition): void {
    this.stopAnimation();
    this.position.set(position);
  }

  wasDragged(): boolean {
    return performance.now() < this.ignoreClickUntil;
  }

  startDock(event: PointerEvent, frame: HTMLElement): void {
    if (this.gesture || event.button !== 0 || !event.isPrimary) return;
    const target = event.currentTarget as HTMLElement;
    event.preventDefault();
    this.stopAnimation();
    target.focus({ preventScroll: true });
    const listeners = new AbortController();
    this.gesture = {
      pointerId: event.pointerId,
      target,
      startX: event.clientX,
      startY: event.clientY,
      frame: frame.getBoundingClientRect(),
      moved: false,
      listeners,
    };
    target.setPointerCapture(event.pointerId);
    const options = { signal: listeners.signal };
    window.addEventListener('pointermove', (move) => this.movePointer(move), options);
    window.addEventListener(
      'pointerup',
      (up) => {
        if (up.pointerId !== this.gesture?.pointerId) return;
        this.movePointer(up);
        this.finishGesture(true);
      },
      options,
    );
    window.addEventListener(
      'pointercancel',
      (cancel) => {
        if (cancel.pointerId === this.gesture?.pointerId) this.finishGesture(false);
      },
      options,
    );
    window.addEventListener('blur', () => this.finishGesture(false), options);
    window.addEventListener(
      'keydown',
      (key) => {
        if (key.key === 'Escape') {
          key.preventDefault();
          this.finishGesture(false);
        }
      },
      options,
    );
    target.addEventListener('lostpointercapture', () => this.finishGesture(false), options);
  }

  private movePointer(event: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    gesture.moved ||=
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 6;
    if (gesture.moved) {
      this.dragging.set(true);
      this.candidate.set(dockTarget(event.clientX, event.clientY, gesture.frame));
    }
  }

  private finishGesture(commit: boolean): void {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = null;
    gesture.listeners.abort();
    if (gesture.moved) this.ignoreClickUntil = performance.now() + 250;
    const target = this.candidate();
    if (commit && gesture.moved && target) this.moveTo(target);
    this.candidate.set(null);
    this.dragging.set(false);
    if (gesture.target.hasPointerCapture(gesture.pointerId))
      gesture.target.releasePointerCapture(gesture.pointerId);
  }

  private stopAnimation(): void {
    if (this.animationTimer !== undefined) window.clearTimeout(this.animationTimer);
    this.animatingToggle.set(false);
  }
}
