import { Injectable, signal } from '@angular/core';
import type { DesktopRuntimeInfo } from '../../../shared/desktop-api';

@Injectable({ providedIn: 'root' })
export class RuntimeService {
  readonly environment = window.finDesk ? 'desktop' : 'browser';
  readonly info = signal<DesktopRuntimeInfo | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!window.finDesk || this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const info = await window.finDesk.getRuntimeInfo();
      if (typeof info?.appVersion !== 'string' || typeof info?.platform !== 'string') {
        throw new Error('Resposta de versão inválida');
      }
      this.info.set(info);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
