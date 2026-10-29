import { civilDate, dateRange, fixedClock, type Clock } from '../../domain/civil-date';
import { money, type ExchangeRate } from '../../domain/money';
import type { CashMovement, FinanceFacts, Origin } from '../../domain/finance-facts';

export interface DemoScenario {
  readonly id: string;
  readonly version: 1;
  readonly environment: 'demo';
  readonly timezone: 'America/Sao_Paulo';
  readonly clock: Clock;
  readonly facts: FinanceFacts;
  readonly exchangeRate: ExchangeRate;
}

/** Dados inventados. Cada chamada devolve um conjunto independente, sem seed ou I/O. */
export function createDemoScenario(): DemoScenario {
  const brl = (amount: number) => money(amount, 'BRL');
  const date = civilDate;
  const origin = (externalId: string): Origin => ({
    kind: 'file',
    sourceId: 'demo-statement',
    externalId,
  });
  const movement = (id: string, on: string, delta: number) => ({
    id,
    accountId: 'demo-a',
    on: date(on),
    delta: brl(delta),
    description: id,
    origin: origin(id),
  });
  const futureInvoices = [
    ['fat-nov', '2026-11-02', '2026-11-10'],
    ['fat-dez', '2026-12-02', '2026-12-10'],
    ['fat-jan', '2027-01-02', '2027-01-10'],
    ['fat-fev', '2027-02-02', '2027-02-10'],
    ['fat-mar', '2027-03-02', '2027-03-10'],
    ['fat-abr', '2027-04-02', '2027-04-10'],
  ] as const;
  const purchases = [
    ['compra-merc-set', '2026-09-15', 10000, 1, 'alimentacao', 'mercado', null],
    ['compra-netflix-set', '2026-09-21', 3990, 1, 'entretenimento', 'netflix', 'sub-card'],
    ['compra-outra-set', '2026-09-23', 12010, 1, 'casa', 'loja', null],
    ['compra-6x', '2026-10-20', 120000, 6, 'casa', 'loja', null],
    ['compra-netflix-out', '2026-10-21', 4990, 1, 'entretenimento', 'netflix', 'sub-card'],
    ['compra-3x', '2026-10-22', 10000, 3, 'casa', 'loja', null],
  ] as const;
  const accounts = [
    {
      id: 'demo-a',
      name: 'Nubank · demonstração',
      openingOn: date('2026-09-30'),
      openingBalance: brl(100000),
    },
    {
      id: 'demo-b',
      name: 'Conta auxiliar · demonstração',
      openingOn: date('2026-09-30'),
      openingBalance: brl(20000),
    },
    {
      id: 'demo-u',
      name: 'Nomad · demonstração, sem cartão',
      openingOn: date('2026-09-30'),
      openingBalance: money(30000, 'USD'),
    },
  ];
  return {
    id: 'demo-financas-v1',
    version: 1,
    environment: 'demo',
    timezone: 'America/Sao_Paulo',
    clock: fixedClock(date('2026-10-29')),
    exchangeRate: {
      from: 'USD',
      to: 'BRL',
      numerator: 5,
      denominator: 1,
      on: date('2026-10-29'),
      source: 'cotacao-ficticia-v1',
      nature: 'fictitious',
    },
    facts: {
      accounts,
      movements: [
        { ...movement('mov-sal', '2026-10-02', 300000), kind: 'income', salaryId: 'sal-out' },
        {
          ...movement('mov-tr-a', '2026-10-07', -40000),
          kind: 'own-transfer',
          transferId: 'tr-demo',
          counterpartAccountId: 'demo-b',
        },
        {
          ...movement('mov-tr-b', '2026-10-07', 40000),
          accountId: 'demo-b',
          kind: 'own-transfer',
          transferId: 'tr-demo',
          counterpartAccountId: 'demo-a',
        },
        ...['mov-uber-1', 'mov-uber-2'].map((id): CashMovement => ({
          ...movement(id, '2026-10-08', -3000),
          kind: 'expense',
          merchantId: 'uber',
          categoryId: 'transporte',
          subscriptionId: null,
        })),
        {
          ...movement('mov-merc', '2026-10-10', -18000),
          kind: 'expense',
          merchantId: 'mercado',
          categoryId: 'alimentacao',
          subscriptionId: null,
        },
        {
          ...movement('mov-fat-out', '2026-10-10', -26000),
          kind: 'invoice-payment',
          invoiceId: 'fat-out',
        },
        {
          ...movement('mov-mensal', '2026-10-12', -3990),
          kind: 'expense',
          merchantId: 'servico-mensal',
          categoryId: 'entretenimento',
          subscriptionId: 'sub-conta',
        },
        {
          ...movement('mov-energia', '2026-10-15', -12000),
          kind: 'expense',
          merchantId: 'energia',
          categoryId: 'casa',
          subscriptionId: null,
        },
        {
          ...movement('mov-anual', '2026-10-20', -23990),
          kind: 'expense',
          merchantId: 'servico-anual',
          categoryId: 'entretenimento',
          subscriptionId: 'sub-anual',
        },
        {
          ...movement('mov-aporte', '2026-10-23', -20000),
          kind: 'investment-contribution',
          investmentId: 'aporte-demo',
        },
      ],
      cards: [
        {
          id: 'card-demo',
          accountId: 'demo-a',
          lastDigits: '0000',
          totalLimit: brl(300000),
          usedLimit: brl(180000),
          availableLimit: brl(120000),
          limitSource: 'manual fictícia',
        },
      ],
      purchases: purchases.map(
        ([id, purchasedOn, total, installmentCount, categoryId, merchantId, subscriptionId]) => ({
          id,
          cardId: 'card-demo',
          purchasedOn: date(purchasedOn),
          total: brl(total),
          installmentCount,
          scheduleCoverage: 'complete',
          categoryId,
          merchantId,
          subscriptionId,
          origin: origin(id),
        }),
      ),
      invoices: [
        {
          id: 'fat-out',
          cardId: 'card-demo',
          closesOn: date('2026-10-02'),
          dueOn: date('2026-10-10'),
          status: 'paid',
          confirmedTotal: brl(26000),
          paidByMovementId: 'mov-fat-out',
        },
        ...futureInvoices.map(([id, closesOn, dueOn]) => ({
          id,
          cardId: 'card-demo',
          closesOn: date(closesOn),
          dueOn: date(dueOn),
          status: id === 'fat-nov' ? ('open' as const) : ('future' as const),
          confirmedTotal: null,
          paidByMovementId: null,
        })),
      ],
      invoiceItems: [
        ...(['compra-merc-set', 'compra-netflix-set', 'compra-outra-set'] as const).map(
          (purchaseId, index) => ({
            id: `item-out-${index + 1}`,
            invoiceId: 'fat-out',
            purchaseId,
            installmentNumber: 1,
            amount: brl([10000, 3990, 12010][index]!),
          }),
        ),
        ...futureInvoices.map(([invoiceId], index) => ({
          id: `item-6x-${index + 1}`,
          invoiceId,
          purchaseId: 'compra-6x',
          installmentNumber: index + 1,
          amount: brl(20000),
        })),
        {
          id: 'item-netflix-out',
          invoiceId: 'fat-nov',
          purchaseId: 'compra-netflix-out',
          installmentNumber: 1,
          amount: brl(4990),
        },
        ...futureInvoices.slice(0, 3).map(([invoiceId], index) => ({
          id: `item-3x-${index + 1}`,
          invoiceId,
          purchaseId: 'compra-3x',
          installmentNumber: index + 1,
          amount: brl([3334, 3333, 3333][index]!),
        })),
      ].map((item) => ({ ...item, nature: 'observed' as const })),
      salaries: [
        {
          id: 'sal-out',
          accountId: 'demo-a',
          expectedOn: date('2026-10-05'),
          expectedAmount: brl(300000),
        },
        {
          id: 'sal-nov',
          accountId: 'demo-a',
          expectedOn: date('2026-11-05'),
          expectedAmount: brl(300000),
        },
      ],
      subscriptions: [
        {
          id: 'sub-conta',
          periodicity: 'monthly',
          billingAmount: brl(3990),
          nextExpectedOn: date('2026-11-12'),
        },
        {
          id: 'sub-anual',
          periodicity: 'annual',
          billingAmount: brl(23990),
          nextExpectedOn: date('2027-10-20'),
        },
        {
          id: 'sub-card',
          periodicity: 'monthly',
          billingAmount: brl(4990),
          nextExpectedOn: date('2026-11-21'),
        },
      ],
      coverage: accounts.map((account) => ({
        accountId: account.id,
        sourceId: 'demo-statement',
        range: dateRange(date('2026-10-01'), date('2026-10-29')),
        lastAttemptAt: '2026-10-29T12:00:00.000Z',
        lastSuccessAt: '2026-10-29T12:00:00.000Z',
        status: 'current',
      })),
    },
  };
}

