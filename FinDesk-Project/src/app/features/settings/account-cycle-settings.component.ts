import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Account, Card } from '../../../../domain/finance-facts';
import type { CivilDate } from '../../../../domain/civil-date';
import type { AccountCycleReference } from '../../../../shared/storage-api';
import { FinancePreferencesStore } from '../finance/finance-preferences.service';
import { ChoiceSymbolView, type ChoiceSymbol } from '../finance/choice-symbol';

@Component({
  selector: 'fd-account-cycle-settings',
  imports: [ChoiceSymbolView],
  templateUrl: './account-cycle-settings.component.html',
  styleUrl: './account-cycle-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCycleSettings {
  readonly account = input.required<Account>();
  readonly cards = input.required<readonly Card[]>();
  readonly asOf = input.required<CivilDate>();
  readonly preferences = inject(FinancePreferencesStore);
  readonly days = Array.from({ length: 31 }, (_, index) => index + 1);
  readonly feedback = signal<'saved' | 'failed' | null>(null);
  readonly ownCards = computed(() =>
    this.cards().filter((card) => card.accountId === this.account().id),
  );
  readonly rule = computed<AccountCycleReference>(
    () =>
      this.preferences
        .value()
        ?.cycleReferences.find((item) => item.accountId === this.account().id) ?? {
        accountId: this.account().id,
        salaryDay: null,
        salaryFrom: null,
        referenceCardId: null,
      },
  );
  readonly symbol = computed<ChoiceSymbol>(() =>
    this.account().id === 'demo-a' ? 'nubank' : this.account().id === 'demo-u' ? 'nomad' : 'wallet',
  );
  readonly name = computed(() => this.account().name.split(' · demonstração')[0]);
  readonly missingReference = computed(
    () =>
      !!this.rule().referenceCardId &&
      !this.ownCards().some((card) => card.id === this.rule().referenceCardId),
  );

  async selectDay(day: number | null): Promise<void> {
    if (this.preferences.saving() || this.rule().salaryDay === day) return;
    await this.save({
      ...this.rule(),
      salaryDay: day,
      salaryFrom: day === null ? null : this.asOf(),
    });
  }
  async selectCard(id: string | null): Promise<void> {
    if (this.preferences.saving() || this.rule().referenceCardId === id) return;
    await this.save({ ...this.rule(), referenceCardId: id });
  }
  private async save(rule: AccountCycleReference): Promise<void> {
    this.feedback.set(null);
    const saved = await this.preferences.updateCycle(rule);
    this.feedback.set(saved ? 'saved' : 'failed');
  }
  moveDayFocus(event: KeyboardEvent): void {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (!(event.key in steps) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const buttons = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 30
          : Math.max(0, Math.min(30, index + steps[event.key]!));
    buttons[next]?.focus();
  }
}
