import type { DateRange } from '../domain/civil-date';
import type { CashMovement } from '../domain/finance-facts';
import {
  addMoney,
  money,
  convertForDisplay,
  type Currency,
  type ExchangeRate,
  type Money,
} from '../domain/money';
import type { DemoSnapshot, FinancePreferences } from '../shared/storage-api';
import { ALL_ACCOUNTS } from './finance-context';

export const MOVEMENT_TYPES: Readonly<
  Record<CashMovement['kind'], { label: string; icon: string }>
> = {
  income: { label: 'Recebimento', icon: 'pi-arrow-down-left' },
  expense: { label: 'Despesa', icon: 'pi-arrow-up-right' },
  'own-transfer': { label: 'Transferência própria', icon: 'pi-arrow-right-arrow-left' },
  'invoice-payment': { label: 'Pagamento de fatura', icon: 'pi-credit-card' },
  'investment-contribution': { label: 'Aporte', icon: 'pi-chart-line' },
};

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  entretenimento: 'Entretenimento',
  casa: 'Casa',
};

/** Rótulos editoriais apenas dos registros fictícios existentes, não heurística de comerciantes. */
const DEMO_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'mov-sal': 'Salário',
  'mov-tr-a': 'Transferência para conta auxiliar',
  'mov-tr-b': 'Transferência recebida do Nubank',
  'mov-uber-1': 'Uber',
  'mov-uber-2': 'Uber',
  'mov-merc': 'Mercado',
  'mov-fat-out': 'Pagamento da fatura',
  'mov-mensal': 'Serviço mensal',
  'mov-energia': 'Energia',
  'mov-anual': 'Serviço anual',
  'mov-aporte': 'Aporte em investimento',
};

export const UNCATEGORIZED = 'uncategorized';

export function categoryKey(movement: CashMovement): string | null {
  return movement.kind === 'expense' ? (movement.categoryId ?? UNCATEGORIZED) : null;
}

export function categoryLabel(key: string, labels: Readonly<Record<string, string>> = {}): string {
  return key === UNCATEGORIZED
    ? 'Sem categoria'
    : Object.hasOwn(labels, key)
      ? labels[key]!
      : Object.hasOwn(CATEGORY_LABELS, key)
        ? CATEGORY_LABELS[key]!
        : key;
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export interface StatementRow {
  readonly movement: CashMovement;
  readonly description: string;
  readonly accountName: string;
  readonly category: string | null;
}

export interface StatementFilters {
  readonly search: string;
  readonly kind: CashMovement['kind'] | null;
  readonly category: string | null;
}

export function statementRows(
  snapshot: DemoSnapshot,
  accountId: string,
  range: DateRange,
): StatementRow[] {
  return snapshot.facts.movements
    .filter(
      (movement) =>
        (accountId === ALL_ACCOUNTS || movement.accountId === accountId) &&
        movement.on >= range.start &&
        movement.on <= range.end,
    )
    .map((movement) => ({
      movement,
      description:
        snapshot.seedId === 'demo-financas-v1' && movement.origin.sourceId === 'demo-statement'
          ? (DEMO_DESCRIPTIONS[movement.id] ?? movement.description)
          : movement.description,
      accountName:
        snapshot.facts.accounts.find((account) => account.id === movement.accountId)?.name ??
        movement.accountId,
      category: categoryKey(movement),
    }))
    .sort(
      (a, b) =>
        b.movement.on.localeCompare(a.movement.on) || a.movement.id.localeCompare(b.movement.id),
    );
}

export function filterStatement(
  rows: readonly StatementRow[],
  filters: StatementFilters,
  labels: Readonly<Record<string, string>> = {},
): StatementRow[] {
  const words = normalized(filters.search).split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (filters.kind && row.movement.kind !== filters.kind) return false;
    if (filters.category && row.category !== filters.category) return false;
    const searchable = normalized(
      [
        row.description,
        row.movement.description,
        row.accountName,
        MOVEMENT_TYPES[row.movement.kind].label,
        row.category ? categoryLabel(row.category, labels) : '',
      ].join(' '),
    );
    return words.every((word) => searchable.includes(word));
  });
}

