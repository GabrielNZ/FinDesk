import { civilDate } from '../domain/civil-date';
import { accountBalanceAt, validateFacts } from '../domain/finance';
import { money } from '../domain/money';
import type { CashMovement } from '../domain/finance-facts';
import type { DemoSnapshot } from '../shared/storage-api';
import type { CreateExpense, MerchantCatalogue } from '../shared/expenses';
import type { CategoryState } from '../shared/categories';
import { classifyMovement } from './categories';
import { DEMO_MERCHANT_LABELS } from '../fixtures/financas/labels';

function object(value: unknown, keys: string): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== keys
  )
    throw new Error('Dados da despesa inválidos.');
  return value as Record<string, unknown>;
}
function identifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 160 &&
    value.trim() === value &&
    !/\p{Cc}/u.test(value)
  );
}
function label(value: unknown, limit: number): string {
  if (typeof value !== 'string' || /\p{Cc}/u.test(value)) throw new Error('Texto inválido.');
  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (!normalized || normalized.length > limit) throw new Error('Confira o texto informado.');
  return normalized;
}
export const merchantNameKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/gu, ' ');
export function parseMerchantCatalogue(value: unknown): MerchantCatalogue {
  const data = object(value, 'merchants,version');
  if (
    data['version'] !== 1 ||
    !Array.isArray(data['merchants']) ||
    data['merchants'].length > 10_000
  )
    throw new Error('Catálogo de estabelecimentos inválido.');
  const merchants = data['merchants'].map((value: unknown) => {
    const item = object(value, 'id,name');
    if (!identifier(item['id'])) throw new Error('Estabelecimento inválido.');
    return { id: item['id'], name: label(item['name'], 160) };
  });
  if (
    new Set(merchants.map((m) => m.id)).size !== merchants.length ||
    new Set(merchants.map((m) => merchantNameKey(m.name))).size !== merchants.length
  )
    throw new Error('Estabelecimento repetido.');
  return { version: 1, merchants };
}
export function initialMerchants(snapshot: DemoSnapshot): MerchantCatalogue {
  const ids = new Set([
    ...Object.keys(DEMO_MERCHANT_LABELS),
    ...snapshot.facts.movements.flatMap((m) =>
      m.kind === 'expense' && m.merchantId ? [m.merchantId] : [],
    ),
    ...snapshot.facts.purchases.map((p) => p.merchantId),
  ]);
  return parseMerchantCatalogue({
    version: 1,
    merchants: [...ids].map((id) => ({
      id,
      name: Object.hasOwn(DEMO_MERCHANT_LABELS, id) ? DEMO_MERCHANT_LABELS[id] : id,
    })),
  });
}
export function parseExpenseAmount(value: string): number {
  if (!/^\d{1,16}(?:[,.]\d{1,2})?$/u.test(value.trim()))
    throw new Error('Informe um valor positivo com até duas casas decimais.');
  const [whole, fraction = ''] = value.trim().split(/[,.]/u);
  const amount = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Valor fora do limite permitido.');
  return Number(amount);
}
export function parseCreateExpense(value: unknown): CreateExpense {
  const data = object(
    value,
    'accountId,amountMinor,classification,description,merchant,on,requestId',
  );
  if (
    typeof data['requestId'] !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      data['requestId'],
    ) ||
    !identifier(data['accountId']) ||
    !Number.isSafeInteger(data['amountMinor']) ||
    (data['amountMinor'] as number) <= 0
  )
    throw new Error('Dados da despesa inválidos.');
  const merchant = data['merchant'] as CreateExpense['merchant'];
  if (merchant?.mode === 'none') object(merchant, 'mode');
  else if (merchant?.mode === 'existing') {
    object(merchant, 'id,mode');
    if (!identifier(merchant.id)) throw new Error('Estabelecimento inválido.');
  } else if (merchant?.mode === 'new') {
    object(merchant, 'mode,name');
    label(merchant.name, 160);
  } else throw new Error('Estabelecimento inválido.');
  const classification = data['classification'] as CreateExpense['classification'];
  if (classification?.mode === 'automatic') object(classification, 'mode');
  else if (classification?.mode === 'manual') {
    object(classification, 'categoryId,mode');
    if (classification.categoryId !== null && !identifier(classification.categoryId))
      throw new Error('Categoria inválida.');
  } else throw new Error('Categoria inválida.');
  return {
    requestId: data['requestId'],
    accountId: data['accountId'],
    on: civilDate(data['on'] as string),
    amountMinor: data['amountMinor'] as number,
    description: label(data['description'], 240),
    merchant:
      merchant.mode === 'new'
        ? { mode: 'new', name: label(merchant.name, 160) }
        : merchant.mode === 'existing'
          ? { mode: 'existing', id: merchant.id }
          : { mode: 'none' },
    classification:
      classification.mode === 'manual'
        ? { mode: 'manual', categoryId: classification.categoryId }
        : { mode: 'automatic' },
  };
}
export function planExpense(
  snapshot: DemoSnapshot,
  categories: CategoryState,
  catalogue: MerchantCatalogue,
  value: CreateExpense,
  movementId: string,
  merchantId: string,
) {
  const input = parseCreateExpense(value);
  const account = snapshot.facts.accounts.find((a) => a.id === input.accountId);
  if (
    !account ||
    input.on <= account.openingOn ||
    input.on > snapshot.asOf ||
    snapshot.facts.movements.length >= 100_000 ||
    snapshot.facts.movements.some((m) => m.id === movementId)
  )
    throw new Error('Confira a conta e a data da despesa.');
  let merchants = catalogue;
  let selected: string | null = null;
  if (input.merchant.mode === 'existing') {
    selected = input.merchant.id;
    if (!catalogue.merchants.some((m) => m.id === selected))
      throw new Error('Estabelecimento indisponível.');
  } else if (input.merchant.mode === 'new') {
    merchants = parseMerchantCatalogue({
      ...catalogue,
      merchants: [...catalogue.merchants, { id: merchantId, name: input.merchant.name }],
    });
    selected = merchantId;
  }
  const movement: CashMovement = {
    id: movementId,
    accountId: account.id,
    on: input.on,
    delta: money(-input.amountMinor, account.openingBalance.currency),
    description: input.description,
    origin: { kind: 'manual', sourceId: 'findesk-manual-demo', externalId: input.requestId },
    kind: 'expense',
    categoryId: null,
    merchantId: selected,
    subscriptionId: null,
  };
  const next = {
    ...snapshot,
    facts: { ...snapshot.facts, movements: [...snapshot.facts.movements, movement] },
  };
  validateFacts(next.facts);
  accountBalanceAt(next.facts, account.id, snapshot.asOf);
  return {
    snapshot: next,
    merchants,
    categories:
      input.classification.mode === 'manual'
        ? classifyMovement(
            categories,
            { movementId, categoryId: input.classification.categoryId },
            next.facts.movements,
          )
        : categories,
  };
}
