import type { Category, CategoryState, ClassifyMovement, SaveCategory } from '../shared/categories';
import type { CashMovement } from '../domain/finance-facts';

export const CATEGORY_ICONS = [
  ['pi-tag', 'Etiqueta'],
  ['pi-home', 'Casa'],
  ['pi-car', 'Transporte'],
  ['pi-shopping-cart', 'Compras'],
  ['pi-ticket', 'Lazer'],
  ['pi-heart', 'Saúde'],
  ['pi-book', 'Educação'],
  ['pi-bolt', 'Energia'],
  ['pi-globe', 'Viagem'],
  ['pi-mobile', 'Tecnologia'],
  ['pi-gift', 'Presentes'],
  ['pi-briefcase', 'Trabalho'],
] as const;
export const CATEGORY_COLORS = [
  ['#a9c8b5', 'Verde'],
  ['#8fb8de', 'Azul'],
  ['#b6a3da', 'Lilás'],
  ['#dab788', 'Dourado'],
  ['#d9a2bb', 'Rosa'],
  ['#8bc9c5', 'Turquesa'],
] as const;

export function initialCategories(): CategoryState {
  return {
    version: 1,
    classifications: [],
    categories: [
      { id: 'transporte', name: 'Transporte', icon: 'pi-car', color: '#8fb8de' },
      { id: 'alimentacao', name: 'Alimentação', icon: 'pi-shopping-cart', color: '#a9c8b5' },
      { id: 'entretenimento', name: 'Entretenimento', icon: 'pi-ticket', color: '#b6a3da' },
      { id: 'casa', name: 'Casa', icon: 'pi-home', color: '#dab788' },
    ],
  };
}

export function categoryNameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}
function record(value: unknown, keys: string): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== keys
  )
    throw new Error('Dados de categoria inválidos.');
  return value as Record<string, unknown>;
}
function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
}
export function parseSaveCategory(value: unknown): SaveCategory {
  const data = record(value, 'color,icon,id,name');
  if (
    !(data['id'] === null || identifier(data['id'])) ||
    typeof data['name'] !== 'string' ||
    !data['name'].trim() ||
    data['name'].length > 60 ||
    [...data['name']].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    categoryNameKey(data['name']) === 'sem categoria' ||
    !CATEGORY_ICONS.some(([icon]) => icon === data['icon']) ||
    !CATEGORY_COLORS.some(([color]) => color === data['color'])
  )
    throw new Error('Informe um nome de até 60 caracteres, ícone e cor válidos.');
  return {
    id: data['id'] as string | null,
    name: data['name'].trim().replace(/\s+/g, ' '),
    icon: data['icon'] as string,
    color: data['color'] as string,
  };
}
export function parseClassification(value: unknown): ClassifyMovement {
  const data = record(value, 'categoryId,movementId');
  if (
    !identifier(data['movementId']) ||
    !(data['categoryId'] === null || identifier(data['categoryId']))
  )
    throw new Error('Classificação inválida.');
  return { movementId: data['movementId'], categoryId: data['categoryId'] as string | null };
}
export function parseCategoryState(value: unknown): CategoryState {
  const data = record(value, 'categories,classifications,version');
  if (
    data['version'] !== 1 ||
    !Array.isArray(data['categories']) ||
    !Array.isArray(data['classifications']) ||
    data['categories'].length > 1000 ||
    data['classifications'].length > 100_000
  )
    throw new Error('Catálogo inválido.');
  const categories = data['categories'].map((value: unknown): Category => {
    const checked = parseSaveCategory(value);
    if (!checked.id) throw new Error('Categoria sem identificador.');
    return { ...checked, id: checked.id };
  });
  const ids = new Set(categories.map((item) => item.id));
  if (
    ids.size !== categories.length ||
    new Set(categories.map((item) => categoryNameKey(item.name))).size !== categories.length
  )
    throw new Error('Categorias repetidas.');
  const classifications = data['classifications'].map(parseClassification);
  if (
    new Set(classifications.map((item) => item.movementId)).size !== classifications.length ||
    classifications.some((item) => item.categoryId !== null && !ids.has(item.categoryId))
  )
    throw new Error('Classificações inválidas.');
  return { version: 1, categories, classifications };
}
export function saveCategory(
  state: CategoryState,
  input: SaveCategory,
  newId: string,
): CategoryState {
  const checked = parseSaveCategory(input);
  if (
    state.categories.some(
      (item) =>
        item.id !== checked.id && categoryNameKey(item.name) === categoryNameKey(checked.name),
    )
  )
    throw new Error('Já existe uma categoria com esse nome.');
  if (checked.id && !state.categories.some((item) => item.id === checked.id))
    throw new Error('Categoria não encontrada.');
  const category = { ...checked, id: checked.id ?? newId };
  return parseCategoryState({
    ...state,
    categories: checked.id
      ? state.categories.map((item) => (item.id === checked.id ? category : item))
      : [...state.categories, category],
  });
}
export function classifyMovement(
  state: CategoryState,
  input: ClassifyMovement,
  movements: readonly CashMovement[],
): CategoryState {
  const checked = parseClassification(input);
  if (
    !movements.some((item) => item.id === checked.movementId && item.kind === 'expense') ||
    (checked.categoryId !== null &&
      !state.categories.some((item) => item.id === checked.categoryId))
  )
    throw new Error('Despesa ou categoria não encontrada.');
  return parseCategoryState({
    ...state,
    classifications: [
      ...state.classifications.filter((item) => item.movementId !== checked.movementId),
      checked,
    ],
  });
}
export function categorizedMovements(
  movements: readonly CashMovement[],
  state: CategoryState,
): readonly CashMovement[] {
  const overrides = new Map(
    state.classifications.map((item) => [item.movementId, item.categoryId]),
  );
  return movements.map((movement) =>
    movement.kind === 'expense' && overrides.has(movement.id)
      ? { ...movement, categoryId: overrides.get(movement.id)! }
      : movement,
  );
}
