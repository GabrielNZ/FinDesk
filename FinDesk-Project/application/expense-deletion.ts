import type { CashMovement } from '../domain/finance-facts';
import type { DemoSnapshot } from '../shared/storage-api';
import type { ExpenseLifecycleRequest } from '../shared/expenses';
import { accountBalanceAt, validateFacts } from '../domain/finance';
import { editableExpense, parseExpenseEditId } from './expense-editing';

export function parseExpenseLifecycle(value: unknown): ExpenseLifecycleRequest {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'expectedToken,movementId,requestId'
  )
    throw new Error('Solicitação de exclusão ou recuperação inválida.');
  const data = value as ExpenseLifecycleRequest;
  if (typeof data.expectedToken !== 'string' || !/^[0-9a-f]{64}$/u.test(data.expectedToken))
    throw new Error('Versão inválida.');
  return {
    requestId: parseExpenseEditId(data.requestId),
    movementId: parseExpenseEditId(data.movementId),
    expectedToken: data.expectedToken,
  };
}
export function planExpenseDeletion(snapshot: DemoSnapshot, id: string): DemoSnapshot {
  const movement = snapshot.facts.movements.find((m) => m.id === id);
  if (!movement || !editableExpense(movement))
    throw new Error('Despesa indisponível para exclusão.');
  const account = snapshot.facts.accounts.find((a) => a.id === movement.accountId);
  if (!account || movement.on <= account.openingOn || movement.on > snapshot.asOf)
    throw new Error('Data da despesa incompatível.');
  const next = {
    ...snapshot,
    facts: { ...snapshot.facts, movements: snapshot.facts.movements.filter((m) => m.id !== id) },
  };
  validateFacts(next.facts);
  accountBalanceAt(next.facts, movement.accountId, snapshot.asOf);
  return next;
}
export function planExpenseRecovery(
  snapshot: DemoSnapshot,
  movement: CashMovement,
  position: number,
): DemoSnapshot {
  const account = snapshot.facts.accounts.find((a) => a.id === movement.accountId);
  if (
    !editableExpense(movement) ||
    !account ||
    movement.on <= account.openingOn ||
    movement.on > snapshot.asOf ||
    snapshot.facts.movements.some((m) => m.id === movement.id) ||
    !Number.isSafeInteger(position) ||
    position < 0 ||
    snapshot.facts.movements.length >= 100_000
  )
    throw new Error('Despesa indisponível para recuperação.');
  const movements = [...snapshot.facts.movements];
  movements.splice(Math.min(position, movements.length), 0, movement);
  const next = { ...snapshot, facts: { ...snapshot.facts, movements } };
  validateFacts(next.facts);
  accountBalanceAt(next.facts, movement.accountId, snapshot.asOf);
  return next;
}
