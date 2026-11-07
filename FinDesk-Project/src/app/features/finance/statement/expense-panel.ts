import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { adjacentCivilDate, civilDate } from '../../../../../domain/civil-date';
import { formatCivilDate } from '../../../../../application/finance-context';
import {
  merchantNameKey,
  parseCreateExpense,
  parseExpenseAmount,
} from '../../../../../application/expenses';
import type { CreateExpense } from '../../../../../shared/expenses';
import { FinanceContext } from '../finance-context.service';
import { CategoryStore } from './category-store.service';

@Component({
  selector: 'fd-expense-panel',
  imports: [FormsModule],
  templateUrl: './expense-panel.html',
  styleUrls: ['./category-panel.scss', './expense-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'escape($event)' },
})
export class ExpensePanel {
  readonly context = inject(FinanceContext);
  readonly store = inject(CategoryStore);
  readonly closed = output<void>();
  readonly created = output<string>();
  readonly reveal = output<string>();
  readonly outside = input(false);
  readonly amount = signal('');
  readonly date = signal(this.context.snapshot()!.asOf as string);
  readonly accountId = signal(this.context.account()?.id ?? '');
  readonly description = signal('');
  readonly merchantSearch = signal('');
  readonly merchant = signal<CreateExpense['merchant']>({ mode: 'none' });
  readonly category = signal<string | null | undefined>(undefined);
  readonly categoriesOpen = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedId = signal<string | null>(null);
  readonly displayDate = formatCivilDate;
  readonly account = computed(() =>
    this.context.snapshot()!.facts.accounts.find((a) => a.id === this.accountId()),
  );
  readonly minDate = computed(() =>
    this.account() ? adjacentCivilDate(this.account()!.openingOn, 1) : null,
  );
  readonly matches = computed(
    () =>
      this.store
        .merchants()
        ?.merchants.filter((m) =>
          merchantNameKey(m.name).includes(merchantNameKey(this.merchantSearch())),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) ?? [],
  );
  readonly merchantName = computed(() => {
    const merchant = this.merchant();
    return merchant.mode === 'new'
      ? merchant.name
      : merchant.mode === 'existing'
        ? this.store.merchantLabel(merchant.id)
        : null;
  });
  readonly rule = computed(() => {
    const merchant = this.merchant();
    return merchant.mode === 'existing'
      ? this.store.rules()?.rules.find((r) => r.merchantId === merchant.id && r.active)
      : null;
  });
  readonly automaticLabel = computed(() =>
    this.rule()
      ? `Regra: ${this.rule()!.categoryId ? this.store.label(this.rule()!.categoryId!) : 'Sem categoria'}`
      : 'Sem regra · Sem categoria',
  );
  private attempt: { payload: string; requestId: string } | null = null;
  constructor() {
    afterNextRender(() => document.getElementById('expense-value')?.focus({ preventScroll: true }));
  }
  prepareMerchant(): void {
    const name = this.merchantSearch().trim().replace(/\s+/gu, ' ');
    if (!name || name.length > 160 || /\p{Cc}/u.test(name)) {
      this.error.set('Informe um nome de até 160 caracteres.');
      return;
    }
    if (
      this.store
        .merchants()
        ?.merchants.some((m) => merchantNameKey(m.name) === merchantNameKey(name))
    ) {
      this.error.set('Já existe um estabelecimento com esse nome. Selecione-o na lista.');
      return;
    }
    this.merchant.set({ mode: 'new', name });
    this.error.set(null);
  }
  choose(categoryId: string | null | undefined): void {
    this.category.set(categoryId);
    this.categoriesOpen.set(false);
  }
  async save(): Promise<void> {
    if (this.store.busy()) return;
    this.error.set(null);
    let input: CreateExpense;
    try {
      const on = civilDate(this.date());
      if (!this.account() || on <= this.account()!.openingOn || on > this.context.snapshot()!.asOf)
        throw new Error('Escolha uma conta e uma data dentro do intervalo informado.');
      if (!this.description().trim()) throw new Error('Informe uma descrição para a despesa.');
      const draft = {
        accountId: this.accountId(),
        on,
        amountMinor: parseExpenseAmount(this.amount()),
        description: this.description(),
        merchant: this.merchant(),
        classification:
          this.category() === undefined
            ? { mode: 'automatic' as const }
            : { mode: 'manual' as const, categoryId: this.category()! },
      };
      const payload = JSON.stringify(draft);
      if (this.attempt?.payload !== payload)
        this.attempt = { payload, requestId: crypto.randomUUID() };
      input = parseCreateExpense({ ...draft, requestId: this.attempt!.requestId });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Confira os campos.');
      return;
    }
    this.store.busy.set(true);
    try {
      const result = await window.finDesk!.storage.createExpense(input);
      if (!result.ok) throw new Error();
      this.store.value.set(result.value.categories);
      this.store.rules.set(result.value.rules);
      this.store.merchants.set(result.value.merchants);
      this.context.snapshot.set(result.value.snapshot);
      this.savedId.set(result.value.movementId);
      this.created.emit(result.value.movementId);
      setTimeout(() => document.getElementById('expense-saved')?.focus({ preventScroll: true }));
    } catch {
      this.error.set(
        'Não foi possível salvar a despesa. Seus campos foram mantidos para tentar novamente.',
      );
    } finally {
      this.store.busy.set(false);
    }
  }
  reset(): void {
    this.savedId.set(null);
    this.amount.set('');
    this.description.set('');
    this.date.set(this.context.snapshot()!.asOf);
    this.merchant.set({ mode: 'none' });
    this.merchantSearch.set('');
    this.category.set(undefined);
    this.categoriesOpen.set(false);
    this.error.set(null);
    this.attempt = null;
    setTimeout(() => document.getElementById('expense-value')?.focus({ preventScroll: true }));
  }
  escape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.store.busy()) this.closed.emit();
  }
}
