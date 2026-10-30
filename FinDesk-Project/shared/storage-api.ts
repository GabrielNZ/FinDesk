import type { CivilDate } from '../domain/civil-date';
import type { FinanceFacts } from '../domain/finance-facts';

export interface DemoSnapshot {
  readonly formatVersion: 1;
  readonly seedId: 'demo-financas-v1';
  readonly seedVersion: 1;
  readonly asOf: CivilDate;
  readonly timezone: 'America/Sao_Paulo';
  readonly facts: FinanceFacts;
}

export interface FinancePreferences {
  readonly version: 1;
  readonly currencyMode: 'original' | 'BRL' | 'USD';
  readonly periodMode: 'calendar-month' | 'salary-cycle' | 'card-cycle';
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
  readonly schemaVersion: 1;
}

export interface StorageApi {
  getStatus(): Promise<StorageResult<StorageInfo>>;
  getDemo(): Promise<StorageResult<DemoSnapshot>>;
  getPreferences(): Promise<StorageResult<FinancePreferences>>;
  savePreferences(value: FinancePreferences): Promise<StorageResult<FinancePreferences>>;
  restoreDemoData(confirmation: 'restore-demo-data'): Promise<StorageResult<DemoSnapshot>>;
}

export const STORAGE_CHANNELS = {
  status: 'findesk:storage-status',
  readDemo: 'findesk:demo-read',
  readPreferences: 'findesk:preferences-read',
  savePreferences: 'findesk:preferences-save',
  restoreDemo: 'findesk:demo-restore',
} as const;
