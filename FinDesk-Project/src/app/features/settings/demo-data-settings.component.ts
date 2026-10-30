import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DemoDataService } from './demo-data.service';

@Component({
  selector: 'fd-demo-data-settings',
  imports: [ButtonModule],
  providers: [DemoDataService],
  templateUrl: './demo-data-settings.component.html',
  styleUrl: './demo-data-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoDataSettings {
  readonly data = inject(DemoDataService);
  readonly confirming = signal(false);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly restoreButton = viewChild<ElementRef<HTMLButtonElement>>('restoreButton');
  private readonly retryButton = viewChild<ElementRef<HTMLButtonElement>>('retryButton');

  requestConfirmation(): void {
    if (this.data.state() !== 'available') return;
    this.data.feedback.set(null);
    this.confirming.set(true);
    this.focusAfterRender(() => this.cancelButton());
  }

  cancelConfirmation(): void {
    if (this.data.state() === 'restoring') return;
    this.confirming.set(false);
    this.focusAfterRender(() => this.restoreButton());
  }

  async confirmRestore(): Promise<void> {
    if (!this.confirming() || this.data.state() !== 'available') return;
    await this.data.restore();
    this.confirming.set(false);
    this.focusAfterRender(() =>
      this.data.state() === 'failed' ? this.retryButton() : this.restoreButton(),
    );
  }

  async verifyStorage(): Promise<void> {
    await this.data.check();
    this.focusAfterRender(() =>
      this.data.state() === 'available' ? this.restoreButton() : this.retryButton(),
    );
  }

  private focusAfterRender(target: () => ElementRef<HTMLButtonElement> | undefined): void {
    if (this.destroyRef.destroyed) return;
    afterNextRender(() => target()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }
}
