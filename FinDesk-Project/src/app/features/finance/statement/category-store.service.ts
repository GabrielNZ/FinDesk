import { Injectable, computed, signal } from '@angular/core';
import { categoryLabel } from '../../../../../application/statement';
import { parseCategoryState } from '../../../../../application/categories';
import { parseRuleCatalogue } from '../../../../../application/category-rules';
import type { RuleCatalogue, SaveCategoryRule } from '../../../../../shared/category-rules';
import { DEMO_MERCHANT_LABELS } from '../../../../../fixtures/financas/labels';
import { parseMerchantCatalogue } from '../../../../../application/expenses';
import type { MerchantCatalogue } from '../../../../../shared/expenses';
import type {
  CategoryState,
  SaveCategory,
  ClassifyMerchant,
} from '../../../../../shared/categories';

@Injectable({ providedIn: 'root' })
export class CategoryStore {
  readonly value = signal<CategoryState | null>(null);
  readonly rules = signal<RuleCatalogue | null>(null);
  readonly merchants = signal<MerchantCatalogue | null>(null);
  readonly merchantLabels = computed(() =>
    this.merchants()
      ? Object.fromEntries(this.merchants()!.merchants.map((m) => [m.id, m.name]))
      : DEMO_MERCHANT_LABELS,
  );
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = computed(() =>
    [...(this.value()?.categories ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  readonly labels = computed(() =>
    Object.fromEntries(this.categories().map((item) => [item.id, item.name])),
  );
  private loading: Promise<void> | null = null;
  label(key: string): string {
    return categoryLabel(key, this.labels());
  }
  category(key: string | null) {
    return this.value()?.categories.find((item) => item.id === key);
  }
  merchantLabel(id: string): string {
    const labels = this.merchantLabels();
    return Object.hasOwn(labels, id) ? labels[id]! : id;
  }

  load(): Promise<void> {
    if (this.loading) return this.loading;
    if (this.busy()) return Promise.resolve();
    this.loading = Promise.resolve().then(async () => {
      try {
        const api = window.finDesk?.storage;
        if (!api?.getCategories) throw new Error();
        const [result, rules, merchants] = await Promise.all([
          api.getCategories(),
          api.getCategoryRules(),
          api.getMerchants(),
        ]);
        if (!result.ok || !rules.ok || !merchants.ok) throw new Error();
        const categories = parseCategoryState(result.value);
        const catalogue = parseRuleCatalogue(rules.value);
        const names = parseMerchantCatalogue(merchants.value);
        this.value.set(categories);
        this.rules.set(catalogue);
        this.merchants.set(names);
        this.error.set(null);
      } catch {
        this.error.set('Não foi possível carregar as categorias. Tente novamente.');
      } finally {
        this.loading = null;
      }
    });
    return this.loading;
  }

  async save(input: SaveCategory): Promise<string | null> {
    const previous = this.value();
    if (!previous || this.busy() || this.loading) return null;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await window.finDesk!.storage.saveCategory(input);
      if (!result.ok) throw new Error();
      const value = parseCategoryState(result.value);
      const id =
        input.id ??
        value.categories.find((item) => !previous.categories.some((old) => old.id === item.id))?.id;
      if (!id) throw new Error();
      this.value.set(value);
      return id;
    } catch {
      this.error.set(
        'Não foi possível salvar a categoria. Seus ajustes foram mantidos para tentar novamente.',
      );
      return null;
    } finally {
      this.busy.set(false);
    }
  }
  async classify(movementId: string, categoryId: string | null): Promise<boolean> {
    if (!this.value() || this.busy() || this.loading) return false;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await window.finDesk!.storage.classifyMovement({ movementId, categoryId });
      if (!result.ok) throw new Error();
      this.value.set(parseCategoryState(result.value));
      return true;
    } catch {
      this.error.set('Não foi possível salvar a classificação. Tente novamente.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async classifyMerchant(input: ClassifyMerchant): Promise<boolean> {
    if (!this.value() || this.busy() || this.loading) return false;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await window.finDesk!.storage.classifyMerchant(input);
      if (!result.ok) throw new Error();
      this.value.set(parseCategoryState(result.value));
      return true;
    } catch {
      this.error.set(
        'Não foi possível aplicar a reclassificação. Confira a prévia e tente novamente.',
      );
      return false;
    } finally {
      this.busy.set(false);
      // Uma outra gravação pode ter tornado a prévia obsoleta. Atualizar sem reaplicar.
      if (this.error()) {
        const error = this.error();
        await this.load();
        this.error.set(error);
      }
    }
  }
  async saveRule(input: SaveCategoryRule): Promise<boolean> {
    if (!this.rules() || this.busy() || this.loading) return false;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await window.finDesk!.storage.saveCategoryRule(input);
      if (!result.ok) throw new Error();
      this.rules.set(parseRuleCatalogue(result.value));
      return true;
    } catch {
      this.error.set('Não foi possível salvar a regra. Confira os ajustes e tente novamente.');
      return false;
    } finally {
      this.busy.set(false);
      if (this.error()) {
        const error = this.error();
        await this.load();
        this.error.set(error);
      }
    }
  }
}
