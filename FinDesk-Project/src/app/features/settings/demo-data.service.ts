import { Injectable, signal } from '@angular/core';

export type DemoDataState = 'checking' | 'available' | 'restoring' | 'failed' | 'browser';

/** Estado da seção; somente operações explícitas da ponte, sem SQL ou cálculos financeiros. */
@Injectable()
export class DemoDataService {
  readonly state = signal<DemoDataState>('checking');
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  private active = false;

  constructor() {
    void this.check();
  }

  async check(): Promise<void> {
    if (this.active) return;
    const api = window.finDesk?.storage;
    if (!api) {
      this.state.set('browser');
      return;
    }
    this.active = true;
    this.state.set('checking');
    this.error.set(null);
    this.feedback.set(null);
    try {
      const status = await api.getStatus();
      if (!status.ok) {
        this.failed(status.error.message);
        return;
      }
      const demo = await api.getDemo();
      if (!demo.ok) {
        this.failed(demo.error.message);
        return;
      }
      this.state.set('available');
    } catch {
      this.failed('Não foi possível consultar os dados de demonstração.');
    } finally {
      this.active = false;
    }
  }

  async restore(): Promise<boolean> {
    const api = window.finDesk?.storage;
    if (this.active || this.state() !== 'available' || !api) return false;
    this.active = true;
    this.state.set('restoring');
    this.feedback.set(null);
    this.error.set(null);
    try {
      const result = await api.restoreDemoData('restore-demo-data');
      if (!result.ok) {
        this.failed(result.error.message);
        return false;
      }
      this.state.set('available');
      this.feedback.set('Dados de demonstração restaurados.');
      return true;
    } catch {
      this.failed(
        'Não foi possível confirmar a restauração. Verifique os dados antes de tentar novamente.',
      );
      return false;
    } finally {
      this.active = false;
    }
  }

  private failed(message: string): void {
    this.state.set('failed');
    this.error.set(message);
  }
}
