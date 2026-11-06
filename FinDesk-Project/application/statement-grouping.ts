import type { CashMovement } from '../domain/finance-facts';
import type { Money } from '../domain/money';
import type { FinancePreferences } from '../shared/storage-api';
import {
  categoryLabel,
  UNCATEGORIZED,
  statementSelectionGrandTotals,
  type SelectionGrandTotal,
  type StatementRow,
} from './statement';

export interface GroupingRow extends StatementRow {
  readonly amount: Money | null;
}

export interface StatementGroup {
  readonly id: string;
  readonly level: 'category' | 'merchant' | 'kind';
  readonly label: string;
  readonly count: number;
  readonly totals: readonly SelectionGrandTotal[];
  readonly rows: readonly GroupingRow[];
  readonly children: readonly StatementGroup[];
  readonly filter: StatementGroupFilter;
}

type OtherKind = Exclude<CashMovement['kind'], 'expense'>;
export type StatementGroupFilter =
  | { readonly level: 'category'; readonly categoryId: string | null }
  | {
      readonly level: 'merchant';
      readonly categoryId: string | null;
      readonly merchantId: string | null;
    }
  | { readonly level: 'kind'; readonly kind: OtherKind };

export function filterStatementGroup(
  rows: readonly GroupingRow[],
  filter: StatementGroupFilter | null,
): GroupingRow[] {
  return rows.filter(
    ({ movement }) =>
      !filter ||
      (filter.level === 'kind'
        ? movement.kind === filter.kind
        : movement.kind === 'expense' &&
          movement.categoryId === filter.categoryId &&
          (filter.level === 'category' || movement.merchantId === filter.merchantId)),
  );
}
const OTHER_KINDS: readonly [OtherKind, string][] = [
  ['income', 'Recebimentos'],
  ['own-transfer', 'Transferências próprias'],
  ['invoice-payment', 'Pagamentos de fatura'],
  ['investment-contribution', 'Aportes'],
];

/** Agrupa os registros consultados; não seleciona, altera ou persiste movimentos. */
export function groupStatement(
  rows: readonly GroupingRow[],
  currencyMode: FinancePreferences['currencyMode'],
  merchantLabels: Readonly<Record<string, string>> = {},
  categoryLabels: Readonly<Record<string, string>> = {},
): StatementGroup[] {
  const seen = new Set<string>();
  const categories = new Map<string | null, GroupingRow[]>();
  const kinds = new Map<OtherKind, GroupingRow[]>();
  for (const row of rows) {
    if (seen.has(row.movement.id)) continue;
    seen.add(row.movement.id);
    if (row.movement.kind === 'expense') {
      const key = row.movement.categoryId;
      const group = categories.get(key) ?? [];
      group.push(row);
      categories.set(key, group);
    } else {
      const key = row.movement.kind;
      const group = kinds.get(key) ?? [];
      group.push(row);
      kinds.set(key, group);
    }
  }
  const node = (
    id: string,
    filter: StatementGroupFilter,
    label: string,
    members: readonly GroupingRow[],
    children: readonly StatementGroup[] = [],
  ): StatementGroup => ({
    id,
    level: filter.level,
    filter,
    label,
    count: members.length,
    rows: members,
    totals: statementSelectionGrandTotals(members, currencyMode),
    children,
  });
  const compare = (a: StatementGroup, b: StatementGroup) =>
    a.label.localeCompare(b.label, 'pt-BR') || a.id.localeCompare(b.id);
  const result = [...categories]
    .map(([categoryId, members]) => {
      const merchants = new Map<string | null, GroupingRow[]>();
      for (const row of members) {
        if (row.movement.kind !== 'expense') continue;
        const key = row.movement.merchantId;
        const group = merchants.get(key) ?? [];
        group.push(row);
        merchants.set(key, group);
      }
      const children = [...merchants]
        .map(([merchantId, entries]) => {
          const label =
            merchantId === null
              ? 'Estabelecimento não informado'
              : Object.hasOwn(merchantLabels, merchantId) &&
                  typeof merchantLabels[merchantId] === 'string'
                ? merchantLabels[merchantId]!
                : merchantId;
          return node(
            JSON.stringify(['merchant', categoryId, merchantId]),
            { level: 'merchant', categoryId, merchantId },
            label,
            entries,
          );
        })
        .sort(compare);
      return node(
        JSON.stringify(['category', categoryId]),
        { level: 'category', categoryId },
        categoryLabel(categoryId ?? UNCATEGORIZED, categoryLabels),
        members,
        children,
      );
    })
    .sort(compare);
  for (const [kind, label] of OTHER_KINDS) {
    const members = kinds.get(kind);
    if (members)
      result.push(node(JSON.stringify(['kind', kind]), { level: 'kind', kind }, label, members));
  }
  return result;
}
