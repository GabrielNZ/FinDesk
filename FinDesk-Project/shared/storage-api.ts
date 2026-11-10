import type { CivilDate } from '../domain/civil-date';
import type { FinanceFacts } from '../domain/finance-facts';
import type { CardLayout } from './card-layout';
import type { StatementLayout } from './statement-layout';
import type { CategoryState, ClassifyMovement, ClassifyMerchant, SaveCategory } from './categories';
import type { RuleCatalogue, SaveCategoryRule } from './category-rules';
import type {
  ExpenseLifecycleRequest,
  ExpenseLifecycleResult,
  ExpenseTrashState,
} from './expenses';
import type {
  CreateExpense,
  EditExpense,
  ExpenseCreated,
  ExpenseEditDraft,
  MerchantCatalogue,
} from './expenses';

export interface DemoSnapshot {
  readonly formatVersion: 1;
  readonly seedId: 'demo-financas-v1';
  readonly seedVersion: 1 | 2;
  readonly asOf: CivilDate;
  readonly timezone: 'America/Sao_Paulo';
  readonly facts: FinanceFacts;
}

export interface AccountCycleReference {
  readonly accountId: string;
  readonly salaryDay: number | null;
  readonly salaryFrom: CivilDate | null;
  readonly referenceCardId: string | null;
}

export interface FinancePreferences {
  readonly version: 3;
  readonly cycleReferences: readonly AccountCycleReference[];
  readonly currencyMode: 'original' | 'BRL' | 'USD';
  readonly periodMode: 'calendar-month' | 'salary-cycle' | 'card-cycle';
  readonly lastAccountId: string | null;
}

export type StorageErrorCode =
  'unavailable' | 'incompatible' | 'corrupt' | 'invalid-request' | 'closed';
export type StorageResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: StorageErrorCode; readonly message: string };
    };

export interface StorageInfo {
  readonly environment: 'demo';
  readonly schemaVersion: 6;
}

export interface StorageApi {
  getExpenseAnalysisLayout(): Promise<StorageResult<CardLayout | null>>;
  saveExpenseAnalysisLayout(value: CardLayout): Promise<StorageResult<CardLayout>>;
  getExpenseTrash(): Promise<StorageResult<ExpenseTrashState>>;
  deleteExpense(value: ExpenseLifecycleRequest): Promise<StorageResult<ExpenseLifecycleResult>>;
  recoverExpense(value: ExpenseLifecycleRequest): Promise<StorageResult<ExpenseLifecycleResult>>;
  getExpenseEdit(movementId: string): Promise<StorageResult<ExpenseEditDraft>>;
  editExpense(value: EditExpense): Promise<StorageResult<ExpenseCreated>>;
  getMerchants(): Promise<StorageResult<MerchantCatalogue>>;
  createExpense(value: CreateExpense): Promise<StorageResult<ExpenseCreated>>;
  getCategoryRules(): Promise<StorageResult<RuleCatalogue>>;
  saveCategoryRule(value: SaveCategoryRule): Promise<StorageResult<RuleCatalogue>>;
  getCategories(): Promise<StorageResult<CategoryState>>;
  saveCategory(value: SaveCategory): Promise<StorageResult<CategoryState>>;
  classifyMovement(value: ClassifyMovement): Promise<StorageResult<CategoryState>>;
  classifyMerchant(value: ClassifyMerchant): Promise<StorageResult<CategoryState>>;
  getStatus(): Promise<StorageResult<StorageInfo>>;
  getDemo(): Promise<StorageResult<DemoSnapshot>>;
  getPreferences(): Promise<StorageResult<FinancePreferences>>;
  savePreferences(value: FinancePreferences): Promise<StorageResult<FinancePreferences>>;
  restoreDemoData(confirmation: 'restore-demo-data'): Promise<StorageResult<DemoSnapshot>>;
  getCardLayout(): Promise<StorageResult<CardLayout | null>>;
  getStatementLayout(): Promise<StorageResult<StatementLayout | null>>;
  saveStatementLayout(layout: StatementLayout): Promise<StorageResult<StatementLayout>>;
  saveCardLayout(layout: CardLayout): Promise<StorageResult<CardLayout>>;
  restoreCardLayout(confirmation: 'restore-card-layout'): Promise<StorageResult<CardLayout>>;
}

export const STORAGE_CHANNELS = {
  readExpenseAnalysisLayout: 'findesk:expense-analysis-layout-read',
  saveExpenseAnalysisLayout: 'findesk:expense-analysis-layout-save',
  readExpenseTrash: 'findesk:expense-trash-read',
  deleteExpense: 'findesk:expense-delete',
  recoverExpense: 'findesk:expense-recover',
  readExpenseEdit: 'findesk:expense-edit-read',
  editExpense: 'findesk:expense-edit',
  readMerchants: 'findesk:merchants-read',
  createExpense: 'findesk:expense-create',
  readCategoryRules: 'findesk:category-rules-read',
  saveCategoryRule: 'findesk:category-rule-save',
  readCategories: 'findesk:categories-read',
  saveCategory: 'findesk:category-save',
  classifyMovement: 'findesk:movement-classify',
  classifyMerchant: 'findesk:merchant-classify',
  status: 'findesk:storage-status',
  readDemo: 'findesk:demo-read',
  readPreferences: 'findesk:preferences-read',
  savePreferences: 'findesk:preferences-save',
  restoreDemo: 'findesk:demo-restore',
  readCardLayout: 'findesk:card-layout-read',
  readStatementLayout: 'findesk:statement-layout-read',
  saveStatementLayout: 'findesk:statement-layout-save',
  saveCardLayout: 'findesk:card-layout-save',
  restoreCardLayout: 'findesk:card-layout-restore',
} as const;
