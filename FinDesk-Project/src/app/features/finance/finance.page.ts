import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { formatMoney } from '../../../../application/finance-context';
import { FinanceContext } from './finance-context.service';
import { CircleSelector, type CircleChoice } from './circle-selector';
import { PeriodControl } from './period-control';
import { CardLayoutAction } from './cards/card-layout-action';
import { CardLayoutState } from './cards/card-layout.service';

@Component({
  selector: 'fd-finance-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    CircleSelector,
    PeriodControl,
    CardLayoutAction,
  ],
  templateUrl: './finance.page.html',
  styleUrl: './finance.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePage {
  readonly context = inject(FinanceContext);
  readonly cardLayout = inject(CardLayoutState);
  readonly money = formatMoney;
  readonly accountChoices = computed<readonly CircleChoice[]>(() => [
    ...(this.context.snapshot()?.facts.accounts ?? []).map((account): CircleChoice => ({
      value: account.id,
      label: account.name.split(' · demonstração')[0] ?? account.name,
      symbol: account.id === 'demo-a' ? 'nubank' : account.id === 'demo-u' ? 'nomad' : 'wallet',
    })),
    {
      value: 'all',
      label: 'Todas as contas',
      symbol: 'accounts',
      disabled: !this.context.snapshot()?.facts.accounts.length,
    },
  ]);
  readonly currencyChoices: readonly CircleChoice[] = [
    { value: 'original', label: 'Original', symbol: 'original' },
    { value: 'BRL', label: 'Real · BRL', symbol: 'brl' },
    { value: 'USD', label: 'Dólar · USD', symbol: 'usd' },
  ];
  readonly submenus = [
    { path: 'geral', label: 'Geral' },
    { path: 'movimentacoes', label: 'Movimentações' },
    { path: 'cartao', label: 'Cartão' },
    { path: 'compromissos', label: 'Compromissos' },
    { path: 'assinaturas', label: 'Assinaturas' },
  ];

  constructor() {
    void this.context.load();
  }
}
