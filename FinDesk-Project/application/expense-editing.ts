import type { CashMovement } from '../domain/finance-facts';
import type { CategoryState } from '../shared/categories';
import type { DemoSnapshot } from '../shared/storage-api';
import type { EditExpense, MerchantCatalogue } from '../shared/expenses';
import { parseCreateExpense, planExpense } from './expenses';
import { accountBalanceAt } from '../domain/finance';

export function editableExpense(
  movement: CashMovement,
): movement is Extract<CashMovement, { kind: 'expense' }> {
  return (
    movement.kind === 'expense' &&
    movement.origin.kind === 'manual' &&
    movement.origin.sourceId === 'findesk-manual-demo' &&
    movement.subscriptionId === null
  );
}
export function parseExpenseEditId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  )
    throw new Error('Despesa inválida.');
  return value;
}
export function parseEditExpense(value: unknown): EditExpense {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !==
      'accountId,amountMinor,classification,description,expectedToken,merchant,movementId,on,requestId'
  )
    throw new Error('Edição inválida.');
  const data = value as EditExpense;
  const movementId = parseExpenseEditId(data.movementId);
  if (typeof data.expectedToken !== 'string' || !/^[0-9a-f]{64}$/u.test(data.expectedToken))
    throw new Error('Versão inválida.');
  const classification = data.classification;
  if (
    !classification ||
    (classification.mode !== 'keep' && classification.mode !== 'manual') ||
    (classification.mode === 'keep' && Object.keys(classification).join(',') !== 'mode')
  )
    throw new Error('Categoria inválida.');
  const checked = parseCreateExpense({
    requestId: data.requestId,
    accountId: data.accountId,
    on: data.on,
    amountMinor: data.amountMinor,
    description: data.description,
    merchant: data.merchant,
    classification: classification.mode === 'keep' ? { mode: 'automatic' } : classification,
  });
  return {
    ...checked,
    movementId,
    expectedToken: data.expectedToken,
    classification:
      classification.mode === 'keep'
        ? { mode: 'keep' }
        : { mode: 'manual', categoryId: classification.categoryId },
  };
}
export function planExpenseEdit(
  snapshot: DemoSnapshot,
  categories: CategoryState,
  merchants: MerchantCatalogue,
  value: EditExpense,
  newMerchantId: string,
) {
  const input = parseEditExpense(value);
  const original = snapshot.facts.movements.find((m) => m.id === input.movementId);
  const account = snapshot.facts.accounts.find((a) => a.id === input.accountId);
  if (
    !original ||
    !editableExpense(original) ||
    !account ||
    account.openingBalance.currency !== original.delta.currency
  )
    throw new Error('Despesa ou conta incompatível.');
  const next = planExpense(
    {
      ...snapshot,
      facts: {
        ...snapshot.facts,
        movements: snapshot.facts.movements.filter((m) => m.id !== original.id),
      },
    },
    categories,
    merchants,
    {
      requestId: input.requestId,
      accountId: input.accountId,
      on: input.on,
      amountMinor: input.amountMinor,
      description: input.description,
      merchant: input.merchant,
      classification:
        input.classification.mode === 'keep' ? { mode: 'automatic' } : input.classification,
    },
    original.id,
    newMerchantId,
  );
  const candidate = next.snapshot.facts.movements.at(-1)!;
  const edited = { ...candidate, origin: original.origin, categoryId: original.categoryId };
  const result = {
    ...next,
    snapshot: {
      ...snapshot,
      facts: {
        ...snapshot.facts,
        movements: snapshot.facts.movements.map((m) => (m.id === original.id ? edited : m)),
      },
    },
  };
  for (const id of new Set([original.accountId, input.accountId]))
    accountBalanceAt(result.snapshot.facts, id, snapshot.asOf);
  return result;
}
