import type { CashMovement } from '../domain/finance-facts';
import type { CategoryState } from '../shared/categories';
import type { CategoryRuleState, RuleCatalogue, SaveCategoryRule } from '../shared/category-rules';

function record(value: unknown, keys: string): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== keys
  )
    throw new Error('Regra de categoria inválida.');
  return value as Record<string, unknown>;
}
function id(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
}
function revision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}
export function parseSaveCategoryRule(value: unknown): SaveCategoryRule {
  const data = record(value, 'active,categoryId,expectedRevision,merchantId');
  if (
    !id(data['merchantId']) ||
    !(data['categoryId'] === null || id(data['categoryId'])) ||
    typeof data['active'] !== 'boolean' ||
    !(data['expectedRevision'] === null || revision(data['expectedRevision']))
  )
    throw new Error('Regra de categoria inválida.');
  return {
    merchantId: data['merchantId'],
    categoryId: data['categoryId'] as string | null,
    active: data['active'],
    expectedRevision: data['expectedRevision'] as number | null,
  };
}
export function parseRuleCatalogue(value: unknown): RuleCatalogue {
  const data = record(value, 'assignments,rules,version');
  if (
    data['version'] !== 1 ||
    !Array.isArray(data['rules']) ||
    data['rules'].length > 1000 ||
    !Array.isArray(data['assignments']) ||
    data['assignments'].length > 100_000
  )
    throw new Error('Catálogo de regras inválido.');
  const rules = data['rules'].map((value: unknown) => {
    const item = record(value, 'active,categoryId,merchantId,revision');
    const checked = parseSaveCategoryRule({
      merchantId: item['merchantId'],
      categoryId: item['categoryId'],
      active: item['active'],
      expectedRevision: item['revision'],
    });
    if (checked.expectedRevision === null) throw new Error('Revisão inválida.');
    return {
      merchantId: checked.merchantId,
      categoryId: checked.categoryId,
      active: checked.active,
      revision: checked.expectedRevision,
    };
  });
  const byMerchant = new Map(rules.map((r) => [r.merchantId, r]));
  if (byMerchant.size !== rules.length) throw new Error('Estabelecimento repetido.');
  const assignments = data['assignments'].map((value: unknown) => {
    const item = record(value, 'categoryId,merchantId,movementId,ruleRevision');
    if (
      !id(item['movementId']) ||
      !id(item['merchantId']) ||
      !(item['categoryId'] === null || id(item['categoryId'])) ||
      !revision(item['ruleRevision']) ||
      !byMerchant.has(item['merchantId']) ||
      item['ruleRevision'] > byMerchant.get(item['merchantId'])!.revision
    )
      throw new Error('Atribuição automática inválida.');
    return {
      movementId: item['movementId'],
      merchantId: item['merchantId'],
      categoryId: item['categoryId'] as string | null,
      ruleRevision: item['ruleRevision'],
    };
  });
  if (new Set(assignments.map((a) => a.movementId)).size !== assignments.length)
    throw new Error('Atribuição repetida.');
  return { version: 1, rules, assignments };
}
export function parseCategoryRuleState(value: unknown): CategoryRuleState {
  const data = record(value, 'assignments,knownMovementIds,rules,version');
  const catalogue = parseRuleCatalogue({
    version: data['version'],
    rules: data['rules'],
    assignments: data['assignments'],
  });
  const known = data['knownMovementIds'];
  const knownIds = new Set(Array.isArray(known) ? known : []);
  if (
    !Array.isArray(known) ||
    known.length > 100_000 ||
    !known.every(id) ||
    knownIds.size !== known.length ||
    catalogue.assignments.some((a) => !knownIds.has(a.movementId))
  )
    throw new Error('Registro de entrada inválido.');
  return { ...catalogue, knownMovementIds: known as string[] };
}
export function initialCategoryRules(movements: readonly CashMovement[]): CategoryRuleState {
  return parseCategoryRuleState({
    version: 1,
    rules: [],
    assignments: [],
    knownMovementIds: movements.map((m) => m.id),
  });
}
export function ruleCatalogue(state: CategoryRuleState): RuleCatalogue {
  return { version: 1, rules: state.rules, assignments: state.assignments };
}
export function validateRuleCategories(state: RuleCatalogue, categories: CategoryState): void {
  const ids = new Set(categories.categories.map((c) => c.id));
  if (
    [...state.rules, ...state.assignments].some(
      (item) => item.categoryId !== null && !ids.has(item.categoryId),
    )
  )
    throw new Error('Categoria da regra indisponível.');
}
export function saveCategoryRule(
  state: CategoryRuleState,
  input: SaveCategoryRule,
  categories: CategoryState,
  movements: readonly CashMovement[],
): CategoryRuleState {
  const checked = parseSaveCategoryRule(input);
  const previous = state.rules.find((r) => r.merchantId === checked.merchantId);
  if (
    (previous?.revision ?? null) !== checked.expectedRevision ||
    (!previous &&
      !movements.some((m) => m.kind === 'expense' && m.merchantId === checked.merchantId))
  )
    throw new Error('Regra alterada ou estabelecimento indisponível.');
  const rule = {
    merchantId: checked.merchantId,
    categoryId: checked.categoryId,
    active: checked.active,
    revision: (previous?.revision ?? 0) + 1,
  };
  const next = parseCategoryRuleState({
    ...state,
    rules: previous
      ? state.rules.map((r) => (r.merchantId === rule.merchantId ? rule : r))
      : [...state.rules, rule],
  });
  validateRuleCategories(next, categories);
  return next;
}
/** Somente primeira entrada de um ID; revisões das regras nunca recalculam atribuições antigas. */
export function recordRuleArrivals(
  state: CategoryRuleState,
  movements: readonly CashMovement[],
): CategoryRuleState {
  const known = new Set(state.knownMovementIds);
  const rules = new Map(state.rules.filter((r) => r.active).map((r) => [r.merchantId, r]));
  const assignments = [...state.assignments];
  for (const movement of movements) {
    if (known.has(movement.id)) continue;
    known.add(movement.id);
    if (movement.kind !== 'expense' || !movement.merchantId) continue;
    const rule = rules.get(movement.merchantId);
    if (rule)
      assignments.push({
        movementId: movement.id,
        merchantId: rule.merchantId,
        categoryId: rule.categoryId,
        ruleRevision: rule.revision,
      });
  }
  return parseCategoryRuleState({ ...state, assignments, knownMovementIds: [...known] });
}
