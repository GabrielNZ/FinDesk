import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CategoryStore } from './category-store.service';

@Component({
  selector: 'fd-category-rule-editor',
  templateUrl: './category-rule-editor.html',
  styleUrls: ['./category-panel.scss', './category-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryRuleEditor {
  readonly merchantId = input.required<string>();
  readonly saved = output<void>();
  readonly store = inject(CategoryStore);
  readonly draft = signal<string | null | undefined>(undefined);
  readonly success = signal(false);
  readonly current = computed(() =>
    this.store.rules()?.rules.find((r) => r.merchantId === this.merchantId()),
  );
  readonly destination = computed(() =>
    this.draft() === undefined ? this.current()?.categoryId : this.draft(),
  );
  readonly changed = computed(
    () =>
      this.destination() !== undefined &&
      (!this.current() || this.destination() !== this.current()!.categoryId),
  );
  constructor() {
    effect(() => {
      this.merchantId();
      this.draft.set(undefined);
      this.success.set(false);
    });
  }
  choose(categoryId: string | null): void {
    this.draft.set(categoryId);
    this.success.set(false);
    this.store.error.set(null);
  }
  async save(): Promise<void> {
    const categoryId = this.destination();
    if (!this.changed() || categoryId === undefined || this.store.busy()) return;
    if (
      await this.store.saveRule({
        merchantId: this.merchantId(),
        categoryId,
        active: this.current()?.active ?? true,
        expectedRevision: this.current()?.revision ?? null,
      })
    ) {
      this.draft.set(undefined);
      this.success.set(true);
      this.saved.emit();
    }
  }
}
