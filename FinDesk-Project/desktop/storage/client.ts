import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import type {
  DemoSnapshot,
  FinancePreferences,
  StorageInfo,
  StorageResult,
} from '../../shared/storage-api';
import { failure, StorageFailure, type StorageOperation, type WorkerResponse } from './contracts';
import type { CardLayout } from '../../shared/card-layout';

/** Canal interno para um único worker; sem SQL, eval ou caminho em mensagens. */
export class StorageClient {
  readonly ready: Promise<StorageResult<StorageInfo>>;
  private worker: Worker;
  private resolveReady!: (value: StorageResult<StorageInfo>) => void;
  private startupTimer: ReturnType<typeof setTimeout>;
  private failed: StorageResult<never> | undefined;
  private closed = false;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (result: StorageResult<unknown>) => void; timer: ReturnType<typeof setTimeout> }
  >();

  constructor(directory: string) {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.worker = new Worker(join(__dirname, 'worker.js'), { workerData: { directory } });
    this.startupTimer = setTimeout(() => {
      this.fail(failure(new StorageFailure('unavailable')));
      void this.worker.terminate();
    }, 10_000);
    this.worker.on('message', (message: WorkerResponse) => {
      if (message.id === 0) {
        clearTimeout(this.startupTimer);
        if (!message.result.ok) this.failed = message.result;
        this.resolveReady(message.result as StorageResult<StorageInfo>);
      } else {
        const request = this.pending.get(message.id);
        if (request) {
          clearTimeout(request.timer);
          this.pending.delete(message.id);
          request.resolve(message.result);
        }
      }
    });
    this.worker.on('error', () => this.fail(failure(new StorageFailure('unavailable'))));
    this.worker.on('exit', () => {
      if (!this.closed && !this.failed) this.fail(failure(new StorageFailure('unavailable')));
    });
  }

  private fail(result: StorageResult<never>): void {
    if (!this.failed) this.failed = result;
    clearTimeout(this.startupTimer);
    this.resolveReady(this.failed);
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.resolve(this.failed);
    }
    this.pending.clear();
  }

  private async request<T>(
    operation: StorageOperation,
    payload?: unknown,
  ): Promise<StorageResult<T>> {
    const ready = await this.ready;
    if (!ready.ok) return ready;
    if (this.failed) return this.failed;
    if (this.closed) return failure(new StorageFailure('closed'));
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.fail(failure(new StorageFailure('unavailable')));
        void this.worker.terminate();
      }, 10_000);
      this.pending.set(id, { timer, resolve: (value) => resolve(value as StorageResult<T>) });
      try {
        this.worker.postMessage({ id, operation, ...(payload === undefined ? {} : { payload }) });
      } catch (error) {
        this.fail(failure(error));
      }
    });
  }

  getDemo(): Promise<StorageResult<DemoSnapshot>> {
    return this.request('read-demo');
  }
  async getStatus(): Promise<StorageResult<StorageInfo>> {
    const result = await this.ready;
    return this.failed ?? (this.closed ? failure(new StorageFailure('closed')) : result);
  }
  getPreferences(): Promise<StorageResult<FinancePreferences>> {
    return this.request('read-preferences');
  }
  savePreferences(value: FinancePreferences): Promise<StorageResult<FinancePreferences>> {
    return this.request('save-preferences', value);
  }
  restoreDemoData(): Promise<StorageResult<DemoSnapshot>> {
    return this.request('restore-demo', 'restore-demo-data');
  }

  getCardLayout(): Promise<StorageResult<CardLayout | null>> {
    return this.request('read-card-layout');
  }
  saveCardLayout(layout: CardLayout): Promise<StorageResult<CardLayout>> {
    return this.request('save-card-layout', layout);
  }
  restoreCardLayout(): Promise<StorageResult<CardLayout>> {
    return this.request('restore-card-layout', 'restore-card-layout');
  }

  async close(): Promise<void> {
    if (this.closed) return;
    try {
      await this.request('close');
    } finally {
      this.closed = true;
      await this.worker.terminate();
    }
  }
}
