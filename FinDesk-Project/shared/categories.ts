export interface Category {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
}

export interface CategoryState {
  readonly version: 1;
  readonly categories: readonly Category[];
  readonly classifications: readonly {
    readonly movementId: string;
    readonly categoryId: string | null;
  }[];
}

export interface SaveCategory {
  readonly id: string | null;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
}

export interface ClassifyMovement {
  readonly movementId: string;
  readonly categoryId: string | null;
}
import type { CivilDate } from '../domain/civil-date';
import type { CashMovement } from '../domain/finance-facts';

export interface MerchantQuery {
  readonly accountId: string;
  readonly start: CivilDate;
  readonly end: CivilDate;
  readonly search: string;
  readonly kind: CashMovement['kind'] | null;
  readonly category: string | null;
}

export interface MerchantPreviewItem {
  readonly movementId: string;
  readonly categoryId: string | null;
  readonly manual: boolean;
}

export interface ClassifyMerchant {
  readonly merchantId: string;
  readonly categoryId: string | null;
  readonly includeManual: boolean;
  readonly query: MerchantQuery;
  readonly expected: readonly MerchantPreviewItem[];
}
