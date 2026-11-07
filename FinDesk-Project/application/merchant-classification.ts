import { civilDate, dateRange } from '../domain/civil-date';
import type { CategoryState, ClassifyMerchant, MerchantQuery } from '../shared/categories';
import type { DemoSnapshot } from '../shared/storage-api';
import { categorizedMovements, parseCategoryState } from './categories';
import { ALL_ACCOUNTS } from './finance-context';
import { filterStatement, MOVEMENT_TYPES, statementRows } from './statement';
import type { RuleAssignment } from '../shared/category-rules';

function record(value: unknown, keys: string): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== keys
  )
    throw new Error('Reclassificação inválida.');
  return value as Record<string, unknown>;
}
function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
}

export function parseClassifyMerchant(value: unknown): ClassifyMerchant {
  const data = record(value, 'categoryId,expected,includeManual,merchantId,query');
  const query = record(data['query'], 'accountId,category,end,kind,search,start');
  if (
    !identifier(data['merchantId']) ||
    !(data['categoryId'] === null || identifier(data['categoryId'])) ||
    typeof data['includeManual'] !== 'boolean' ||
    !identifier(query['accountId']) ||
    typeof query['start'] !== 'string' ||
    typeof query['end'] !== 'string' ||
    typeof query['search'] !== 'string' ||
    query['search'].length > 500 ||
    !(query['kind'] === null || Object.hasOwn(MOVEMENT_TYPES, query['kind'] as string)) ||
    !(query['category'] === null || identifier(query['category'])) ||
    !Array.isArray(data['expected']) ||
    !data['expected'].length ||
    data['expected'].length > 100_000
  )
    throw new Error('Reclassificação inválida.');
  const range = dateRange(civilDate(query['start']), civilDate(query['end']));
  const expected = data['expected'].map((value: unknown) => {
    const item = record(value, 'categoryId,manual,movementId');
    if (
      !identifier(item['movementId']) ||
      typeof item['manual'] !== 'boolean' ||
      !(item['categoryId'] === null || identifier(item['categoryId']))
    )
      throw new Error('Prévia inválida.');
    return {
      movementId: item['movementId'],
      categoryId: item['categoryId'] as string | null,
      manual: item['manual'],
    };
  });
  if (new Set(expected.map((item) => item.movementId)).size !== expected.length)
    throw new Error('Prévia repetida.');
  return {
    merchantId: data['merchantId'],
    categoryId: data['categoryId'] as string | null,
    includeManual: data['includeManual'],
    expected,
    query: {
      accountId: query['accountId'],
      start: range.start,
      end: range.end,
      search: query['search'],
      kind: query['kind'] as MerchantQuery['kind'],
      category: query['category'] as string | null,
    },
  };
}

/** Mesma consulta do extrato, sobre fatos e personalizações preservados separadamente. */
export function previewMerchantClassification(
  snapshot: DemoSnapshot,
  state: CategoryState,
  query: MerchantQuery,
  merchantId: string,
  categoryId: string | null,
  includeManual: boolean,
  automatic: readonly RuleAssignment[] = [],
) {
  if (
    !identifier(merchantId) ||
    (query.accountId !== ALL_ACCOUNTS &&
      !snapshot.facts.accounts.some((a) => a.id === query.accountId)) ||
    (categoryId !== null && !state.categories.some((c) => c.id === categoryId))
  )
    throw new Error('Estabelecimento, conta ou categoria indisponível.');
  const labels = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
  const manual = new Set(state.classifications.map((c) => c.movementId));
  const rows = filterStatement(
    statementRows(
      {
        ...snapshot,
        facts: {
          ...snapshot.facts,
          movements: categorizedMovements(snapshot.facts.movements, state, automatic),
        },
      },
      query.accountId,
      dateRange(query.start, query.end),
    ),
    query,
    labels,
  ).filter((row) => row.movement.kind === 'expense' && row.movement.merchantId === merchantId);
  return rows.map((row) => {
    const current = row.movement.kind === 'expense' ? row.movement.categoryId : null;
    const isManual = manual.has(row.movement.id);
    return {
      row,
      expected: { movementId: row.movement.id, categoryId: current, manual: isManual },
      status:
        isManual && !includeManual
          ? ('preserved' as const)
          : current === categoryId
            ? ('unchanged' as const)
            : ('change' as const),
    };
  });
}

/** O conjunto visto pelo usuário deve continuar igual dentro da transação de gravação. */
export function classifyMerchant(
  snapshot: DemoSnapshot,
  state: CategoryState,
  input: ClassifyMerchant,
  automatic: readonly RuleAssignment[] = [],
): CategoryState {
  const checked = parseClassifyMerchant(input);
  const preview = previewMerchantClassification(
    snapshot,
    state,
    checked.query,
    checked.merchantId,
    checked.categoryId,
    checked.includeManual,
    automatic,
  );
  if (JSON.stringify(preview.map((item) => item.expected)) !== JSON.stringify(checked.expected))
    throw new Error('A consulta mudou. Confira a prévia novamente.');
  const changes = preview.filter((item) => item.status === 'change');
  if (!changes.length) throw new Error('Nenhuma despesa a alterar.');
  const ids = new Set(changes.map((item) => item.row.movement.id));
  return parseCategoryState({
    ...state,
    classifications: [
      ...state.classifications.filter((item) => !ids.has(item.movementId)),
      ...changes.map((item) => ({
        movementId: item.row.movement.id,
        categoryId: checked.categoryId,
      })),
    ],
  });
}
