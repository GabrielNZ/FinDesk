import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FinanceContext } from './finance-context.service';

@Component({
  selector: 'fd-finance-subpage',
  template: `
    <section class="finance-content" [attr.aria-label]="route()['label']">
      <h2>{{ route()['label'] }}</h2>
      @if (route()['section'] === 'cartao' && !context.hasCard()) {
        <p>Esta conta não possui cartão na demonstração.</p>
      } @else {
        <p>{{ route()['pending'] }}</p>
      }
    </section>
  `,
  styles: `
    .finance-content {
      border: 1px solid var(--fd-border);
      border-radius: var(--fd-radius);
      padding: 26px;
      min-height: 180px;
    }
    h2 {
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 12px;
    }
    p {
      color: var(--fd-muted);
      font-size: 13px;
      line-height: 1.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceSubpage {
  readonly context = inject(FinanceContext);
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly route = toSignal(this.activatedRoute.data, {
    initialValue: this.activatedRoute.snapshot.data,
  });
}
