import {
  adjacentCivilDate,
  civilDate,
  containsDate,
  dateRange,
  type CivilDate,
  type DateRange,
} from '../domain/civil-date';
import type { DemoSnapshot } from '../shared/storage-api';
import { ALL_ACCOUNTS } from './finance-context';

export type CycleMode = 'salary-cycle' | 'card-cycle';
export interface SavedPeriod {
  readonly key: string;
  readonly range: DateRange;
}
export interface CycleCatalogue {
  readonly periods: readonly SavedPeriod[];
  readonly currentKey: string | null;
  readonly unavailableReason: string | null;
}

const unavailable = (unavailableReason: string): CycleCatalogue => ({
  periods: [],
  currentKey: null,
  unavailableReason,
});

/** D37: somente datas salvas, sem gerar dia do mês, dia útil ou outra previsão. */
export function savedCyclePeriods(
  snapshot: DemoSnapshot,
  accountId: string,
  mode: CycleMode,
): CycleCatalogue {
  if (accountId === ALL_ACCOUNTS) return unavailable('Selecione uma conta para usar este ciclo.');
  if (!snapshot.facts.accounts.some((account) => account.id === accountId))
    return unavailable('Selecione uma conta.');
  let dates: CivilDate[];
  let reference: string;
  if (mode === 'salary-cycle') {
    dates = snapshot.facts.salaries
      .filter((salary) => salary.accountId === accountId)
      .map((salary) => civilDate(salary.expectedOn));
    reference = accountId;
  } else {
    const cards = snapshot.facts.cards.filter((card) => card.accountId === accountId);
    if (!cards.length) return unavailable('Esta conta não possui cartão.');
    if (cards.length > 1) return unavailable('É necessário definir um cartão de referência.');
    reference = cards[0]!.id;
    dates = snapshot.facts.invoices
      .filter((invoice) => invoice.cardId === reference)
      .map((invoice) => civilDate(invoice.closesOn));
  }
  const ordered = [...new Set(dates)].sort();
  if (ordered.length < 2)
    return unavailable(
      mode === 'salary-cycle'
        ? 'Sem duas datas previstas de salário nesta conta.'
        : 'Sem dois fechamentos salvos nesta conta.',
    );
  const periods: SavedPeriod[] = [];
  for (let index = 1; index < ordered.length; index++) {
    const before = ordered[index - 1]!;
    const after = ordered[index]!;
    const start = mode === 'salary-cycle' ? before : adjacentCivilDate(before, 1);
    const end = mode === 'salary-cycle' ? adjacentCivilDate(after, -1) : after;
    if (!start || !end) continue;
    const range = dateRange(start, end);
    periods.push({ key: `${mode}:${reference}:${start}/${end}`, range });
  }
  const currentKey =
    periods.find((period) => containsDate(period.range, snapshot.asOf))?.key ?? null;
  return {
    periods,
    currentKey,
    unavailableReason: currentKey ? null : 'Sem intervalo salvo para a data de referência.',
  };
}
