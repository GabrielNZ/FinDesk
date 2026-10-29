import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
  {
    path: 'visao-geral',
    title: 'Visão geral · FinDesk',
    loadComponent: () => import('./features/overview/overview.page').then((m) => m.OverviewPage),
  },
  {
    path: 'financas',
    title: 'Finanças · FinDesk',
    data: {
      title: 'Finanças',
      icon: 'pi-wallet',
      description: 'Contas, movimentações e cartão de crédito.',
      areas: ['Contas e movimentações', 'Cartão e faturas', 'Compras e parcelas'],
      emptyTitle: 'Nenhuma movimentação',
      emptyDescription: 'Dados fictícios ainda não adicionados.',
    },
    loadComponent: () =>
      import('./features/planned-area/planned-area.page').then((m) => m.PlannedAreaPage),
  },
  {
    path: 'investimentos',
    title: 'Investimentos · FinDesk',
    data: {
      title: 'Investimentos',
      icon: 'pi-chart-line',
      description: 'Carteira, movimentações e simulações.',
      areas: ['Carteira em reais e dólares', 'Posições e movimentações', 'Simulador de patrimônio'],
      emptyTitle: 'Nenhuma posição de investimento',
      emptyDescription: 'Dados fictícios ainda não adicionados.',
    },
    loadComponent: () =>
      import('./features/planned-area/planned-area.page').then((m) => m.PlannedAreaPage),
  },
  {
    path: 'configuracoes',
    title: 'Configurações · FinDesk',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'configuracoes/identidade',
    title: 'Propostas de identidade · FinDesk',
    loadComponent: () => import('./features/identity/identity.page').then((m) => m.IdentityPage),
  },
  { path: '**', redirectTo: 'visao-geral' },
];