/** Cotação de apresentação do contexto, sem alterar data ou moeda do fato. */
export function statementAmount(
  value: Money,
  mode: FinancePreferences['currencyMode'],
  rate: ExchangeRate | null,
  asOf: string,
): Money | null {
  if (mode === 'original' || mode === value.currency) return value;
  if (!rate || rate.on > asOf) return null;
  const usable =
    rate.from === value.currency && rate.to === mode
      ? rate
      : rate.to === value.currency && rate.from === mode
        ? {
            ...rate,
            from: rate.to,
            to: rate.from,
            numerator: rate.denominator,
            denominator: rate.numerator,
          }
        : null;
  if (!usable) return null;
  try {
    return convertForDisplay(value, usable).converted;
  } catch {
    return null;
  }
}

/** Seleção temporária: itens removidos da consulta não reaparecem selecionados ao limpar filtros. */
export function keepStatementSelection(
  ids: readonly string[],
  rows: readonly StatementRow[],
): string[] {
  const visible = new Set(rows.map((row) => row.movement.id));
  return [...new Set(ids)].filter((id) => visible.has(id));
}

const SELECTION_KINDS = [
  ['expense', 'Despesas'],
  ['income', 'Recebimentos'],
  ['transfer-out', 'Transferências enviadas'],
  ['transfer-in', 'Transferências recebidas'],
  ['invoice-payment', 'Pagamentos de fatura'],
  ['investment-contribution', 'Aportes'],
] as const;

export interface SelectionTotal {
  readonly kind: string;
  readonly label: string;
  readonly currency: Currency;
  readonly count: number;
  readonly value: Money | null;
}

export interface SelectionGrandTotal {
  readonly currency: Currency;
  readonly value: Money | null;
}

/** Soma dos valores selecionados com sinal, separada dos subtotais de consumo/tipo. */
export function statementSelectionGrandTotals(
  rows: readonly { movement: CashMovement; amount: Money | null }[],
  mode: FinancePreferences['currencyMode'],
): SelectionGrandTotal[] {
  const seen = new Set<string>();
  const sums = new Map<Currency, bigint | null>();
  for (const { movement, amount } of rows) {
    if (seen.has(movement.id)) continue;
    seen.add(movement.id);
    const currency = mode === 'original' ? movement.delta.currency : mode;
    const previous = sums.get(currency);
    sums.set(
      currency,
      previous === null ||
        !amount ||
        amount.currency !== currency ||
        !Number.isSafeInteger(amount.minorUnits)
        ? null
        : (previous ?? 0n) + BigInt(amount.minorUnits),
    );
  }
  return (['BRL', 'USD'] as const).flatMap((currency) => {
    const sum = sums.get(currency);
    if (sum === undefined) return [];
    const safe =
      sum !== null &&
      sum >= BigInt(Number.MIN_SAFE_INTEGER) &&
      sum <= BigInt(Number.MAX_SAFE_INTEGER);
    return [{ currency, value: safe ? money(Number(sum), currency) : null }];
  });
}

/** Subtotais sobre itens únicos, sem somar moedas ou transformar liquidações em consumo. */
export function statementSelectionTotals(
  rows: readonly { movement: CashMovement; amount: Money | null }[],
  mode: FinancePreferences['currencyMode'],
): SelectionTotal[] {
  const seen = new Set<string>();
  const groups = new Map<string, SelectionTotal>();
  for (const { movement, amount } of rows) {
    if (seen.has(movement.id)) continue;
    seen.add(movement.id);
    const kind =
      movement.kind === 'own-transfer'
        ? movement.delta.minorUnits < 0
          ? 'transfer-out'
          : 'transfer-in'
        : movement.kind;
    const currency = mode === 'original' ? movement.delta.currency : mode;
    const key = `${kind}:${currency}`;
    const previous = groups.get(key);
    let value: Money | null = null;
    if (amount && amount.currency === currency && (!previous || previous.value)) {
      try {
        const magnitude = money(Math.abs(amount.minorUnits), currency);
        value = previous?.value ? addMoney(previous.value, magnitude) : magnitude;
      } catch {
        /* Precisão excedida: não exibir soma parcial. */
      }
    }
    groups.set(key, {
      kind,
      label: SELECTION_KINDS.find(([id]) => id === kind)![1],
      currency,
      count: (previous?.count ?? 0) + 1,
      value,
    });
  }
  return SELECTION_KINDS.flatMap(([kind]) =>
    (['BRL', 'USD'] as const).flatMap((currency) => groups.get(`${kind}:${currency}`) ?? []),
  );
}
