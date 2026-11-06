import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { GroupingRow, StatementGroup } from '../../../../../application/statement-grouping';
import { formatMoney } from '../../../../../application/finance-context';
import { MOVEMENT_TYPES } from '../../../../../application/statement';
import type { Category } from '../../../../../shared/categories';

export function groupToggleId(id: string): string {
  return `statement-group-toggle-${encodeURIComponent(id)}`;
}

export function statementGroupIcon(group: StatementGroup): string {
  if (group.filter.level === 'kind') return MOVEMENT_TYPES[group.filter.kind].icon;
  const icons: Readonly<Record<string, string>> = {
    alimentacao: 'pi-shopping-cart',
    casa: 'pi-home',
    entretenimento: 'pi-ticket',
    transporte: 'pi-car',
  };
  const key = group.filter.categoryId;
  return key && Object.hasOwn(icons, key) ? icons[key]! : 'pi-tag';
}

@Component({
  selector: 'fd-statement-groups',
  imports: [NgTemplateOutlet],
  templateUrl: './statement-groups.html',
  styleUrl: './statement-groups.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatementGroups {
  readonly groups = input.required<readonly StatementGroup[]>();
  readonly categories = input<readonly Category[]>([]);
  readonly openId = input<string | null>(null);
  readonly expandedHeight = input(400);
  readonly dragId = input<string | null>(null);
  readonly expandedGroup = computed(() =>
    this.groups().find((group) => group.id === this.openId()),
  );
  readonly movementTemplate = input.required<TemplateRef<{ $implicit: GroupingRow }>>();
  readonly groupToggled = output<string>();
  readonly groupDragStarted = output<{ event: PointerEvent; id: string }>();
  readonly groupSelected = output<string>();
  readonly formatMoney = formatMoney;
  readonly toggleId = groupToggleId;
  icon(group: StatementGroup): string {
    return this.category(group)?.icon ?? statementGroupIcon(group);
  }
  category(group: StatementGroup): Category | undefined {
    const filter = group.filter;
    return filter.level !== 'kind'
      ? this.categories().find((item) => item.id === filter.categoryId)
      : undefined;
  }

  contentId(id: string): string {
    return `statement-group-content-${encodeURIComponent(id)}`;
  }
  startDrag(event: PointerEvent, id: string): void {
    const target = event.target as HTMLElement;
    const control = target.closest('button, input, a, select, textarea');
    if (target.closest('.movement') || (control && !control.classList.contains('group-summary')))
      return;
    this.groupDragStarted.emit({ event, id });
  }
}
