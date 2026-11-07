import type { CivilDate } from '../domain/civil-date';
import type { DemoSnapshot } from './storage-api';
import type { CategoryState } from './categories';
import type { RuleCatalogue } from './category-rules';
import type { CashMovement } from '../domain/finance-facts';

export interface MerchantCatalogue {
  readonly version: 1;
  readonly merchants: readonly { readonly id: string; readonly name: string }[];
}
export interface CreateExpense {
  readonly requestId: string;
  readonly accountId: string;
  readonly on: CivilDate;
  readonly amountMinor: number;
  readonly description: string;
  readonly merchant:
    | { readonly mode: 'none' }
    | { readonly mode: 'existing'; readonly id: string }
    | { readonly mode: 'new'; readonly name: string };
  readonly classification:
    | { readonly mode: 'automatic' }
    | { readonly mode: 'manual'; readonly categoryId: string | null };
}
export interface ExpenseCreated {
  readonly movementId: string;
  readonly snapshot: DemoSnapshot;
  readonly categories: CategoryState;
  readonly rules: RuleCatalogue;
  readonly merchants: MerchantCatalogue;
}
export interface ExpenseEditDraft extends ExpenseCreated {
  readonly token: string;
  readonly effectiveCategoryId: string | null;
}
export interface EditExpense extends Omit<CreateExpense, 'classification'> {
  readonly movementId: string;
  readonly expectedToken: string;
  readonly classification:
    { readonly mode: 'keep' } | { readonly mode: 'manual'; readonly categoryId: string | null };
}
export interface ExpenseLifecycleRequest {
  readonly requestId: string;
  readonly movementId: string;
  readonly expectedToken: string;
}
export interface DeletedExpense {
  readonly movement: Extract<CashMovement, { kind: 'expense' }>;
  readonly token: string;
  readonly effectiveCategoryId: string | null;
}
export interface ExpenseTrashState extends Omit<ExpenseCreated, 'movementId'> {
  readonly trash: readonly DeletedExpense[];
}
export interface ExpenseLifecycleResult extends ExpenseTrashState {
  readonly movementId: string;
  readonly deleted: boolean;
}
