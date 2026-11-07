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
import type { MerchantQuery } from '../../../../../shared/categories';
import type { StatementRow } from '../../../../../application/statement';
import {
  MOVEMENT_TYPES,
  statementSelectionGrandTotals,
} from '../../../../../application/statement';
import { previewMerchantClassification } from '../../../../../application/merchant-classification';
import { formatCivilDate, formatMoney } from '../../../../../application/finance-context';
import { DEMO_MERCHANT_LABELS } from '../../../../../fixtures/financas/labels';
import { FinanceContext } from '../finance-context.service';
import { CategoryStore } from './category-store.service';

@Component({
  selector: 'fd-merchant-category-panel',
  templateUrl: './merchant-category-panel.html',
  styleUrls: ['./category-panel.scss', './merchant-category-panel.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'escape($event)' },
})
export class MerchantCategoryPanel {
  readonly movement = input.required<StatementRow>();
  readonly query = input.required<MerchantQuery>();
  readonly closed = output<void>();
  readonly applied = output<number>();
  readonly store = inject(CategoryStore);
  readonly context = inject(FinanceContext);
  readonly destination = signal<string | null | undefined>(undefined);
  readonly includeManual = signal(false);
  readonly money = formatMoney;
  readonly date = formatCivilDate;
  readonly merchantId = computed(() => {
    const movement = this.movement().movement;
    return movement.kind === 'expense' ? movement.merchantId : null;
  });
  readonly merchantName = computed(() =>
    Object.hasOwn(DEMO_MERCHANT_LABELS, this.merchantId() ?? '')
      ? DEMO_MERCHANT_LABELS[this.merchantId()!]
      : this.merchantId(),
  );
  readonly filterDescription = computed(() => {
    const query = this.query();
    return [
      query.search ? `Busca: ${query.search}` : '',
      query.kind ? `Tipo: ${MOVEMENT_TYPES[query.kind].label}` : '',
      query.category ? `Categoria: ${this.store.label(query.category)}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  });
  readonly previewState = computed<{
    items: ReturnType<typeof previewMerchantClassification>;
    error: string | null;
  }>(() => {
    const snapshot = this.context.snapshot();
    const state = this.store.value();
    const merchant = this.merchantId();
    const destination = this.destination();
    if (!snapshot || !state || !merchant || destination === undefined)
      return { items: [], error: null };
    try {
      return {
        items: previewMerchantClassification(
          snapshot,
          state,
          this.query(),
          merchant,
          destination,
          this.includeManual(),
        ),
        error: null,
      };
    } catch {
      return {
        items: [],
        error: 'Não foi possível montar a prévia. Confira a conta e a categoria escolhidas.',
      };
    }
  });
  readonly preview = computed(() => this.previewState().items);
  readonly changes = computed(() => this.preview().filter((item) => item.status === 'change'));
  readonly totals = computed(() =>
    statementSelectionGrandTotals(
      this.changes().map(({ row }) => ({ ...row, amount: row.movement.delta })),
      'original',
    ),
  );
  readonly preserved = computed(
    () => this.preview().filter((item) => item.status === 'preserved').length,
  );
  readonly unchanged = computed(
    () => this.preview().filter((item) => item.status === 'unchanged').length,
  );

  constructor() {
    afterNextRender(() =>
      document.getElementById('merchant-panel-title')?.focus({ preventScroll: true }),
    );
  }
  choose(categoryId: string | null): void {
    if (this.store.busy()) return;
    this.destination.set(categoryId);
    this.store.error.set(null);
  }
  async apply(): Promise<void> {
    const categoryId = this.destination();
    const merchantId = this.merchantId();
    const count = this.changes().length;
    if (!merchantId || categoryId === undefined || !count || this.store.busy()) return;
    const success = await this.store.classifyMerchant({
      merchantId,
      categoryId,
      includeManual: this.includeManual(),
      query: this.query(),
      expected: this.preview().map((item) => item.expected),
    });
    if (success) this.applied.emit(count);
  }
  escape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.store.busy()) this.closed.emit();
  }
}
