import {
  adjacentCivilDate,
  civilDate,
  containsDate,
  dateRange,
  monthlyCivilDate,
  type CivilDate,
  type DateRange,
} from '../domain/civil-date';
import type { AccountCycleReference, DemoSnapshot } from '../shared/storage-api';
import { ALL_ACCOUNTS, moveCalendarMonth } from './finance-context';

export type CycleMode = 'salary-cycle' | 'card-cycle';
export interface SavedPeriod {
  readonly key: string;
  readonly range: DateRange;
}

/** D47–D52: intervalos previstos; nunca cria fatos, valores ou recebimentos. */
export function configuredSalaryPeriods(
  snapshot: DemoSnapshot,
  accountId: string,
  rule: AccountCycleReference,
  through: CivilDate = snapshot.asOf,
): CycleCatalogue {
  const saved = savedCyclePeriods(snapshot, accountId, 'salary-cycle');
  if (
    rule.accountId !== accountId ||
    accountId === ALL_ACCOUNTS ||
    !snapshot.facts.accounts.some((account) => account.id === accountId)
  )
    return unavailable('Selecione uma conta para usar este ciclo.');
  if (rule.salaryDay === null || rule.salaryFrom === null) return saved;
  if (!Number.isInteger(rule.salaryDay) || rule.salaryDay < 1 || rule.salaryDay > 31)
    return unavailable('Dia salarial inválido.');
  civilDate(rule.salaryFrom);
  civilDate(through);
  const byMonth = new Map<string, Set<CivilDate>>();
  for (const salary of snapshot.facts.salaries.filter((item) => item.accountId === accountId)) {
    const on = civilDate(salary.expectedOn);
    const key = on.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, new Set());
    byMonth.get(key)!.add(on);
  }
  const anchor = (month: CivilDate): CivilDate => {
    const dates = byMonth.get(month.slice(0, 7));
    if (dates && dates.size > 1) throw new RangeError('Previsões salariais ambíguas.');
    return dates?.values().next().value ?? monthlyCivilDate(month, rule.salaryDay!);
  };
  try {
    let firstMonth = moveCalendarMonth(rule.salaryFrom, 0)!;
    if (anchor(firstMonth) > rule.salaryFrom) {
      const previous = moveCalendarMonth(firstMonth, -1);
      if (!previous) return saved;
      firstMonth = previous;
    }
    const lastFocus = through > snapshot.asOf ? through : snapshot.asOf;
    const upper = moveCalendarMonth(lastFocus, 2) ?? civilDate('9999-12-01');
    const anchors: CivilDate[] = [];
    for (
      let month: CivilDate | null = firstMonth;
      month && month <= upper;
      month = moveCalendarMonth(month, 1)
    )
      anchors.push(anchor(month));
    const periods: SavedPeriod[] = saved.periods.filter(
      (period) => period.range.end < anchor(firstMonth),
    );
    for (let index = 1; index < anchors.length; index++) {
      const start = anchors[index - 1]!;
      const end = adjacentCivilDate(anchors[index]!, -1);
      if (!end) continue;
      periods.push({
        key: `salary-cycle:${accountId}:${start}/${end}`,
        range: dateRange(start, end),
      });
    }
    periods.sort((a, b) => a.range.start.localeCompare(b.range.start));
    const currentKey =
      periods.find((period) => containsDate(period.range, snapshot.asOf))?.key ?? null;
    return {
      periods,
      currentKey,
      unavailableReason: currentKey ? null : 'Sem intervalo disponível para a data de referência.',
    };
  } catch {
    return unavailable('Mais de uma previsão salarial no mês; revise as datas confirmadas.');
  }
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
  referenceCardId: string | null = null,
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
    if (referenceCardId && !cards.some((card) => card.id === referenceCardId))
      return unavailable('O cartão de referência não está disponível nesta conta.');
    if (!referenceCardId && cards.length > 1)
      return unavailable('É necessário definir um cartão de referência.');
    reference = referenceCardId ?? cards[0]!.id;
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
