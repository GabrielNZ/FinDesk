import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type {
  ExpenseEditDraft,
  ExpenseLifecycleRequest,
  ExpenseTrashState,
  DeletedExpense,
} from '../../../../../shared/expenses';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import { money } from '../../../../../domain/money';
import { FinanceContext } from '../finance-context.service';
import { CategoryStore } from './category-store.service';

@Component({
  selector: 'fd-expense-trash-panel',
  templateUrl: './expense-trash-panel.html',
  styleUrls: ['./category-panel.scss', './expense-trash-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'escape($event)' },
})
export class ExpenseTrashPanel {
  readonly context = inject(FinanceContext);
  readonly store = inject(CategoryStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly movementId = input<string | null>(null);
  readonly outside = input(false);
  readonly closed = output<void>();
  readonly changed = output<{ movementId: string; deleted: boolean }>();
  readonly reveal = output<string>();
  readonly view = signal<'preview' | 'list'>('list');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly conflict = signal(false);
  readonly draft = signal<ExpenseEditDraft | null>(null);
  readonly trash = signal<readonly DeletedExpense[]>([]);
  readonly recoveredId = signal<string | null>(null);
  readonly movement = computed(() =>
    this.draft()?.snapshot.facts.movements.find((m) => m.id === this.movementId()),
  );
  readonly categoryId = computed(() => this.draft()?.effectiveCategoryId ?? null);
  readonly effectValue = computed(() => {
    const movement = this.movement();
    return movement ? money(-movement.delta.minorUnits, movement.delta.currency) : null;
  });
  readonly money = formatMoney;
  readonly date = formatCivilDate;
  private generation = 0;
  private attempt: { payload: string; value: ExpenseLifecycleRequest } | null = null;
  constructor() {
    effect(() => {
      const id = this.movementId();
      untracked(() => {
        if (id) void this.loadPreview(id);
        else void this.loadList();
      });
    });
  }
  accountName(id: string): string {
    return this.context.snapshot()?.facts.accounts.find((a) => a.id === id)?.name ?? id;
  }
  private apply(state: Omit<ExpenseTrashState, 'trash'>): void {
    this.store.value.set(state.categories);
    this.store.rules.set(state.rules);
    this.store.merchants.set(state.merchants);
    this.context.snapshot.set(state.snapshot);
  }
  private focus(id: string): void {
    setTimeout(() => {
      if (!this.destroyRef.destroyed) document.getElementById(id)?.focus({ preventScroll: true });
    });
  }
  async loadPreview(id: string): Promise<void> {
    const generation = ++this.generation;
    this.view.set('preview');
    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);
    this.conflict.set(false);
    this.draft.set(null);
    this.attempt = null;
    try {
      const result = await window.finDesk!.storage.getExpenseEdit(id);
      if (this.destroyRef.destroyed || generation !== this.generation) return;
      if (!result.ok) throw new Error();
      this.apply(result.value);
      this.draft.set(result.value);
      this.focus('expense-trash-title');
    } catch {
      if (!this.destroyRef.destroyed && generation === this.generation)
        this.error.set('Não foi possível carregar esta despesa para exclusão.');
    } finally {
      if (!this.destroyRef.destroyed && generation === this.generation) this.loading.set(false);
    }
  }
  async loadList(): Promise<void> {
    const generation = ++this.generation;
    this.view.set('list');
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await window.finDesk!.storage.getExpenseTrash();
      if (this.destroyRef.destroyed || generation !== this.generation) return;
      if (!result.ok) throw new Error();
      this.apply(result.value);
      this.trash.set(result.value.trash);
      this.focus('expense-trash-title');
    } catch {
      if (!this.destroyRef.destroyed && generation === this.generation)
        this.error.set('Não foi possível carregar as despesas excluídas. Tente novamente.');
    } finally {
      if (!this.destroyRef.destroyed && generation === this.generation) this.loading.set(false);
    }
  }
  async confirm(): Promise<void> {
    const draft = this.draft();
    if (draft && !this.conflict()) await this.perform('delete', draft.movementId, draft.token);
  }
  async recover(item: DeletedExpense): Promise<void> {
    await this.perform('recover', item.movement.id, item.token);
  }
  private async perform(operation: 'delete' | 'recover', id: string, token: string): Promise<void> {
    if (this.store.busy() || this.loading()) return;
    const payload = JSON.stringify([operation, id, token]);
    if (this.attempt?.payload !== payload)
      this.attempt = {
        payload,
        value: { requestId: crypto.randomUUID(), movementId: id, expectedToken: token },
      };
    this.store.busy.set(true);
    this.error.set(null);
    this.message.set(null);
    this.recoveredId.set(null);
    try {
      const result =
        operation === 'delete'
          ? await window.finDesk!.storage.deleteExpense(this.attempt.value)
          : await window.finDesk!.storage.recoverExpense(this.attempt.value);
      if (!result.ok) throw new Error();
      this.apply(result.value);
      if (this.destroyRef.destroyed) return;
      this.trash.set(result.value.trash);
      this.view.set('list');
      this.changed.emit({ movementId: id, deleted: result.value.deleted });
      this.message.set(result.value.deleted ? 'Despesa excluída.' : 'Despesa recuperada.');
      if (!result.value.deleted) this.recoveredId.set(id);
      this.focus('expense-trash-status');
    } catch {
      if (this.destroyRef.destroyed) return;
      if (operation === 'delete') {
        this.error.set('Não foi possível excluir a despesa. Confira a prévia e tente novamente.');
        try {
          const latest = await window.finDesk!.storage.getExpenseEdit(id);
          if (!this.destroyRef.destroyed && (!latest.ok || latest.value.token !== token)) {
            this.conflict.set(true);
            this.error.set(
              latest.ok
                ? 'Este lançamento foi alterado. Recarregue a prévia antes de confirmar a exclusão.'
                : 'Este lançamento não está disponível para exclusão. Confira a lista de Excluídas.',
            );
          }
        } catch {
          /* Preservar prévia e versão esperada. */
        }
      } else {
        await this.loadList();
        if (!this.destroyRef.destroyed)
          this.error.set(
            'Não foi possível recuperar a despesa. Confira a lista atualizada e tente novamente.',
          );
      }
    } finally {
      this.store.busy.set(false);
    }
  }
  escape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.store.busy()) this.closed.emit();
  }
}
