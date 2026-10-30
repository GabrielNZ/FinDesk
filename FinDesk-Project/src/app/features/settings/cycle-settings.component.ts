import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FinanceContext } from '../finance/finance-context.service';
import { AccountCycleSettings } from './account-cycle-settings.component';

@Component({
  selector: 'fd-cycle-settings',
  imports: [AccountCycleSettings],
  template: `
    <div class="cycle-settings" aria-labelledby="cycles-title">
      <h3 id="cycles-title">Ciclos por conta</h3>
      @if (context.state() === 'ready') {
        <p>Ajustes aplicados ao salvar. Datas confirmadas prevalecem.</p>
        @for (account of context.snapshot()!.facts.accounts; track account.id) {
          <fd-account-cycle-settings
            [account]="account"
            [cards]="context.snapshot()!.facts.cards"
            [asOf]="context.snapshot()!.asOf"
          />
        } @empty {
          <p>Nenhuma conta disponível.</p>
        }
      } @else if (context.state() === 'failed') {
        <p role="alert">{{ context.error() }}</p>
        <button type="button" (click)="context.load()">Tentar novamente</button>
      } @else {
        <p role="status">Carregando contas…</p>
      }
    </div>
  `,
  styles: `
    .cycle-settings {
      margin-top: 20px;
    }
    h3 {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 10px;
    }
    p {
      margin-bottom: 14px;
    }
    button {
      border: 1px solid var(--fd-border);
      background: transparent;
      color: var(--fd-text);
      padding: 8px 12px;
      border-radius: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleSettings {
  readonly context = inject(FinanceContext);
  constructor() {
    void this.context.load();
  }
}
