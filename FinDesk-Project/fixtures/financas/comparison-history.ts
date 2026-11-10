import { civilDate } from '../../domain/civil-date';
import { accountBalanceAt, validateFacts } from '../../domain/finance';
import { addMoney, money } from '../../domain/money';
import type { CashMovement } from '../../domain/finance-facts';
import type { DemoSnapshot } from '../../shared/storage-api';

/** D136: setembro fictício, recebido uma vez; não é importação real. */
export function withSeptemberHistory(snapshot: DemoSnapshot): DemoSnapshot {
  if (snapshot.seedVersion === 2) return snapshot;
  if (snapshot.seedVersion !== 1) throw new Error('Versão fictícia incompatível.');
  const entries = [
    ['a-e1', 'demo-a', '03', 7000, 'entretenimento', 'servico-mensal'],
    ['a-e2', 'demo-a', '13', 6000, 'entretenimento', 'servico-mensal'],
    ['a-e3', 'demo-a', '24', 11000, 'entretenimento', 'servico-mensal'],
    ['a-e4', 'demo-a', '28', 8000, 'entretenimento', 'servico-mensal'],
    ['a-t1', 'demo-a', '05', 4000, 'transporte', 'uber'],
    ['a-t2', 'demo-a', '18', 5000, 'transporte', 'uber'],
    ['a-a1', 'demo-a', '04', 5000, 'alimentacao', 'mercado'],
    ['a-a2', 'demo-a', '12', 5000, 'alimentacao', 'mercado'],
    ['a-a3', 'demo-a', '26', 3000, 'alimentacao', 'mercado'],
    ['a-c1', 'demo-a', '15', 9000, 'casa', 'energia'],
    ['b-c1', 'demo-b', '10', 2000, 'casa', 'energia'],
    ['u-a1', 'demo-u', '07', 500, 'alimentacao', 'mercado'],
    ['u-a2', 'demo-u', '22', 900, 'alimentacao', 'mercado'],
  ] as const;
  const names = {
    entretenimento: 'Lazer',
    transporte: 'Transporte',
    alimentacao: 'Alimentação',
    casa: 'Casa',
  };
  const accounts = new Map(snapshot.facts.accounts.map((a) => [a.id, a]));
  for (const id of ['demo-a', 'demo-b', 'demo-u']) {
    const account = accounts.get(id);
    if (
      !account ||
      account.openingOn !== '2026-09-30' ||
      snapshot.facts.movements.some((m) => m.accountId === id && m.on <= account.openingOn)
    )
      throw new Error('Histórico existente incompatível com a ampliação fictícia.');
  }
  const additions: CashMovement[] = entries.map(
    ([key, accountId, day, amount, categoryId, merchantId]) => {
      const id = `demo-september-2026-${key}`;
      if (snapshot.facts.movements.some((m) => m.id === id))
        throw new Error('Identificador fictício já existente.');
      return {
        id,
        accountId,
        on: civilDate(`2026-09-${day}`),
        delta: money(-amount, accounts.get(accountId)!.openingBalance.currency),
        description: `${names[categoryId]} · setembro fictício`,
        kind: 'expense',
        categoryId,
        merchantId,
        subscriptionId: null,
        origin: { kind: 'file', sourceId: 'demo-statement', externalId: id },
      };
    },
  );
  const next: DemoSnapshot = {
    ...snapshot,
    seedVersion: 2,
    facts: {
      ...snapshot.facts,
      movements: [...snapshot.facts.movements, ...additions],
      accounts: snapshot.facts.accounts.map((account) => {
        const spent = additions.filter((m) => m.accountId === account.id);
        if (!spent.length) return account;
        const openingBalance = spent.reduce(
          (balance, m) => addMoney(balance, money(-m.delta.minorUnits, m.delta.currency)),
          account.openingBalance,
        );
        return { ...account, openingOn: civilDate('2026-08-31'), openingBalance };
      }),
      coverage: snapshot.facts.coverage.map((c) =>
        c.sourceId === 'demo-statement' && c.range.start === '2026-10-01'
          ? { ...c, range: { ...c.range, start: civilDate('2026-09-01') } }
          : c,
      ),
    },
  };
  validateFacts(next.facts);
  for (const id of ['demo-a', 'demo-b', 'demo-u']) {
    for (const on of [civilDate('2026-09-30'), snapshot.asOf]) {
      if (
        accountBalanceAt(snapshot.facts, id, on).minorUnits !==
        accountBalanceAt(next.facts, id, on).minorUnits
      )
        throw new Error('Saldo alterado pela ampliação fictícia.');
    }
  }
  return next;
}
