import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FinancePreferencesStore } from '../finance/finance-preferences.service';
import { PeriodSymbol } from '../finance/period-symbol';
import type { FinancePreferences } from '../../../../shared/storage-api';

@Component({
  selector: 'fd-finance-settings',
  imports: [PeriodSymbol],
  templateUrl: './finance-settings.component.html',
  styleUrl: './finance-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceSettings {
  readonly preferences = inject(FinancePreferencesStore);
  readonly feedback = signal<'saved' | 'failed' | null>(null);
  readonly modes: readonly { value: FinancePreferences['periodMode']; label: string }[] = [
    { value: 'calendar-month', label: 'Calendário' },
    { value: 'salary-cycle', label: 'Salário' },
    { value: 'card-cycle', label: 'Cartão' },
  ];

  constructor() {
    void this.preferences.load();
  }

  async select(mode: FinancePreferences['periodMode']): Promise<void> {
    if (this.preferences.saving() || this.preferences.value()?.periodMode === mode) return;
    this.feedback.set(null);
    const saved = await this.preferences.update({ periodMode: mode });
    this.feedback.set(saved ? 'saved' : 'failed');
  }
}
