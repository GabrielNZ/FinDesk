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
    loadComponent: () => import('./features/finance/finance.page').then((m) => m.FinancePage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'geral' },
      ...[
        { path: 'geral', label: 'Geral', pending: 'Resumo financeiro ainda não implementado.' },
        {
          path: 'movimentacoes',
          label: 'Movimentações',
          pending: 'Extrato ainda não implementado.',
        },
        { path: 'cartao', label: 'Cartão', pending: 'Faturas e compras ainda não implementadas.' },
        {
          path: 'compromissos',
          label: 'Compromissos',
          pending: 'Agenda de compromissos ainda não implementada.',
        },
        {
          path: 'assinaturas',
          label: 'Assinaturas',
          pending: 'Gestão de assinaturas ainda não implementada.',
        },
      ].map((page) => ({
        path: page.path,
        title: `${page.label} · Finanças · FinDesk`,
        data: { section: page.path, label: page.label, pending: page.pending },
        loadComponent: () =>
          import('./features/finance/finance-subpage').then((m) => m.FinanceSubpage),
      })),
    ],
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