export function createUncategorizedScenario(): DemoScenario {
  const base = createDemoScenario();
  return {
    ...base,
    id: 'demo-c09',
    facts: {
      ...base.facts,
      movements: [
        ...base.facts.movements,
        {
          id: 'mov-sem-categoria',
          accountId: 'demo-a',
          on: civilDate('2026-10-24'),
          delta: money(-2000, 'BRL'),
          description: 'Despesa sem categoria · demonstração',
          kind: 'expense',
          categoryId: null,
          merchantId: null,
          subscriptionId: null,
          origin: { kind: 'manual', sourceId: 'demo-manual', externalId: null },
        },
      ],
    },
  };
}

export function createLateSalaryScenario(received: boolean): DemoScenario {
  const base = createDemoScenario();
  const asOf = civilDate(received ? '2026-11-09' : '2026-11-07');
  return {
    ...base,
    id: received ? 'demo-c18-received' : 'demo-c18-pending',
    clock: fixedClock(asOf),
    facts: {
      ...base.facts,
      coverage: base.facts.coverage.map((coverage) => ({
        ...coverage,
        range: dateRange(coverage.range.start, asOf),
        lastAttemptAt: `${asOf}T12:00:00.000Z`,
        lastSuccessAt: `${asOf}T12:00:00.000Z`,
      })),
      movements: received
        ? [
            ...base.facts.movements,
            {
              id: 'mov-sal-nov',
              accountId: 'demo-a',
              on: civilDate('2026-11-09'),
              delta: money(300000, 'BRL'),
              description: 'Salário recebido em atraso · demonstração',
              kind: 'income',
              salaryId: 'sal-nov',
              origin: { kind: 'file', sourceId: 'demo-statement', externalId: 'mov-sal-nov' },
            },
          ]
        : base.facts.movements,
    },
  };
}
