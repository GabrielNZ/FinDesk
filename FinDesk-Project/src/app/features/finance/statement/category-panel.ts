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
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryNameKey,
  parseSaveCategory,
} from '../../../../../application/categories';
import type { Category, SaveCategory } from '../../../../../shared/categories';
import type { StatementRow } from '../../../../../application/statement';
import { CategoryStore } from './category-store.service';
import { CategoryRuleEditor } from './category-rule-editor';
import type { CategoryRule } from '../../../../../shared/category-rules';

@Component({
  selector: 'fd-category-panel',
  imports: [FormsModule, CategoryRuleEditor],
  templateUrl: './category-panel.html',
  styleUrls: ['./category-panel.scss', './category-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'escape($event)' },
})
export class CategoryPanel {
  readonly store = inject(CategoryStore);
  readonly movement = input<StatementRow | null>(null);
  readonly closed = output<void>();
  readonly form = signal<SaveCategory | null>(null);
  readonly tab = signal<'categories' | 'rules'>('categories');
  readonly editingRule = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly icons = CATEGORY_ICONS;
  readonly colors = CATEGORY_COLORS;
  readonly current = computed(() => {
    const movement = this.movement()?.movement;
    return movement?.kind === 'expense' ? movement : null;
  });
  constructor() {
    afterNextRender(() =>
      document.getElementById('category-panel-title')?.focus({ preventScroll: true }),
    );
  }
  edit(category: Category | null): void {
    this.message.set(null);
    this.store.error.set(null);
    this.form.set(
      category ? { ...category } : { id: null, name: '', icon: 'pi-tag', color: '#a9c8b5' },
    );
    setTimeout(() => document.getElementById('category-name')?.focus({ preventScroll: true }));
  }
  switchTab(tab: 'categories' | 'rules'): void {
    this.tab.set(tab);
    this.editingRule.set(null);
    this.message.set(null);
    this.store.error.set(null);
  }
  async toggleRule(rule: CategoryRule): Promise<void> {
    this.message.set(null);
    if (
      await this.store.saveRule({
        merchantId: rule.merchantId,
        categoryId: rule.categoryId,
        active: !rule.active,
        expectedRevision: rule.revision,
      })
    )
      this.message.set(rule.active ? 'Regra pausada.' : 'Regra ativada.');
  }
  ruleSaved(): void {
    this.editingRule.set(null);
    this.message.set('Regra salva.');
  }
  change(changes: Partial<SaveCategory>): void {
    this.form.update((value) => (value ? { ...value, ...changes } : null));
  }
  async save(): Promise<void> {
    if (this.store.busy()) return;
    this.message.set(null);
    let input: SaveCategory;
    try {
      input = parseSaveCategory(this.form());
      if (
        this.store
          .categories()
          .some(
            (item) =>
              item.id !== input.id && categoryNameKey(item.name) === categoryNameKey(input.name),
          )
      )
        throw new Error('Já existe uma categoria com esse nome.');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Confira os dados da categoria.');
      return;
    }
    const id = await this.store.save(input);
    if (!id) return;
    this.form.set(null);
    // Criar não classifica silenciosamente: a nova categoria aparece entre as opções.
    this.message.set('Categoria salva.');
    document.getElementById('category-panel-title')?.focus({ preventScroll: true });
  }
  async choose(categoryId: string | null): Promise<void> {
    const movement = this.movement();
    if (movement && (await this.store.classify(movement.movement.id, categoryId)))
      this.closed.emit();
  }
  cancelForm(): void {
    this.form.set(null);
    this.message.set(null);
    document.getElementById('category-panel-title')?.focus({ preventScroll: true });
  }
  escape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.store.busy()) return;
    if (this.editingRule()) this.editingRule.set(null);
    else if (this.form()) this.cancelForm();
    else this.closed.emit();
  }
}
