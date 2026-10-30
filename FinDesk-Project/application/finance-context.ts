import { civilDate, type CivilDate } from '../domain/civil-date';
import { accountBalanceAt } from '../domain/finance';
import {
  convertForDisplay,
  sumMoney,
  type Currency,
  type ExchangeRate,
  type Money,
} from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';

export const ALL_ACCOUNTS = 'all';

export function moveCalendarMonth(anchor: CivilDate, offset: number): CivilDate | null {
  civilDate(anchor);
  if (!Number.isSafeInteger(offset)) throw new RangeError('Deslocamento de mês inválido.');
  const index = Number(anchor.slice(0, 4)) * 12 + Number(anchor.slice(5, 7)) - 1 + offset;
  if (!Number.isSafeInteger(index) || index < 12 || index >= 120000) return null;
  return civilDate(
    `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}-01`,
  );
}

export interface BalancePresentation {
  readonly originals: readonly {
    readonly accountId: string;
    readonly accountName: string;
    readonly value: Money;
  }[];
  readonly values: readonly Money[];
  readonly converted: boolean;
  readonly unavailable: boolean;
}

/** Saldo usa sempre a referência do snapshot, nunca o mês histórico selecionado. */
export function presentAccountBalance(
  snapshot: DemoSnapshot,
  accountId: string,
  currencyMode: FinancePreferences['currencyMode'],
  rate: ExchangeRate | null,
): BalancePresentation {
  const accounts = snapshot.facts.accounts.filter(
    (account) => accountId === ALL_ACCOUNTS || account.id === accountId,
  );
  if (!accounts.length) return { originals: [], values: [], converted: false, unavailable: true };
  const originals = accounts.map((account) => ({
    accountId: account.id,
    accountName: account.name,
    value: accountBalanceAt(snapshot.facts, account.id, snapshot.asOf),
  }));
  const currencies = [...new Set(originals.map((item) => item.value.currency))];
  const subtotals = currencies.map((currency) =>
    sumMoney(
      currency,
      originals.filter((item) => item.value.currency === currency).map((item) => item.value),
    ),
  );
  if (currencyMode === 'original') {
    return { originals, values: subtotals, converted: false, unavailable: false };
  }
  const target: Currency = currencyMode;
  const amounts: Money[] = [];
  let converted = false;
  for (const value of subtotals) {
    if (value.currency === target) amounts.push(value);
    else {
      const usableRate =
        rate &&
        rate.on <= snapshot.asOf &&
        (rate.from === value.currency && rate.to === target
          ? rate
          : rate.to === value.currency && rate.from === target
            ? {
                ...rate,
                from: rate.to,
                to: rate.from,
                numerator: rate.denominator,
                denominator: rate.numerator,
              }
            : null);
      if (!usableRate) return { originals, values: [], converted: false, unavailable: true };
      amounts.push(convertForDisplay(value, usableRate).converted);
      converted = true;
    }
  }
  return { originals, values: [sumMoney(target, amounts)], converted, unavailable: false };
}

/** Formata centavos sem converter o valor integral para ponto flutuante. */
export function formatMoney(value: Money): string {
  const amount = BigInt(value.minorUnits);
  const magnitude = amount < 0n ? -amount : amount;
  const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(
    magnitude / 100n,
  );
  return `${amount < 0n ? '-' : ''}${value.currency === 'BRL' ? 'R$' : 'US$'} ${whole},${String(magnitude % 100n).padStart(2, '0')}`;
}

export function formatCivilDate(date: CivilDate): string {
  civilDate(date);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}
