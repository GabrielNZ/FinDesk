import { civilDate } from '../../domain/civil-date';
import { validateFacts } from '../../domain/finance';
import { snapshotShape } from './snapshot-shape';
import type {
  DemoSnapshot,
  FinancePreferences,
  StorageErrorCode,
  StorageResult,
} from '../../shared/storage-api';

const messages: Record<StorageErrorCode, string> = {
  unavailable:
    'Não foi possível acessar o armazenamento local. Os arquivos existentes foram preservados.',
  incompatible: 'O armazenamento usa uma versão ou formato incompatível. Nenhum dado foi recriado.',
  corrupt:
    'Os dados locais não passaram na verificação. Nenhum arquivo foi apagado ou restaurado automaticamente.',
  'invalid-request': 'Solicitação de armazenamento inválida.',
  closed: 'O armazenamento não está disponível nesta execução.',
};

export class StorageFailure extends Error {
  constructor(readonly code: StorageErrorCode) {
    super(messages[code]);
  }
}

export function failure(error: unknown): StorageResult<never> {
  const code = error instanceof StorageFailure ? error.code : 'unavailable';
  return { ok: false, error: { code, message: messages[code] } };
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new StorageFailure('invalid-request');
  return value as Record<string, unknown>;
}

export function parsePreferences(value: unknown): FinancePreferences {
  const data = record(value);
  if (
    Object.keys(data).sort().join(',') !== 'currencyMode,lastAccountId,periodMode,version' ||
    data['version'] !== 2 ||
    !['original', 'BRL', 'USD'].includes(data['currencyMode'] as string) ||
    !['calendar-month', 'salary-cycle', 'card-cycle'].includes(data['periodMode'] as string) ||
    !(
      data['lastAccountId'] === null ||
      (typeof data['lastAccountId'] === 'string' &&
        data['lastAccountId'].trim().length > 0 &&
        data['lastAccountId'].length <= 160)
    )
  )
    throw new StorageFailure('invalid-request');
  return {
    version: 2,
    currencyMode: data['currencyMode'] as FinancePreferences['currencyMode'],
    periodMode: data['periodMode'] as FinancePreferences['periodMode'],
    lastAccountId: data['lastAccountId'] as string | null,
  };
}

/** Usado somente pela migração local; o IPC não aceita formatos antigos. */
export function upgradePreferencesV1(value: unknown): FinancePreferences {
  const data = record(value);
  if (
    Object.keys(data).sort().join(',') !== 'currencyMode,periodMode,version' ||
    data['version'] !== 1
  )
    throw new StorageFailure('corrupt');
  return parsePreferences({ ...data, version: 2, lastAccountId: null });
}

/** JSON escrito pela aplicação é canônico: recusar conversões silenciosas ao ler disco. */
export function parseStoredJson(raw: unknown): unknown {
  if (typeof raw !== 'string') throw new StorageFailure('corrupt');
  try {
    const value: unknown = JSON.parse(raw);
    if (JSON.stringify(value) !== raw) throw new Error('Representação não canônica.');
    return value;
  } catch {
    throw new StorageFailure('corrupt');
  }
}

export function validateSnapshot(value: unknown): DemoSnapshot {
  try {
    const data = record(value);
    if (
      data['formatVersion'] !== 1 ||
      data['seedId'] !== 'demo-financas-v1' ||
      data['seedVersion'] !== 1 ||
      data['timezone'] !== 'America/Sao_Paulo'
    )
      throw new StorageFailure('incompatible');
    civilDate(data['asOf'] as string);
    if (!snapshotShape(value)) throw new StorageFailure('corrupt');
    const facts = record(data['facts']);
    const names = [
      'accounts',
      'movements',
      'cards',
      'purchases',
      'invoices',
      'invoiceItems',
      'salaries',
      'subscriptions',
      'coverage',
    ];
    if (Object.keys(facts).sort().join(',') !== names.sort().join(','))
      throw new StorageFailure('corrupt');
    for (const name of names) if (!Array.isArray(facts[name])) throw new StorageFailure('corrupt');
    const snapshot = value as DemoSnapshot;
    validateFacts(snapshot.facts);
    return snapshot;
  } catch (error) {
    if (error instanceof StorageFailure && error.code === 'incompatible') throw error;
    throw new StorageFailure('corrupt');
  }
}

export type StorageOperation =
  'read-demo' | 'read-preferences' | 'save-preferences' | 'restore-demo' | 'close';
export interface WorkerRequest {
  readonly id: number;
  readonly operation: StorageOperation;
  readonly payload?: unknown;
}
export interface WorkerResponse {
  readonly id: number;
  readonly result: StorageResult<unknown>;
}

export function validateRequest(value: unknown): WorkerRequest {
  const data = record(value);
  if (
    !Number.isSafeInteger(data['id']) ||
    (data['id'] as number) < 1 ||
    !['read-demo', 'read-preferences', 'save-preferences', 'restore-demo', 'close'].includes(
      data['operation'] as string,
    ) ||
    Object.keys(data).some((key) => !['id', 'operation', 'payload'].includes(key))
  )
    throw new StorageFailure('invalid-request');
  if (data['operation'] === 'save-preferences') parsePreferences(data['payload']);
  else if (data['operation'] === 'restore-demo') {
    if (data['payload'] !== 'restore-demo-data') throw new StorageFailure('invalid-request');
  } else if (data['payload'] !== undefined) throw new StorageFailure('invalid-request');
  return data as unknown as WorkerRequest;
}
